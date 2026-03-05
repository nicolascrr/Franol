import { NextRequest, NextResponse } from "next/server";
import { getFunFactPrompts, getRandomFactType } from "@/lib/prompts";
import type { Locale } from "@/lib/prompts";

const OPENAI_API_KEY = process.env.API_KEY;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const excludeParam = searchParams.get("exclude") || "";
    const locale = (searchParams.get("locale") || "fr") as Locale;
    const excludeKeywords = excludeParam
      ? excludeParam.split(",").slice(-5)
      : [];

    const factType = getRandomFactType();

    // Utiliser les prompts centralisés
    const { system: systemPrompt, user: userPrompt } = getFunFactPrompts(
      locale,
      {
        factType,
        excludeKeywords,
      },
    );

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.5,
        max_tokens: 200,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("OpenAI API error:", response.status, errorData);
      return NextResponse.json({ error: "API error" }, { status: 500 });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      console.error("No content in response:", JSON.stringify(data));
      return NextResponse.json({ error: "No content" }, { status: 500 });
    }

    let jsonContent = content.trim();
    if (jsonContent.startsWith("```")) {
      jsonContent = jsonContent
        .replace(/```json?\n?/g, "")
        .replace(/```$/g, "");
    }

    const factData = JSON.parse(jsonContent.trim());

    return NextResponse.json({
      fact: factData.fact,
      type: factData.type || factType,
      keyword: factData.keyword || "",
    });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
