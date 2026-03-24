import { put } from "@vercel/blob";
import "dotenv/config";
import { eq } from "drizzle-orm";
import fs from "fs";
import input from "input";
import path from "path";
import { Api, TelegramClient } from "telegram";
import { NewMessage } from "telegram/events";
import { NewMessageEvent } from "telegram/events/NewMessage";
import { StringSession } from "telegram/sessions";
import { db } from "../lib/db";
import { processIngestion } from "../lib/ingest-pipeline";
import { ingestSources } from "../lib/schema";

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
let TARGET_CHANNELS: string[] = [];

async function refreshSources() {
  try {
    const sources = await db.query.ingestSources.findMany({
      where: eq(ingestSources.isActive, true),
    });
    // Assuming type 'telegram' and value holds the username
    const newChannels = sources
      .filter((s) => s.type === "telegram")
      .map((s) => s.value);
    // If DB is empty, fallback or just use empty list
    TARGET_CHANNELS =
      newChannels.length > 0
        ? newChannels
        : [
            "liveuamap",
            "DeepStateUA",
            "clashreport",
            "osintdefender",
            "auroraintel",
            "bnonews",
          ];
    console.log(
      `\n🛰️ Updated monitoring channels: ${TARGET_CHANNELS.join(", ")}`
    );
  } catch (err) {
    console.error("Failed to refresh sources from DB:", err);
  }
}

async function startTelegramIngestor() {
  await refreshSources();
  checkLock();
  if (!apiId || !apiHash) {
    if (!apiId) console.error("❌ Missing: TELEGRAM_API_ID");
    if (!apiHash) console.error("❌ Missing: TELEGRAM_API_HASH");
    process.exit(1);
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error("❌ ERROR: BLOB_READ_WRITE_TOKEN is missing from .env");
    console.error("Local media uploads will fail.");
  } else {
    console.log(
      "🌐 Vercel Blob Token detected. Ready for cloud media storage."
    );
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
      let imageUrl: string | undefined;

      // 1. Check for native photo media
      if (message.media instanceof Api.MessageMediaPhoto) {
        try {
          const photoName = `tg_${username}_${message.id}.jpg`;
          console.log(
            `📸 Image detected. Uploading to Vercel Blob: ${photoName}`
          );

          const buffer = (await client.downloadMedia(
            message.media,
            {}
          )) as Buffer;
          const { url } = await put(`media/${photoName}`, buffer, {
            access: "public",
          });
          imageUrl = url;
          console.log(`✅ Uploaded image: ${url}`);
        } catch (err) {
          console.error("❌ Failed to upload message photo:", err);
        }
      }
      // 2. Check for video media (extract thumbnail)
      else if (message.media instanceof Api.MessageMediaDocument) {
        const doc = message.media.document as Api.Document;
        if (doc.mimeType?.startsWith("video/")) {
          try {
            const thumbName = `tg_thumb_${username}_${message.id}.jpg`;
            console.log(
              `🎬 Video detected. Extracting thumbnail: ${thumbName}`
            );

            const buffer = (await client.downloadMedia(message.media, {
              // @ts-expect-error - thumbIdx is internal to GramJS but not in the typings
              thumbIdx: 0,
            })) as Buffer;

            if (buffer) {
              const { url } = await put(`media/${thumbName}`, buffer, {
                access: "public",
              });
              imageUrl = url;
              console.log(`✅ Uploaded video thumbnail: ${url}`);
            }
          } catch (err) {
            console.error("❌ Failed to extraction video thumbnail:", err);
          }
        }
      }
      // 3. Fallback to web preview thumbnails
      else if (
        message.media instanceof Api.MessageMediaWebPage &&
        message.media.webpage instanceof Api.WebPage
      ) {
        const webpage = message.media.webpage;
        if (webpage.photo instanceof Api.Photo) {
          try {
            const photoName = `preview_${username}_${message.id}.jpg`;
            console.log(
              `🔗 Web preview detected. Uploading thumbnail: ${photoName}`
            );
            const buffer = (await client.downloadMedia(
              webpage.photo as unknown as Api.TypeMessageMedia,
              {}
            )) as Buffer;
            const { url } = await put(`media/${photoName}`, buffer, {
              access: "public",
            });
            imageUrl = url;
            console.log(`✅ Uploaded preview: ${url}`);
          } catch (err) {
            console.error("❌ Failed to upload preview photo:", err);
          }
        }
      }

      await processIngestion(message.text, {
        externalId: `tg_${username}_${message.id}`,
        source: username.toString(),
        sourceCreatedAt: new Date(message.date * 1000),
        imageUrl,
      });
    }
  }, new NewMessage({}));

  console.log(`\n🛰️ Monitoring channels initialized.`);
  console.log("Fetching recent history to prime the queue...");

  for (const channelName of TARGET_CHANNELS) {
    console.log(`🔍 Checking channel: @${channelName}`);
    try {
      const msgs = await client.getMessages(channelName, { limit: 5 });
      console.log(`📥 Priming ${msgs.length} messages from @${channelName}`);
      for (const msg of msgs) {
        if (msg.text) {
          let imageUrl: string | undefined;

          // Historical media extraction
          if (msg.media instanceof Api.MessageMediaPhoto) {
            try {
              const photoName = `tg_${channelName}_${msg.id}.jpg`;
              console.log(`📸 Priming image: ${photoName}`);

              const buffer = (await client.downloadMedia(
                msg.media,
                {}
              )) as Buffer;
              const { url } = await put(`media/${photoName}`, buffer, {
                access: "public",
                addRandomSuffix: false,
              });
              imageUrl = url;
            } catch (err) {
              console.error(
                `❌ Failed to prime image for ${channelName}_${msg.id}:`,
                err
              );
            }
          } else if (msg.media instanceof Api.MessageMediaDocument) {
            const doc = msg.media.document as Api.Document;
            if (doc.mimeType?.startsWith("video/")) {
              try {
                const thumbName = `tg_thumb_${channelName}_${msg.id}.jpg`;
                console.log(`🎬 Priming video thumbnail: ${thumbName}`);

                const buffer = (await client.downloadMedia(msg.media, {
                  // @ts-expect-error - thumbIdx is internal to GramJS but not in the typings
                  thumbIdx: 0,
                })) as Buffer;

                if (buffer) {
                  const { url } = await put(`media/${thumbName}`, buffer, {
                    access: "public",
                    addRandomSuffix: false,
                  });
                  imageUrl = url;
                }
              } catch (err) {
                console.error(
                  `❌ Failed to prime video thumb for ${channelName}_${msg.id}:`,
                  err
                );
              }
            }
          }

          console.log(
            `📄 Processing message text: "${msg.text.substring(0, 30)}..."`
          );
          await processIngestion(msg.text, {
            externalId: `tg_${channelName}_${msg.id}`,
            source: channelName,
            sourceCreatedAt: new Date(msg.date * 1000),
            imageUrl,
          });
          // Add delay to avoid rate limiting
          await new Promise((resolve) => setTimeout(resolve, 5000));
        }
      }
    } catch {
      console.warn(`⚠️ Could not prime channel @${channelName}`);
    }
  }

  console.log(
    "\n✅ Startup complete. Watching for new intelligence reports..."
  );

  // Keep alive heartbeat every 15 minutes
  setInterval(async () => {
    await refreshSources();
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
      } catch {
        console.error(
          "❌ Reconnect failed. Crashing to trigger Railway restart."
        );
        process.exit(1);
      }
    }
  }, 5 * 60 * 1000); // Check every 5 mins instead of 15
}

startTelegramIngestor().catch(console.error);
