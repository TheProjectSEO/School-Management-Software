# Unified App Merge Plan: JWT + RBAC Authentication

## Executive Summary

Merge 4 separate Next.js apps (landing, admin, student, teacher) into a single unified application with JWT-based authentication and Role-Based Access Control (RBAC).

---

## Current State Analysis

### Existing Apps

| App | Auth Routes | Dashboard Routes | API Routes | Auth Method |
|-----|-------------|------------------|------------|-------------|
| landing | None | 1 (home) | None | None |
| admin | login | ~20+ pages | ~50+ endpoints | Supabase Auth + RPC role check |
| student | login, register | ~25+ pages | Some endpoints | Supabase Auth |
| teacher | login, teacher-register | ~25+ pages | ~60+ endpoints | Supabase Auth |

### Current Authentication Issues

1. **No JWT tokens** - Using Supabase session cookies only
2. **No centralized RBAC** - Each app checks roles independently via RPC
3. **Duplicated auth logic** - Each app has its own login implementation
4. **No unified session management** - Separate sessions per app
5. **No role-based routing** - Manual redirects after login

---

## Proposed Architecture

### Unified App Structure

```
apps/web/                          # Single unified Next.js app
├── app/
│   ├── (public)/                  # Public routes (no auth required)
│   │   ├── page.tsx               # Landing page
│   │   ├── about/
│   │   ├── contact/
│   │   └── features/
│   │
│   ├── (auth)/                    # Authentication routes
│   │   ├── layout.tsx
│   │   ├── login/page.tsx         # Unified login (role selection)
│   │   ├── register/page.tsx      # Student registration
│   │   ├── teacher-register/page.tsx
│   │   └── forgot-password/page.tsx
│   │
│   ├── (dashboard)/               # Protected routes (auth required)
│   │   ├── layout.tsx             # RBAC middleware wrapper
│   │   │
│   │   ├── admin/                 # Admin-only routes
│   │   │   ├── layout.tsx         # Admin layout + role guard
│   │   │   ├── page.tsx           # Admin dashboard
│   │   │   ├── analytics/
│   │   │   ├── applications/
│   │   │   ├── enrollments/
│   │   │   ├── finance/
│   │   │   ├── messages/
│   │   │   ├── reports/
│   │   │   ├── settings/
│   │   │   └── users/
│   │   │
│   │   ├── teacher/               # Teacher-only routes
│   │   │   ├── layout.tsx         # Teacher layout + role guard
│   │   │   ├── page.tsx           # Teacher dashboard
│   │   │   ├── ai-planner/
│   │   │   ├── assessments/
│   │   │   ├── attendance/
│   │   │   ├── calendar/
│   │   │   ├── classes/
│   │   │   ├── gradebook/
│   │   │   ├── grading/
│   │   │   ├── live-sessions/
│   │   │   ├── messages/
│   │   │   ├── question-banks/
│   │   │   ├── report-cards/
│   │   │   ├── students/
│   │   │   ├── subjects/
│   │   │   └── submissions/
│   │   │
│   │   ├── student/               # Student-only routes
│   │   │   ├── layout.tsx         # Student layout + role guard
│   │   │   ├── page.tsx           # Student dashboard
│   │   │   ├── announcements/
│   │   │   ├── ask-ai/
│   │   │   ├── assessments/
│   │   │   ├── attendance/
│   │   │   ├── downloads/
│   │   │   ├── grades/
│   │   │   ├── help/
│   │   │   ├── live-sessions/
│   │   │   ├── messages/
│   │   │   ├── notes/
│   │   │   ├── notifications/
│   │   │   ├── profile/
│   │   │   ├── progress/
│   │   │   └── subjects/
│   │   │
│   │   └── shared/                # Shared routes (all authenticated users)
│   │       ├── profile/
│   │       ├── settings/
│   │       └── notifications/
│   │
│   ├── api/                       # API routes
│   │   ├── auth/
│   │   │   ├── login/route.ts
│   │   │   ├── logout/route.ts
│   │   │   ├── refresh/route.ts
│   │   │   ├── register/route.ts
│   │   │   └── me/route.ts
│   │   ├── admin/                 # Admin API endpoints
│   │   ├── teacher/               # Teacher API endpoints
│   │   └── student/               # Student API endpoints
│   │
│   ├── layout.tsx                 # Root layout
│   └── globals.css
│
├── components/
│   ├── auth/                      # Auth components
│   │   ├── LoginForm.tsx
│   │   ├── RegisterForm.tsx
│   │   ├── RoleGuard.tsx
│   │   └── AuthProvider.tsx
│   ├── layouts/                   # Layout components
│   │   ├── AdminLayout.tsx
│   │   ├── TeacherLayout.tsx
│   │   ├── StudentLayout.tsx
│   │   └── PublicLayout.tsx
│   ├── shared/                    # Shared UI components
│   └── ui/                        # Base UI components
│
├── lib/
│   ├── auth/
│   │   ├── jwt.ts                 # JWT utilities
│   │   ├── rbac.ts                # RBAC utilities
│   │   ├── permissions.ts         # Permission definitions
│   │   └── session.ts             # Session management
│   ├── supabase/
│   │   ├── client.ts
│   │   ├── server.ts
│   │   └── admin.ts
│   └── utils/
│
├── middleware.ts                  # Auth + RBAC middleware
├── types/
│   ├── auth.ts
│   ├── rbac.ts
│   └── supabase.ts
└── hooks/
    ├── useAuth.ts
    ├── usePermissions.ts
    └── useRole.ts
```

