export interface Passkey {
  id: string;
  name: string;
  createdAt: string;
  lastUsedAt?: string;
  credentialId: string;
  publicKey: string;
}

export interface AuthSession {
  userId: string;
  deviceId: string;
  token: string;
  createdAt: string;
  expiresAt: string;
  type: 'passkey' | 'password' | 'linked';
}

export interface DeviceLink {
  id: string;
  code: string;
  expiresAt: string;
  verificationCode?: string;
  sourceDeviceId: string;
  targetDeviceId?: string;
  status: 'pending' | 'verified' | 'expired';
}

export interface AuthConfig {
  passwordEnabled: boolean;
  passkeysEnabled: boolean;
  deviceLinkingEnabled: boolean;
  sessionTimeout: number; // minutes
  requirePasswordChange: boolean;
}

/**
 * Generate random device linking code (6 digits)
 */
export function generateDeviceLinkCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Generate device linking QR code data
 */
export function generateQRCodeData(deviceId: string, code: string): string {
  return JSON.stringify({
    type: 'device_link',
    deviceId,
    code,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Validate device link code format
 */
export function validateLinkCode(code: string): boolean {
  return /^\d{6}$/.test(code);
}

/**
 * Create device link request
 */
export function createDeviceLinkRequest(sourceDeviceId: string): DeviceLink {
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + 15); // 15 min expiry

  return {
    id: `link-${Date.now()}`,
    code: generateDeviceLinkCode(),
    expiresAt: expiresAt.toISOString(),
    sourceDeviceId,
    status: 'pending',
  };
}

/**
 * Verify device link
 */
export function verifyDeviceLink(
  link: DeviceLink,
  targetDeviceId: string,
  verificationCode: string
): boolean {
  const isExpired = new Date(link.expiresAt) < new Date();
  const codeMatches = link.code === verificationCode;

  return !isExpired && codeMatches;
}

/**
 * Create session token
 */
export function createSessionToken(userId: string, deviceId: string, expiryMinutes: number = 1440): AuthSession {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + expiryMinutes * 60000);

  const token = btoa(
    JSON.stringify({
      userId,
      deviceId,
      timestamp: now.toISOString(),
      random: Math.random().toString(36).substring(2),
    })
  );

  return {
    userId,
    deviceId,
    token,
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    type: 'password',
  };
}

/**
 * Validate session token
 */
export function validateSessionToken(session: AuthSession): boolean {
  const expiryDate = new Date(session.expiresAt);
  const now = new Date();

  return now < expiryDate && session.token && session.token.length > 0;
}

/**
 * Refresh session token
 */
export function refreshSessionToken(session: AuthSession, expiryMinutes: number = 1440): AuthSession {
  return createSessionToken(session.userId, session.deviceId, expiryMinutes);
}

/**
 * Hash password (simple demo - use bcrypt in production)
 */
export function hashPassword(password: string): string {
  // In production, use proper bcrypt or argon2
  return btoa(password + 'salt'); // Very insecure, for demo only
}

/**
 * Verify password
 */
export function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

/**
 * Validate password strength
 */
export function validatePasswordStrength(password: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Mínimo 8 caracteres');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Incluir mayúscula');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Incluir minúscula');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Incluir número');
  }
  if (!/[!@#$%^&*]/.test(password)) {
    errors.push('Incluir carácter especial (!@#$%^&*)');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Generate password reset token
 */
export function generateResetToken(): string {
  return `reset-${Date.now()}-${Math.random().toString(36).substring(2)}`;
}

/**
 * Check if reset token is expired
 */
export function isResetTokenExpired(createdAt: Date, hoursValid: number = 24): boolean {
  const expiryDate = new Date(createdAt.getTime() + hoursValid * 60 * 60 * 1000);
  return new Date() > expiryDate;
}

/**
 * Get passkey by credential ID
 */
export function getPasskeyByCredentialId(passkeys: Passkey[], credentialId: string): Passkey | null {
  return passkeys.find((p) => p.credentialId === credentialId) || null;
}

/**
 * Create passkey entry
 */
export function createPasskey(name: string, credentialId: string, publicKey: string): Passkey {
  return {
    id: `passkey-${Date.now()}`,
    name,
    createdAt: new Date().toISOString(),
    credentialId,
    publicKey,
  };
}

/**
 * Initialize auth config
 */
export function initializeAuthConfig(): AuthConfig {
  return {
    passwordEnabled: true,
    passkeysEnabled: false, // Requires WebAuthn setup
    deviceLinkingEnabled: true,
    sessionTimeout: 1440, // 24 hours
    requirePasswordChange: false,
  };
}

/**
 * Format session info for display
 */
export function formatSessionInfo(session: AuthSession): string {
  const createdDate = new Date(session.createdAt).toLocaleDateString('es-ES');
  const expiresDate = new Date(session.expiresAt).toLocaleDateString('es-ES');
  return `${session.type.toUpperCase()} • ${createdDate} - ${expiresDate}`;
}
