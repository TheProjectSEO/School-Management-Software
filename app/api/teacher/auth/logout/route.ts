import { createServiceClient } from '@/lib/supabase/service'
import { NextResponse } from 'next/server'

export async function POST() {
  try {
    const supabase = createServiceClient()
    const { error } = await supabase.auth.signOut()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to log out' },
      { status: 500 }
    )
  }
}
