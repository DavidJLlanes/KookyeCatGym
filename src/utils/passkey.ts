/**
 * Inicio de sesión con passkeys (WebAuthn): Face ID / Touch ID en iPhone,
 * huella o cara en Android, Windows Hello en PC. La comprobación de firmas
 * está en server/passkeys.php.
 */
import * as api from '../api/client';
import type { AuthUser } from '../auth';

const toB64url = (buf: ArrayBuffer): string =>
  btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

const fromB64url = (text: string): ArrayBuffer => {
  const bin = atob(text.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (text.length % 4)) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0)).buffer;
};

/** true si el dispositivo tiene Face ID, huella, Windows Hello… utilizable desde el navegador. */
export async function isPasskeyAvailable(): Promise<boolean> {
  try {
    return (
      typeof window !== 'undefined' &&
      !!window.PublicKeyCredential &&
      (await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable())
    );
  } catch {
    return false;
  }
}

/** Nombre del método según el dispositivo, para los textos de los botones. */
export function biometricLabel(): string {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return 'Face ID / Touch ID';
  if (/Android/.test(ua)) return 'huella o cara';
  if (/Windows/.test(ua)) return 'Windows Hello';
  if (/Macintosh/.test(ua)) return 'Touch ID';
  return 'Face ID / huella';
}

function deviceName(): string {
  const ua = navigator.userAgent;
  if (/iPhone/.test(ua)) return 'iPhone';
  if (/iPad/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return 'iPad';
  const android = ua.match(/Android[^;]*;\s*([^;)]+?)(?:\s+Build|\))/);
  if (android) return android[1].trim() === 'K' ? 'Android' : `Android (${android[1].trim()})`;
  if (/Windows/.test(ua)) return 'PC Windows';
  if (/Macintosh/.test(ua)) return 'Mac';
  return 'Dispositivo';
}

/** Traduce los errores del navegador a mensajes comprensibles. */
function friendlyError(err: any): Error {
  switch (err?.name) {
    case 'NotAllowedError':
      return new Error('Se canceló o se agotó el tiempo. Inténtalo de nuevo.');
    case 'InvalidStateError':
      return new Error('Este dispositivo ya está activado para tu cuenta.');
    case 'SecurityError':
      return new Error('Face ID / huella solo funciona desde https://kookyecatgym.com.');
    case 'NotSupportedError':
      return new Error('Este dispositivo no admite el inicio con cara o huella.');
    default:
      return err instanceof Error ? err : new Error('No se pudo usar la cara o la huella');
  }
}

// Safari (iPhone) solo deja pedir la cara/huella justo después de que el
// usuario toque un botón: si antes se espera a la red, cancela la petición.
// Por eso el reto se pide al servidor por adelantado (al mostrar el botón) y
// las funciones de abajo lo reciben ya preparado.
export const preparePasskeyRegistration = api.getPasskeyRegisterOptions;
export const preparePasskeyLogin = api.getPasskeyLoginOptions;
export type PasskeyLoginOptions = Awaited<ReturnType<typeof api.getPasskeyLoginOptions>>;

/** Activa el inicio con cara/huella en este dispositivo para el usuario con sesión iniciada. */
export async function registerPasskey(options: api.PasskeyRegisterOptions): Promise<void> {
  let credential: PublicKeyCredential;
  try {
    credential = (await navigator.credentials.create({
      publicKey: {
        challenge: fromB64url(options.challenge),
        rp: options.rp,
        user: { id: fromB64url(options.user.id), name: options.user.name, displayName: options.user.displayName },
        pubKeyCredParams: [
          { type: 'public-key', alg: -7 },
          { type: 'public-key', alg: -257 },
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          residentKey: 'required',
          requireResidentKey: true,
          userVerification: 'required',
        },
        excludeCredentials: options.excludeCredentials.map((id) => ({ type: 'public-key' as const, id: fromB64url(id) })),
        attestation: 'none',
        timeout: options.timeout,
      },
    })) as PublicKeyCredential;
  } catch (err) {
    throw friendlyError(err);
  }

  const response = credential.response as AuthenticatorAttestationResponse;
  const publicKey = response.getPublicKey?.();
  if (!publicKey) throw new Error('Actualiza el navegador para usar el inicio con cara o huella.');
  await api.savePasskey({
    id: credential.id,
    clientDataJSON: toB64url(response.clientDataJSON),
    authenticatorData: toB64url(response.getAuthenticatorData()),
    publicKey: toB64url(publicKey),
    publicKeyAlgorithm: response.getPublicKeyAlgorithm(),
    name: deviceName(),
  });
}

/** Inicia sesión con una passkey guardada en el dispositivo (no hace falta escribir el usuario). */
export async function loginWithPasskey(options: PasskeyLoginOptions): Promise<AuthUser> {
  let credential: PublicKeyCredential;
  try {
    credential = (await navigator.credentials.get({
      publicKey: {
        challenge: fromB64url(options.challenge),
        rpId: options.rpId,
        userVerification: 'required',
        timeout: options.timeout,
      },
    })) as PublicKeyCredential;
  } catch (err) {
    throw friendlyError(err);
  }

  const response = credential.response as AuthenticatorAssertionResponse;
  return api.passkeyLogin({
    id: credential.id,
    clientDataJSON: toB64url(response.clientDataJSON),
    authenticatorData: toB64url(response.authenticatorData),
    signature: toB64url(response.signature),
    userHandle: response.userHandle ? toB64url(response.userHandle) : null,
  });
}

// Recuerda en este dispositivo si ya se ofreció activar la cara/huella a un usuario
const offerKey = (userId: string) => `kookyecatgym-passkey-offer-${userId}`;

export function passkeyOfferDone(userId: string): boolean {
  try {
    return localStorage.getItem(offerKey(userId)) === '1';
  } catch {
    return true;
  }
}

export function markPasskeyOfferDone(userId: string): void {
  try {
    localStorage.setItem(offerKey(userId), '1');
  } catch {
    // sin almacenamiento: se volverá a ofrecer, no pasa nada
  }
}
