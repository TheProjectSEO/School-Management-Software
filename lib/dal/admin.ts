/**
 * Admin Authentication for API Routes
 * Use this in API routes for admin authentication
 */

import { createServiceClient } from '@/lib/supabase/service';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';
import { headers } from 'next/headers';

/**
 * Get user info from request headers (set by middleware)
 */
export async function getUserFromHeaders(): Promise<{ sub: string; email: string; role: string; profile_id: string; school_id?: string; permissions: string[] } | null> {
  try {
    const headersList = await headers();
    const userId = headersList.get('x-user-id');
    const email = headersList.get('x-user-email');
    const role = headersList.get('x-user-role');
    const profileId = headersList.get('x-user-profile-id');
    const schoolId = headersList.get('x-user-school-id');
    const permissionsStr = headersList.get('x-user-permissions');

    if (!userId || !email || !role) {
      return null;
    }

    let permissions: string[] = [];
    if (permissionsStr) {
      try {
        permissions = JSON.parse(permissionsStr);
      } catch {
        permissions = [];
      }
    }

    return {
      sub: userId,
      email,
      role,
      profile_id: profileId || '',
      school_id: schoolId || undefined,
      permissions,
    };
  } catch {
    return null;
  }
}

// Types
export type AdminRole = 'super_admin' | 'school_admin' | 'admin' | 'registrar' | 'support';

export type AdminPermission =
  | 'users:read'
  | 'users:create'
  | 'users:update'
  | 'users:delete'
  | 'enrollments:read'
  | 'enrollments:create'
  | 'enrollments:update'
  | 'finance:read'
  | 'finance:create'
  | 'finance:update'
  | 'finance:delete'
  | 'reports:read'
  | 'reports:export'
  | 'settings:read'
  | 'settings:update'
  | 'audit:read';

export type AdminContext = {
  userId: string;
  adminId: string;
  profileId: string;
  schoolId: string;
  fullName: string;
  email: string;
  role: AdminRole;
  permissions: AdminPermission[];
};

type AuthResult =
  | { success: true; admin: AdminContext }
  | { success: false; response: NextResponse };

/**
 * Get default permissions based on admin role
 */
function getDefaultPermissions(role: AdminRole): AdminPermission[] {
  if (role === 'super_admin') {
    return [
      'users:read',
      'users:create',
      'users:update',
      'users:delete',
      'enrollments:read',
      'enrollments:create',
      'enrollments:update',
      'finance:read',
      'finance:create',
      'finance:update',
      'finance:delete',
      'reports:read',
      'reports:export',
      'settings:read',
      'settings:update',
      'audit:read',
    ];
  }

  // Handle both 'school_admin' and 'admin' (database alias)
  if (role === 'school_admin' || role === 'admin') {
    return [
      'users:read',
      'users:create',
      'users:update',
      'enrollments:read',
      'enrollments:create',
      'enrollments:update',
      'finance:read',
      'finance:create',
      'finance:update',
      'finance:delete',
      'reports:read',
      'reports:export',
      'settings:read',
      'settings:update',
      'audit:read',
    ];
  }

  if (role === 'registrar') {
    return [
      'users:read',
      'users:create',
      'users:update',
      'enrollments:read',
      'enrollments:create',
      'enrollments:update',
      'reports:read',
    ];
  }

  // Support role
  return ['users:read', 'enrollments:read', 'reports:read', 'audit:read'];
}

/**
 * Require admin authentication for API routes
 * Optionally requires a specific permission
 * Returns admin context or error response
 */
