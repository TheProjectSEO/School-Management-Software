import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getTeacherProfile } from '@/lib/dal/teacher'

interface WeightEntry {
  course_id: string
  grading_period_id?: string
  assessment_type: string
  weight_percent: number
  drop_lowest: number
}

/**
 * POST /api/teacher/gradebook/weights
 * Save grade weight configuration for a course
 */
export async function POST(request: NextRequest) {
  try {
    // Get authenticated teacher
    const teacherProfile = await getTeacherProfile()
    if (!teacherProfile) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { courseId, periodId, weights } = body as {
      courseId: string
      periodId?: string
      weights: WeightEntry[]
    }

    if (!courseId || !weights || !Array.isArray(weights)) {
      return NextResponse.json(
        { error: 'Missing required fields: courseId, weights' },
        { status: 400 }
      )
    }

    // Validate weights sum to 100%
    const totalWeight = weights.reduce((sum, w) => sum + w.weight_percent, 0)
    if (Math.abs(totalWeight - 100) > 0.01) {
      return NextResponse.json(
        { error: 'Weights must sum to 100%' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Verify teacher has access to this course
    const { count: accessCount } = await supabase
      .from('teacher_assignments')
      .select('*', { count: 'exact', head: true })
      .eq('teacher_profile_id', teacherProfile.id)
      .eq('course_id', courseId)

    if (!accessCount || accessCount === 0) {
      return NextResponse.json(
        { error: 'You do not have access to this course' },
        { status: 403 }
      )
    }

    // Delete existing weights for this course/period
    let deleteQuery = supabase
      .from('grade_weight_configs')
      .delete()
      .eq('course_id', courseId)

    if (periodId) {
      deleteQuery = deleteQuery.eq('grading_period_id', periodId)
    } else {
      deleteQuery = deleteQuery.is('grading_period_id', null)
    }

    const { error: deleteError } = await deleteQuery

    if (deleteError) {
      console.error('Error deleting existing weights:', deleteError)
      return NextResponse.json(
        { error: 'Failed to update weight configuration' },
        { status: 500 }
      )
    }

    // Insert new weights
    const weightsToInsert = weights.map((w) => ({
      course_id: courseId,
      grading_period_id: periodId || null,
      assessment_type: w.assessment_type,
      weight_percent: w.weight_percent,
      drop_lowest: w.drop_lowest,
    }))

    const { error: insertError } = await supabase
      .from('grade_weight_configs')
      .insert(weightsToInsert)

    if (insertError) {
      console.error('Error inserting weights:', insertError)
      return NextResponse.json(
        { error: 'Failed to save weight configuration' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in weights:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/teacher/gradebook/weights
 * Get grade weight configuration for a course
 */
export async function GET(request: NextRequest) {
  try {
    // Get authenticated teacher
    const teacherProfile = await getTeacherProfile()
    if (!teacherProfile) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get query params
    const { searchParams } = new URL(request.url)
    const courseId = searchParams.get('courseId')
    const periodId = searchParams.get('periodId')

    if (!courseId) {
      return NextResponse.json(
        { error: 'Missing required query parameter: courseId' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Verify teacher has access to this course
    const { count: accessCount } = await supabase
      .from('teacher_assignments')
      .select('*', { count: 'exact', head: true })
      .eq('teacher_profile_id', teacherProfile.id)
      .eq('course_id', courseId)

    if (!accessCount || accessCount === 0) {
      return NextResponse.json(
        { error: 'You do not have access to this course' },
        { status: 403 }
      )
    }

    // Fetch weights
    let query = supabase
      .from('grade_weight_configs')
      .select('*')
      .eq('course_id', courseId)

    if (periodId) {
      query = query.or(`grading_period_id.eq.${periodId},grading_period_id.is.null`)
    } else {
      query = query.is('grading_period_id', null)
    }

    const { data, error } = await query.order('assessment_type', { ascending: true })

    if (error) {
      console.error('Error fetching weights:', error)
      return NextResponse.json(
        { error: 'Failed to fetch weight configuration' },
        { status: 500 }
      )
    }

    return NextResponse.json({ weights: data })
  } catch (error) {
    console.error('Error in weights GET:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
