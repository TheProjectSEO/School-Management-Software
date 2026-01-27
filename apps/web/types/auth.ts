import { Role, Permission } from '@/lib/auth/permissions';

/**
 * User data returned from authentication
 */
export interface AuthUser {
  id: string;
  email: string;
  role: Role;
  profileId: string;
  schoolId?: string;
  permissions: Permission[];
}

/**
 * Login request body
 */
export interface LoginRequest {
  email: string;
  password: string;
}

/**
 * Login response
 */
export interface LoginResponse {
  user: AuthUser;
  redirectTo: string;
}

/**
 * Student registration request
 */
export interface StudentRegistrationRequest {
  type: 'student';
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  schoolId: string;
  gradeLevel?: string;
  lrn?: string;
}

/**
 * Teacher registration request
 */
export interface TeacherRegistrationRequest {
  type: 'teacher';
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  schoolId: string;
  employeeId?: string;
  department?: string;
}

/**
 * Registration request (student or teacher)
 */
export type RegistrationRequest = StudentRegistrationRequest | TeacherRegistrationRequest;

/**
 * Registration response
 */
export interface RegistrationResponse {
  success: boolean;
  message: string;
  userId: string;
}

/**
 * Token refresh response
 */
export interface RefreshResponse {
  user: AuthUser;
  redirectTo: string;
}

/**
 * Current user response
 */
export interface MeResponse {
  user: AuthUser | null;
  isAuthenticated: boolean;
  redirectTo?: string;
}

/**
 * Logout response
 */
export interface LogoutResponse {
  success: boolean;
}

/**
 * Auth error response
 */
export interface AuthErrorResponse {
  error: string;
  message?: string;
}

/**
 * Session state
 */
export interface SessionState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

/**
 * Auth context value
 */
export interface AuthContextValue extends SessionState {
  login: (email: string, password: string) => Promise<LoginResponse>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  checkSession: () => Promise<void>;
}
