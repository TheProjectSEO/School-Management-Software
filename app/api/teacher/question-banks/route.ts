import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getCurrentUser } from '@/lib/auth/session'

export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceClient()
    const { searchParams } = new URL(request.url)
    const courseId = searchParams.get('course_id')

    // Check authentication using JWT
    const currentUser = await getCurrentUser()

    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get teacher profile using profile_id from JWT
    const { data: teacherProfile } = await supabase
      .from('teacher_profiles')
      .select('id')
      .eq('profile_id', currentUser.profile_id)
      .single()

    if (!teacherProfile) {
      return NextResponse.json({ error: 'Teacher profile not found' }, { status: 404 })
    }

    // Build query
    let query = supabase
      .from('teacher_question_banks')
      .select(`
        id,
        name,
        description,
        created_at
      `)
      .eq('created_by', teacherProfile.id)
      .order('created_at', { ascending: false })

    if (courseId) {
      query = query.eq('course_id', courseId)
    }

    const { data: banks, error } = await query

    if (error) {
      console.error('Error fetching question banks:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Get question count for each bank
    const banksWithCounts = await Promise.all(
      banks.map(async (bank) => {
        const { count } = await supabase
          .from('teacher_bank_questions')
          .select('*', { count: 'exact', head: true })
          .eq('bank_id', bank.id)

        return {
          ...bank,
          question_count: count || 0
        }
      })
    )

    return NextResponse.json({ banks: banksWithCounts })
  } catch (error) {
    console.error('Error in GET /api/teacher/question-banks:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServiceClient()
    const body = await request.json()

    // Check authentication using JWT
    const currentUser = await getCurrentUser()

    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get teacher profile using profile_id from JWT
    const { data: teacherProfile } = await supabase
      .from('teacher_profiles')
      .select('id')
      .eq('profile_id', currentUser.profile_id)
      .single()

    if (!teacherProfile) {
      return NextResponse.json({ error: 'Teacher profile not found' }, { status: 404 })
    }

    const { name, description, course_id } = body

    // Create question bank
    const { data: bank, error: bankError } = await supabase
      .from('teacher_question_banks')
      .insert({
        name,
        description,
        course_id,
        created_by: teacherProfile.id
      })
      .select()
      .single()

    if (bankError) {
      console.error('Error creating question bank:', bankError)
      return NextResponse.json({ error: bankError.message }, { status: 500 })
    }

    return NextResponse.json({ bank }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/teacher/question-banks:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
