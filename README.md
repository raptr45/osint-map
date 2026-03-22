# 🌐 OSINT Map

A high-performance, precision geopolitical intelligence platform. Built with **Next.js 16**, **PostGIS**, and **Gemini AI**.

---

## 🚀 Quick Start

1. **Clone & Install**: `pnpm install`
2. **Setup Environment**: Copy `.env.example` to `.env`.
3. **Tactical Initialization**:
   ```bash
   pnpm db:setup
   ```
   _This single command enables PostGIS, deploys the schema, and seeds starting data._
4. **Finally**: `pnpm dev`

---

## 🏗️ Deployment Architecture

This project is optimized for a **Hybrid Cloud** setup:

| Component    | Platform                          | Role                                |
| :----------- | :-------------------------------- | :---------------------------------- |
| **Website**  | ✨ [Vercel](https://vercel.com)   | Next.js Map UI (Serverless)         |
| **Ingestor** | 🚂 [Railway](https://railway.app) | 24/7 Telegram Listener (Persistent) |
| **Database** | 🐘 [Railway](https://railway.app) | Shared PostgreSQL + PostGIS         |

### 🔑 Critical Environment Variables

For production, ensure these are set:

- `DATABASE_URL`: Your Railway Postgres connection string.
- `BETTER_AUTH_SECRET`: Random string for session security.
- `BETTER_AUTH_URL`: Your full Vercel URL (e.g., `https://osint-map.vercel.app`).
- `TELEGRAM_API_ID`, `TELEGRAM_API_HASH`: Your Telegram App credentials.

---

## 🛡️ Operational Features

- **📍 Precision Mapping**: High-speed geospatial visualization via MapLibre GL.
- **🤖 AI Extraction**: Automated situational reports and geolocation using Gemini 2.0 Flash.
- **📡 Reliable Ingest**: Heartbeat-monitored Telegram scraper with auto-reconnection.
- **👮 Moderation Queue**: Full-cycle verification from raw intel to published events.
- **🔐 Secure Uplink**: Hardened role-based access control via Better-Auth.

---

Built for clarity, speed, and strategic awareness.
