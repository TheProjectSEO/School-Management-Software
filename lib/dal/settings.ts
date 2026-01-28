/**
 * Settings Management Data Access Layer
 *
 * Provides functions for managing academic years, grading periods,
 * and school settings.
 */

import { createClient } from '@/lib/supabase/server';

// Additional type exports for API routes
export interface AcademicSettings {
  grading_system: 'percentage' | 'letter' | 'gpa';
  passing_grade: number;
  max_grade: number;
  allow_late_submissions: boolean;
  late_submission_penalty: number;
}

export interface GradingScale {
  id: string;
  school_id: string;
  name: string;
  min_grade: number;
  max_grade: number;
  letter_grade?: string;
  gpa_value?: number;
  description?: string;
}

// Types
export interface AcademicYear {
  id: string;
  school_id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateAcademicYearInput {
  school_id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_current?: boolean;
}

export interface GradingPeriod {
  id: string;
  school_id: string;
  academic_year_id: string;
  name: string;
  start_date: string;
  end_date: string;
  order: number;
  weight?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  academic_year?: {
    id: string;
    name: string;
  };
}

export interface UpdateGradingPeriodInput {
  name?: string;
  start_date?: string;
  end_date?: string;
  order?: number;
  is_active?: boolean;
  weight?: number;
}

export interface SchoolSettings {
  id: string;
  school_id: string;
  grading_system: 'percentage' | 'letter' | 'gpa';
  passing_grade: number;
  max_grade: number;
  allow_late_submissions: boolean;
  late_submission_penalty: number;
  attendance_tracking: boolean;
  auto_enroll: boolean;
  enrollment_approval_required: boolean;
  student_messaging: boolean;
  message_quota_per_day: number;
  created_at: string;
  updated_at: string;
}

export interface UpdateSchoolSettingsInput {
  grading_system?: 'percentage' | 'letter' | 'gpa';
  passing_grade?: number;
  max_grade?: number;
  allow_late_submissions?: boolean;
  late_submission_penalty?: number;
  attendance_tracking?: boolean;
  auto_enroll?: boolean;
  enrollment_approval_required?: boolean;
  student_messaging?: boolean;
  message_quota_per_day?: number;
}

export interface ActionResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// ============================================================================
// ACADEMIC YEARS
// ============================================================================

/**
 * Get all academic years for a school
 */
export async function getAcademicYears(
  schoolId?: string
): Promise<AcademicYear[]> {
  try {
    const supabase = await createClient();

    let query = supabase
      .from('academic_years')
      .select('*')
      .order('start_date', { ascending: false });

    if (schoolId) {
      query = query.eq('school_id', schoolId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching academic years:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Unexpected error in getAcademicYears:', error);
    return [];
  }
}

/**
 * Get the current academic year for a school
 */
export async function getCurrentAcademicYear(
  schoolId: string
): Promise<AcademicYear | null> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('academic_years')
      .select('*')
      .eq('school_id', schoolId)
      .eq('is_current', true)
      .maybeSingle();

    if (error) {
      console.error('Error fetching current academic year:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Unexpected error in getCurrentAcademicYear:', error);
    return null;
  }
}

/**
 * Create a new academic year
 */
export async function createAcademicYear(
  input: CreateAcademicYearInput
): Promise<ActionResult<AcademicYear>> {
  try {
    const supabase = await createClient();

    // If this is set as current, unset other current years
    if (input.is_current) {
      await supabase
        .from('academic_years')
        .update({ is_current: false, updated_at: new Date().toISOString() })
        .eq('school_id', input.school_id)
        .eq('is_current', true);
    }

    const { data, error } = await supabase
      .from('academic_years')
      .insert({
        ...input,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating academic year:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Unexpected error in createAcademicYear:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Update an academic year
 */
export async function updateAcademicYear(
  id: string,
  updates: Partial<CreateAcademicYearInput>
): Promise<ActionResult<AcademicYear>> {
  try {
    const supabase = await createClient();

    // If setting as current, unset other current years first
    if (updates.is_current && updates.school_id) {
      await supabase
        .from('academic_years')
        .update({ is_current: false, updated_at: new Date().toISOString() })
        .eq('school_id', updates.school_id)
        .eq('is_current', true)
        .neq('id', id);
    }

    const { data, error } = await supabase
      .from('academic_years')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating academic year:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Unexpected error in updateAcademicYear:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

// ============================================================================
// GRADING PERIODS
// ============================================================================

/**
 * Get all grading periods, optionally filtered by school or academic year
 */
export async function getGradingPeriods(params?: {
  schoolId?: string;
  academicYearId?: string;
}): Promise<GradingPeriod[]> {
  try {
    const supabase = await createClient();

    let query = supabase
      .from('grading_periods')
      .select(
        `
        *,
        academic_year:academic_years(
          id,
          name
        )
      `
      )
      .order('order', { ascending: true });

    if (params?.schoolId) {
      query = query.eq('school_id', params.schoolId);
    }

    if (params?.academicYearId) {
      query = query.eq('academic_year_id', params.academicYearId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching grading periods:', error);
      return [];
    }

    // Transform the data
    return (data || []).map((period: any) => ({
      ...period,
      academic_year: period.academic_year?.[0] || period.academic_year,
    }));
  } catch (error) {
    console.error('Unexpected error in getGradingPeriods:', error);
    return [];
  }
}

/**
 * Get a single grading period by ID
 */
export async function getGradingPeriodById(
  id: string
): Promise<GradingPeriod | null> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('grading_periods')
      .select(
        `
        *,
        academic_year:academic_years(
          id,
          name
        )
      `
      )
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching grading period:', error);
      return null;
    }

    if (!data) return null;

    return {
      ...data,
      academic_year: data.academic_year?.[0] || data.academic_year,
    };
  } catch (error) {
    console.error('Unexpected error in getGradingPeriodById:', error);
    return null;
  }
}

/**
 * Update a grading period
 */
export async function updateGradingPeriod(
  id: string,
  updates: UpdateGradingPeriodInput
): Promise<ActionResult<GradingPeriod>> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('grading_periods')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating grading period:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Unexpected error in updateGradingPeriod:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Create a new grading period
 */
export async function createGradingPeriod(input: {
  school_id: string;
  academic_year_id: string;
  name: string;
  start_date: string;
  end_date: string;
  order: number;
  is_active?: boolean;
}): Promise<ActionResult<GradingPeriod>> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('grading_periods')
      .insert({
        ...input,
        is_active: input.is_active ?? false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating grading period:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Unexpected error in createGradingPeriod:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

// ============================================================================
// SCHOOL SETTINGS
// ============================================================================

/**
 * Get school settings
 */
export async function getSchoolSettings(
  schoolId: string
): Promise<SchoolSettings | null> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('school_settings')
      .select('*')
      .eq('school_id', schoolId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching school settings:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Unexpected error in getSchoolSettings:', error);
    return null;
  }
}

/**
 * Update school settings
 */
export async function updateSchoolSettings(
  schoolId: string,
  updates: UpdateSchoolSettingsInput
): Promise<ActionResult<SchoolSettings>> {
  try {
    const supabase = await createClient();

    // Check if settings exist
    const { data: existing } = await supabase
      .from('school_settings')
      .select('id')
      .eq('school_id', schoolId)
      .maybeSingle();

    let result;

    if (existing) {
      // Update existing settings
      result = await supabase
        .from('school_settings')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('school_id', schoolId)
        .select()
        .single();
    } else {
      // Create new settings with defaults
      result = await supabase
        .from('school_settings')
        .insert({
          school_id: schoolId,
          grading_system: updates.grading_system || 'percentage',
          passing_grade: updates.passing_grade ?? 75,
          max_grade: updates.max_grade ?? 100,
          allow_late_submissions: updates.allow_late_submissions ?? true,
          late_submission_penalty: updates.late_submission_penalty ?? 10,
          attendance_tracking: updates.attendance_tracking ?? true,
          auto_enroll: updates.auto_enroll ?? false,
          enrollment_approval_required:
            updates.enrollment_approval_required ?? true,
          student_messaging: updates.student_messaging ?? true,
          message_quota_per_day: updates.message_quota_per_day ?? 10,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();
    }

    if (result.error) {
      console.error('Error updating school settings:', result.error);
      return { success: false, error: result.error.message };
    }

    return { success: true, data: result.data };
  } catch (error) {
    console.error('Unexpected error in updateSchoolSettings:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Get school details
 */
export async function getSchool(
  schoolId: string
): Promise<{
  id: string;
  slug: string;
  name: string;
  region?: string;
  division?: string;
  logo_url?: string;
  accent_color?: string;
} | null> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('schools')
      .select('*')
      .eq('id', schoolId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching school:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Unexpected error in getSchool:', error);
    return null;
  }
}

// ============================================================================
// ADDITIONAL FUNCTIONS FOR API ROUTES
// ============================================================================

/**
 * Set the current academic year for a school
 */
export async function setCurrentAcademicYear(
  schoolId: string,
  academicYearId: string
): Promise<ActionResult<AcademicYear>> {
  try {
    const supabase = await createClient();

    // First, unset all current years for this school
    await supabase
      .from('academic_years')
      .update({ is_current: false, updated_at: new Date().toISOString() })
      .eq('school_id', schoolId);

    // Set the new current year
    const { data, error } = await supabase
      .from('academic_years')
      .update({ is_current: true, updated_at: new Date().toISOString() })
      .eq('id', academicYearId)
      .eq('school_id', schoolId)
      .select()
      .single();

    if (error) {
      console.error('Error setting current academic year:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Unexpected error in setCurrentAcademicYear:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Delete an academic year
 */
export async function deleteAcademicYear(
  id: string
): Promise<ActionResult<void>> {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from('academic_years')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting academic year:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Unexpected error in deleteAcademicYear:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Get academic settings (alias for school settings grading config)
 */
export async function getAcademicSettings(
  schoolId: string
): Promise<AcademicSettings | null> {
  const settings = await getSchoolSettings(schoolId);
  if (!settings) return null;

  return {
    grading_system: settings.grading_system,
    passing_grade: settings.passing_grade,
    max_grade: settings.max_grade,
    allow_late_submissions: settings.allow_late_submissions,
    late_submission_penalty: settings.late_submission_penalty,
  };
}

/**
 * Update academic settings
 */
export async function updateAcademicSettings(
  schoolId: string,
  updates: Partial<AcademicSettings>
): Promise<ActionResult<AcademicSettings>> {
  const result = await updateSchoolSettings(schoolId, updates);
  if (!result.success) {
    return { success: false, error: result.error };
  }

  return {
    success: true,
    data: {
      grading_system: result.data!.grading_system,
      passing_grade: result.data!.passing_grade,
      max_grade: result.data!.max_grade,
      allow_late_submissions: result.data!.allow_late_submissions,
      late_submission_penalty: result.data!.late_submission_penalty,
    },
  };
}

/**
 * Get grading scale for a school
 */
export async function getGradingScale(
  schoolId: string
): Promise<GradingScale[]> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('grading_scales')
      .select('*')
      .eq('school_id', schoolId)
      .order('min_grade', { ascending: true });

    if (error) {
      console.error('Error fetching grading scale:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Unexpected error in getGradingScale:', error);
    return [];
  }
}

/**
 * Update grading scale
 */
export async function updateGradingScale(
  schoolId: string,
  scales: Omit<GradingScale, 'id' | 'school_id'>[]
): Promise<ActionResult<GradingScale[]>> {
  try {
    const supabase = await createClient();

    // Delete existing scales
    await supabase.from('grading_scales').delete().eq('school_id', schoolId);

    // Insert new scales
    const { data, error } = await supabase
      .from('grading_scales')
      .insert(
        scales.map((scale) => ({
          ...scale,
          school_id: schoolId,
        }))
      )
      .select();

    if (error) {
      console.error('Error updating grading scale:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Unexpected error in updateGradingScale:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Upload school logo
 */
export async function uploadSchoolLogo(
  schoolId: string,
  file: File
): Promise<ActionResult<{ url: string }>> {
  try {
    const supabase = await createClient();

    const fileExt = file.name.split('.').pop();
    const fileName = `${schoolId}/logo.${fileExt}`;

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from('school-assets')
      .upload(fileName, file, { upsert: true });

    if (uploadError) {
      console.error('Error uploading logo:', uploadError);
      return { success: false, error: uploadError.message };
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('school-assets')
      .getPublicUrl(fileName);

    // Update school record
    await supabase
      .from('schools')
      .update({
        logo_url: urlData.publicUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', schoolId);

    return { success: true, data: { url: urlData.publicUrl } };
  } catch (error) {
    console.error('Unexpected error in uploadSchoolLogo:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Update school details
 */
export async function updateSchool(
  schoolId: string,
  updates: {
    name?: string;
    region?: string;
    division?: string;
    accent_color?: string;
  }
): Promise<ActionResult<{ id: string; name: string }>> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('schools')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', schoolId)
      .select('id, name')
      .single();

    if (error) {
      console.error('Error updating school:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Unexpected error in updateSchool:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}
