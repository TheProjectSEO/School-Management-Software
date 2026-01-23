import { NextRequest, NextResponse } from 'next/server'
import { getTeacherProfile, createLiveSession } from '@/lib/dal/teacher'

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

    // Validate required fields
    if (!body.course_id || !body.section_id || !body.title || !body.scheduled_start) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Create the session
    const session = await createLiveSession(teacherProfile.id, {
      course_id: body.course_id,
      section_id: body.section_id,
      module_id: body.module_id || null,
      title: body.title,
      description: body.description || null,
      scheduled_start: body.scheduled_start,
      scheduled_end: body.scheduled_end || null,
      provider: body.provider || 'zoom',
      join_url: body.join_url || null
    })

    return NextResponse.json(session, { status: 201 })
  } catch (error) {
    console.error('Error creating session:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create session' },
      { status: 500 }
    )
  }
}
