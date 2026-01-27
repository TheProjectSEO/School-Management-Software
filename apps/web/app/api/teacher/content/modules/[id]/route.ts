/**
 * API Routes for Individual Module Operations
 * GET - Get a single module with lessons
 * PATCH - Update a module
 * DELETE - Delete a module
 */

import { NextRequest, NextResponse } from 'next/server'
import { getTeacherProfile } from '@/lib/dal/teacher'
import { updateModule, deleteModule, getLessonsForModule } from '@/lib/dal/content'
import { createClient } from '@/lib/supabase/server'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const teacherProfile = await getTeacherProfile()
    if (!teacherProfile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: moduleId } = await params
    const supabase = await createClient()

    // Get module with course info
    const { data: module, error } = await supabase
      .from('modules')
      .select(`
        *,
        course:courses!inner(id, name, subject_code)
      `)
      .eq('id', moduleId)
      .single()

    if (error || !module) {
      return NextResponse.json({ error: 'Module not found' }, { status: 404 })
    }

    // Verify teacher access
    const { count } = await supabase
      .from('teacher_assignments')
      .select('*', { count: 'exact', head: true })
      .eq('teacher_profile_id', teacherProfile.id)
      .eq('course_id', module.course_id)

    if (!count || count === 0) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Get lessons for this module
    const lessons = await getLessonsForModule(teacherProfile.id, moduleId)

    return NextResponse.json({
      module: {
        ...module,
        lessons
      }
    })
  } catch (error) {
    console.error('Error in GET /api/content/modules/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const teacherProfile = await getTeacherProfile()
    if (!teacherProfile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: moduleId } = await params
    const body = await request.json()
    const { title, description, order, duration_minutes, is_published } = body

    const updatedModule = await updateModule(teacherProfile.id, moduleId, {
      title,
      description,
      order,
      duration_minutes,
      is_published
    })

    if (!updatedModule) {
      return NextResponse.json(
        { error: 'Failed to update module. Check access permissions.' },
        { status: 403 }
      )
    }

    return NextResponse.json({ module: updatedModule })
  } catch (error) {
    console.error('Error in PATCH /api/content/modules/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const teacherProfile = await getTeacherProfile()
    if (!teacherProfile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: moduleId } = await params
    const success = await deleteModule(teacherProfile.id, moduleId)

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to delete module. Check access permissions.' },
        { status: 403 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/content/modules/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
