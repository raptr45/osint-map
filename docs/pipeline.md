# Ingestion & AI Pipeline

How raw intelligence becomes geolocated markers on the map.

## 📡 1. Raw Ingestion
The system is designed to swallow raw, unstructured text from various sources:
- **Telegram Channels** (MTProto Scrapers)
- **RSS Feeds**
- **Manual Input**

Inputs are hit first in the `Pending Queue`, preserving the original raw text/source.

## 🧠 2. AI Parsing (Gemini-1.5-Flash)
The `lib/ai-parser.ts` module uses Google's Gemini models to perform "Named Entity Recognition" and "Geolocation".

- **Input**: *"Large explosion reported near the Okhmatdyt Children's Hospital in Kyiv."*
- **Process**: The AI identifies landmarks and cities, cross-references them internally, and returns a structured JSON.
- **Output**:
  ```json
  {
    "title": "Hospital Attack - Kyiv",
    "latitude": 50.4497,
    "longitude": 30.4854,
    "severity": "critical"
  }
  ```

## 🛠️ 3. The Moderation Queue
Before an event is "Published" to the global map, it must pass a human check:
1. **Verification**: Admins see the raw text alongside the AI-suggested location.
2. **Adjustment**: If the AI is slightly off, admins can click the map to re-pin the target.
3. **Publication**: Once approved, the record is moved from `pending_events` to `published_events` and PostGIS geometry is generated.

## 🚀 4. How to Test
You can simulate the ingestion of any text using the mock-ingestor CLI:
```bash
pnpm tsx ingest/mock-ingestor.ts "Your raw intel text here"
```
Check the **Moderation Queue** (`/admin/queue`) to see the result.
