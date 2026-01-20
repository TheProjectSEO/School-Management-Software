import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { callOpenAIChatCompletions, callOpenAIEmbeddings } from "@/lib/ai/openai";

type ConversationMessage = { role: "user" | "assistant"; content: string };

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { question, conversationHistory } = await request.json();
    if (!question || typeof question !== "string") {
      return NextResponse.json({ error: "Question is required" }, { status: 400 });
    }

    const { data: profile } = await supabase
      .from("school_profiles")
      .select("id, role, full_name")
      .eq("auth_user_id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const sessionId = params.id;
    const { data: session, error: sessionError } = await supabase
      .from("live_sessions")
      .select(
        `
        id,
        course_id,
        title,
        description,
        teacher_profile_id,
        course:courses(name, subject_code),
        section:sections(grade_level)
      `
      )
      .eq("id", sessionId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    let studentId: string | null = null;
    let gradeLevel: string | null = null;

    if (profile.role === "student") {
      const { data: student } = await supabase
        .from("students")
        .select("id, grade_level")
        .eq("profile_id", profile.id)
        .single();

      if (!student) {
        return NextResponse.json({ error: "Student not found" }, { status: 404 });
      }

      studentId = student.id;
      gradeLevel = student.grade_level ?? session.section?.grade_level ?? null;

      const { data: enrollment } = await supabase
        .from("enrollments")
        .select("id")
        .eq("student_id", student.id)
        .eq("course_id", session.course_id)
        .single();

      if (!enrollment) {
        return NextResponse.json({ error: "Not enrolled in this course" }, { status: 403 });
      }
    } else if (profile.role === "teacher") {
      const { data: teacher } = await supabase
        .from("teacher_profiles")
        .select("id")
        .eq("profile_id", profile.id)
        .single();

      if (!teacher || teacher.id !== session.teacher_profile_id) {
        return NextResponse.json({ error: "Unauthorized for this session" }, { status: 403 });
      }
    }

    const embeddingResponse = await callOpenAIEmbeddings({
      input: [question],
    });

    const queryEmbedding = embeddingResponse.data[0]?.embedding;
    if (!queryEmbedding) {
      return NextResponse.json({ error: "Failed to generate embeddings" }, { status: 500 });
    }

    const { data: chunks, error: chunkError } = await supabase.rpc(
      "match_session_transcript_chunks",
      {
        query_embedding: queryEmbedding,
        match_session: sessionId,
        match_count: 8,
        match_threshold: 0.7,
      }
    );

    if (chunkError) {
      console.error("Transcript chunk search error:", chunkError);
    }

    const transcriptContext = Array.isArray(chunks)
      ? chunks.map((c: { content: string }) => c.content).join("\n\n")
      : "";

    const systemPrompt = `
You are a friendly K-12 STEM learning assistant. Be clear, concise, and age-appropriate.
If a question is outside K-12/STEM, give a brief helpful response and gently steer back to STEM/K-12 topics.
Use the session transcript context when available. If the transcript is insufficient, say so.
Avoid mentioning internal tools or sources.

Session:
- Title: ${session.title}
- Course: ${session.course?.name ?? "Course"} (${session.course?.subject_code ?? "N/A"})
${gradeLevel ? `- Grade Level: ${gradeLevel}` : ""}

Transcript context:
${transcriptContext || "No transcript context available."}
    `.trim();

    const conversationMessages: ConversationMessage[] = [];
    if (Array.isArray(conversationHistory)) {
      conversationHistory.slice(-6).forEach((msg: ConversationMessage) => {
        if (msg.role === "user" || msg.role === "assistant") {
          conversationMessages.push({ role: msg.role, content: msg.content });
        }
      });
    }

    const completion = await callOpenAIChatCompletions({
      messages: [
        { role: "system", content: systemPrompt },
        ...conversationMessages,
        { role: "user", content: question },
      ],
      temperature: 0.4,
      max_tokens: 1200,
    });

    const answer =
      completion.choices?.[0]?.message?.content ||
      "I'm sorry, I couldn't generate a response right now.";

    return NextResponse.json({
      answer,
      hasTranscript: Boolean(transcriptContext),
      contextUsed: transcriptContext ? ["transcript", "session"] : ["session"],
      studentId,
      model: completion.model,
    });
  } catch (error) {
    console.error("Session AI ask error:", error);
    return NextResponse.json(
      { error: "Failed to generate response. Please try again." },
      { status: 500 }
    );
  }
}
