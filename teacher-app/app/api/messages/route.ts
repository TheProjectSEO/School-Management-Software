/**
 * API Route: Teacher Messages
 * GET - Get all conversations for the teacher
 */

import { NextResponse } from 'next/server'
import { getTeacherProfile } from '@/lib/dal/teacher'
import {
  getTeacherConversations,
  getUnreadMessageCount,
} from '@/lib/dal/messages'

export async function GET() {
  try {
    const teacherProfile = await getTeacherProfile()
    if (!teacherProfile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const [conversations, unreadCount] = await Promise.all([
      getTeacherConversations(teacherProfile.id),
      getUnreadMessageCount(teacherProfile.id),
    ])

    return NextResponse.json({
      conversations,
      unreadCount,
    })
  } catch (error) {
    console.error('Error in GET /api/messages:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
