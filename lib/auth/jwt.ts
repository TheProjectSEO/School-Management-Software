import { SignJWT, jwtVerify, type JWTPayload } from 'jose';

// Token expiry constants
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';

// Interfaces
export interface AccessTokenPayload extends JWTPayload {
  sub: string;
  email: string;
  role: 'super_admin' | 'admin' | 'teacher' | 'student';
  permissions: string[];
  school_id?: string;
  profile_id: string;
}

export interface RefreshTokenPayload extends JWTPayload {
  sub: string;
  jti: string;
}

// Get secret as Uint8Array for jose
function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not set');
  }
  if (secret.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters');
  }
  return new TextEncoder().encode(secret);
}

// Generate access token
export async function generateAccessToken(payload: Omit<AccessTokenPayload, 'iat' | 'exp'>): Promise<string> {
  const secret = getJwtSecret();

  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_EXPIRY)
    .sign(secret);
}

// Generate refresh token
export async function generateRefreshToken(userId: string, tokenId: string): Promise<string> {
  const secret = getJwtSecret();

  return new SignJWT({ sub: userId, jti: tokenId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(REFRESH_TOKEN_EXPIRY)
    .sign(secret);
}

// Verify access token
export async function verifyAccessToken(token: string): Promise<AccessTokenPayload | null> {
  try {
    const secret = getJwtSecret();
    const { payload } = await jwtVerify(token, secret);
    return payload as AccessTokenPayload;
  } catch {
    return null;
  }
}

// Verify refresh token
export async function verifyRefreshToken(token: string): Promise<RefreshTokenPayload | null> {
  try {
    const secret = getJwtSecret();
    const { payload } = await jwtVerify(token, secret);
    return payload as RefreshTokenPayload;
  } catch {
    return null;
  }
}

// Decode token without verification (for client-side use)
export function decodeToken<T extends JWTPayload>(token: string): T | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1]));
    return payload as T;
  } catch {
    return null;
  }
}

// Check if token is expired
export function isTokenExpired(token: string): boolean {
  const payload = decodeToken(token);
  if (!payload || !payload.exp) return true;
  return Date.now() >= payload.exp * 1000;
}
