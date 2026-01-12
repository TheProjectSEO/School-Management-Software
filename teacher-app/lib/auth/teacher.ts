/**
 * Teacher Authentication Helpers
 * Server-side utilities for teacher authentication and authorization
 */

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { cache } from 'react'

export type TeacherProfile = {
  id: string
  profile_id: string
  school_id: string
  employee_id: string | null
  department: string | null
  specialization: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export type TeacherWithProfile = TeacherProfile & {
  profile: {
    id: string
    auth_user_id: string
    full_name: string
    phone: string | null
    avatar_url: string | null
  }
  school: {
    id: string
    name: string
    logo_url: string | null
  }
}

/**
 * Get the currently authenticated teacher with profile data
 * Returns null if user is not authenticated or not a teacher
 * Uses React cache to prevent duplicate queries in the same render
 */
export const getCurrentTeacher = cache(async (): Promise<TeacherWithProfile | null> => {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return null
    }

    // Get profile linked to auth user
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('auth_user_id', user.id)
      .single()

    if (profileError || !profile) {
      return null
    }

    // Get teacher profile with school info
    const { data: teacherProfile, error: teacherError } = await supabase
      .from('teacher_profiles')
      .select(`
        *,
        profile:profiles!teacher_profiles_profile_id_fkey(*),
        school:schools!teacher_profiles_school_id_fkey(id, name, logo_url)
      `)
      .eq('profile_id', profile.id)
      .eq('is_active', true)
      .single()

    if (teacherError || !teacherProfile) {
      return null
    }

    return teacherProfile as TeacherWithProfile
  } catch (error) {
    console.error('Error fetching teacher profile:', error)
    return null
  }
})

/**
 * Server-side auth guard for teacher routes
 * Redirects to /login if user is not authenticated or not a teacher
 * Returns teacher profile on success
 */
export async function requireTeacher(): Promise<TeacherWithProfile> {
  const teacher = await getCurrentTeacher()

  if (!teacher) {
    redirect('/login')
  }

  return teacher
}

/**
 * Check if the current user has a teacher role
 * Returns true if user is authenticated and has teacher profile
 */
export async function getTeacherRole(): Promise<'teacher' | 'student' | null> {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return null
    }

    // Get profile linked to auth user
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (profileError || !profile) {
      return null
    }

    // Check if teacher profile exists
    const { data: teacherProfile, error: teacherError } = await supabase
      .from('teacher_profiles')
      .select('id')
      .eq('profile_id', profile.id)
      .eq('is_active', true)
      .maybeSingle()

    if (!teacherError && teacherProfile) {
      return 'teacher'
    }

    // Check if student profile exists
    const { data: studentProfile, error: studentError } = await supabase
      .from('students')
      .select('id')
      .eq('profile_id', profile.id)
      .maybeSingle()

    if (!studentError && studentProfile) {
      return 'student'
    }

    return null
  } catch (error) {
    console.error('Error determining user role:', error)
    return null
  }
}

/**
 * Get teacher's email from auth user
 */
export async function getTeacherEmail(): Promise<string | null> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    return user?.email ?? null
  } catch {
    return null
  }
}
