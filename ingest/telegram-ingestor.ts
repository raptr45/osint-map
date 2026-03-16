import "dotenv/config";
import { TelegramClient, Api } from "telegram";
import { StringSession } from "telegram/sessions";
import { NewMessage } from "telegram/events";
import { NewMessageEvent } from "telegram/events/NewMessage";
import { processIngestion } from "../lib/ingest-pipeline";
import input from "input";

const apiId = parseInt(process.env.TELEGRAM_API_ID || "0");
const apiHash = process.env.TELEGRAM_API_HASH || "";
const stringSession = new StringSession(process.env.TELEGRAM_SESSION || "");

// List of target OSINT channels (usernames)
const TARGET_CHANNELS = [
  "liveuamap", 
  "DeepStateUA",
  "astrapress",
  "rusbrief",
  "shot_shot"
];

async function startTelegramIngestor() {
  if (!apiId || !apiHash) {
    console.error("❌ Error: TELEGRAM_API_ID and TELEGRAM_API_HASH must be set in .env");
    process.exit(1);
  }

  console.log("📡 Starting Telegram MTProto Ingestor...");
  
  const client = new TelegramClient(stringSession, apiId, apiHash, {
    connectionRetries: 5,
  });

  await client.start({
    phoneNumber: async () => await input.text("Please enter your phone number: "),
    password: async () => await input.text("Please enter your password: "),
    phoneCode: async () => await input.text("Please enter the code you received: "),
    onError: (err) => console.log(err),
  });

  console.log("✅ Successfully connected to Telegram!");
  console.log("💾 YOUR SESSION STRING (Save this to .env as TELEGRAM_SESSION):");
  console.log(client.session.save());

  // Listen for new messages
  client.addEventHandler(async (event: NewMessageEvent) => {
    const message = event.message;
    if (!message.text) return;

    // Get sender info (channel)
    const chat = await message.getChat() as Api.Chat | Api.Channel | Api.User;
    const username = ("username" in chat ? chat.username : null) || chat.id.toString();

    console.log(`\n📬 [${username}] New Message Received`);
    
    // Check if it's from our target list or if you want to ingest everything
    // For now, let's ingest if it's in our list
    if (TARGET_CHANNELS.includes(username) || true) { // Set to true to ingest all incoming for testing
      await processIngestion(message.text);
    }
  }, new NewMessage({}));

  console.log(`\n🛰️ Monitoring channels: ${TARGET_CHANNELS.join(", ")}`);
  console.log("Fetching recent history to prime the queue...");

  for (const channelName of TARGET_CHANNELS) {
    try {
      const msgs = await client.getMessages(channelName, { limit: 2 });
      console.log(`📥 Priming ${msgs.length} messages from ${channelName}`);
      for (const msg of msgs) {
        if (msg.text) {
          await processIngestion(msg.text);
        }
      }
    } catch (err) {
      console.warn(`⚠️ Could not prime channel ${channelName}:`, (err as Error).message);
    }
  }

  console.log("\n✅ Startup complete. Watching for new intelligence reports...");
}

startTelegramIngestor().catch(console.error);
