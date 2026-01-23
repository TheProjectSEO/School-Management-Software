/**
 * API Routes for Teacher Announcements
 * GET - List all announcements for the current teacher
 * POST - Create a new announcement
 */

import { NextRequest, NextResponse } from 'next/server'
import { getTeacherProfile } from '@/lib/dal/teacher'
import {
  getTeacherAnnouncements,
  createAnnouncement,
  CreateAnnouncementInput
} from '@/lib/dal/announcements'

export async function GET(request: NextRequest) {
  try {
    const teacherProfile = await getTeacherProfile()
    if (!teacherProfile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const publishedOnly = searchParams.get('published') === 'true'
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : undefined

    const announcements = await getTeacherAnnouncements({
      publishedOnly,
      limit,
      offset
    })

    return NextResponse.json({ announcements }, { status: 200 })
  } catch (error) {
    console.error('Error in GET /api/announcements:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const teacherProfile = await getTeacherProfile()
    if (!teacherProfile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    // Validate required fields
    if (!body.title?.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }
    if (!body.content?.trim()) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 })
    }
    if (!body.target_type) {
      return NextResponse.json({ error: 'Target type is required' }, { status: 400 })
    }

    // Validate target type
    const validTargetTypes = ['section', 'grade', 'course', 'school']
    if (!validTargetTypes.includes(body.target_type)) {
      return NextResponse.json({ error: 'Invalid target type' }, { status: 400 })
    }

    // Validate targeting based on type
    if (body.target_type === 'section' && (!body.target_section_ids || body.target_section_ids.length === 0)) {
      return NextResponse.json({ error: 'At least one section must be selected' }, { status: 400 })
    }
    if (body.target_type === 'grade' && (!body.target_grade_levels || body.target_grade_levels.length === 0)) {
      return NextResponse.json({ error: 'At least one grade level must be selected' }, { status: 400 })
    }
    if (body.target_type === 'course' && (!body.target_course_ids || body.target_course_ids.length === 0)) {
      return NextResponse.json({ error: 'At least one course must be selected' }, { status: 400 })
    }

    const input: CreateAnnouncementInput = {
      title: body.title.trim(),
      content: body.content.trim(),
      target_type: body.target_type,
      target_section_ids: body.target_section_ids || [],
      target_grade_levels: body.target_grade_levels || [],
      target_course_ids: body.target_course_ids || [],
      priority: body.priority || 'normal',
      expires_at: body.expires_at || null,
      attachments: body.attachments || [],
      auto_publish: body.auto_publish || false
    }

    const announcement = await createAnnouncement(input)

    if (!announcement) {
      return NextResponse.json({ error: 'Failed to create announcement' }, { status: 500 })
    }

    return NextResponse.json({ announcement }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/announcements:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