export async function requireAdminAPI(
  requiredPermission?: AdminPermission
): Promise<AuthResult> {
  try {
    // Use headers set by middleware (contains JWT-decoded user info)
    const currentUser = await getUserFromHeaders();

    if (!currentUser) {
      return {
        success: false,
        response: NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        ),
      };
    }

    // Use admin client to bypass RLS
    const supabase = createAdminClient();

    // Get school_profile first
    const { data: profile, error: profileError } = await supabase
      .from('school_profiles')
      .select('id, full_name, role')
      .eq('auth_user_id', currentUser.sub)
      .single();

    if (profileError || !profile) {
      return {
        success: false,
        response: NextResponse.json(
          { error: 'Profile not found' },
          { status: 403 }
        ),
      };
    }

    // Get admin record
    const { data: admin, error: adminError } = await supabase
      .from('admins')
      .select('id, school_id, profile_id')
      .eq('profile_id', profile.id)
      .single();

    if (adminError || !admin) {
      return {
        success: false,
        response: NextResponse.json(
          { error: 'Admin profile not found' },
          { status: 403 }
        ),
      };
    }

    const role = (profile.role || 'school_admin') as AdminRole;
    const permissions = getDefaultPermissions(role);

    const adminContext: AdminContext = {
      userId: currentUser.sub,
      adminId: admin.id,
      profileId: profile.id,
      schoolId: admin.school_id,
      fullName: profile.full_name || 'Admin',
      email: currentUser.email || '',
      role,
      permissions,
    };

    // Check for required permission if specified
    if (requiredPermission && !hasPermission(adminContext, requiredPermission)) {
      return {
        success: false,
        response: NextResponse.json(
          { error: 'Insufficient permissions' },
          { status: 403 }
        ),
      };
    }

    return {
      success: true,
      admin: adminContext,
    };
  } catch (error) {
    console.error('requireAdminAPI error:', error);
    return {
      success: false,
      response: NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      ),
    };
  }
}

/**
 * Check if admin has a specific permission
 * Can be called with just a permission (will get current admin automatically)
 * or with both admin context and permission
 */
export async function hasPermission(
  permissionOrAdmin: AdminPermission | AdminContext,
  permission?: AdminPermission
): Promise<boolean> {
  // If called with just a permission, get current admin
  if (typeof permissionOrAdmin === 'string') {
    const admin = await getCurrentAdmin();
    if (!admin) return false;
    if (admin.role === 'super_admin') return true;
    return admin.permissions.includes(permissionOrAdmin as AdminPermission);
  }

  // Called with admin context and permission
  const admin = permissionOrAdmin as AdminContext;
  const perm = permission as AdminPermission;
  if (admin.role === 'super_admin') return true;
  return admin.permissions.includes(perm);
}

/**
 * Get the current admin profile (for non-API use)
 */
export async function getCurrentAdmin(): Promise<AdminContext | null> {
  try {
    // Use headers set by middleware (contains JWT-decoded user info)
    const currentUser = await getUserFromHeaders();
    if (!currentUser) return null;

    // Use admin client to bypass RLS
    const supabase = createAdminClient();

    // Get school_profile first
    const { data: profile, error: profileError } = await supabase
      .from('school_profiles')
      .select('id, full_name, role')
      .eq('auth_user_id', currentUser.sub)
      .single();

    if (profileError || !profile) {
      return null;
    }

    // Get admin record
    const { data: admin, error: adminError } = await supabase
      .from('admins')
      .select('id, school_id, profile_id')
      .eq('profile_id', profile.id)
      .single();

    if (adminError || !admin) {
      return null;
    }

    const role = (profile.role || 'school_admin') as AdminRole;
    const permissions = getDefaultPermissions(role);

    return {
      userId: currentUser.sub,
      adminId: admin.id,
      profileId: profile.id,
      schoolId: admin.school_id,
      fullName: profile.full_name || 'Admin',
      email: currentUser.email || '',
      role,
      permissions,
    };
  } catch (error) {
    console.error('getCurrentAdmin error:', error);
    return null;
  }
}

// ============================================================================
// ADMIN DATA ACCESS FUNCTIONS
// ============================================================================

