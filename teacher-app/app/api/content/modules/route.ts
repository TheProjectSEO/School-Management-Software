/**
 * API Routes for Module Management
 * POST - Create a new module
 * GET - List modules for a course
 */

import { NextRequest, NextResponse } from 'next/server'
import { getTeacherProfile } from '@/lib/dal/teacher'
import { createModule, getLessonsForModule } from '@/lib/dal/content'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const teacherProfile = await getTeacherProfile()
    if (!teacherProfile) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { course_id, title, description, order, duration_minutes } = body

    if (!course_id || !title) {
      return NextResponse.json(
        { error: 'course_id and title are required' },
        { status: 400 }
      )
    }

    const newModule = await createModule(teacherProfile.id, {
      course_id,
      title,
      description,
      order,
      duration_minutes
    })

    if (!newModule) {
      return NextResponse.json(
        { error: 'Failed to create module. Check access permissions.' },
        { status: 403 }
      )
    }

    return NextResponse.json({ module: newModule }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/content/modules:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const teacherProfile = await getTeacherProfile()
    if (!teacherProfile) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const courseId = searchParams.get('course_id')

    if (!courseId) {
      return NextResponse.json(
        { error: 'course_id is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // First verify teacher has access to this course
    const { count } = await supabase
      .from('teacher_assignments')
      .select('*', { count: 'exact', head: true })
      .eq('teacher_profile_id', teacherProfile.id)
      .eq('course_id', courseId)

    if (!count || count === 0) {
      return NextResponse.json(
        { error: 'Access denied to this course' },
        { status: 403 }
      )
    }

    // Get all modules for this course with lesson counts
    const { data: modules, error } = await supabase
      .from('modules')
      .select(`
        *,
        lessons:lessons(count)
      `)
      .eq('course_id', courseId)
      .order('order', { ascending: true })

    if (error) {
      console.error('Error fetching modules:', error)
      return NextResponse.json(
        { error: 'Failed to fetch modules' },
        { status: 500 }
      )
    }

    // Transform the response to include lesson_count
    const modulesWithCounts = modules.map(m => ({
      ...m,
      lesson_count: (m.lessons as any)?.[0]?.count || 0,
      lessons: undefined
    }))

    return NextResponse.json({ modules: modulesWithCounts })
  } catch (error) {
    console.error('Error in GET /api/content/modules:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
