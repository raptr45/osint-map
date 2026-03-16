import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

export interface ParsedEvent {
  title: string;
  description: string;
  latitude: number;
  longitude: number;
  severity: "low" | "medium" | "high" | "critical";
}

export async function parseRawIntel(content: string): Promise<ParsedEvent | null> {
  const prompt = `
    You are an OSINT expert. Parse the following intelligence report and extract geospatial information.
    
    Report: "${content}"
    
    Return ONLY a JSON object with this structure:
    {
      "title": "Short descriptive title",
      "description": "Brief summary",
      "latitude": number,
      "longitude": number,
      "severity": "low" | "medium" | "high" | "critical"
    }
    
    If you cannot find a specific location, estimate the centroid of the mentioned region. 
    Focus on accuracy.
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
