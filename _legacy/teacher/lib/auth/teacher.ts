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
 * Uses SECURITY DEFINER RPC function to bypass RLS issues
 */
export const getCurrentTeacher = cache(async (): Promise<TeacherWithProfile | null> => {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return null
    }

    // Use RPC function that bypasses RLS for safe profile fetching
    const { data, error } = await supabase
      .rpc('get_teacher_profile', { user_auth_id: user.id })

    if (error) {
      console.error('Error fetching teacher profile via RPC:', error)
      return null
    }

    if (!data || data.length === 0) {
      return null
    }

    // Transform RPC result to expected format
    const row = data[0]
    return {
      id: row.id,
      profile_id: row.profile_id,
      school_id: row.school_id,
      employee_id: row.employee_id,
      department: row.department,
      specialization: row.specialization,
      is_active: row.is_active,
      created_at: row.created_at,
      updated_at: row.updated_at,
      profile: {
        id: row.profile_id,
        auth_user_id: user.id,
        full_name: row.profile_full_name,
        phone: null,
        avatar_url: row.profile_avatar_url
      },
      school: {
        id: row.school_id,
        name: row.school_name,
        logo_url: row.school_logo_url
      }
    } as TeacherWithProfile
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
 * Uses SECURITY DEFINER RPC function to bypass RLS issues
 */
export async function getTeacherRole(): Promise<'teacher' | 'student' | null> {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return null
    }

    // Use RPC function that bypasses RLS for safe role detection
    const { data: roleData, error: roleError } = await supabase
      .rpc('get_user_role', { user_auth_id: user.id })

    if (roleError) {
      console.error('Error detecting role via RPC:', roleError)
      return null
    }

    if (roleData && roleData.length > 0) {
      return roleData[0].role as 'teacher' | 'student'
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
