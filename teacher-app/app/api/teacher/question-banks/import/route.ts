// @ts-nocheck - Uses n8n_content_creation schema with complex queries
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireTeacher } from "@/lib/auth/requireTeacher";

interface ImportRow {
  type: string;
  prompt: string;
  options?: string; // JSON string for multiple choice
  correctAnswer?: string; // JSON string or simple value
  explanation?: string;
  points?: number;
  difficulty?: string;
  tags?: string; // Comma-separated
}

/**
 * POST /api/teacher/question-banks/import
 * Import questions from CSV/JSON to a question bank
 */
export async function POST(request: NextRequest) {
  const authResult = await requireTeacher();
  if (!authResult.success) {
    return authResult.response;
  }

  const { teacherId } = authResult.context;

  try {
    const supabase = await createClient();
    const body = await request.json();

    const { bankId, questions, format } = body;

    if (!bankId) {
      return NextResponse.json(
        { error: "Bank ID is required" },
        { status: 400 }
      );
    }

    if (!Array.isArray(questions) || questions.length === 0) {
      return NextResponse.json(
        { error: "Questions array is required and cannot be empty" },
        { status: 400 }
      );
    }

    // Verify bank exists and teacher has access
    const { data: bank } = await supabase
      .from("teacher_question_banks")
      .select("subject_id")
      .eq("id", bankId)
      .single();

    if (!bank) {
      return NextResponse.json(
        { error: "Question bank not found" },
        { status: 404 }
      );
    }

    // Verify teacher has access
    const { data: sectionSubject } = await supabase
      .from("teacher_assignments")
      .select("id")
      .eq("subject_id", bank.subject_id)
      .eq("teacher_id", teacherId)
      .limit(1)
      .single();

    if (!sectionSubject) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Process and validate each question
    const validQuestions: any[] = [];
    const errors: { row: number; error: string }[] = [];

    for (let i = 0; i < questions.length; i++) {
      const row = questions[i] as ImportRow;
      const rowNum = i + 1;

      try {
        // Validate required fields
        if (!row.type) {
          errors.push({ row: rowNum, error: "Missing question type" });
          continue;
        }

        if (!row.prompt?.trim()) {
          errors.push({ row: rowNum, error: "Missing question prompt" });
          continue;
        }

        // Normalize type
        const type = normalizeQuestionType(row.type);
        if (!type) {
          errors.push({ row: rowNum, error: `Invalid question type: ${row.type}` });
          continue;
        }

        // Parse options for multiple choice
        let choicesJson = null;
        if (["multiple_choice_single", "multiple_choice_multi"].includes(type)) {
          if (!row.options) {
            errors.push({ row: rowNum, error: "Multiple choice questions require options" });
            continue;
          }

          try {
            // Try to parse as JSON, otherwise split by delimiter
            if (row.options.startsWith("[")) {
              choicesJson = JSON.parse(row.options);
            } else {
              // Split by | or ;
              choicesJson = row.options.split(/[|;]/).map((opt) => opt.trim());
            }
          } catch (e) {
            errors.push({ row: rowNum, error: "Invalid options format" });
            continue;
          }
        }

        // Parse answer key
        let answerKeyJson = null;
        if (row.correctAnswer) {
          try {
            if (row.correctAnswer.startsWith("[") || row.correctAnswer.startsWith("{")) {
              answerKeyJson = JSON.parse(row.correctAnswer);
            } else if (type === "true_false") {
              answerKeyJson = row.correctAnswer.toLowerCase() === "true";
            } else if (["multiple_choice_single", "multiple_choice_multi"].includes(type)) {
              // Could be index (0, 1, 2) or letter (A, B, C) or actual answer text
              const answer = row.correctAnswer.trim();
              if (/^\d+$/.test(answer)) {
                answerKeyJson = parseInt(answer, 10);
              } else if (/^[A-Za-z]$/.test(answer)) {
                answerKeyJson = answer.toUpperCase().charCodeAt(0) - 65;
              } else {
                answerKeyJson = answer;
              }
            } else {
              answerKeyJson = row.correctAnswer;
            }
          } catch (e) {
            errors.push({ row: rowNum, error: "Invalid answer format" });
            continue;
          }
        }

        // Parse tags
        let tagsJson: string[] = [];
        if (row.tags) {
          tagsJson = row.tags.split(",").map((t) => t.trim()).filter((t) => t);
        }

        // Validate difficulty
        const difficulty = normalizeDifficulty(row.difficulty);

        // Create question object
        validQuestions.push({
          bank_id: bankId,
          type,
          prompt: row.prompt.trim(),
          choices_json: choicesJson,
          answer_key_json: answerKeyJson,
          explanation: row.explanation?.trim() || null,
          points: row.points || 1,
          difficulty,
          tags_json: tagsJson,
        });
      } catch (e) {
        errors.push({ row: rowNum, error: "Failed to parse row" });
      }
    }

    // Insert valid questions
    let imported = 0;
    if (validQuestions.length > 0) {
      const { data: insertedQuestions, error: insertError } = await supabase
        .from("teacher_assessment_questions")
        .insert(validQuestions)
        .select();

      if (insertError) {
        console.error("Error inserting questions:", insertError);
        return NextResponse.json(
          { error: "Failed to import questions" },
          { status: 500 }
        );
      }

      imported = insertedQuestions?.length || 0;
    }

    return NextResponse.json({
      success: true,
      imported,
      failed: errors.length,
      errors: errors.slice(0, 50), // Limit error output
      total: questions.length,
    });
  } catch (error) {
    console.error("Question import error:", error);
    return NextResponse.json(
      { error: "An error occurred during import" },
      { status: 500 }
    );
  }
}

// Helper function to normalize question type
function normalizeQuestionType(type: string): string | null {
  const normalized = type.toLowerCase().replace(/[\s_-]+/g, "_");

  const typeMap: Record<string, string> = {
    "multiple_choice": "multiple_choice_single",
    "multiple_choice_single": "multiple_choice_single",
    "multiplechoice": "multiple_choice_single",
    "mc": "multiple_choice_single",
    "single": "multiple_choice_single",

    "multiple_choice_multi": "multiple_choice_multi",
    "multi_select": "multiple_choice_multi",
    "multiselect": "multiple_choice_multi",
    "multi": "multiple_choice_multi",
    "checkbox": "multiple_choice_multi",

    "true_false": "true_false",
    "truefalse": "true_false",
    "tf": "true_false",
    "boolean": "true_false",

    "short_answer": "short_answer",
    "shortanswer": "short_answer",
    "short": "short_answer",
    "text": "short_answer",

    "essay": "essay",
    "long_answer": "essay",
    "longanswer": "essay",
    "paragraph": "essay",

    "matching": "matching",
    "match": "matching",

    "fill_in_blank": "fill_in_blank",
    "fillinblank": "fill_in_blank",
    "fill_blank": "fill_in_blank",
    "fib": "fill_in_blank",
    "blank": "fill_in_blank",
  };

  return typeMap[normalized] || null;
}

// Helper function to normalize difficulty
function normalizeDifficulty(difficulty?: string): string {
  if (!difficulty) return "medium";

  const normalized = difficulty.toLowerCase().trim();

  if (["easy", "simple", "basic", "1", "low"].includes(normalized)) {
    return "easy";
  }
  if (["medium", "moderate", "normal", "2", "mid"].includes(normalized)) {
    return "medium";
  }
  if (["hard", "difficult", "advanced", "3", "high"].includes(normalized)) {
    return "hard";
  }

  return "medium";
}
