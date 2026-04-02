# 📚 Documentation Hub

Welcome to the **OSINT Map** technical documentation center. This repository serves as the single source of truth for the project's architecture, data modeling, and operational procedures.

---

## 🗺️ Navigation

| Document                                 | Focus Area                                                  | Audience               |
| :--------------------------------------- | :---------------------------------------------------------- | :--------------------- |
| **[Architecture](architecture.md)**      | System design, GIS layers, and sovereign hosting.           | Architects / Lead devs |
| **[Database Schema](database.md)**       | PostGIS modeling, ER diagrams, and spatial logic.           | Backend / DBAs         |
| **[Intelligence Pipeline](pipeline.md)** | Tactical Response Hub, AI extraction flow (Gemini), Multi-Source Ingestion (Telegram/X), and moderation. | DevOps / Operators     |

---

## 🛠️ Tech Stack & Governance

This project is built on a "Sovereign First" philosophy, prioritizing open-source engines and local control over proprietary SaaS dependencies.

- **Frontend**: Next.js 16 (App Router) + Tailwind CSS 4.0
- **State & Validation**: Zustand, TanStack Query, and Zod
- **Map Engine**: MapLibre GL JS (Vector Tile Native)
- **Persistence**: PostgreSQL + PostGIS (Spatial Indexing)
- **Logic**: Drizzle ORM + Better-Auth
- **Intelligence**: Google Gemini 2.0 Flash (LLM Geolocation)

---

## 🆘 Operational Support

### Useful Commands

- **Enable PostGIS**: `pnpm db:postgis`
- **Initialize DB**: `pnpm db:setup`
- **Start Ingestor**: `pnpm tsx ingest/telegram-ingestor.ts`

> [!NOTE]
> For core setup instructions, please refer to the [Main Root README](../README.md).
