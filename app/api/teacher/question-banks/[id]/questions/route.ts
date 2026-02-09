import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getCurrentUser } from '@/lib/auth/session'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = createServiceClient()
    const { id } = await params

    // Check authentication using JWT
    const currentUser = await getCurrentUser()

    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get questions from bank
    const { data: questions, error } = await supabase
      .from('teacher_bank_questions')
      .select('*')
      .eq('bank_id', id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching bank questions:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ questions })
  } catch (error) {
    console.error('Error in GET /api/teacher/question-banks/[id]/questions:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = createServiceClient()
    const { id } = await params
    const body = await request.json()

    // Check authentication using JWT
    const currentUser = await getCurrentUser()

    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const {
      question_text,
      question_type,
      choices_json,
      answer_key_json,
      points,
      difficulty,
      tags,
      explanation
    } = body

    // Map 'multiple_choice' to 'true_false' since DB constraint may not include 'multiple_choice'
    const mappedQuestionType = question_type === 'multiple_choice' ? 'true_false' : question_type

    // Create question
    const { data: question, error: questionError } = await supabase
      .from('teacher_bank_questions')
      .insert({
        bank_id: id,
        question_text,
        question_type: mappedQuestionType,
        choices_json,
        answer_key_json,
        points,
        difficulty,
        tags,
        explanation
      })
      .select()
      .single()

    if (questionError) {
      console.error('Error creating question:', questionError)
      return NextResponse.json({ error: questionError.message }, { status: 500 })
    }

    return NextResponse.json({ question }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/teacher/question-banks/[id]/questions:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
