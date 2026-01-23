/**
 * API Routes for Lesson Management
 * POST - Create a new lesson
 * GET - List lessons for a module
 */

import { NextRequest, NextResponse } from 'next/server'
import { getTeacherProfile } from '@/lib/dal/teacher'
import { createLesson, getLessonsForModule, detectVideoType, getYouTubeThumbnail } from '@/lib/dal/content'

export async function POST(request: NextRequest) {
  try {
    const teacherProfile = await getTeacherProfile()
    if (!teacherProfile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      module_id,
      title,
      content,
      content_type,
      video_url,
      video_type,
      thumbnail_url,
      duration_minutes,
      order
    } = body

    if (!module_id || !title) {
      return NextResponse.json(
        { error: 'module_id and title are required' },
        { status: 400 }
      )
    }

    // Auto-detect video type if not provided
    let detectedVideoType = video_type
    let detectedThumbnail = thumbnail_url

    if (video_url && !detectedVideoType) {
      detectedVideoType = detectVideoType(video_url)
    }

    // Auto-generate YouTube thumbnail if not provided
    if (video_url && !detectedThumbnail && detectedVideoType === 'youtube') {
      detectedThumbnail = getYouTubeThumbnail(video_url)
    }

    const lesson = await createLesson(teacherProfile.id, {
      module_id,
      title,
      content,
      content_type: content_type || 'video',
      video_url,
      video_type: detectedVideoType,
      thumbnail_url: detectedThumbnail,
      duration_minutes,
      order
    })

    if (!lesson) {
      return NextResponse.json(
        { error: 'Failed to create lesson. Check access permissions.' },
        { status: 403 }
      )
    }

    return NextResponse.json({ lesson }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/content/lessons:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const teacherProfile = await getTeacherProfile()
    if (!teacherProfile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const moduleId = searchParams.get('module_id')

    if (!moduleId) {
      return NextResponse.json(
        { error: 'module_id is required' },
        { status: 400 }
      )
    }

    const lessons = await getLessonsForModule(teacherProfile.id, moduleId)

    return NextResponse.json({ lessons })
  } catch (error) {
    console.error('Error in GET /api/content/lessons:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