---

## JWT Authentication Design

### Token Structure

```typescript
// Access Token Payload (short-lived: 15 minutes)
interface AccessTokenPayload {
  sub: string;              // User ID (Supabase auth.users.id)
  email: string;
  role: 'admin' | 'teacher' | 'student';
  permissions: string[];    // Array of permission codes
  school_id?: string;       // For multi-tenant support
  profile_id: string;       // Role-specific profile ID
  iat: number;              // Issued at
  exp: number;              // Expiration
}

// Refresh Token Payload (long-lived: 7 days)
interface RefreshTokenPayload {
  sub: string;              // User ID
  jti: string;              // Token ID (for revocation)
  iat: number;
  exp: number;
}
```

### Token Flow

```
1. User submits credentials
   ↓
2. Server validates with Supabase Auth
   ↓
3. Server fetches user role + permissions from DB
   ↓
4. Server generates JWT access token + refresh token
   ↓
5. Access token stored in memory (React state)
   Refresh token stored in httpOnly cookie
   ↓
6. Client sends access token in Authorization header
   ↓
7. Middleware validates token + checks permissions
   ↓
8. On token expiry, client uses refresh token to get new access token
```

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/login` | POST | Authenticate user, return tokens |
| `/api/auth/logout` | POST | Revoke refresh token, clear cookies |
| `/api/auth/refresh` | POST | Exchange refresh token for new access token |
| `/api/auth/register` | POST | Register new student/teacher |
| `/api/auth/me` | GET | Get current user info from token |

---

## RBAC (Role-Based Access Control) Design

### Roles

```typescript
enum Role {
  SUPER_ADMIN = 'super_admin',   // Full system access
  ADMIN = 'admin',               // School admin
  TEACHER = 'teacher',           // Teacher
  STUDENT = 'student',           // Student
}
```

### Permissions

```typescript
// Permission format: resource:action
const PERMISSIONS = {
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
```

### Role-Permission Mapping

```typescript
const ROLE_PERMISSIONS: Record<Role, string[]> = {
  super_admin: ['*'],  // All permissions

  admin: [
    'users:read', 'users:create', 'users:update', 'users:delete',
    'enrollments:manage', 'finance:manage', 'reports:view',
    'settings:manage', 'classes:manage', 'students:view',
  ],

  teacher: [
    'classes:manage', 'grades:manage', 'attendance:manage',
    'assessments:create', 'assessments:grade', 'content:manage',
    'students:view', 'profile:manage',
  ],

  student: [
    'subjects:view', 'assessments:take', 'grades:view_own',
    'attendance:view_own', 'profile:manage',
  ],
};
```

### Middleware Implementation

```typescript
// middleware.ts
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes - no auth needed
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  // Auth routes - redirect if already logged in
  if (isAuthRoute(pathname)) {
    const token = getTokenFromRequest(request);
    if (token && isValidToken(token)) {
      return redirectToDashboard(token.role);
    }
    return NextResponse.next();
  }

  // Protected routes - require auth + role check
  const token = getTokenFromRequest(request);

  if (!token) {
    return redirectToLogin(pathname);
  }

  if (!isValidToken(token)) {
    return redirectToLogin(pathname);
  }

  // Role-based route protection
  const requiredRole = getRequiredRole(pathname);
  if (requiredRole && token.role !== requiredRole) {
    return redirectToDashboard(token.role);
  }

  // Permission check for API routes
  if (pathname.startsWith('/api/')) {
    const requiredPermission = getRequiredPermission(pathname, request.method);
    if (requiredPermission && !hasPermission(token, requiredPermission)) {
      return new NextResponse(
        JSON.stringify({ error: 'Forbidden' }),
        { status: 403 }
      );
    }
  }

  return NextResponse.next();
}
```

---

## Database Schema Updates

### New Tables Required

```sql
-- Refresh tokens table (for token revocation)
CREATE TABLE refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  user_agent TEXT,
  ip_address INET
);

