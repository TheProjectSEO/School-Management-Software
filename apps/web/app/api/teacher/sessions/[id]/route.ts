import { NextRequest, NextResponse } from 'next/server'
import { getTeacherProfile, updateLiveSession, deleteLiveSession } from '@/lib/dal/teacher'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const teacherProfile = await getTeacherProfile()

    if (!teacherProfile) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const sessionId = (await params).id

    // Update the session
    const session = await updateLiveSession(sessionId, teacherProfile.id, body)

    return NextResponse.json(session)
  } catch (error) {
    console.error('Error updating session:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update session' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const teacherProfile = await getTeacherProfile()

    if (!teacherProfile) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const sessionId = (await params).id

    // Delete the session
    await deleteLiveSession(sessionId, teacherProfile.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting session:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete session' },
      { status: 500 }
    )
  }
}
