/**
 * Lesson Reactions API
 * GET - Fetch reactions for a lesson
 * POST - Toggle a reaction on a lesson
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireStudentAPI } from '@/lib/auth/requireStudentAPI'
import { createServiceClient } from '@/lib/supabase/service'

const VALID_REACTIONS = ['like', 'helpful', 'confused', 'love', 'celebrate'] as const

export async function GET(request: NextRequest) {
  try {
    const auth = await requireStudentAPI()
    if (!auth.success) return auth.response

    const { searchParams } = new URL(request.url)
    const lessonId = searchParams.get('lessonId')

    if (!lessonId) {
      return NextResponse.json({ error: 'lessonId is required' }, { status: 400 })
    }

    const supabase = createServiceClient()

    const { data: reactions, error } = await supabase
      .from('lesson_reactions')
      .select('reaction_type, student_id')
      .eq('lesson_id', lessonId)

    if (error) {
      // If table doesn't exist, return empty data instead of error
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        console.warn('lesson_reactions table not found, returning empty data')
        return NextResponse.json({ counts: {}, myReaction: null })
      }
      console.error('Error fetching reactions:', error)
      return NextResponse.json(
        { error: `Failed to fetch reactions: ${error.message}`, code: error.code },
        { status: 500 }
      )
    }

    // Aggregate counts
    const counts: Record<string, number> = {}
    let myReaction: string | null = null

    ;(reactions || []).forEach((r) => {
      counts[r.reaction_type] = (counts[r.reaction_type] || 0) + 1
      if (r.student_id === auth.student.studentId) {
        myReaction = r.reaction_type
      }
    })

    return NextResponse.json({ counts, myReaction })
  } catch (error) {
    console.error('Error in GET /api/student/lesson-reactions:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireStudentAPI()
    if (!auth.success) return auth.response

    const body = await request.json()
    const { lessonId, reactionType, remove } = body

    if (!lessonId) {
      return NextResponse.json({ error: 'lessonId is required' }, { status: 400 })
    }

    if (!remove && (!reactionType || !VALID_REACTIONS.includes(reactionType))) {
      return NextResponse.json(
        { error: `Invalid reaction type. Must be one of: ${VALID_REACTIONS.join(', ')}` },
        { status: 400 }
      )
    }

    const supabase = createServiceClient()
    const studentId = auth.student.studentId

    if (remove) {
      // Delete the reaction
      const { error } = await supabase
        .from('lesson_reactions')
        .delete()
        .eq('lesson_id', lessonId)
        .eq('student_id', studentId)

      if (error) {
        console.error('Error removing reaction:', error)
        return NextResponse.json(
          { error: `Failed to remove reaction: ${error.message}`, code: error.code },
          { status: 500 }
        )
      }

      return NextResponse.json({ success: true, myReaction: null })
    }

    // Upsert approach: try to insert, on conflict update
    // The UNIQUE(lesson_id, student_id) constraint handles deduplication
    const { error: upsertError } = await supabase
      .from('lesson_reactions')
      .upsert(
        {
          lesson_id: lessonId,
          student_id: studentId,
          reaction_type: reactionType,
        },
        { onConflict: 'lesson_id,student_id', ignoreDuplicates: false }
      )

    if (!upsertError) {
      return NextResponse.json({ success: true, myReaction: reactionType })
    }

    // Upsert failed, fall back to select-then-insert/update
    console.warn('Reaction upsert failed, trying fallback:', upsertError.message)

    const { data: existing, error: selectError } = await supabase
      .from('lesson_reactions')
      .select('id')
      .eq('lesson_id', lessonId)
      .eq('student_id', studentId)
      .maybeSingle()

    if (selectError) {
      console.error('Error selecting reaction:', selectError)
      return NextResponse.json(
        { error: `Failed to check reaction: ${selectError.message}`, code: selectError.code },
        { status: 500 }
      )
    }

    if (existing) {
      const { error } = await supabase
        .from('lesson_reactions')
        .update({ reaction_type: reactionType })
        .eq('id', existing.id)

      if (error) {
        console.error('Error updating reaction:', error)
        return NextResponse.json(
          { error: `Failed to update reaction: ${error.message}`, code: error.code },
          { status: 500 }
        )
      }
    } else {
      const { error } = await supabase
        .from('lesson_reactions')
        .insert({
          lesson_id: lessonId,
          student_id: studentId,
          reaction_type: reactionType,
        })

      if (error) {
        console.error('Error inserting reaction:', error)
        return NextResponse.json(
          { error: `Failed to add reaction: ${error.message}`, code: error.code },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({ success: true, myReaction: reactionType })
  } catch (error) {
    console.error('Error in POST /api/student/lesson-reactions:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
