/**
 * API Route: Teacher Conversation with Student
 * GET - Get messages in conversation
 * POST - Send a message to student (no quota limits)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getTeacherProfile } from '@/lib/dal/teacher'
import {
  getConversationMessages,
  sendMessageToStudent,
  markMessagesAsRead,
  getStudentIdByProfileId,
} from '@/lib/dal/messages'
import { createServiceClient } from '@/lib/supabase/service'
import { getStudentCourseIds } from '@/lib/dal/student'

interface RouteContext {
  params: Promise<{ studentProfileId: string }>
}

async function verifySharedCourse(teacherProfileId: string, studentProfileId: string): Promise<boolean> {
  const supabase = createServiceClient()
  // Get student record id from profile id
  const { data: student } = await supabase
    .from('students')
    .select('id')
    .eq('profile_id', studentProfileId)
    .single()
  if (!student) return false

  // Get teacher's course IDs
  const { data: assignments } = await supabase
    .from('teacher_assignments')
    .select('course_id')
    .eq('teacher_profile_id', teacherProfileId)
  if (!assignments || assignments.length === 0) return false
  const teacherCourseIds = assignments.map((a) => a.course_id)

  // Get student's course IDs
  const studentCourseIds = await getStudentCourseIds(student.id)
  return studentCourseIds.some((id) => teacherCourseIds.includes(id))
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const teacherProfile = await getTeacherProfile()
    if (!teacherProfile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { studentProfileId } = await context.params

    // Verify teacher and student share at least one course (IDOR fix)
    const sharesACourse = await verifySharedCourse(teacherProfile.id, studentProfileId)
    if (!sharesACourse) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Get messages
    const rawMessages = await getConversationMessages(
      teacherProfile.id,
      studentProfileId,
      { limit, offset }
    )

    // Transform messages to match frontend expected format
    const messages = rawMessages.map((msg) => ({
      id: msg.id,
      sender_id: msg.from_profile_id,
      sender_name: msg.from_user?.full_name || 'Unknown',
      sender_role: msg.sender_type,
      content: msg.body,
      created_at: msg.created_at,
      is_read: msg.is_read,
    }))

    // Mark messages as read
    await markMessagesAsRead(teacherProfile.id, studentProfileId)

    return NextResponse.json({ messages })
  } catch (error) {
    console.error('Error in GET /api/teacher/messages/[studentProfileId]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const teacherProfile = await getTeacherProfile()
    if (!teacherProfile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { studentProfileId } = await context.params

    // Verify teacher and student share at least one course (IDOR fix)
    const sharesACourse = await verifySharedCourse(teacherProfile.id, studentProfileId)
    if (!sharesACourse) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const body = await request.json()
    const { message, content, attachments } = body

    // Support both 'message' and 'content' field names
    const messageBody = message || content

    if (!messageBody || typeof messageBody !== 'string' || messageBody.trim().length === 0) {
      return NextResponse.json(
        { error: 'Message body is required' },
        { status: 400 }
      )
    }

    // Get student ID from profile ID
    const studentId = await getStudentIdByProfileId(studentProfileId)
    if (!studentId) {
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      )
    }

    // Send message (no quota limits for teachers)
    const result = await sendMessageToStudent(
      teacherProfile.id,
      studentId,
      teacherProfile.school_id,
      messageBody.trim(),
      attachments
    )

    if (!result.success) {
      return NextResponse.json(
        {
          error: result.error,
          message: result.message,
        },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message_id: result.message_id,
    })
  } catch (error) {
    console.error('Error in POST /api/teacher/messages/[studentProfileId]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
