
import { GoogleGenAI, Type } from "@google/genai";
import { Task } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const analyzeSchedule = async (tasks: Task[]) => {
  const taskData = tasks.map(t => ({
    name: t.text,
    actual: { start: t.start_date.toISOString(), end: t.end_date.toISOString() },
    planned: { start: t.planned_start?.toISOString(), end: t.planned_end?.toISOString() }
  }));

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Analyze this project schedule. Compare actual vs planned dates (baselines) and identify delays or optimizations.
    Data: ${JSON.stringify(taskData)}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          summary: { type: Type.STRING },
          warnings: { type: Type.ARRAY, items: { type: Type.STRING } },
          score: { type: Type.NUMBER, description: 'Project health score 0-100' }
        },
        required: ["summary", "warnings", "score"]
      }
    }
  });

  return JSON.parse(response.text);
};
