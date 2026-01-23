import { createClient } from "@/lib/supabase/server";
import { logAuditEvent } from "./admin";

// Types
export interface SchoolSettings {
  id: string;
  school_id: string;
  name: string;
  code: string;
  address: string;
  city: string;
  province: string;
  postal_code: string;
  phone: string;
  email: string;
  website: string;
  principal: string;
  founded_year: string;
  school_type: string;
  logo_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface AcademicYear {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
  created_at: string;
}

export interface GradingPeriod {
  id: string;
  academic_year_id: string;
  name: string;
  short_name: string;
  start_date: string;
  end_date: string;
  weight: number;
  order: number;
}

export interface AcademicSettings {
  id: string;
  school_id: string;
  passing_grade: number;
  attendance_required: number;
  max_absences: number;
  late_threshold: number;
  class_start_time: string;
  class_end_time: string;
  created_at: string;
  updated_at: string;
}

export interface GradingScale {
  letter: string;
  min_score: number;
  max_score: number;
  description: string;
  color: string;
}

// School Settings Functions
export async function getSchoolSettings(schoolId: string): Promise<SchoolSettings | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("school_settings")
    .select("*")
    .eq("school_id", schoolId)
    .single();

  if (error) {
    console.error("Error getting school settings:", error);
    return null;
  }

  return data as unknown as SchoolSettings;
}

export async function updateSchoolSettings(
  schoolId: string,
  updates: Partial<SchoolSettings>
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("school_settings")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("school_id", schoolId);

  if (error) {
    return { success: false, error: error.message };
  }

  await logAuditEvent({
    action: "update",
    entityType: "school_settings",
    entityId: schoolId,
    newValues: updates,
  });

  return { success: true };
}

export async function uploadSchoolLogo(
  schoolId: string,
  file: File
): Promise<{ success: boolean; url?: string; error?: string }> {
  const supabase = await createClient();

  const fileExt = file.name.split(".").pop();
  const fileName = `${schoolId}/logo.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from("school-assets")
    .upload(fileName, file, { upsert: true });

  if (uploadError) {
    return { success: false, error: uploadError.message };
  }

  const { data: { publicUrl } } = supabase.storage
    .from("school-assets")
    .getPublicUrl(fileName);

  // Update school settings with new logo URL
  await updateSchoolSettings(schoolId, { logo_url: publicUrl } as Partial<SchoolSettings>);

  return { success: true, url: publicUrl };
}

// Academic Year Functions
export async function getAcademicYears(schoolId: string): Promise<AcademicYear[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("academic_years")
    .select("*")
    .eq("school_id", schoolId)
    .order("start_date", { ascending: false });

  if (error) {
    console.error("Error getting academic years:", error);
    return [];
  }

  return data as AcademicYear[];
}

export async function getCurrentAcademicYear(schoolId: string): Promise<AcademicYear | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("academic_years")
    .select("*")
    .eq("school_id", schoolId)
    .eq("is_current", true)
    .single();

  if (error) {
    console.error("Error getting current academic year:", error);
    return null;
  }

  return data as unknown as AcademicYear;
}

export async function createAcademicYear(
  schoolId: string,
  year: { name: string; startDate: string; endDate: string }
): Promise<{ success: boolean; id?: string; error?: string }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("academic_years")
    .insert({
      school_id: schoolId,
      name: year.name,
      start_date: year.startDate,
      end_date: year.endDate,
      is_current: false,
    })
    .select("id")
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  await logAuditEvent({
    action: "create",
    entityType: "academic_year",
    entityId: data.id,
    newValues: year,
  });

  return { success: true, id: data.id };
}

export async function setCurrentAcademicYear(
  schoolId: string,
  yearId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  // First, unset current for all years
  const { error: unsetError } = await supabase
    .from("academic_years")
    .update({ is_current: false })
    .eq("school_id", schoolId);

  if (unsetError) {
    return { success: false, error: unsetError.message };
  }

  // Set the new current year
  const { error: setError } = await supabase
    .from("academic_years")
    .update({ is_current: true })
    .eq("id", yearId);

  if (setError) {
    return { success: false, error: setError.message };
  }

  await logAuditEvent({
    action: "update",
    entityType: "academic_year",
    entityId: yearId,
    newValues: { is_current: true },
  });

  return { success: true };
}

export async function deleteAcademicYear(
  yearId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  // Check if year is current
  const { data: year } = await supabase
    .from("academic_years")
    .select("is_current")
    .eq("id", yearId)
    .single();

  if (year?.is_current) {
    return { success: false, error: "Cannot delete the current academic year" };
  }

  const { error } = await supabase
    .from("academic_years")
    .delete()
    .eq("id", yearId);

  if (error) {
    return { success: false, error: error.message };
  }

  await logAuditEvent({
    action: "delete",
    entityType: "academic_year",
    entityId: yearId,
  });

  return { success: true };
}

// Grading Period Functions
export async function getGradingPeriods(academicYearId: string): Promise<GradingPeriod[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("grading_periods")
    .select("*")
    .eq("academic_year_id", academicYearId)
    .order("order", { ascending: true });

  if (error) {
    console.error("Error getting grading periods:", error);
    return [];
  }

  return data as GradingPeriod[];
}

export async function updateGradingPeriod(
  periodId: string,
  updates: Partial<GradingPeriod>
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("grading_periods")
    .update(updates)
    .eq("id", periodId);

  if (error) {
    return { success: false, error: error.message };
  }

  await logAuditEvent({
    action: "update",
    entityType: "grading_period",
    entityId: periodId,
    newValues: updates,
  });

  return { success: true };
}

// Academic Settings Functions
export async function getAcademicSettings(schoolId: string): Promise<AcademicSettings | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("academic_settings")
    .select("*")
    .eq("school_id", schoolId)
    .single();

  if (error) {
    console.error("Error getting academic settings:", error);
    return null;
  }

  return data as unknown as AcademicSettings;
}

export async function updateAcademicSettings(
  schoolId: string,
  updates: Partial<AcademicSettings>
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("academic_settings")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("school_id", schoolId);

  if (error) {
    return { success: false, error: error.message };
  }

  await logAuditEvent({
    action: "update",
    entityType: "academic_settings",
    entityId: schoolId,
    newValues: updates,
  });

  return { success: true };
}

// Grading Scale Functions
export async function getGradingScale(schoolId: string): Promise<GradingScale[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("grading_scales")
    .select("*")
    .eq("school_id", schoolId)
    .order("min_score", { ascending: false });

  if (error) {
    console.error("Error getting grading scale:", error);
    return [];
  }

  return data as GradingScale[];
}

export async function updateGradingScale(
  schoolId: string,
  scales: GradingScale[]
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  // Delete existing scales
  await supabase.from("grading_scales").delete().eq("school_id", schoolId);

  // Insert new scales
  const { error } = await supabase
    .from("grading_scales")
    .insert(scales.map(scale => ({ ...scale, school_id: schoolId })));

  if (error) {
    return { success: false, error: error.message };
  }

  await logAuditEvent({
    action: "update",
    entityType: "grading_scale",
    entityId: schoolId,
    newValues: { scales },
  });

  return { success: true };
}