export interface AuditLog {
  id: string;
  school_id?: string;
  actor_id?: string;
  actor_name?: string;
  action: string;
  resource_type?: string;
  resource_id?: string;
  details?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

/**
 * Get audit logs with optional filters
 */
export async function getAuditLogs(params?: {
  schoolId?: string;
  actorId?: string;
  adminId?: string; // Alias for actorId
  action?: string;
  resourceType?: string;
  entityType?: string; // Alias for resourceType
  startDate?: string;
  endDate?: string;
  dateFrom?: string; // Alias for startDate
  dateTo?: string; // Alias for endDate
  page?: number;
  pageSize?: number;
}): Promise<{ data: AuditLog[]; total: number }> {
  try {
    const supabase = createAdminClient();
    const { page = 1, pageSize = 20 } = params || {};

    let query = supabase
      .from('audit_logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (params?.schoolId) {
      query = query.eq('school_id', params.schoolId);
    }

    // Support both actorId and adminId (alias)
    const actorId = params?.actorId || params?.adminId;
    if (actorId) {
      query = query.eq('actor_id', actorId);
    }

    if (params?.action) {
      query = query.eq('action', params.action);
    }

    // Support both resourceType and entityType (alias)
    const resourceType = params?.resourceType || params?.entityType;
    if (resourceType) {
      query = query.eq('resource_type', resourceType);
    }

    // Support both startDate and dateFrom (alias)
    const startDate = params?.startDate || params?.dateFrom;
    if (startDate) {
      query = query.gte('created_at', startDate);
    }

    // Support both endDate and dateTo (alias)
    const endDate = params?.endDate || params?.dateTo;
    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, count, error } = await query.range(from, to);

    if (error) {
      console.error('Error fetching audit logs:', error);
      return { data: [], total: 0 };
    }

    return { data: data || [], total: count || 0 };
  } catch (error) {
    console.error('Unexpected error in getAuditLogs:', error);
    return { data: [], total: 0 };
  }
}

/**
 * Get audit log by ID
 */
export async function getAuditLogById(id: string): Promise<AuditLog | null> {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching audit log:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Unexpected error in getAuditLogById:', error);
    return null;
  }
}

export interface StudentListItem {
  id: string;
  profile_id?: string;
  lrn: string;
  grade_level: string;
  status: string;
  // Flat fields for frontend compatibility
  full_name?: string;
  section_name?: string;
  created_at?: string;
  email?: string;
  // Nested structure
  profile?: {
    id: string;
    full_name: string;
    email?: string;
    avatar_url?: string;
  };
  section?: {
    id: string;
    name: string;
  };
}

/**
 * List students with optional filters
 * Uses direct queries with service client to bypass RLS
 */
export async function listStudents(params?: {
  schoolId?: string;
  sectionId?: string;
  gradeLevel?: string;
  status?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ data: StudentListItem[]; total: number; page: number; pageSize: number; totalPages: number }> {
  try {
    const supabase = createAdminClient();
    const { search, status, sectionId, gradeLevel, page = 1, pageSize = 20 } = params || {};

    // Get ALL students first with profile data via FK join
    // We'll filter by search/status in memory since PostgREST can't handle OR on FK fields
    let query = supabase
      .from('students')
      .select(`
        *,
        school_profiles!students_profile_id_fkey(
          id,
          full_name,
          email,
          avatar_url,
          status
        ),
        sections(
          id,
          name,
          grade_level
        )
      `)
      .order('created_at', { ascending: false });

    // Apply direct filters (on students table only)
    if (sectionId) {
      query = query.eq('section_id', sectionId);
    }

    if (gradeLevel) {
      query = query.eq('grade_level', gradeLevel);
    }

    // Execute query to get all matching records
    const { data: allStudents, error } = await query;

    if (error) {
      console.error('Error listing students:', error);
      return { data: [], total: 0, page, pageSize, totalPages: 0 };
    }

    if (!allStudents || allStudents.length === 0) {
      return { data: [], total: 0, page, pageSize, totalPages: 0 };
    }

    // Transform to StudentListItem format
    let students: StudentListItem[] = allStudents.map((s: any) => {
      const profile = s.school_profiles;
      const section = s.sections;

      return {
        id: s.id,
        profile_id: s.profile_id,
        lrn: s.lrn || '',
        grade_level: s.grade_level || '',
        status: profile?.status || 'active',
        full_name: profile?.full_name || 'Unknown',
        email: profile?.email || '',
        section_name: section?.name,
        created_at: s.created_at,
        profile: profile ? {
          id: profile.id,
          full_name: profile.full_name,
          avatar_url: profile.avatar_url,
        } : undefined,
        section: section ? {
          id: section.id,
          name: section.name,
        } : undefined,
      };
    });

    // Apply search filter in code (after fetching)
    if (search) {
      const searchLower = search.toLowerCase();
      students = students.filter(s =>
        (s.lrn && s.lrn.toLowerCase().includes(searchLower)) ||
        (s.full_name && s.full_name.toLowerCase().includes(searchLower)) ||
        (s.email && s.email.toLowerCase().includes(searchLower))
      );
    }

    // Apply status filter in code
    if (status) {
      students = students.filter(s => s.status === status);
    }

    // Calculate total after filtering
    const total = students.length;

    // Apply pagination
    const from = (page - 1) * pageSize;
    const paginatedStudents = students.slice(from, from + pageSize);

    return {
      data: paginatedStudents,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  } catch (error) {
    console.error('Unexpected error in listStudents:', error);
    return { data: [], total: 0, page: 1, pageSize: 20, totalPages: 0 };
  }
}

export interface TeacherListItem {
  id: string;
  profile_id?: string;
  employee_id?: string;
  department?: string;
  specialization?: string;
  status: string;
  is_active?: boolean;
  created_at?: string;
  // Flat fields for frontend compatibility
  full_name?: string;
  email?: string;
  // Nested structure
  profile: {
    id: string;
    full_name: string;
    email?: string;
    avatar_url?: string;
  };
}

/**
 * List teachers with optional filters
 */
/**
 * Verify admin password for sensitive operations
 * Uses Supabase signInWithPassword to verify credentials
 */
export async function verifyAdminPassword(
  email: string,
  password: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createServiceClient();

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { success: false, error: 'Invalid password' };
    }

    return { success: true };
  } catch (error) {
    console.error('Error verifying admin password:', error);
    return { success: false, error: 'Failed to verify password' };
  }
}

