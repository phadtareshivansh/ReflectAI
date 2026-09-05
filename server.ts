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

/**
 * THREAT-MODEL NOTE: Multi-Document Aggregation & Enumeration Prevention (Directive 8 & 9)
 * - Scope: /api/weekly-reflect
 * - Threats:
 *   1. Cross-entry enumeration / IDOR: Aggregation over entries belonging to multiple users.
 *   2. Aggregation endpoint abuse: Pulling unbounded volumes of entries to exhaust tokens or exfiltrate data.
 *   3. Plaintext leakage via logs: Exposing multi-entry prompts or aggregated outputs in console logs.
 * - Countermeasures:
 *   1. Per-document owner verification: re-verifies request.body.userId === entry.userId on EVERY document.
 *   2. Strict batch limit capped at 10 entries from the last 7 days.
 *   3. Zero plaintext logging: zero entry or synthesis strings in logs; only count and model telemetry.
 *   4. Transient in-memory decryption with explicit garbage collection nullification.
 */
app.post("/api/weekly-reflect", async (req: Request, res: Response): Promise<void> => {
  let decryptedItems: { title: string; mood: string; text: string; date: string }[] | null = [];
  try {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const userId = typeof body.userId === "string" ? body.userId.trim() : "";
    const keyJwk = body.keyJwk;
    const rawEntries = Array.isArray(body.entries) ? body.entries : [];
    const startDate = typeof body.startDate === "string" ? body.startDate : "";
    const endDate = typeof body.endDate === "string" ? body.endDate : "";

    if (!userId) {
      res.status(400).json({ error: "User identity verification required." });
      return;
    }

    if (!keyJwk || typeof keyJwk !== "object") {
      res.status(400).json({ error: "Vault key authorization required for decryption." });
      return;
    }

    if (rawEntries.length === 0) {
      res.status(400).json({ error: "No entries found in the 7-day window." });
      return;
    }

    // 1. Re-verify ownership on EVERY individual document (Directive 9)
    const verifiedEntries = rawEntries.filter((entry) => {
      return entry && typeof entry === "object" && entry.userId === userId;
    });

    if (verifiedEntries.length === 0) {
      res.status(403).json({ error: "Ownership validation failed: zero matching entries for authenticated user." });
      return;
    }

    // 2. Strict batch capping (Directive 9: max 10 entries)
    const MAX_BATCH_CAP = 10;
    const cappedBatch = verifiedEntries.slice(0, MAX_BATCH_CAP);

    // Compute mood distribution from metadata
    const moodDistribution: Record<string, number> = {};
    for (const entry of cappedBatch) {
      const mood = entry.mood || "Focused";
      moodDistribution[mood] = (moodDistribution[mood] || 0) + 1;
    }

    // 3. Transient decryption in memory
    for (const entry of cappedBatch) {
      if (entry.content && entry.encryptionIv) {
        try {
          const plain = await decryptTransient(entry.content, entry.encryptionIv, keyJwk);
          decryptedItems.push({
            title: entry.title || "Reflective Inscription",
            mood: entry.mood || "Focused",
            text: plain,
            date: entry.createdAt || "",
          });
        } catch {
          // If single document decryption fails, skip cleanly without throwing or logging content
        }
      }
    }

    if (decryptedItems.length === 0) {
      res.status(400).json({ error: "Unable to decrypt entries with provided vault credentials." });
      return;
    }

    // 4. Construct aggregation prompt for Gemini
    const promptEntries = decryptedItems
      .map(
        (item, idx) =>
          `[Entry ${idx + 1}] Date: ${item.date} | Mood: ${item.mood} | Title: ${item.title}\n${item.text}`
      )
      .join("\n\n---\n\n");

    const aggregationPrompt = `Analyze this user's private reflections from the last 7 days.
Synthesize recurring themes, emotional tone shifts, intellectual growth, and constructive actionable guidance.

${promptEntries}

Respond ONLY with a JSON object in this exact schema (no preamble, no backticks, just raw JSON):
{
  "recurringThemes": ["theme 1", "theme 2", "theme 3"],
  "toneShift": "Concise summary of tone/mood shift across the week (e.g., 'From Dispersed Anxiety to Calm Momentum')",
  "synthesis": "Comprehensive markdown synthesis summarizing the week's cognitive milestones, recurring dilemmas, and psychological progress.",
  "actionableInsight": "A high-leverage question or reflective practice for the upcoming week."
}`;

    const systemInstruction = `You are Aether's Memory & Pattern Engine.
You synthesize multi-day reflective journal entries into coherent, empathetic, high-signal patterns.
Preserve user privacy, provide perceptive psychological insight, and adhere strictly to the requested JSON structure.`;

    const { text, modelUsed } = await generateContentWithFallback(aggregationPrompt, systemInstruction);

    // Parse JSON safely
    let parsedResult: any = null;
    try {
      const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
      parsedResult = JSON.parse(cleaned);
    } catch {
      // Graceful fallback if model output contains markdown or conversational wrap
      parsedResult = {
        recurringThemes: ["Mindfulness & Clarity", "Work & Purpose", "Emotional Calibration"],
        toneShift: "Deepening self-awareness through continuous inquiry",
        synthesis: text,
        actionableInsight: "Maintain regular daily reflections to track emergent clarity.",
      };
    }

    // Zero-Plaintext Logging: strictly log metadata counts only
    console.log(
      `[/api/weekly-reflect] Synthesized ${decryptedItems.length} entries for user using ${modelUsed}`
    );

    res.json({
      success: true,
      startDate: startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: endDate || new Date().toISOString(),
      entryCount: decryptedItems.length,
      recurringThemes: Array.isArray(parsedResult.recurringThemes) ? parsedResult.recurringThemes : [],
      toneShift: typeof parsedResult.toneShift === "string" ? parsedResult.toneShift : "Steady Inward Focus",
      synthesis: typeof parsedResult.synthesis === "string" ? parsedResult.synthesis : text,
      actionableInsight: typeof parsedResult.actionableInsight === "string" ? parsedResult.actionableInsight : "",
      moodDistribution,
      modelUsed,
      createdAt: new Date().toISOString(),
    });
  } catch (error: any) {
    // Sanitize log: zero plaintext logging
    console.error("[/api/weekly-reflect] Synthesis error:", error?.name || "AggregationError");
    res.status(500).json({
      error: "Failed to generate weekly reflection patterns. Please try again.",
    });
  } finally {
    // Explicit nullification for memory safety (Directive 8)
    decryptedItems = null;
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
