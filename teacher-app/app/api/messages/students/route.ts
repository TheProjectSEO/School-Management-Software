/**
 * API Route: Available Students for Messaging
 * GET - Get list of students the teacher can message (from their courses)
 */

import { NextResponse } from 'next/server'
import { getTeacherProfile } from '@/lib/dal/teacher'
import { getStudentsForMessaging } from '@/lib/dal/messages'

export async function GET() {
  try {
    const teacherProfile = await getTeacherProfile()
    if (!teacherProfile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const students = await getStudentsForMessaging(teacherProfile.id)

    return NextResponse.json({ students })
  } catch (error) {
    console.error('Error in GET /api/messages/students:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
