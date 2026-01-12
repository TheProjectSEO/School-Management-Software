/**
 * API Routes for Individual Lesson Operations
 * GET - Get a single lesson with attachments
 * PATCH - Update a lesson
 * DELETE - Delete a lesson
 */

import { NextRequest, NextResponse } from 'next/server'
import { getTeacherProfile } from '@/lib/dal/teacher'
import { getLesson, updateLesson, deleteLesson, detectVideoType, getYouTubeThumbnail } from '@/lib/dal/content'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const teacherProfile = await getTeacherProfile()
    if (!teacherProfile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: lessonId } = await params
    const lesson = await getLesson(teacherProfile.id, lessonId)

    if (!lesson) {
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 })
    }

    return NextResponse.json({ lesson })
  } catch (error) {
    console.error('Error in GET /api/content/lessons/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const teacherProfile = await getTeacherProfile()
    if (!teacherProfile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: lessonId } = await params
    const body = await request.json()
    const {
      title,
      content,
      content_type,
      video_url,
      video_type,
      thumbnail_url,
      duration_minutes,
      order,
      is_published
    } = body

    // Auto-detect video type if video_url changed but video_type not provided
    let detectedVideoType = video_type
    let detectedThumbnail = thumbnail_url

    if (video_url && !detectedVideoType) {
      detectedVideoType = detectVideoType(video_url)
    }

    // Auto-generate YouTube thumbnail if not provided
    if (video_url && !detectedThumbnail && detectedVideoType === 'youtube') {
      detectedThumbnail = getYouTubeThumbnail(video_url)
    }

    const lesson = await updateLesson(teacherProfile.id, lessonId, {
      title,
      content,
      content_type,
      video_url,
      video_type: detectedVideoType,
      thumbnail_url: detectedThumbnail,
      duration_minutes,
      order,
      is_published
    })

    if (!lesson) {
      return NextResponse.json(
        { error: 'Failed to update lesson. Check access permissions.' },
        { status: 403 }
      )
    }

    return NextResponse.json({ lesson })
  } catch (error) {
    console.error('Error in PATCH /api/content/lessons/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const teacherProfile = await getTeacherProfile()
    if (!teacherProfile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: lessonId } = await params
    const success = await deleteLesson(teacherProfile.id, lessonId)

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to delete lesson. Check access permissions.' },
        { status: 403 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/content/lessons/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
