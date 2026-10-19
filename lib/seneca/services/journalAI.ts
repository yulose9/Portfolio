// @ts-nocheck
import { GoogleGenAI } from "@google/genai";
import { getEnv } from "./firebase";

const SYSTEM_PROMPT = `
Role & Persona:
You are a personal editor and stoic companion for the writer of this journal. Your voice mixes a modern professional diary with the calm, grounded wisdom of the Stoics: elevated, but never detached from real life.

Your Objective:
Take the writer's raw, informal, sometimes stream-of-consciousness or Taglish (Tagalog-English) notes and rewrite them as clear, reflective journal entries that find the meaning in an ordinary day.

Style Guidelines:
1. Elevate the tone without inventing events: keep every fact the writer gave, and add none.
2. Stoic and steady: acknowledge tiredness or frustration honestly, then turn toward resolve.
3. Faith and gratitude: when the writer mentions them, treat them with respect.
4. Language: translate Tagalog or Taglish phrases into natural, reflective English.
5. Structure: cohesive paragraphs; bullet points only if the input is a task list.
6. Perspective: keep the writer's own perspective, including notes addressed to themselves.

Example (style only; invented):
Input: "ang daming gagawin today, medyo pagod pero kaya naman. need to finish the report"
Output Title: "One Task at a Time"
Output Content: "<p>Today arrived with a long list, and I felt the weight of it before I began. I am tired, but not defeated. The report comes first; the rest can wait its turn. One finished task is worth more than ten worried about.</p>"

Instructions:
Analyze the input.
Return ONLY a JSON object with "title" (short, punchy, stoic) and "content" (HTML-safe text, e.g. <p>...</p>).
`;

export interface RefinedEntry {
  title: string;
  content: string;
}

export const refineEntryWithGemini = async (
  currentTitle: string,
  currentContent: string,
): Promise<RefinedEntry | null> => {
  const apiKey = getEnv("GEMINI_API_KEY");
  if (!apiKey) {
    throw new Error("Journal rewrite needs a secure server connection. You can keep editing and save your entry normally.");
  }

  const promptText = `${SYSTEM_PROMPT}\n\nInput Title: ${currentTitle}\nInput Content: ${currentContent}`;

  // 1. Try Gemini 2.0 Flash (Streaming)
  try {
    const ai = new GoogleGenAI({ apiKey });
    const req = {
      model: "gemini-2.0-flash",
      contents: [{ role: "user", parts: [{ text: promptText }] }],
    };

    const resultStream = await ai.models.generateContentStream(req);
    let fullText = "";
    for await (const chunk of resultStream) {
      if (chunk.text) fullText += chunk.text;
    }

    const cleanText = fullText
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();
    return JSON.parse(cleanText) as RefinedEntry;
  } catch (e) {
    console.warn("Gemini 2.0 Journal Rewrite Failed:", e);

    // 2. Fallback to Gemini 1.5 Flash (Standard)
    try {
      const ai = new GoogleGenAI({ apiKey });
      const req = {
        model: "gemini-1.5-flash",
        contents: [{ role: "user", parts: [{ text: promptText }] }],
        config: { responseMimeType: "application/json" },
      };
      const result = await ai.models.generateContent(req);
      const text = (result as any)?.text || (result as any)?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) return JSON.parse(text) as RefinedEntry;
    } catch (fallbackError) {
      console.error("Gemini 1.5 Fallback Failed:", fallbackError);
      throw new Error("Unable to refine entry.");
    }
  }
  return null;
};
