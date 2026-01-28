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
/**
 * Get the currently authenticated admin profile
 * Uses direct queries to fetch admin profile
 */
export async function getCurrentAdmin(): Promise<AdminProfile | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Get school_profile first
  const { data: profile, error: profileError } = await supabase
    .from('school_profiles')
    .select('id, full_name, role')
    .eq('auth_user_id', user.id)
    .single();

  if (profileError || !profile) {
    console.error("Error fetching school profile:", profileError?.message);
    return null;
  }

  // Get admin record
  const { data: admin, error: adminError } = await supabase
    .from('admins')
    .select('id, school_id, profile_id')
    .eq('profile_id', profile.id)
    .single();

  if (adminError || !admin) {
    console.error("No admin profile found for user");
    return null;
  }

  // Get school name
  const { data: school } = await supabase
    .from('schools')
    .select('id, name')
    .eq('id', admin.school_id)
    .single();

  const role = (profile.role || 'school_admin') as AdminRole;

  // Default permissions based on role
  const permissions: AdminPermission[] =
    role === "super_admin" ? [
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
    id: admin.id,
    profile_id: profile.id,
    school_id: admin.school_id,
    role: role,
    is_active: true,
    profile: {
      id: profile.id,
      full_name: profile.full_name,
      email: user.email || "",
    },
    schools: {
      id: admin.school_id,
      name: school?.name || "Unknown School",
    },
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
  gradeLevel?: string;
  page?: number;
  pageSize?: number;
}): Promise<PaginatedResult<UserListItem>> {
  const supabase = await createClient();
  const { search, status, sectionId, gradeLevel, page = 1, pageSize = 20 } = params;

  // Use direct query instead of RPC for better compatibility
  let query = supabase
    .from('students')
    .select(`
      id,
      profile_id,
      school_id,
      section_id,
      lrn,
      grade_level,
      status,
      created_at,
      updated_at,
      school_profiles!inner(id, full_name, avatar_url, email),
      sections(id, name, grade_level)
    `, { count: 'exact' })
    .order('created_at', { ascending: false });

  if (sectionId) {
    query = query.eq('section_id', sectionId);
  }

  if (gradeLevel) {
    query = query.eq('grade_level', gradeLevel);
  }

  if (status && status !== 'all') {
    query = query.eq('status', status);
  }

  if (search) {
    query = query.or(`lrn.ilike.%${search}%,school_profiles.full_name.ilike.%${search}%`);
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, count, error } = await query.range(from, to);

  if (error) {
    console.error("Error listing students:", error);
    return { data: [], total: 0, page, pageSize, totalPages: 0 };
  }

  const users: UserListItem[] = (data || []).map((s: Record<string, unknown>) => {
    const profile = s.school_profiles as Record<string, unknown> | null;
    const section = s.sections as Record<string, unknown> | null;
    return {
      id: s.id as string,
      profile_id: s.profile_id as string,
      full_name: (profile?.full_name as string) || "",
      email: (profile?.email as string) || "",
      role: "student" as const,
      status: (s.status as "active" | "inactive" | "suspended") || "active",
      grade_level: s.grade_level as string,
      section_name: section ? (section.name as string) : undefined,
      created_at: s.created_at as string,
    };
  });

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
      school_profiles!inner(id, full_name, email)
    `,
      { count: "exact" }
    )
    .order("created_at", { ascending: false });

  // Search by employee_id only (nested table search doesn't work with .or())
  if (search) {
    query = query.ilike('employee_id', `%${search}%`);
  }

  if (status === "active") {
    query = query.eq("is_active", true);
  } else if (status === "inactive") {
    query = query.eq("is_active", false);
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, count, error } = await query.range(from, to);

  if (error) {
    console.error("Error listing teachers:", error);
    return { data: [], total: 0, page, pageSize, totalPages: 0 };
  }

  const users: UserListItem[] = (data || []).map((t: Record<string, unknown>) => {
    const profile = t.school_profiles as Record<string, unknown> | null;
    return {
      id: t.id as string,
      profile_id: t.profile_id as string,
      full_name: (profile?.full_name as string) || "",
      email: (profile?.email as string) || "",
      role: "teacher" as const,
      status: (t.is_active ? "active" : "inactive") as "active" | "inactive",
      department: t.department as string,
      created_at: t.created_at as string,
    };
  });

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
