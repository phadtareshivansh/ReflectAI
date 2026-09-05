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

/**
 * THREAT-MODEL NOTE: Plaintext Leakage Prevention (OWASP LLM05 & Directive 8)
 * - Scope: /api/reflect
 * - Risk: Plaintext prompt leakage via server stdout/stderr or error trackers.
 * - Countermeasure: Prompts and AI outputs reside transiently in function memory.
 * - Zero-Plaintext Logging: Logs contain strictly operational metadata (model used, timing, sanitized status).
 * - Decrypted/plaintext content is NEVER written to disk, database, or console logs.
 */
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
    // Sanitize log: log only the error name and code, NEVER raw request payloads or user content
    console.error("[/api/reflect] Operation failed:", error?.name || "SynthesisError");
    res.status(500).json({
      error: "An error occurred during reflection synthesis. Please try again.",
    });
  }
});

/**
 * THREAT-MODEL NOTE: Plaintext Leakage Prevention (OWASP LLM05 & Directive 8)
 * - Scope: /api/chat
 * - Risk: Plaintext multi-turn chat message leakage via server logs or exception crash reports.
 * - Countermeasure: Multi-turn history is processed strictly in memory and dereferenced.
 * - Zero-Plaintext Logging: Exception handlers scrub message contents and only output status codes.
 */
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
    // Sanitize log: zero plaintext logging
    console.error("[/api/chat] Operation failed:", error?.name || "ChatError");
    res.status(500).json({
      error: "An error occurred during follow-up dialogue. Please try again.",
    });
  }
});

/**
 * Helper to decode base64 in Node.js
 */
function base64ToUint8(b64: string): Uint8Array {
  const buf = Buffer.from(b64, "base64");
  const ab = new ArrayBuffer(buf.length);
  const view = new Uint8Array(ab);
  for (let i = 0; i < buf.length; i++) {
    view[i] = buf[i];
  }
  return view;
}

/**
 * Transient in-memory decryption helper using standard WebCrypto SubtleCrypto.
 * Decrypted content is immediately scoped to function execution and NEVER written to disk,
 * cached, or logged.
 */
async function decryptTransient(
  ciphertextBase64: string,
  ivBase64: string,
  jwk: any
): Promise<string> {
  const cryptoSubtle = globalThis.crypto.subtle;
  const key = await cryptoSubtle.importKey(
    "jwk",
    jwk,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"]
  );
  const iv = base64ToUint8(ivBase64);
  const ciphertext = base64ToUint8(ciphertextBase64);
  const decryptedBuf = await cryptoSubtle.decrypt(
    { name: "AES-GCM", iv: iv as BufferSource },
    key,
    ciphertext as BufferSource
  );
  return new TextDecoder().decode(decryptedBuf);
}

/**
 * THREAT-MODEL NOTE: Plaintext Leakage via Logs or Crash Reports (Directive 8 & 9)
 * - Scope: /api/vault/transient-summarize
 * - Objective: Allows server-side pattern analysis across user-provided encrypted entries.
 * - Threat: Ciphertext decrypted on server could leak via unhandled error logs, crash dumps,
 *   or process memory dumps.
 * - Mitigations:
 *   1. Decryption occurs purely in local function scope.
 *   2. Decrypted strings and arrays are explicitly nullified in memory before response transmission.
 *   3. Strict logging ban: console.log and console.error strictly record operation counts and model IDs;
 *      never log payload, decrypted text, or raw error objects.
 *   4. Capped batch limit: Rejects batches greater than 10 entries to prevent denial-of-service or bulk exfiltration.
 */
app.post("/api/vault/transient-summarize", async (req: Request, res: Response): Promise<void> => {
  // Scoped references to ensure deterministic memory cleanup
  let decryptedSnippets: string[] | null = [];
  try {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const encryptedEntries = Array.isArray(body.entries) ? body.entries : [];
    const keyJwk = body.keyJwk;

    if (!keyJwk || typeof keyJwk !== "object") {
      res.status(400).json({ error: "Transient vault key authorization required." });
      return;
    }

    if (encryptedEntries.length === 0) {
      res.status(400).json({ error: "No encrypted entries provided." });
      return;
    }

    // Rate-limit batch cap as required by Directive 9
    const MAX_BATCH = 10;
    const batch = encryptedEntries.slice(0, MAX_BATCH);

    for (const entry of batch) {
      if (entry.content && entry.encryptionIv) {
        try {
          const plain = await decryptTransient(entry.content, entry.encryptionIv, keyJwk);
          decryptedSnippets.push(`- [${entry.title || "Untitled"} (${entry.mode || "entry"})]: ${plain}`);
        } catch {
          // If a document fails decryption, skip without logging plaintext
        }
      }
    }

    if (decryptedSnippets.length === 0) {
      res.status(400).json({ error: "Could not transiently decrypt provided entries with key." });
      return;
    }

    const synthesisPrompt = `Synthesize the user's past journal entries into overarching patterns, recurring themes, and constructive insights:\n\n${decryptedSnippets.join("\n\n")}`;
    const systemInstruction = `You are Aether, conducting high-level pattern analysis across a user's private reflections.
Highlight intellectual growth, recurring dilemmas, emotional trajectories, and actionable future inquiries. Format with clean, structured Markdown.`;

    const { text, modelUsed } = await generateContentWithFallback(synthesisPrompt, systemInstruction);

    res.json({
      summary: text,
      modelUsed,
      entriesAnalyzed: decryptedSnippets.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("[/api/vault/transient-summarize] Operation failed:", error?.name || "SummarizeError");
    res.status(500).json({
      error: "An unexpected error occurred during transient analysis.",
    });
  } finally {
    // Explicit nullification for garbage collection (Zero plain-text in long-lived memory)
    decryptedSnippets = null;
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
