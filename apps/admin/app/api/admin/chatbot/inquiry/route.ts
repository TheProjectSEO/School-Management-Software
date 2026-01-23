import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { callOpenAIChatCompletions } from "@/lib/ai/openai";

/**
 * POST /api/admin/chatbot/inquiry
 * AI-powered chatbot for handling parent/prospective student inquiries
 *
 * Handles common questions about:
 * - Admissions process and requirements
 * - Programs and curriculum
 * - Tuition and fees
 * - Schedules and academic calendar
 * - Facilities and extracurriculars
 * - Contact information
 *
 * Features:
 * - Context-aware responses based on school data
 * - Escalation to human staff for complex queries
 * - Conversation history tracking
 * - Suggested follow-up questions
 */

interface InquiryChatRequest {
  message: string;
  conversation_id?: string;
  visitor_info?: {
    name?: string;
    email?: string;
    phone?: string;
  };
  context?: {
    interested_grade?: string;
    interested_program?: string;
  };
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: InquiryChatRequest = await request.json();
    const { message, conversation_id, visitor_info, context } = body;

    if (!message || message.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "Message is required" },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Fetch school information for context
    const { data: school } = await supabase
      .from("schools")
      .select("name, region, division")
      .limit(1)
      .single();

    // Fetch available programs/sections
    const { data: sections } = await supabase
      .from("sections")
      .select("name, grade_level")
      .order("grade_level");

    // Get unique grade levels
    const gradeLevels = [...new Set((sections || []).map(s => s.grade_level))].filter(Boolean);

    // Build conversation history (if conversation_id provided)
    let conversationHistory: ChatMessage[] = [];
    if (conversation_id) {
      // In production, you would fetch this from a conversations table
      // For now, we'll work with just the current message
    }

    // Build the system prompt with school context
    const systemPrompt = buildSystemPrompt({
      schoolName: school?.name || "Our School",
      region: school?.region,
      gradeLevels,
      visitorName: visitor_info?.name,
    });

    // Build the user prompt
    const userPrompt = buildUserPrompt(message, context);

