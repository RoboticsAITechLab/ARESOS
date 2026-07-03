import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req: NextRequest) {
  try {
    const { userText, solveResult, variables, chatMessages } = await req.json();

    // 1. Request Validation
    if (!userText || !solveResult) {
      return NextResponse.json({ error: "Missing required chat parameters" }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Gemini API key is not configured on the server" }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // Format chat history context for persistent memory
    const historyContext = (chatMessages || [])
      .map((m: any) => `${m.sender === "user" ? "Student" : "Tutor"}: ${m.text}`)
      .join("\n");

    const prompt = `
    You are ARES AI, a friendly and world-class mathematics and physics tutor. 
    The student is studying the following equation/calculation drawn on their whiteboard notes app:
    - Equation: ${solveResult.equation}
    - Solving Output: ${solveResult.result}
    - Solution Steps: ${JSON.stringify(solveResult.steps)}
    
    Variables currently defined in memory: ${JSON.stringify(variables || {})}

    Conversation History:
    ${historyContext}

    Current Student Input:
    "${userText}"

    Instructions:
    1. Auto-detect the language of the student. If the student speaks in Hindi (or any other language), respond in that language.
    2. PERSISTENT LANGUAGE: If the student previously established a specific language (like explaining in Hindi, etc.), keep replying in that language until they request to change it.
    3. CANVAS INTERACTION: If the student asks you to solve on the canvas/board, write/draw on the whiteboard, or show steps on the notebook (e.g. "canvas notebook me solve karke batao", "draw on canvas", "write the solution on board"), you must trigger a canvas action.
       To trigger a canvas action, output a JSON object matching this structure:
       {
         "reply": "A friendly message explaining that you've written the step on the board.",
         "action": {
           "type": "drawText",
           "text": "Equation/value/formula to write directly on the canvas notebook"
         }
       }
       Otherwise, if no writing on the canvas is needed, return:
       {
         "reply": "Friendly explanation response text",
         "action": null
       }
    
    Return ONLY raw JSON. Do not write markdown blocks (like \`\`\`json) or extra text.`;

    const result = await model.generateContent(prompt);
    const rawText = result.response.text().trim();
    const cleanJson = rawText.replace(/^```json/i, "").replace(/```$/i, "").trim();

    // Verify it parses correctly
    const parsed = JSON.parse(cleanJson);
    return NextResponse.json(parsed);

  } catch (err: any) {
    console.error("[API Chat Error]:", err);
    const errStr = String(err.message || "");

    const is429 = errStr.includes("429") || errStr.toLowerCase().includes("quota") || errStr.toLowerCase().includes("rate limit") || err.status === 429;
    
    if (is429) {
      const secondsMatch = errStr.match(/retry in ([\d\.]+)s/i);
      const retryAfter = secondsMatch ? parseFloat(secondsMatch[1]) : 30;
      
      return NextResponse.json({
        error: "Rate limit exceeded",
        retryAfter: retryAfter,
        message: "AI Tutor rate limit reached."
      }, { status: 429 });
    }

    return NextResponse.json({
      error: "AI Tutor query failed",
      message: err.message || "An unexpected error occurred."
    }, { status: 500 });
  }
}
