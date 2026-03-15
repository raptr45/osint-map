# OSINT Map Documentation

Welcome to the OSINT Map project. This directory contains detailed technical documentation for developers and operators.

## 📖 Table of Contents
1. **[Architecture Overview](architecture.md)**
   - Understanding PostGIS, GIS layers, and sovereign tile hosting.
2. **[AI & Pipeline Logic](pipeline.md)**
   - How raw data from Telegram/RSS is parsed by Gemini and moderated.
3. **[Database Schema](database.md)**
   - Deep dive into the Postgres/PostGIS table structures.

## 🚀 Quick Links
- **Main Map**: `/`
- **Moderation Queue** (Admin Only): `/admin/queue`
- **Auth Systems**: `/auth/sign-in`

## 🛠️ Tech Stack Snippet
- **Frontend**: Next.js 15+, Tailwind CSS, MapLibre GL
- **Backend**: Drizzle ORM, Neon (PostgreSQL + PostGIS)
- **AI**: Google Generative AI (Gemini 1.5 Flash)
- **Auth**: Better-Auth
