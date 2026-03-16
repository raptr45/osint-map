# 🌐 OSINT Map

A high-performance, precision geopolitical intelligence platform. Built with **Next.js 16**, **PostGIS**, and **Gemini AI**.

---

### 🚀 Quick Start

1. **Clone & Install**: `pnpm install`
2. **Setup Environment**: Copy `.env.example` to `.env`.
3. **Tactical Initialization**:
   ```bash
   pnpm db:setup
   ```
   _This single command enables PostGIS, deploys the schema, and seeds starting data._
4. **Finally**: `pnpm dev`

---

### 📖 Documentation

For detailed technical specs and operational guides, see the [Documentation Hub](docs/README.md).

- **[Architecture Overview](docs/architecture.md)**: GIS layers, viewport-first ingestion, and sovereign hosting.
- **[Intelligence Pipeline](docs/pipeline.md)**: How raw Telegram signals are parsed by AI and moderated.
- **[Database & GIS](docs/database.md)**: Deep dive into the PostGIS schema and R-Tree indexing.

---

### 🛡️ Operational Features

- **📍 Precision Mapping**: High-speed geospatial visualization via MapLibre GL.
- **🤖 AI Extraction**: Automated situational reports and geolocation using Gemini 2.0 Flash.
- **👮 Moderation Queue**: Full-cycle verification from raw intel to published events.
- **🔐 Secure Uplink**: Hardened role-based access control via Better-Auth.

---

Built for clarity, speed, and strategic awareness.
