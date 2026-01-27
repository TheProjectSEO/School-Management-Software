// Permission format: resource:action
export const PERMISSIONS = {
  // Admin permissions
  'users:read': 'View all users',
  'users:create': 'Create users',
  'users:update': 'Update users',
  'users:delete': 'Delete users',
  'enrollments:manage': 'Manage enrollments',
  'finance:manage': 'Manage finance',
  'reports:view': 'View reports',
  'settings:manage': 'Manage school settings',

  // Teacher permissions
  'classes:manage': 'Manage assigned classes',
  'grades:manage': 'Manage grades',
  'attendance:manage': 'Manage attendance',
  'assessments:create': 'Create assessments',
  'assessments:grade': 'Grade assessments',
  'content:manage': 'Manage course content',
  'students:view': 'View assigned students',

  // Student permissions
  'subjects:view': 'View enrolled subjects',
  'assessments:take': 'Take assessments',
  'grades:view_own': 'View own grades',
  'attendance:view_own': 'View own attendance',
  'profile:manage': 'Manage own profile',
} as const;

export type Permission = keyof typeof PERMISSIONS;

// Roles
export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  TEACHER: 'teacher',
  STUDENT: 'student',
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

// Wildcard permission for super admin
export type WildcardPermission = '*';

// Role-Permission Mapping
export const ROLE_PERMISSIONS: Record<Role, readonly Permission[] | readonly [WildcardPermission]> = {
  super_admin: ['*'] as const,

  admin: [
    'users:read',
    'users:create',
    'users:update',
    'users:delete',
    'enrollments:manage',
    'finance:manage',
    'reports:view',
    'settings:manage',
    'classes:manage',
    'students:view',
  ],

  teacher: [
    'classes:manage',
    'grades:manage',
    'attendance:manage',
    'assessments:create',
    'assessments:grade',
    'content:manage',
    'students:view',
    'profile:manage',
  ],

  student: [
    'subjects:view',
    'assessments:take',
    'grades:view_own',
    'attendance:view_own',
    'profile:manage',
  ],
};

// Route-to-permission mapping for API routes
export const API_ROUTE_PERMISSIONS: Record<string, Record<string, Permission>> = {
  '/api/admin/users': {
    GET: 'users:read',
    POST: 'users:create',
    PUT: 'users:update',
    DELETE: 'users:delete',
  },
  '/api/admin/enrollments': {
    GET: 'enrollments:manage',
    POST: 'enrollments:manage',
    PUT: 'enrollments:manage',
    DELETE: 'enrollments:manage',
  },
  '/api/admin/finance': {
    GET: 'finance:manage',
    POST: 'finance:manage',
  },
  '/api/admin/reports': {
    GET: 'reports:view',
  },
  '/api/admin/settings': {
    GET: 'settings:manage',
    PUT: 'settings:manage',
  },
  '/api/teacher/classes': {
    GET: 'classes:manage',
    POST: 'classes:manage',
    PUT: 'classes:manage',
  },
  '/api/teacher/grades': {
    GET: 'grades:manage',
    POST: 'grades:manage',
    PUT: 'grades:manage',
  },
  '/api/teacher/attendance': {
    GET: 'attendance:manage',
    POST: 'attendance:manage',
  },
  '/api/teacher/assessments': {
    GET: 'assessments:create',
    POST: 'assessments:create',
    PUT: 'assessments:grade',
  },
  '/api/student/subjects': {
    GET: 'subjects:view',
  },
  '/api/student/assessments': {
    GET: 'assessments:take',
    POST: 'assessments:take',
  },
  '/api/student/grades': {
    GET: 'grades:view_own',
  },
  '/api/student/attendance': {
    GET: 'attendance:view_own',
  },
};
