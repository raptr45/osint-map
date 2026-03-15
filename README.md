# 🌐 OSINT Map

A high-performance, real-time geopolitical mapping tool built with **Next.js**, **PostGIS**, and **Better-Auth**. Designed for speed, security, and clear geospatial intelligence.

## 🚀 Features

- **📍 Real-time Mapping**: Powered by MapLibre GL JS for smooth, high-volume data visualization.
- **🔐 Secure Auth**: Built-in authentication with social providers (GitHub, Google) via Better-Auth.
- **🌍 Geospatial Intelligence**: Native PostGIS integration for efficient viewport-based spatial queries.
- **🌓 Adaptive UI**: Premium dark/light themes with a custom, integrated theme switcher.
- **⚡ Modern Stack**: Next.js 15, Drizzle ORM, and Tailwind CSS 4.0.

## 🛠️ Technology Stack

- **Core**: [Next.js](https://nextjs.org/) (App Router)
- **Database**: [PostgreSQL](https://www.postgresql.org/) + [PostGIS](https://postgis.net/)
- **ORM**: [Drizzle ORM](https://orm.drizzle.team/)
- **Auth**: [Better-Auth](https://better-auth.com/)
- **Map**: [MapLibre GL JS](https://maplibre.org/) + [React-Map-GL](https://visgl.github.io/react-map-gl/)
- **UI**: [Shadcn UI](https://ui.shadcn.com/) + [Tailwind CSS 4.0](https://tailwindcss.com/)

## 🛤️ Roadmap

- [x] Initial infrastructure and Auth setup
- [x] PostGIS schema and spatial logic
- [x] Map interface integration
- [ ] Automated data ingestion pipeline (Telegram/RSS/Social)
- [ ] Internal moderation dashboard
- [ ] Live viewport-based event fetching

## 🛠️ Getting Started

1. **Clone the repository**
2. **Install dependencies:** `pnpm install`
3. **Setup Environment:** Copy `.env.example` to `.env` and fill in your database and auth credentials.
4. **Push Database Schema:** `pnpm drizzle-kit push`
5. **Run Development Server:** `pnpm dev`

---

Built for clarity and speed in geospatial intelligence.
