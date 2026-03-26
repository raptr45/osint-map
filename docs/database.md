# Database Schema & GIS

This project leverages PostgreSQL with the **PostGIS** extension for advanced geospatial capabilities.

```mermaid
erDiagram
    USER ||--o{ PUBLISHED_EVENTS : "approves"
    PENDING_EVENTS ||--o{ SYSTEM_LOGS : "logs"
    INGEST_SOURCES ||--o{ PENDING_EVENTS : "feeds"
    PUBLISHED_EVENTS {
        uuid id PK
        string title
        text description
        geometry coordinates "PostGIS Point"
        string severity
        string source_url
        string image_url
        string user_id FK
        datetime source_created_at
        datetime created_at
    }
    PENDING_EVENTS {
        uuid id PK
        string source
        text raw_source
        string suggested_title
        text suggested_description
        geometry suggested_coordinates
        string status "pending|processing|processed|failed|rejected"
        string source_url
        string image_url
        datetime source_created_at
    }
    INGEST_SOURCES {
        uuid id PK
        string type "telegram|x|rss"
        string value "username"
        boolean is_active
        datetime last_fetched_at
    }
    USER {
        string id PK
        string email
        string role "admin|moderator|analyst|user"
    }
```

## 🗄️ Core Tables

### `published_events`
The source of truth for all live markers visible to the public.
- `id`: UUID (Primary Key)
- `title`: String
- `coordinates`: `geometry(Point, 4326)` (PostGIS Geometry)
- `severity`: Enum (`low`, `medium`, `high`, `critical`)
- `userId`: Reference to the user who approved the intel.
- `sourceUrl`: Persistent hyperlink to the original claim.
- `imageUrl`: Public link to visual evidence (Vercel Blob proxy).

### `pending_events`
The staging area for raw incoming data and geolocated AI payloads.
- `source`: The origin identifier (e.g., Telegram handle `osintdefender`)
- `raw_source`: The original text payload.
- `suggested_coordinates`: AI-estimated geometry point.
- `status`: Lifecycle hook (`pending`, `processing`, `processed`, `failed`, `rejected`).
- `sourceUrl` / `imageUrl`: Deep-links and visual proxies pulled simultaneously upon ingestion.

### `ingest_sources`
Registry configuration node for scraping targets.
- `type`: Target format (`telegram`, `x`, `rss`, `custom`).
- `value`: Target handle identifier.
- `isActive`: Maintenance kill-switch toggle for active scraping without payload loss.

### `user` (Auth)
- `email`: String (Unique)
- `role`: Enum (`admin`, `moderator`, `analyst`, `user`). This controls clearance bounds across the Administrative `/admin/*` routes.

## 🔭 Key GIS Functions Used

### `ST_Intersects`
Used in `/api/events` to filter markers by the current viewport. High performance via spatial indexing.

### `pointSql` (Custom Helper)
Located in `lib/map-logic.ts`. Converts raw latitude/longitude floats into a PostGIS `geometry` format during database insertion.

### `ST_X` & `ST_Y`
Used in the API to convert geometry points back into latitude/longitude decimals so the browser can understand them.
