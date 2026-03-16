import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

export interface ParsedEvent {
  title: string;
  description: string;
  latitude: number | null;
  longitude: number | null;
  severity: "low" | "medium" | "high" | "critical";
}

export async function parseRawIntel(content: string): Promise<ParsedEvent | null> {
  const prompt = `
    You are an expert OSINT (Open Source Intelligence) analyzer. 
    Analyze the following raw intelligence report and convert it into a structured geospatial event.

    INSTRUCTIONS:
    1. EXTRACT the most specific location possible (City, Landmark, Strait, or Border Region).
    2. If no specific location is found, use the centroid of the country or region mentioned.
    3. If the report is generic and has NO geospatial context, set latitude and longitude to null.
    4. REWRITE the title to be professional and tactical (e.g., "Naval Movement: Strait of Hormuz").
    5. SUMMARIZE the SITREP (Situation Report) into a concise, unbiased paragraph.
    6. ASSESS severity based on tactical impact.

    Report: "${content}"
    
    Return ONLY a JSON object:
    {
      "title": "Tactical Header",
      "description": "Professional summary of the event/intelligence.",
      "latitude": number | null,
      "longitude": number | null,
      "severity": "low" | "medium" | "high" | "critical"
    }
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    // Strip markdown formatting if present
    const cleanJson = text.replace(/```json|```/g, "").trim();
    return JSON.parse(cleanJson);
  } catch (error) {
    console.error("Gemini Parsing Error:", error);
    return null;
  }
}
