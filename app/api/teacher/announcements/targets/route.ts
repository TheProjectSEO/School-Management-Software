/**
 * API Route for Getting Available Targeting Options
 * GET - Get sections, grade levels, and courses available for targeting
 */

import { NextRequest, NextResponse } from 'next/server'
import { getTeacherProfile } from '@/lib/dal/teacher'
import {
  getTargetableSections,
  getTargetableGradeLevels,
  getTargetableCourses,
  getTargetPreviewCount
} from '@/lib/dal/announcements'

export async function GET(request: NextRequest) {
  try {
    const teacherProfile = await getTeacherProfile()
    if (!teacherProfile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch all targeting options in parallel
    const [sections, gradeLevels, courses] = await Promise.all([
      getTargetableSections(),
      getTargetableGradeLevels(),
      getTargetableCourses()
    ])

    // Calculate school-wide count
    const schoolWideCount = await getTargetPreviewCount('school', [], [], [])

    return NextResponse.json({
      sections,
      gradeLevels,
      courses,
      schoolWideCount
    }, { status: 200 })
  } catch (error) {
    console.error('Error in GET /api/announcements/targets:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST - Get preview count for specific targeting
 */
export async function POST(request: NextRequest) {
  try {
    const teacherProfile = await getTeacherProfile()
    if (!teacherProfile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      target_type,
      target_section_ids = [],
      target_grade_levels = [],
      target_course_ids = []
    } = body

    if (!target_type) {
      return NextResponse.json({ error: 'Target type is required' }, { status: 400 })
    }

    const count = await getTargetPreviewCount(
      target_type,
      target_section_ids,
      target_grade_levels,
      target_course_ids
    )

    return NextResponse.json({ count }, { status: 200 })
  } catch (error) {
    console.error('Error in POST /api/announcements/targets:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