    // Get AI response
    const completion = await callOpenAIChatCompletions({
      messages: [
        { role: "system", content: systemPrompt },
        ...conversationHistory.map(m => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 800,
    });

    const content = completion.choices?.[0]?.message?.content?.trim();
    if (!content) {
      return NextResponse.json(
        { success: false, error: "AI did not return a response" },
        { status: 500 }
      );
    }

    // Parse the AI response
    let response;
    try {
      response = JSON.parse(content);
    } catch {
      // If not JSON, treat as plain text
      response = {
        message: content,
        needs_escalation: false,
        confidence: 70,
        suggested_questions: [],
      };
    }

    // Determine if escalation is needed
    const needsEscalation = response.needs_escalation ||
      response.confidence < 50 ||
      containsEscalationTriggers(message);

    // Store the conversation (optional - for future conversation tracking)
    const newConversationId = conversation_id || generateConversationId();

    return NextResponse.json({
      success: true,
      response: {
        message: response.message || content,
        needs_escalation: needsEscalation,
        escalation_reason: needsEscalation ? response.escalation_reason || "Complex inquiry requiring staff attention" : null,
        confidence: response.confidence || 70,
        suggested_questions: response.suggested_questions || generateSuggestedQuestions(message),
        category: response.category || categorizeInquiry(message),
      },
      conversation_id: newConversationId,
      metadata: {
        responded_at: new Date().toISOString(),
        model_used: "gpt-4o",
      },
    });
  } catch (error) {
    console.error("Inquiry chatbot error:", error);
    return NextResponse.json(
      { success: false, error: "An error occurred processing your inquiry" },
      { status: 500 }
    );
  }
}

function buildSystemPrompt(context: {
  schoolName: string;
  region?: string;
  gradeLevels: string[];
  visitorName?: string;
}): string {
  return `You are a helpful, friendly admissions assistant for ${context.schoolName}${context.region ? ` in ${context.region}` : ''}.

Your role is to:
1. Answer common questions about the school clearly and helpfully
2. Guide prospective parents/students through the admissions process
3. Provide accurate information about programs, fees, and requirements
4. Be warm and welcoming while remaining professional
5. Escalate complex or sensitive queries to human staff

Available Grade Levels: ${context.gradeLevels.join(", ") || "Various grade levels"}
${context.visitorName ? `Speaking with: ${context.visitorName}` : ''}

Guidelines:
- Be concise but thorough (2-3 paragraphs max)
- Use a friendly, approachable tone
- If unsure, acknowledge it and offer to connect with staff
- Always suggest next steps when appropriate
- For fee/tuition questions, provide general ranges and direct to admissions for specifics

Return your response as JSON:
{
  "message": "<your helpful response>",
  "needs_escalation": <true if needs human staff>,
  "escalation_reason": "<why escalation needed, if applicable>",
  "confidence": <0-100 confidence level>,
  "category": "<admissions|programs|fees|schedule|facilities|general>",
  "suggested_questions": ["<follow-up question 1>", "<follow-up question 2>"]
}`;
}

function buildUserPrompt(message: string, context?: { interested_grade?: string; interested_program?: string }): string {
  let prompt = message;

  if (context) {
    const contextParts: string[] = [];
    if (context.interested_grade) {
      contextParts.push(`Interested in: ${context.interested_grade}`);
    }
    if (context.interested_program) {
      contextParts.push(`Program interest: ${context.interested_program}`);
    }
    if (contextParts.length > 0) {
      prompt += `\n\n[Context: ${contextParts.join(", ")}]`;
    }
  }

  return prompt;
}

function containsEscalationTriggers(message: string): boolean {
  const triggers = [
    "complaint",
    "refund",
    "urgent",
    "emergency",
    "lawyer",
    "legal",
    "speak to manager",
    "supervisor",
    "human",
    "real person",
    "not helpful",
    "frustrated",
    "angry",
    "scholarship exception",
    "special case",
    "medical",
    "disability",
    "accommodation",
  ];

  const lowerMessage = message.toLowerCase();
  return triggers.some(trigger => lowerMessage.includes(trigger));
}

function categorizeInquiry(message: string): string {
  const lowerMessage = message.toLowerCase();

  if (/admission|apply|application|enroll|requirement|document/i.test(lowerMessage)) {
    return "admissions";
  }
  if (/program|curriculum|subject|course|track|stem|abm|humss/i.test(lowerMessage)) {
    return "programs";
  }
  if (/fee|tuition|payment|cost|price|scholarship|discount/i.test(lowerMessage)) {
    return "fees";
  }
  if (/schedule|calendar|semester|start|end|holiday|break/i.test(lowerMessage)) {
    return "schedule";
  }
  if (/facility|campus|building|lab|library|gym|cafeteria/i.test(lowerMessage)) {
    return "facilities";
  }
  if (/activity|club|sport|extracurricular|event/i.test(lowerMessage)) {
    return "activities";
  }

  return "general";
}

function generateSuggestedQuestions(message: string): string[] {
  const category = categorizeInquiry(message);

  const questionSets: Record<string, string[]> = {
    admissions: [
      "What documents do I need to submit?",
      "What is the admission deadline?",
      "How can I schedule a campus tour?",
    ],
    programs: [
      "What tracks/strands are available?",
      "What subjects are included in the curriculum?",
      "Are there special programs or honors classes?",
    ],
    fees: [
      "Are there payment plan options?",
      "What scholarships are available?",
      "Are there any additional fees besides tuition?",
    ],
    schedule: [
      "What are the school hours?",
      "When does the school year start?",
      "What is the daily schedule like?",
    ],
    facilities: [
      "Can I visit the campus?",
      "What facilities are available for students?",
      "Is there a school bus service?",
    ],
    activities: [
      "What clubs are available?",
      "Are there sports teams?",
      "What events does the school organize?",
    ],
    general: [
      "How can I learn more about the school?",
      "Can I speak with current parents?",
      "What makes this school unique?",
    ],
  };

  return questionSets[category] || questionSets.general;
}

function generateConversationId(): string {
  return `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
