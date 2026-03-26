# 🌐 OSINT Map

A high-performance, precision geopolitical intelligence platform. Built with **Next.js 16**, **PostGIS**, and **Gemini AI**.

> 📚 **Looking for detailed documentation?** Check out the [Documentation Hub](docs/README.md) for Architecture, Database schemas, and AI Pipeline details.

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
- **🤖 Server-Side AI Extraction**: Automated situational reports, coordinate extraction, and translation using Gemini 2.0 Flash or GPT-4o.
- **📡 Multi-Source Ingestion**: Dynamic, database-driven extraction nodes supporting **Telegram MTProto** and preparing for **X (Twitter)**.
- **🔄 Fuzzy Deduplication**: Built-in cross-source similarity matching prevents identical events from flooding the map, even if posted on different platforms.
- **⚡ Real-Time Streaming**: Server-Sent Events (SSE) stream new intelligence directly to the admin console without refreshing.
- **🕵️ Tactical Admin Hub (V2)**: Full CRUD lifecycle for intelligence verification, collapsible sidebar navigation, live source metrics, and maintenance toggles.
- **🔐 Secure Uplink**: Hardened role-based access control (RBAC) via Better-Auth (`admin`, `analyst`, `moderator`, `user`).

---

Built for clarity, speed, and strategic awareness.

<!-- edited by: ragibalasad -->
