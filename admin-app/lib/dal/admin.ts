import { createClient } from "@/lib/supabase/server";

// Types
export type AdminRole = "super_admin" | "school_admin" | "registrar" | "support";
export type AdminPermission =
  | "users:read"
  | "users:create"
  | "users:update"
  | "users:delete"
  | "enrollments:read"
  | "enrollments:create"
  | "enrollments:update"
  | "reports:read"
  | "reports:export"
  | "settings:read"
  | "settings:update"
  | "audit:read";

export interface AdminProfile {
  id: string;
  profile_id: string;
  school_id: string;
  role: AdminRole;
  permissions: AdminPermission[];
  is_active: boolean;
  last_login_at?: string;
  profile?: {
    id: string;
    full_name: string;
    email: string;
  };
  schools?: {
    id: string;
    name: string;
  };
}

export interface UserListItem {
  id: string;
  profile_id: string;
  full_name: string;
  email: string;
  role: "student" | "teacher";
  status: "active" | "inactive" | "suspended";
  grade_level?: string;
  section_name?: string;
  department?: string;
  created_at: string;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface BulkImportResult {
  success: number;
  failed: number;
  errors: { row: number; message: string }[];
}

// Functions
export async function getCurrentAdmin(): Promise<AdminProfile | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("auth_user_id", user.id)
    .single();

  if (profileError || !profile) {
    console.error("Profile error:", profileError);
    return null;
  }

  const { data: adminProfile, error: adminError } = await supabase
    .from("admin_profiles")
    .select("id, profile_id, school_id, role, is_active")
    .eq("profile_id", profile.id)
    .eq("is_active", true)
    .single();

  if (adminError || !adminProfile) {
    console.error("Admin profile error:", adminError);
    return null;
  }

  // Get school separately
  const { data: school } = await supabase
    .from("schools")
    .select("id, name")
    .eq("id", adminProfile.school_id)
    .single();

  // Default permissions based on role
  const permissions: AdminPermission[] =
    adminProfile.role === "super_admin" ? [
      "users:read", "users:create", "users:update", "users:delete",
      "enrollments:read", "enrollments:create", "enrollments:update",
      "reports:read", "reports:export",
      "settings:read", "settings:update",
      "audit:read"
    ] : [
      "users:read", "users:create", "users:update",
      "enrollments:read", "enrollments:create", "enrollments:update",
      "reports:read", "reports:export",
      "settings:read",
      "audit:read"
    ];

  return {
    ...adminProfile,
    profile: {
      ...profile,
      email: user.email || "",
    },
    schools: school,
    permissions,
  } as AdminProfile;
}

export async function hasPermission(permission: AdminPermission): Promise<boolean> {
  const admin = await getCurrentAdmin();
  if (!admin) return false;

  // Super admin has all permissions
  if (admin.role === "super_admin") return true;

  return admin.permissions.includes(permission);
}

export async function listStudents(params: {
  search?: string;
  status?: string;
  sectionId?: string;
  page?: number;
  pageSize?: number;
}): Promise<PaginatedResult<UserListItem>> {
  const supabase = await createClient();
  const { search, status, sectionId, page = 1, pageSize = 20 } = params;

  let query = supabase
    .from("students")
    .select(
      `
      id,
      profile_id,
      lrn,
      grade_level,
      status,
      created_at,
      profiles(id, full_name),
      sections(id, name)
    `,
      { count: "exact" }
    );

  if (search) {
    query = query.or(`profiles.full_name.ilike.%${search}%,lrn.ilike.%${search}%`);
  }

  if (status) {
    query = query.eq("status", status);
  }

  if (sectionId) {
    query = query.eq("section_id", sectionId);
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, count, error } = await query.range(from, to).order("created_at", { ascending: false });

  if (error) {
    console.error("Error listing students:", error);
    return { data: [], total: 0, page, pageSize, totalPages: 0 };
  }

  const users: UserListItem[] = (data || []).map((s: Record<string, unknown>) => ({
    id: s.id as string,
    profile_id: s.profile_id as string,
    full_name: (s.profiles as { full_name: string })?.full_name || "",
    email: "", // Email not available in list view
    role: "student" as const,
    status: (s.status as "active" | "inactive" | "suspended") || "active",
    grade_level: s.grade_level as string,
    section_name: (s.sections as { name: string })?.name,
    created_at: s.created_at as string,
  }));

  return {
    data: users,
    total: count || 0,
    page,
    pageSize,
    totalPages: Math.ceil((count || 0) / pageSize),
  };
}

export async function listTeachers(params: {
  search?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}): Promise<PaginatedResult<UserListItem>> {
  const supabase = await createClient();
  const { search, status, page = 1, pageSize = 20 } = params;

  let query = supabase
    .from("teacher_profiles")
    .select(
      `
      id,
      profile_id,
      employee_id,
      department,
      is_active,
      created_at,
      profiles(id, full_name)
    `,
      { count: "exact" }
    );

  if (search) {
    query = query.or(`profiles.full_name.ilike.%${search}%,employee_id.ilike.%${search}%`);
  }

  if (status === "active") {
    query = query.eq("is_active", true);
  } else if (status === "inactive") {
    query = query.eq("is_active", false);
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, count, error } = await query.range(from, to).order("created_at", { ascending: false });

  if (error) {
    console.error("Error listing teachers:", error);
    return { data: [], total: 0, page, pageSize, totalPages: 0 };
  }

  const users: UserListItem[] = (data || []).map((t: Record<string, unknown>) => ({
    id: t.id as string,
    profile_id: t.profile_id as string,
    full_name: (t.profiles as { full_name: string })?.full_name || "",
    email: "", // Email not available in list view
    role: "teacher" as const,
    status: (t.is_active ? "active" : "inactive") as "active" | "inactive",
    department: t.department as string,
    created_at: t.created_at as string,
  }));

  return {
    data: users,
    total: count || 0,
    page,
    pageSize,
    totalPages: Math.ceil((count || 0) / pageSize),
  };
}

export async function getSchoolSettings(schoolId: string) {
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

  return data;
}

export async function updateSchoolSettings(
  schoolId: string,
  settings: Record<string, unknown>
): Promise<boolean> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("school_settings")
    .update({ ...settings, updated_at: new Date().toISOString() })
    .eq("school_id", schoolId);

  if (error) {
    console.error("Error updating school settings:", error);
    return false;
  }

  return true;
}

export async function getAuditLogs(params: {
  adminId?: string;
  entityType?: string;
  action?: string;
  page?: number;
  pageSize?: number;
}) {
  const supabase = await createClient();
  const { adminId, entityType, action, page = 1, pageSize = 50 } = params;

  let query = supabase.from("audit_logs").select("*", { count: "exact" });

  if (adminId) {
    query = query.eq("admin_id", adminId);
  }

  if (entityType) {
    query = query.eq("entity_type", entityType);
  }

  if (action) {
    query = query.eq("action", action);
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, count, error } = await query
    .range(from, to)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error getting audit logs:", error);
    return { data: [], total: 0, page, pageSize, totalPages: 0 };
  }

  return {
    data: data || [],
    total: count || 0,
    page,
    pageSize,
    totalPages: Math.ceil((count || 0) / pageSize),
  };
}

export async function logAuditEvent(event: {
  action: string;
  entityType: string;
  entityId?: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const supabase = await createClient();

  await supabase.rpc("log_audit", {
    p_action: event.action,
    p_entity_type: event.entityType,
    p_entity_id: event.entityId,
    p_old_values: event.oldValues,
    p_new_values: event.newValues,
    p_metadata: event.metadata,
  });
}
