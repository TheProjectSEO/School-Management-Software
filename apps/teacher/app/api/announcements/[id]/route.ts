/**
 * API Routes for Single Announcement
 * GET - Get announcement details
 * PATCH - Update announcement (draft only)
 * DELETE - Delete announcement
 */

import { NextRequest, NextResponse } from 'next/server'
import { getTeacherProfile } from '@/lib/dal/teacher'
import {
  getAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  UpdateAnnouncementInput
} from '@/lib/dal/announcements'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const teacherProfile = await getTeacherProfile()
    if (!teacherProfile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const announcement = await getAnnouncement(id)

    if (!announcement) {
      return NextResponse.json({ error: 'Announcement not found' }, { status: 404 })
    }

    return NextResponse.json({ announcement }, { status: 200 })
  } catch (error) {
    console.error('Error in GET /api/announcements/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const teacherProfile = await getTeacherProfile()
    if (!teacherProfile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()

    // Check if announcement exists and is a draft
    const existing = await getAnnouncement(id)
    if (!existing) {
      return NextResponse.json({ error: 'Announcement not found' }, { status: 404 })
    }
    if (existing.is_published) {
      return NextResponse.json({ error: 'Cannot edit published announcements' }, { status: 400 })
    }

    // Build update input
    const input: UpdateAnnouncementInput = {}

    if (body.title !== undefined) input.title = body.title.trim()
    if (body.content !== undefined) input.content = body.content.trim()
    if (body.target_type !== undefined) input.target_type = body.target_type
    if (body.target_section_ids !== undefined) input.target_section_ids = body.target_section_ids
    if (body.target_grade_levels !== undefined) input.target_grade_levels = body.target_grade_levels
    if (body.target_course_ids !== undefined) input.target_course_ids = body.target_course_ids
    if (body.priority !== undefined) input.priority = body.priority
    if (body.expires_at !== undefined) input.expires_at = body.expires_at
    if (body.attachments !== undefined) input.attachments = body.attachments

    const announcement = await updateAnnouncement(id, input)

    if (!announcement) {
      return NextResponse.json({ error: 'Failed to update announcement' }, { status: 500 })
    }

    return NextResponse.json({ announcement }, { status: 200 })
  } catch (error) {
    console.error('Error in PATCH /api/announcements/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const teacherProfile = await getTeacherProfile()
    if (!teacherProfile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const success = await deleteAnnouncement(id)

    if (!success) {
      return NextResponse.json({ error: 'Failed to delete announcement' }, { status: 500 })
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error('Error in DELETE /api/announcements/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
