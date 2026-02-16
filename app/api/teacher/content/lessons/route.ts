/**
 * API Routes for Lesson Management
 * POST - Create a new lesson
 * GET - List lessons for a module
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireTeacherAPI } from '@/lib/auth/requireTeacherAPI'
import { detectVideoType, getYouTubeThumbnail, addLessonAttachment } from '@/lib/dal/content'
import { createServiceClient } from '@/lib/supabase/service'

export async function POST(request: NextRequest) {
  try {
    const auth = await requireTeacherAPI()
    if (!auth.success) return auth.response

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
      order,
      is_published,
      attachments
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
      .eq('teacher_profile_id', auth.teacher.teacherId)
      .eq('course_id', module.course_id)

    if (!accessCount || accessCount === 0) {
      console.error(`[POST /content/lessons] Access denied: teacher=${auth.teacher.teacherId} course=${module.course_id}`)
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
        is_published: is_published === true,
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

    // Save attachments if provided
    if (attachments && Array.isArray(attachments) && attachments.length > 0) {
      for (let i = 0; i < attachments.length; i++) {
        const att = attachments[i]
        await addLessonAttachment(auth.teacher.teacherId, {
          lesson_id: lesson.id,
          title: att.file_name || att.title || 'Attachment',
          description: att.description || null,
          file_url: att.file_url,
          file_type: att.file_type || null,
          file_size_bytes: att.file_size || att.file_size_bytes || null,
          order_index: att.order_index !== undefined ? att.order_index : i
        })
      }
    }

    // Fetch saved attachments to return
    const { data: savedAttachments } = await supabase
      .from('lesson_attachments')
      .select('*')
      .eq('lesson_id', lesson.id)
      .order('order_index', { ascending: true })

    return NextResponse.json({
      lesson: { ...lesson, attachments: savedAttachments || [] }
    }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/content/lessons:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireTeacherAPI()
    if (!auth.success) return auth.response

    const supabase = createServiceClient()
    const { searchParams } = new URL(request.url)
    const moduleId = searchParams.get('module_id')

    if (!moduleId) {
      return NextResponse.json(
        { error: 'module_id is required' },
        { status: 400 }
      )
    }

    // Verify teacher has access to this module's course
    const { data: module } = await supabase
      .from('modules')
      .select('course_id')
      .eq('id', moduleId)
      .maybeSingle()

    if (!module) {
      return NextResponse.json({ error: 'Module not found' }, { status: 404 })
    }

    const { count: accessCount } = await supabase
      .from('teacher_assignments')
      .select('*', { count: 'exact', head: true })
      .eq('teacher_profile_id', auth.teacher.teacherId)
      .eq('course_id', module.course_id)

    if (!accessCount || accessCount === 0) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Fetch lessons with flat query (no FK joins)
    const { data: lessons, error } = await supabase
      .from('lessons')
      .select('*')
      .eq('module_id', moduleId)
      .order('order', { ascending: true })

    if (error) {
      console.error('[GET /content/lessons] Error:', error)
      return NextResponse.json({ error: 'Failed to fetch lessons' }, { status: 500 })
    }

    // Fetch attachments separately
    const lessonIds = (lessons || []).map((l: any) => l.id)
    let attachmentsByLesson = new Map<string, any[]>()
    if (lessonIds.length > 0) {
      const { data: attachments } = await supabase
        .from('lesson_attachments')
        .select('*')
        .in('lesson_id', lessonIds)
        .order('order_index', { ascending: true })

      ;(attachments || []).forEach((a: any) => {
        const arr = attachmentsByLesson.get(a.lesson_id) || []
        arr.push(a)
        attachmentsByLesson.set(a.lesson_id, arr)
      })
    }

    const lessonsWithAttachments = (lessons || []).map((l: any) => ({
      ...l,
      attachments: attachmentsByLesson.get(l.id) || [],
    }))

    return NextResponse.json({ lessons: lessonsWithAttachments })
  } catch (error) {
    console.error('Error in GET /api/content/lessons:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
