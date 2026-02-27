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

    // Build query
    let query = supabase
      .from('assessments')
      .select(`
        *,
        courses:course_id (
          id,
          name,
          subject_code
        )
      `)
      .eq('created_by', teacherId)
      .order('created_at', { ascending: false })

    if (courseId) {
      query = query.eq('course_id', courseId)
    }

    const { data: assessments, error } = await query

    if (error) {
      console.error('Error fetching assessments:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

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
      section_id,
      grading_period_id,
      instructions,
      due_date,
      time_limit_minutes,
      max_attempts,
      total_points,
      status,
      questions
    } = body

    // Derive deped_component from type if not explicitly provided
    const resolvedDepedComponent = deped_component ?? (
      ['quiz', 'assignment', 'exam'].includes(type)     ? 'written_work' :
      ['project', 'participation'].includes(type)        ? 'performance_task' :
      ['midterm', 'final'].includes(type)                ? 'quarterly_assessment' :
      'written_work'
    )

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
      created_by: teacherId
    }
    if (lesson_id) insertData.lesson_id = lesson_id
    if (grading_period_id) insertData.grading_period_id = grading_period_id

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
        order_index: q.order_index !== undefined ? q.order_index : (q.order !== undefined ? q.order : index)
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
