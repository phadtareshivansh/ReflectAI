import express, { Request, Response } from "express";
import path from "path";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// 1. Top-Level Request Deserialization (Ordering Guarantee)
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true, limit: "5mb" }));

// 2. Secret Management & Lazy SDK Client Initialization
let aiClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is not configured");
    }
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

// 3. Resilient Model Fallback Ladder & Error Recovery Matrix
const MODEL_FALLBACK_LADDER = [
  "gemini-3.6-flash",
  "gemini-3.1-flash-lite",
  "gemini-flash-latest",
  "gemini-3.7-flash",
];

async function generateContentWithFallback(
  prompt: string,
  systemInstruction: string,
  contentsHistory?: any[]
): Promise<{ text: string; modelUsed: string }> {
  const ai = getGenAI();
  let lastError: any = null;

  for (const model of MODEL_FALLBACK_LADDER) {
    try {
      console.log(`[Gemini Engine] Attempting synthesis using model: ${model}`);
      
      let contentsPayload: any = prompt;
      if (contentsHistory && contentsHistory.length > 0) {
        contentsPayload = [
          ...contentsHistory.map((item) => ({
            role: item.role === "assistant" || item.role === "model" ? "model" : "user",
            parts: [{ text: item.text }],
          })),
          {
            role: "user",
            parts: [{ text: prompt }],
          },
        ];
      }

      const response = await ai.models.generateContent({
        model,
        contents: contentsPayload,
        config: {
          systemInstruction: {
            parts: [{ text: systemInstruction }],
          },
          temperature: 0.7,
        },
      });

      const responseText = response.text || "";
      return { text: responseText, modelUsed: model };
    } catch (error: any) {
      console.warn(`[Gemini Engine] Model ${model} encountered an issue:`, error?.message || error);
      lastError = error;
      // Continue to next model in the fallback ladder
    }
  }

  throw new Error(`All Gemini models in fallback ladder exhausted. Last error: ${lastError?.message || "Unknown error"}`);
}

// Health check endpoint
app.get("/api/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    environment: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString(),
  });
});

// Primary reflection endpoint
app.post("/api/reflect", async (req: Request, res: Response): Promise<void> => {
  try {
    // Defensive Payload Ingestion (Null-Safe Destructuring)
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
    const mode = typeof body.mode === "string" ? body.mode : "reflect";
    const mood = typeof body.mood === "string" ? body.mood : "Focused";
    const title = typeof body.title === "string" ? body.title : "Reflective Inscription";

    if (!prompt) {
      res.status(400).json({ error: "Reflection prompt is required and cannot be empty." });
      return;
    }

    let systemInstruction = `You are a contemplative, thoughtful philosophical companion and reflective mentor named Aether.
The user is journaling their thoughts, observations, dilemmas, or concepts.
Their current mood/disposition is: "${mood}".
Current mode is: "${mode}".

Guidelines:
- When mode is "reflect": Provide deep philosophical synthesis, Stoic perspectives, Socratic inquiry, and structured analysis of the user's dilemma. Break down assumptions gently and offer timeless wisdom.
- When mode is "summarize": Act as an executive thinker. Distill the user's thoughts into clear invariants, core thematic pillars, and actionable principles.
- When mode is "brainstorm": Act as an expansive strategist. Propose non-obvious creative pathways, orthogonal angles, and pragmatic experiment ideas.

Formatting:
- Use clean Markdown with clear headings, bullet points, or blockquotes where appropriate.
- Maintain an eloquent, grounded, and respectful tone. Avoid corporate jargon and superficial cheerleading.`;

    const { text, modelUsed } = await generateContentWithFallback(prompt, systemInstruction);

    res.json({
      response: text,
      modelUsed,
      title,
      mode,
      mood,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("[/api/reflect] Error handling reflection:", error);
    res.status(500).json({
      error: error?.message || "An unexpected error occurred during reflection synthesis.",
    });
  }
});

// Multi-turn chat/dialectic endpoint
app.post("/api/chat", async (req: Request, res: Response): Promise<void> => {
  try {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const message = typeof body.message === "string" ? body.message.trim() : "";
    const history = Array.isArray(body.history) ? body.history : [];
    const mode = typeof body.mode === "string" ? body.mode : "reflect";

    if (!message) {
      res.status(400).json({ error: "Message content cannot be empty." });
      return;
    }

    const systemInstruction = `You are Aether, engaging in a continuous dialectic with the user regarding their personal journal entry.
Mode: ${mode}.
Engage deeply with their questions, challenge their reasoning respectfully, and guide them toward clarity and constructive insight.
Format using clean, elegant Markdown.`;

    const { text, modelUsed } = await generateContentWithFallback(
      message,
      systemInstruction,
      history
    );

    res.json({
      response: text,
      modelUsed,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("[/api/chat] Error handling chat message:", error);
    res.status(500).json({
      error: error?.message || "An unexpected error occurred during follow-up dialogue.",
    });
  }
});

// Vite middleware or production static serving
async function setupViteOrStatic() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer } = await import("vite");
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Aether Server] Running on http://0.0.0.0:${PORT}`);
  });
}

setupViteOrStatic().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