export async function listTeachers(params?: {
  schoolId?: string;
  department?: string;
  status?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ data: TeacherListItem[]; total: number; page: number; pageSize: number; totalPages: number }> {
  try {
    const supabase = createAdminClient();
    const { search, status, page = 1, pageSize = 20 } = params || {};

    let query = supabase
      .from('teacher_profiles')
      .select(
        `
        id,
        profile_id,
        employee_id,
        department,
        specialization,
        is_active,
        created_at,
        school_profiles!teacher_profiles_profile_id_fkey(id, full_name, email)
      `
      )
      .order('created_at', { ascending: false });

    // Apply simple filters in SQL
    if (status === 'active') {
      query = query.eq('is_active', true);
    } else if (status === 'inactive') {
      query = query.eq('is_active', false);
    }

    if (params?.department) {
      query = query.eq('department', params.department);
    }

    // Fetch ALL teachers (no pagination in SQL - we'll filter and paginate in JS)
    const { data, error } = await query;

    if (error) {
      console.error('Error listing teachers:', error);
      return { data: [], total: 0, page, pageSize, totalPages: 0 };
    }

    // Transform the data - flatten for frontend compatibility
    let teachers: TeacherListItem[] = (data || []).map((t: Record<string, unknown>) => {
      const profile = t.school_profiles as Record<string, unknown> | null;
      return {
        id: t.id as string,
        profile_id: t.profile_id as string,
        employee_id: t.employee_id as string || '',
        department: t.department as string || '',
        specialization: t.specialization as string || '',
        status: (t.is_active ? 'active' : 'inactive'),
        is_active: t.is_active as boolean,
        created_at: t.created_at as string,
        // Flat fields for frontend compatibility
        full_name: (profile?.full_name as string) || 'Unknown',
        email: (profile?.email as string) || '',
        // Nested structure for backwards compatibility
        profile: {
          id: (t.profile_id as string) || '',
          full_name: (profile?.full_name as string) || 'Unknown',
          email: (profile?.email as string) || '',
        },
      };
    });

    // Apply search filter in JavaScript (PostgREST can't OR with FK joins)
    if (search) {
      const searchLower = search.toLowerCase();
      teachers = teachers.filter((t) => {
        return (
          (t.employee_id && t.employee_id.toLowerCase().includes(searchLower)) ||
          (t.full_name && t.full_name.toLowerCase().includes(searchLower)) ||
          (t.email && t.email.toLowerCase().includes(searchLower))
        );
      });
    }

    // Paginate after filtering
    const total = teachers.length;
    const totalPages = Math.ceil(total / pageSize);
    const from = (page - 1) * pageSize;
    const to = from + pageSize;
    const paginatedTeachers = teachers.slice(from, to);

    return {
      data: paginatedTeachers,
      total,
      page,
      pageSize,
      totalPages,
    };
  } catch (error) {
    console.error('Unexpected error in listTeachers:', error);
    return { data: [], total: 0, page: 1, pageSize: 20, totalPages: 0 };
  }
}
