import "dotenv/config";
import { db } from "../lib/db";
import { pendingEvents } from "../lib/schema";
import { parseRawIntel } from "../lib/ai-parser";
import { pointSql } from "../lib/map-logic";
import { eq } from "drizzle-orm";

/**
 * MOCK INGESTOR
 * In a real scenario, this would be a persistent listener (MTProto for Telegram, etc.)
 * For now, we'll demonstrate the flow from raw text to AI-parsed suggested coordinates.
 */
async function simulateIngestion(rawText: string) {
  console.log(`📡 New Intel Received: "${rawText.substring(0, 50)}..."`);
  
  // 1. Store Raw Intel in Pending Queue
  const [pending] = await db.insert(pendingEvents).values({
    rawSource: rawText,
    status: "pending",
  }).returning();

  console.log(`📥 Raw event staged (ID: ${pending.id})`);

  // 2. Initial AI Parsing (Suggest Location/Title)
  console.log("🤖 Parsing with Gemini-1.5-Flash...");
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
      
    console.log("✅ AI metadata attached. Ready for human moderation.");
  } else {
    console.warn("⚠️ AI parsing failed to extract coordinates.");
  }
}

/**
 * MOCK INGESTOR
 * Simulates receiving raw intel and piping it through Gemini
 */

const args = process.argv.slice(2);
const MOCK_INTEL = args[0] || "Large explosion reported near the Okhmatdyt Children's Hospital in Kyiv. Multiple emergency vehicles on scene.";

simulateIngestion(MOCK_INTEL)
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
