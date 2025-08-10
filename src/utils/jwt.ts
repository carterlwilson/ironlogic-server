import jwt, { SignOptions } from 'jsonwebtoken';

// JWT configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret-change-this-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || '7d';

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

/**
 * Generate access token and refresh token pair
 */
export function generateTokens(payload: Omit<JWTPayload, 'iat' | 'exp'>): TokenPair {
  const accessToken = jwt.sign(
    payload, 
    JWT_SECRET as string, 
    { expiresIn: '24h' }
  );

  const refreshToken = jwt.sign(
    { userId: payload.userId, type: 'refresh' },
    JWT_SECRET as string,
    { expiresIn: '7d' }
  );

  return { accessToken, refreshToken };
}

/**
 * Verify and decode access token
 */
export function verifyAccessToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET as string) as JWTPayload;
    return decoded;
  } catch (error) {
    console.error('Access token verification failed:', error);
    return null;
  }
}

/**
 * Verify refresh token
 */
export function verifyRefreshToken(token: string): { userId: string } | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET as string) as any;
    if (decoded.type !== 'refresh') {
      return null;
    }
    return { userId: decoded.userId };
  } catch (error) {
    console.error('Refresh token verification failed:', error);
    return null;
  }
}

/**
 * Extract token from Authorization header
 */
export function extractTokenFromHeader(authHeader: string | undefined): string | null {
  if (!authHeader) {
    return null;
  }
  
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }
  
  return parts[1];
}

/**
 * Create JWT middleware for protecting routes
 */
export function jwtMiddleware(req: any, res: any, next: any) {
  const token = extractTokenFromHeader(req.headers.authorization);
  
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access token required'
    });
  }
  
  const payload = verifyAccessToken(token);
  if (!payload) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired access token'
    });
  }
  
  // Add user info to request object
  req.user = payload;
  next();
}