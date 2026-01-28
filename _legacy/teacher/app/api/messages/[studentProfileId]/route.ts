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

interface RouteContext {
  params: Promise<{ studentProfileId: string }>
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const teacherProfile = await getTeacherProfile()
    if (!teacherProfile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { studentProfileId } = await context.params
    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Get messages
    const messages = await getConversationMessages(
      teacherProfile.id,
      studentProfileId,
      { limit, offset }
    )

    // Mark messages as read
    await markMessagesAsRead(teacherProfile.id, studentProfileId)

    return NextResponse.json({ messages })
  } catch (error) {
    console.error('Error in GET /api/messages/[studentProfileId]:', error)
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
    const body = await request.json()
    const { message, attachments } = body

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
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
      message.trim(),
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
    console.error('Error in POST /api/messages/[studentProfileId]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
