/**
 * API Routes for Lesson Management
 * POST - Create a new lesson
 * GET - List lessons for a module
 */

import { NextRequest, NextResponse } from 'next/server'
import { getTeacherProfile } from '@/lib/dal/teacher'
import { detectVideoType, getYouTubeThumbnail } from '@/lib/dal/content'
import { createServiceClient } from '@/lib/supabase/service'

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

    const supabase = createServiceClient()

    // Verify the module exists and get its course_id
    const { data: module, error: moduleError } = await supabase
      .from('modules')
      .select('id, course_id')
      .eq('id', module_id)
      .single()

    if (moduleError || !module) {
      console.error('[POST /content/lessons] Module not found:', module_id, moduleError)
      return NextResponse.json({ error: 'Module not found' }, { status: 404 })
    }

    // Verify teacher is assigned to this course
    const { count: accessCount } = await supabase
      .from('teacher_assignments')
      .select('*', { count: 'exact', head: true })
      .eq('teacher_profile_id', teacherProfile.id)
      .eq('course_id', module.course_id)

    if (!accessCount || accessCount === 0) {
      console.error(`[POST /content/lessons] Access denied: teacher=${teacherProfile.id} course=${module.course_id}`)
      return NextResponse.json({ error: 'Access denied to this course' }, { status: 403 })
    }

    // Auto-detect video type if not provided
    let detectedVideoType = video_type
    let detectedThumbnail = thumbnail_url

    if (video_url && !detectedVideoType) {
      detectedVideoType = detectVideoType(video_url)
    }

    if (video_url && !detectedThumbnail && detectedVideoType === 'youtube') {
      detectedThumbnail = getYouTubeThumbnail(video_url)
    }

    // Determine order
    let lessonOrder = order
    if (lessonOrder === undefined) {
      const { data: existing } = await supabase
        .from('lessons')
        .select('order')
        .eq('module_id', module_id)
        .order('order', { ascending: false })
        .limit(1)
      lessonOrder = (existing?.[0]?.order || 0) + 1
    }

    // Insert lesson
    const { data: lesson, error: insertError } = await supabase
      .from('lessons')
      .insert({
        module_id,
        title,
        content: content || null,
        content_type: content_type || 'video',
        video_url: video_url || null,
        video_type: detectedVideoType || null,
        thumbnail_url: detectedThumbnail || null,
        duration_minutes: duration_minutes || null,
        order: lessonOrder,
        is_published: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (insertError) {
      console.error('[POST /content/lessons] Insert error:', insertError)
      return NextResponse.json(
        { error: `Failed to create lesson: ${insertError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({ lesson: { ...lesson, attachments: [] } }, { status: 201 })
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

    const supabase = createServiceClient()
    const { searchParams } = new URL(request.url)
    const moduleId = searchParams.get('module_id')

    if (!moduleId) {
      return NextResponse.json(
        { error: 'module_id is required' },
        { status: 400 }
      )
    }

    // Fetch lessons directly with service client
    const { data: lessons, error } = await supabase
      .from('lessons')
      .select(`
        *,
        attachments:lesson_attachments(*)
      `)
      .eq('module_id', moduleId)
      .order('order', { ascending: true })

    if (error) {
      console.error('[GET /content/lessons] Error:', error)
      return NextResponse.json({ error: 'Failed to fetch lessons' }, { status: 500 })
    }

    return NextResponse.json({ lessons: lessons || [] })
  } catch (error) {
    console.error('Error in GET /api/content/lessons:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
