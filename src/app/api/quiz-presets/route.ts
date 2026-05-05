import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  sanitizeStringInput,
  validateEnum,
  validateNumber,
} from "@/lib/auth/input-validation";

export const dynamic = "force-dynamic";

/**
 * GET /api/quiz-presets?locale=fr
 * Fetch all presets for a given locale.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const locale = validateEnum(searchParams.get("locale"), ["fr", "es"]) || "fr";
    const limitRaw = searchParams.get("limit");
    const limit = limitRaw ? validateNumber(parseInt(limitRaw, 10), 1, 100) : null;

    let query = supabase
      .from("quiz_presets")
      .select("*")
      .eq("locale", locale)
      .order("created_at", { ascending: false });

    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error("[QuizPresets] Fetch error:", error.message);
      return NextResponse.json({ error: "Failed to fetch presets" }, { status: 500 });
    }

    return NextResponse.json({ presets: data });
  } catch (error) {
    console.error("[QuizPresets] GET error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/**
 * POST /api/quiz-presets
 * Create a new quiz preset.
 */
export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      return NextResponse.json(
        { error: "Content-Type must be application/json" },
        { status: 400 },
      );
    }

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 },
      );
    }

    const name = sanitizeStringInput(body.name, 100);
    const mode = validateEnum(body.mode, [
      "classic", "vocabulary", "expressions", "conjugation", "discovery", "custom",
    ]);
    const format = validateEnum(body.format, ["qcm", "translation", "mixed"]);
    const direction = validateEnum(body.direction, ["fr-to-es", "es-to-fr"]);
    const locale = validateEnum(body.locale, ["fr", "es"]);
    const questionCount = validateNumber(body.question_count, 1, 50) || 10;
    const category = sanitizeStringInput(body.category, 100) || null;
    const tense = sanitizeStringInput(body.tense, 50) || null;
    const pronoun = sanitizeStringInput(body.pronoun, 50) || null;
    const verbGroup = sanitizeStringInput(body.verb_group, 50) || null;
    const prompt = sanitizeStringInput(body.prompt, 1000) || null;

    if (!name || !mode || !format || !direction || !locale) {
      return NextResponse.json(
        { error: "Missing required fields: name, mode, format, direction, locale" },
        { status: 400 },
      );
    }

    const supabase = await createClient();

    const { data, error } = await supabase
      .from("quiz_presets")
      .insert({
        name,
        mode,
        format,
        question_count: questionCount,
        category,
        direction,
        tense,
        pronoun,
        verb_group: verbGroup,
        prompt,
        locale,
      })
      .select()
      .single();

    if (error) {
      console.error("[QuizPresets] Create error:", error.message);
      return NextResponse.json({ error: "Failed to create preset" }, { status: 500 });
    }

    return NextResponse.json({ preset: data });
  } catch (error) {
    console.error("[QuizPresets] POST error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/**
 * PUT /api/quiz-presets
 * Rename a quiz preset.
 */
export async function PUT(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      return NextResponse.json(
        { error: "Content-Type must be application/json" },
        { status: 400 },
      );
    }

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 },
      );
    }

    const id = sanitizeStringInput(body.id, 100);
    const name = sanitizeStringInput(body.name, 100);

    if (!id || !name) {
      return NextResponse.json(
        { error: "Missing required fields: id, name" },
        { status: 400 },
      );
    }

    const supabase = await createClient();

    const { data, error } = await supabase
      .from("quiz_presets")
      .update({ name })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("[QuizPresets] Rename error:", error.message);
      return NextResponse.json({ error: "Failed to rename preset" }, { status: 500 });
    }

    return NextResponse.json({ preset: data });
  } catch (error) {
    console.error("[QuizPresets] PUT error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/**
 * DELETE /api/quiz-presets?id=xxx
 * Delete a quiz preset by ID.
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const id = sanitizeStringInput(searchParams.get("id"), 100);

    if (!id) {
      return NextResponse.json({ error: "Missing preset ID" }, { status: 400 });
    }

    const { error } = await supabase
      .from("quiz_presets")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("[QuizPresets] Delete error:", error.message);
      return NextResponse.json({ error: "Failed to delete preset" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[QuizPresets] DELETE error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
