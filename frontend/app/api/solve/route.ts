import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import crypto from "crypto";

// Server-side caching (TTL: 24 Hours)
const solveCache = new Map<string, { result: any; timestamp: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000;

// Server-side Request Lock
let isRequestLocked = false;

export async function POST(req: NextRequest) {
  // 1. Request Lock Check
  if (isRequestLocked) {
    return NextResponse.json({
      success: false,
      error: "Request already running"
    }, { status: 409 });
  }

  isRequestLocked = true;

  try {
    const { image, variables, localText } = await req.json();

    if (!image) {
      isRequestLocked = false;
      return NextResponse.json({ error: "Missing canvas image data" }, { status: 400 });
    }

    // 2. Cache Key Generation (MD5 of Image Base64)
    const imageHash = crypto.createHash("md5").update(image).digest("hex");
    const cached = solveCache.get(imageHash);
    
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log("[AI] Cache Hit");
      isRequestLocked = false;
      return NextResponse.json({
        ...cached.result,
        _log: "[AI] Cache Hit"
      });
    }

    // 3. Contacting AI Engine (Gemini 2.5 Flash as final fallback)
    const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) {
      isRequestLocked = false;
      return NextResponse.json({ error: "Gemini API key is not configured on the server" }, { status: 500 });
    }

    console.log("[AI] Gemini Request Initiated");
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `Analyze this mathematical/scientific canvas representing a hand-drawn or typed equation. Solve it step-by-step.
    
    Keep track of variables. If the user defines variables (like 'x = 10', 'a = 5', or 'y = sin(x - t)'), record them and use them to solve subsequent calculations in the image.
    Note: The variable 't' is reserved for time based animations in the graph, so equations containing 't' should output a javascript-evaluable string representing it in 'graphableFunction' (e.g. 'Math.sin(x - t)').
    
    Variables currently in memory: ${JSON.stringify(variables || {})}

    Return ONLY a JSON object matching this structure:
    {
      "equation": "the recognized equation in plain text or clean format",
      "steps": [
        { "explanation": "Brief explanation of this step", "math": "Formula or value for this step if applicable" }
      ],
      "result": "The final numerical or simplified answer",
      "graphableFunction": "If the equation represents a function of x (and optionally t for animation), output a javascript-evaluable string representing it (e.g. 'x * x', 'Math.sin(x - t)', 'Math.cos(x) * Math.sin(t)'). Otherwise, return null",
      "variables": {
        "varName": "value"
      }
    }

    Do not include markdown wrappers (like \`\`\`json) or extra text. Return raw JSON.`;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: image,
          mimeType: "image/png",
        },
      },
    ]);

    const rawText = result.response.text().trim();
    const cleanJson = rawText.replace(/^```json/i, "").replace(/```$/i, "").trim();
    const parsed = JSON.parse(cleanJson);

    const responseData = {
      ...parsed,
      _log: "[AI] Gemini Success"
    };

    // Cache the successful Gemini solve
    solveCache.set(imageHash, { result: responseData, timestamp: Date.now() });

    isRequestLocked = false;
    return NextResponse.json(responseData);

  } catch (err: any) {
    isRequestLocked = false;
    console.error("[API Solve Error]:", err);
    const errStr = String(err.message || "");

    // Check if it is a 429 Quota Exceeded Rate Limit
    const is429 = errStr.includes("429") || errStr.toLowerCase().includes("quota") || errStr.toLowerCase().includes("rate limit") || err.status === 429;
    
    if (is429) {
      // Parse retry delay dynamically (e.g., "retry in 25.4s")
      const secondsMatch = errStr.match(/retry in ([\d\.]+)s/i);
      const retryAfter = secondsMatch ? parseFloat(secondsMatch[1]) : 30; // default to 30s
      
      return NextResponse.json({
        success: false,
        rateLimited: true,
        retryAfter: retryAfter,
        message: "Gemini API quota exceeded."
      }, { status: 429 });
    }

    return NextResponse.json({
      success: false,
      error: "Failed to solve equation",
      message: err.message || "Unknown error."
    }, { status: 500 });
  }
}
