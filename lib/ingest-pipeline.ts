import { db } from "./db";
import { pendingEvents } from "./schema";
import { parseRawIntel } from "./ai-parser";
import { pointSql } from "./map-logic";
import { eq } from "drizzle-orm";
import { logSystem } from "./logging";

/**
 * Common ingestion pipeline that takes raw text, 
 * stages it in the database, and calls AI for enrichment.
 */
export async function processIngestion(rawText: string) {
  if (!rawText || rawText.length < 10) return null;

  // 1. Store Raw Intel in Pending Queue
  console.log(`📡 New Intel Received: "${rawText.substring(0, 50)}..."`);
  
  let pending;
  try {
    const results = await db.insert(pendingEvents).values({
      rawSource: rawText,
      status: "pending",
    }).returning();
    pending = results[0];
    await logSystem("info", "INGEST", `Raw intel staged: ${rawText.substring(0, 30)}...`);
    console.log(`📥 Raw event staged (ID: ${pending.id})`);
  } catch (err) {
    await logSystem("error", "INGEST", `Failed to stage intel: ${(err as Error).message}`);
    console.error("❌ Database Insertion Error:", err);
    throw err; // Re-throw to be caught by ingestor
  }

  // 2. Initial AI Parsing (Suggest Location/Title)
  console.log("🤖 Parsing with Gemini-1.5-Flash...");
  try {
    const parsed = await parseRawIntel(rawText);

    if (parsed) {
      console.log(`📍 AI Suggested Location: ${parsed.latitude}, ${parsed.longitude}`);
      
      // Update the pending event with AI suggestions
      await db.update(pendingEvents)
        .set({
          suggestedTitle: parsed.title,
          suggestedDescription: parsed.description,
          suggestedCoordinates: (parsed.longitude !== null && parsed.latitude !== null) 
            ? pointSql(parsed.longitude!, parsed.latitude!) 
            : null,
        })
        .where(eq(pendingEvents.id, pending.id));
        
      await logSystem("info", "AI", `Parsed location for intel ${pending.id}: ${parsed.latitude}, ${parsed.longitude}`);
      console.log("✅ AI metadata attached.");
      return pending.id;
    } else {
      await logSystem("warn", "AI", `No location extracted for intel ${pending.id}`);
      console.warn("⚠️ AI parsing failed to extract coordinates.");
      return null;
    }
  } catch (err) {
    await logSystem("error", "AI", `Pipeline failure: ${(err as Error).message}`);
    console.error("❌ AI Pipeline Error:", err);
    return null;
  }
}