-- Role permissions table (for custom permission overrides)
CREATE TABLE role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role TEXT NOT NULL,
  permission TEXT NOT NULL,
  school_id UUID REFERENCES schools(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(role, permission, school_id)
);

-- User permissions table (for individual user overrides)
CREATE TABLE user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  permission TEXT NOT NULL,
  granted BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, permission)
);

-- Audit log for auth events
CREATE TABLE auth_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  event_type TEXT NOT NULL,  -- 'login', 'logout', 'token_refresh', 'permission_denied'
  ip_address INET,
  user_agent TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Migration Steps

### Phase 1: Setup New App Structure
1. Create `apps/web/` directory
2. Initialize Next.js with TypeScript, Tailwind
3. Setup base folder structure
4. Configure environment variables
5. Setup Supabase client

### Phase 2: Implement Auth System
1. Create JWT utility functions
2. Implement auth API routes (`/api/auth/*`)
3. Create AuthProvider context
4. Build login/register pages
5. Implement middleware for route protection
6. Add refresh token rotation

### Phase 3: Implement RBAC
1. Define permissions constants
2. Create role-permission mappings
3. Implement permission checking utilities
4. Add RoleGuard component
5. Update middleware for permission checks
6. Create usePermissions hook

### Phase 4: Migrate Landing Page
1. Copy landing page to `apps/web/app/(public)/`
2. Update imports and paths
3. Add navigation to login

### Phase 5: Migrate Admin Dashboard
1. Copy admin routes to `apps/web/app/(dashboard)/admin/`
2. Update layouts with RBAC guards
3. Migrate components
4. Update API routes
5. Test all admin functionality

### Phase 6: Migrate Teacher Dashboard
1. Copy teacher routes to `apps/web/app/(dashboard)/teacher/`
2. Update layouts with RBAC guards
3. Migrate components
4. Update API routes
5. Test all teacher functionality

### Phase 7: Migrate Student Dashboard
1. Copy student routes to `apps/web/app/(dashboard)/student/`
2. Update layouts with RBAC guards
3. Migrate components
4. Update API routes
5. Test all student functionality

### Phase 8: Consolidate Shared Components
1. Identify duplicate components across roles
2. Create shared component library
3. Refactor role-specific layouts to use shared components
4. Remove duplication

### Phase 9: Database Updates
1. Create new auth tables (refresh_tokens, etc.)
2. Add RLS policies for new tables
3. Create migration scripts
4. Test with Supabase

### Phase 10: Testing & Cleanup
1. End-to-end testing for all roles
2. Security audit (token handling, permissions)
3. Performance testing
4. Remove old apps after verification
5. Update deployment configuration

---

## Security Considerations

1. **Token Storage**
   - Access token: Memory only (not localStorage)
   - Refresh token: httpOnly, Secure, SameSite=Strict cookie

2. **Token Rotation**
   - Rotate refresh token on each use
   - Revoke old refresh token after rotation

3. **Rate Limiting**
   - Login attempts: 5 per minute per IP
   - Token refresh: 10 per minute per user

4. **Audit Logging**
   - Log all auth events
   - Log permission denied attempts

5. **Session Management**
   - Single session per device option
   - Force logout on password change

---

## Environment Variables

```env
# JWT Configuration
JWT_SECRET=<strong-secret-min-32-chars>
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Supabase
NEXT_PUBLIC_SUPABASE_URL=<supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>

# App
NEXT_PUBLIC_APP_URL=https://klase.ph
```

---

## Approval Required

Boss, please review this plan and let me know:

1. **Approve as-is** - Proceed with implementation
2. **Request changes** - Specify what needs modification
3. **Need clarification** - Ask questions about any section

I will not proceed with any implementation until you approve this plan.
