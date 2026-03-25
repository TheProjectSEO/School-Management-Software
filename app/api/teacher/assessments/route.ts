import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { requireTeacher } from '@/lib/auth/requireTeacher'

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireTeacher()
    if (!authResult.success) {
      return authResult.response
    }

    const { teacherId } = authResult.teacher
    const supabase = createServiceClient()
    const { searchParams } = new URL(request.url)
    const courseId = searchParams.get('course_id')

    // Build query — flat select only (BUG-001: no FK joins)
    let query = supabase
      .from('assessments')
      .select('*')
      .eq('created_by', teacherId)
      .order('created_at', { ascending: false })

    if (courseId) {
      query = query.eq('course_id', courseId)
    }

    const { data: assessmentRows, error } = await query

    if (error) {
      console.error('Error fetching assessments:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Fetch course names separately
    const courseIds = [...new Set((assessmentRows || []).map((a: any) => a.course_id).filter(Boolean))]
    let courseMap = new Map<string, { id: string; name: string; subject_code: string | null }>()
    if (courseIds.length > 0) {
      const { data: courses } = await supabase
        .from('courses')
        .select('id, name, subject_code')
        .in('id', courseIds)
      courseMap = new Map((courses || []).map((c) => [c.id, c]))
    }

    const assessments = (assessmentRows || []).map((a: any) => ({
      ...a,
      course: courseMap.get(a.course_id) ?? null,
    }))

    return NextResponse.json({ assessments })
  } catch (error) {
    console.error('Error in GET /api/teacher/assessments:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireTeacher()
    if (!authResult.success) {
      return authResult.response
    }

    const { teacherId, schoolId } = authResult.teacher
    const supabase = createServiceClient()
    const body = await request.json()

    const {
      title,
      type,
      deped_component,
      course_id,
      lesson_id,
      module_id,
      section_id,
      grading_period_id,
      instructions,
      due_date,
      time_limit_minutes,
      max_attempts,
      total_points,
      status,
      questions,
      idempotency_key,
    } = body

    // Server-side idempotency: if client sent an idempotency_key, check for a recent duplicate
    if (idempotency_key) {
      const { data: existingByKey } = await supabase
        .from('assessments')
        .select('id, title, status')
        .eq('created_by', teacherId)
        .eq('idempotency_key', idempotency_key)
        .maybeSingle()
      if (existingByKey) {
        return NextResponse.json({ assessment: existingByKey }, { status: 200 })
      }
    }

    // Derive deped_component from type, validate explicit override
    const VALID_DEPED_COMPONENTS = ['written_work', 'performance_task', 'quarterly_assessment'] as const
    const derivedDepedComponent =
      ['essay', 'assignment'].includes(type)                                         ? 'written_work' :
      ['short_quiz', 'long_quiz', 'quiz', 'project', 'participation'].includes(type) ? 'performance_task' :
      ['exam', 'midterm', 'final'].includes(type)                                    ? 'quarterly_assessment' :
      'written_work'

    const resolvedDepedComponent =
      deped_component && VALID_DEPED_COMPONENTS.includes(deped_component as typeof VALID_DEPED_COMPONENTS[number])
        ? deped_component
        : derivedDepedComponent

    // Create assessment
    const insertData: Record<string, unknown> = {
      title,
      type,
      deped_component: resolvedDepedComponent,
      course_id,
      section_id,
      school_id: schoolId,
      instructions,
      due_date,
      time_limit_minutes,
      max_attempts,
      total_points,
      status: status || 'draft',
      created_by: teacherId,
    }
    if (lesson_id) insertData.lesson_id = lesson_id
    if (module_id) insertData.module_id = module_id
    if (grading_period_id) insertData.grading_period_id = grading_period_id
    if (idempotency_key) insertData.idempotency_key = idempotency_key

    const { data: assessment, error: assessmentError } = await supabase
      .from('assessments')
      .insert(insertData)
      .select()
      .single()

    if (assessmentError) {
      console.error('Error creating assessment:', assessmentError)
      return NextResponse.json({ error: assessmentError.message }, { status: 500 })
    }

    // If questions are provided, create them
    if (questions && questions.length > 0) {
      const questionsToInsert = questions.map((q: any, index: number) => ({
        assessment_id: assessment.id,
        question_text: q.question_text,
        question_type: q.question_type || 'multiple_choice',
        choices_json: q.choices_json || null,
        answer_key_json: q.answer_key_json || null,
        points: q.points || 1,
        order_index: q.order_index !== undefined ? q.order_index : (q.order !== undefined ? q.order : index),
        explanation: q.explanation || null,
      }))

      const { error: questionsError } = await supabase
        .from('teacher_assessment_questions')
        .insert(questionsToInsert)

      if (questionsError) {
        console.error('Error creating questions:', questionsError)
        // Rollback assessment creation
        await supabase
          .from('assessments')
          .delete()
          .eq('id', assessment.id)

        return NextResponse.json({ error: questionsError.message }, { status: 500 })
      }
    }

    return NextResponse.json({ assessment }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/teacher/assessments:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
