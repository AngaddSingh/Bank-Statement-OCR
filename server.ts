import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Allow large uploads for PDF files & high-resolution bank statement images
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is not defined. Please set it in AI Studio secrets.");
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

function cleanGeminiErrorMessage(errorMessage: string): string {
  if (!errorMessage) return "An unexpected error occurred.";
  try {
    const errorStr = errorMessage.trim();
    if (errorStr.startsWith("{") || errorStr.includes('{"error"')) {
      const startIdx = errorStr.indexOf("{");
      const endIdx = errorStr.lastIndexOf("}");
      if (startIdx !== -1 && endIdx !== -1) {
        const jsonCandidate = errorStr.substring(startIdx, endIdx + 1);
        const parsed = JSON.parse(jsonCandidate);
        if (parsed.error && parsed.error.message) {
          return parsed.error.message;
        }
        if (parsed.message) {
          return parsed.message;
        }
      }
    }
  } catch (e) {
    // Fall back to general cleaning
  }
  
  // Strip out full JSON dumps if any remain
  if (errorMessage.includes("UNAVAILABLE") && errorMessage.includes("high demand")) {
    return "The AI system is currently experiencing highly elevated demand. Please click 'Extract Transactions Now' again in 5-10 seconds to retry.";
  }
  return errorMessage;
}

// Endpoint to extract OCR transaction tables from uploaded document(s)
app.post("/api/extract", async (req, res) => {
  try {
    const { fileBase64, mimeType, files } = req.body;

    const ai = getGeminiClient();

    let contentsParts: any[] = [];

    if (files && Array.isArray(files) && files.length > 0) {
      files.forEach((f: any) => {
        contentsParts.push({
          inlineData: {
            data: f.fileBase64,
            mimeType: f.mimeType,
          },
        });
      });
    } else if (fileBase64 && mimeType) {
      contentsParts.push({
        inlineData: {
          data: fileBase64,
          mimeType: mimeType,
        },
      });
    } else {
      return res.status(400).json({ error: "Missing uploaded statement file(s)." });
    }

    contentsParts.push({
      text: `You are an expert financial auditor and OCR assistant.
Analyze all of the provided bank statement documents completely and extract ALL actual individual transaction rows across all the files combined chronologically.

Requirements:
1. Extract ALL real transactions. Do not skip any rows that represent a debit, withdrawal, payment, purchase, credit, interest payment, transfer, deposit, fee, or salary.
2. Skip page headers, column header rows, totals, page number counters, carry-forward balance labels, deposit/withdrawal summaries widgets, and any other non-transaction rows.
3. Standardize dates to 'YYYY-MM-DD' format. If the statements only include month & day (e.g., 'Oct 15'), use statement indicators, header details or context to deduce the correct year. If the statement spans years (e.g. Dec 2025 to Jan 2026), ensure each row is assigned correct year. If no year can be inferred, default to 2026.
4. Extract transaction amounts carefully:
   - Debit, withdrawal, expense, fee, charge, purchase, money-out: MUST be output as a NEGATIVE number (e.g., -45.50)
   - Credit, deposit, interest credit, refund, transfer-in, salary, money-in: MUST be output as a POSITIVE number (e.g., 2500.00)
5. Keep transaction description matching the statement value (e.g. merchant name, wire transfer memo).
6. Auto-detect logical Category: 'groceries', 'dining', 'transport', 'salary', 'bills', 'entertainment', 'shopping', 'health', 'transfer', 'fees', 'or other'.
7. In notes, summarize the reason or add any auxiliary information found in the transaction line (e.g. "Purchase at Target").
8. Handle multi-page and multi-file documents by scanning all items and combining transaction tables chronologically.`,
    });

    let lastError: any = null;
    let response: any = null;
    // We try gemini-3.5-flash first, and fallback to gemini-3.1-flash-lite if the primary is experiencing high demands or temporary outages.
    const modelsToTry = ["gemini-3.5-flash", "gemini-3.1-flash-lite"];

    for (const modelToTry of modelsToTry) {
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          console.log(`[OCR Engine] Attempting extraction with model="${modelToTry}" (Attempt ${attempt}/2)...`);
          response = await ai.models.generateContent({
            model: modelToTry,
            contents: contentsParts,
            config: {
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    date: {
                      type: Type.STRING,
                      description: "The formatted transaction date in YYYY-MM-DD. MUST use YYYY-MM-DD.",
                    },
                    description: {
                      type: Type.STRING,
                      description: "Merchant name, reference description, or narrative text.",
                    },
                    amount: {
                      type: Type.NUMBER,
                      description: "Numerical monetary amount. MUST be negative for expenses/withdrawals, positive for income/deposits.",
                    },
                    category: {
                      type: Type.STRING,
                      description: "Auto-detected category, strictly lowercase. Options: groceries, dining, transport, salary, bills, entertainment, shopping, health, transfer, fees, other.",
                    },
                    notes: {
                      type: Type.STRING,
                      description: "Brief rationale or details (e.g. 'Spent at Walmart').",
                    },
                  },
                  required: ["date", "description", "amount", "category", "notes"],
                },
              },
            },
          });

          if (response && response.text) {
            console.log(`[OCR Engine] Success on model="${modelToTry}" during attempt ${attempt}!`);
            break;
          }
        } catch (err: any) {
          console.warn(`[OCR Engine] Model="${modelToTry}" attempt ${attempt} failed:`, err.message || err);
          lastError = err;
          // Introduce a short backoff pause before trying again
          await new Promise((resolve) => setTimeout(resolve, 1500));
        }
      }
      if (response && response.text) {
        break;
      }
    }

    if (!response || !response.text) {
      const cleanMsg = cleanGeminiErrorMessage(lastError?.message || "");
      console.error("[OCR Engine] All model retries and fallbacks were exhausted.");
      return res.status(503).json({
        error: cleanMsg || "All parsing limits were exhausted. Please wait 5 seconds and try clicking 'Extract' again.",
      });
    }

    const text = response.text;
    try {
      const transactions = JSON.parse(text);
      return res.json({ transactions });
    } catch (parseError) {
      console.error("Failed to parse JSON from Gemini output:", text);
      return res.status(500).json({
        error: "Failed to parse transactions JSON returned by the model.",
        rawResponse: text,
      });
    }
  } catch (error: any) {
    console.error("API Error during bank statement extraction:", error);
    const cleanMsg = cleanGeminiErrorMessage(error.message || "");
    return res.status(500).json({
      error: cleanMsg || "An unexpected error occurred during bank statement processing.",
    });
  }
});

// Configure Vite middleware in development or Express static in production
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Server] Core backend online. Server running on port ${PORT}`);
  });
}

startServer();
