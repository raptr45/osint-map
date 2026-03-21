import "dotenv/config";
import fs from "fs";
import input from "input";
import path from "path";
import { Api, TelegramClient } from "telegram";
import { NewMessage } from "telegram/events";
import { NewMessageEvent } from "telegram/events/NewMessage";
import { StringSession } from "telegram/sessions";
import { processIngestion } from "../lib/ingest-pipeline";

const LOCK_FILE = path.join(process.cwd(), ".ingestor.lock");

function checkLock() {
  const isCloud = !!(
    process.env.RAILWAY_ENVIRONMENT ||
    process.env.VERCEL ||
    process.env.NODE_ENV === "production"
  );

  if (fs.existsSync(LOCK_FILE)) {
    if (isCloud) {
      console.log(
        "♻️  Stale lock file detected in cloud environment. Auto-cleaning..."
      );
      try {
        fs.unlinkSync(LOCK_FILE);
      } catch (err) {
        console.warn("⚠️  Could not auto-clean lock file:", err);
      }
    } else {
      const pid = fs.readFileSync(LOCK_FILE, "utf-8");
      console.error(
        `\n❌ ERROR: Another ingestor is already running (PID: ${pid})`
      );
      console.error(
        `If you are sure it stopped, delete the file: ${LOCK_FILE}\n`
      );
      process.exit(1);
    }
  }
  fs.writeFileSync(LOCK_FILE, process.pid.toString());
}

function releaseLock() {
  if (fs.existsSync(LOCK_FILE)) {
    try {
      fs.unlinkSync(LOCK_FILE);
    } catch {
      // Ignore cleanup errors
    }
  }
}

// Cleanup lock on exit
process.on("exit", releaseLock);
process.on("SIGINT", () => {
  releaseLock();
  process.exit();
});
process.on("SIGTERM", () => {
  releaseLock();
  process.exit();
});
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
  releaseLock();
  process.exit(1);
});

const apiId = parseInt(process.env.TELEGRAM_API_ID || "0");
const apiHash = process.env.TELEGRAM_API_HASH || "";
const stringSession = new StringSession(process.env.TELEGRAM_SESSION || "");

// List of target OSINT channels (usernames)
const TARGET_CHANNELS = [
  "liveuamap",
  "DeepStateUA",
  "clashreport",
  "osintdefender",
  "auroraintel",
  "bnonews",
];

async function startTelegramIngestor() {
  checkLock();
  if (!apiId || !apiHash) {
    if (!apiId) console.error("❌ Missing: TELEGRAM_API_ID");
    if (!apiHash) console.error("❌ Missing: TELEGRAM_API_HASH");
    process.exit(1);
  }

  console.log("📡 Starting Telegram MTProto Ingestor...");

  const client = new TelegramClient(stringSession, apiId, apiHash, {
    connectionRetries: 5,
  });

  await client.start({
    phoneNumber: async () =>
      await input.text("Please enter your phone number: "),
    password: async () => await input.text("Please enter your password: "),
    phoneCode: async () =>
      await input.text("Please enter the code you received: "),
    onError: (err: unknown) => console.log(err),
  });

  console.log("✅ Successfully connected to Telegram!");
  console.log(
    "💾 YOUR SESSION STRING (Save this to .env as TELEGRAM_SESSION):"
  );
  console.log(client.session.save());

  // Listen for new messages
  client.addEventHandler(async (event: NewMessageEvent) => {
    const message = event.message;
    if (!message.text) return;

    // Get sender info (channel)
    const chat = (await message.getChat()) as
      | Api.Chat
      | Api.Channel
      | Api.User
      | undefined;
    const username =
      (chat && "username" in chat ? chat.username : null) ||
      (chat ? chat.id.toString() : "unknown");

    console.log(`\n📬 [${username}] New Message Received`);

    // Check if it's from our target list
    if (username && TARGET_CHANNELS.includes(username?.toString())) {
      await processIngestion(message.text, {
        externalId: `tg_${username}_${message.id}`,
        source: username.toString(),
        sourceCreatedAt: new Date(message.date * 1000),
      });
    }
  }, new NewMessage({}));

  console.log(`\n🛰️ Monitoring channels: ${TARGET_CHANNELS.join(", ")}`);
  console.log("Fetching recent history to prime the queue...");

  for (const channelName of TARGET_CHANNELS) {
    console.log(`🔍 Checking channel: @${channelName}`);
    try {
      const msgs = await client.getMessages(channelName, { limit: 5 });
      console.log(`📥 Priming ${msgs.length} messages from @${channelName}`);
      for (const msg of msgs) {
        if (msg.text) {
          console.log(
            `📄 Processing message text: "${msg.text.substring(0, 30)}..."`
          );
          await processIngestion(msg.text, {
            externalId: `tg_${channelName}_${msg.id}`,
            source: channelName,
            sourceCreatedAt: new Date(msg.date * 1000),
          });
          // Add delay to avoid rate limiting
          await new Promise((resolve) => setTimeout(resolve, 5000));
        }
      }
    } catch (err) {
      console.warn(`⚠️ Could not prime channel @${channelName}:`, err);
    }
  }

  console.log(
    "\n✅ Startup complete. Watching for new intelligence reports..."
  );

  // Keep alive heartbeat every 15 minutes
  setInterval(async () => {
    const isConnected = client.connected;
    console.log(
      `💓 [${new Date().toISOString()}] Ingestor Heartbeat: Still monitoring ${
        TARGET_CHANNELS.length
      } channels. (Connected: ${isConnected})`
    );

    if (!isConnected) {
      console.warn("⚠️  TELEGRAM DISCONNECTED! Attempting to reconnect...");
      try {
        await client.connect();
        console.log("✅ Reconnected.");
      } catch (err) {
        console.error(
          "❌ Reconnect failed. Crashing to trigger Railway restart."
        );
        process.exit(1);
      }
    }
  }, 15 * 60 * 1000);
}

startTelegramIngestor().catch(console.error);
