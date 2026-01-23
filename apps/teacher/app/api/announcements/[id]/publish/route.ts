/**
 * API Route for Publishing Announcement
 * POST - Publish announcement and create notifications for targeted students
 */

import { NextRequest, NextResponse } from 'next/server'
import { getTeacherProfile } from '@/lib/dal/teacher'
import { getAnnouncement, publishAnnouncement } from '@/lib/dal/announcements'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const teacherProfile = await getTeacherProfile()
    if (!teacherProfile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Check if announcement exists
    const existing = await getAnnouncement(id)
    if (!existing) {
      return NextResponse.json({ error: 'Announcement not found' }, { status: 404 })
    }

    // Check if already published
    if (existing.is_published) {
      return NextResponse.json({ error: 'Announcement is already published' }, { status: 400 })
    }

    // Validate that there's at least one target
    const hasTargets =
      existing.target_type === 'school' ||
      (existing.target_section_ids && existing.target_section_ids.length > 0) ||
      (existing.target_grade_levels && existing.target_grade_levels.length > 0) ||
      (existing.target_course_ids && existing.target_course_ids.length > 0)

    if (!hasTargets) {
      return NextResponse.json({ error: 'Announcement must have at least one target' }, { status: 400 })
    }

    const success = await publishAnnouncement(id)

    if (!success) {
      return NextResponse.json({ error: 'Failed to publish announcement' }, { status: 500 })
    }

    // Fetch the updated announcement
    const updatedAnnouncement = await getAnnouncement(id)

    return NextResponse.json({
      success: true,
      announcement: updatedAnnouncement,
      message: `Announcement published to ${updatedAnnouncement?.target_count || 0} students`
    }, { status: 200 })
  } catch (error) {
    console.error('Error in POST /api/announcements/[id]/publish:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
