import { db } from "./db";
import { pendingEvents } from "./schema";
import { parseRawIntel } from "./ai-parser";
import { pointSql } from "./map-logic";
import { eq } from "drizzle-orm";

/**
 * Common ingestion pipeline that takes raw text, 
 * stages it in the database, and calls AI for enrichment.
 */
export async function processIngestion(rawText: string) {
  if (!rawText || rawText.length < 10) return null;

  console.log(`📡 New Intel Received: "${rawText.substring(0, 50)}..."`);
  
  // 1. Store Raw Intel in Pending Queue
  const [pending] = await db.insert(pendingEvents).values({
    rawSource: rawText,
    status: "pending",
  }).returning();

  console.log(`📥 Raw event staged (ID: ${pending.id})`);

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
          suggestedCoordinates: pointSql(parsed.longitude, parsed.latitude),
        })
        .where(eq(pendingEvents.id, pending.id));
        
      console.log("✅ AI metadata attached.");
      return pending.id;
    } else {
      console.warn("⚠️ AI parsing failed to extract coordinates.");
      return null;
    }
  } catch (err) {
    console.error("❌ AI Pipeline Error:", err);
    return null;
  }
}
