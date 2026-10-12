import * as api from '../api/client';

// Aviso de fin de descanso con la app cerrada o el móvil bloqueado. El servidor
// manda una notificación push a la hora de fin; la app solo la programa,
// la reprograma (+15 s, reanudar) o la cancela.

const PREF_KEY = 'kookyecatgym_rest_push';
export const REST_NOTIFICATION_TAG = 'kookyecatgym-rest';

export function isPushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

// En iPhone/iPad las notificaciones web solo existen con la app instalada en la pantalla de inicio
export function needsInstallForPush(): boolean {
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const standalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true;
  return ios && !standalone;
}

export function isRestPushEnabled(): boolean {
  try {
    return localStorage.getItem(PREF_KEY) === 'on' && isPushSupported() && Notification.permission === 'granted';
  } catch {
    return false;
  }
}

function keyToBytes(base64url: string): Uint8Array {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (base64url.length % 4)) % 4);
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
}

/** Pide permiso, suscribe este dispositivo y lo registra en el servidor. Lanza un error legible si no se puede. */
export async function enableRestPush(): Promise<void> {
  if (needsInstallForPush()) {
    throw new Error('En iPhone, primero añade KookyeCatGym a la pantalla de inicio (Compartir → Añadir a pantalla de inicio) y ábrela desde ahí.');
  }
  if (!isPushSupported()) {
    throw new Error('Este navegador no admite notificaciones.');
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('Has bloqueado las notificaciones. Actívalas en los ajustes del navegador para KookyeCatGym.');
  }

  const registration = await navigator.serviceWorker.ready;
  const publicKey = await api.getPushKey();
  let subscription = await registration.pushManager.getSubscription();

  // Si la suscripción existente es de otra clave de servidor, se rehace
  const currentKey = subscription?.options.applicationServerKey;
  if (subscription && currentKey) {
    const a = new Uint8Array(currentKey);
    const b = keyToBytes(publicKey);
    if (a.length !== b.length || a.some((v, i) => v !== b[i])) {
      await subscription.unsubscribe();
      subscription = null;
    }
  }

  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: keyToBytes(publicKey),
    });
  }

  await api.subscribePush(subscription.toJSON());
  localStorage.setItem(PREF_KEY, 'on');
}

export async function disableRestPush(): Promise<void> {
  localStorage.setItem(PREF_KEY, 'off');
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      await api.unsubscribePush(subscription.endpoint).catch(() => {});
      await subscription.unsubscribe();
    }
  } catch {
    // Si falla, el servidor la limpiará cuando el servicio push la dé por caducada
  }
}

// Programar/cancelar no debe bloquear nunca el entrenamiento: los fallos se ignoran
export function scheduleRestPush(endsAt: number, exerciseName: string): void {
  if (!isRestPushEnabled()) return;
  api.scheduleRestPush(endsAt, exerciseName).catch(() => {});
}

export function cancelRestPush(): void {
  if (!isRestPushEnabled()) return;
  api.cancelRestPush().catch(() => {});
}

/** Quita la notificación de descanso si sigue en pantalla (p. ej. al volver a la app). */
export async function clearRestNotifications(): Promise<void> {
  try {
    if (!('serviceWorker' in navigator)) return;
    const registration = await navigator.serviceWorker.ready;
    const notifications = await registration.getNotifications({ tag: REST_NOTIFICATION_TAG });
    notifications.forEach((n) => n.close());
  } catch {
    // no es importante
  }
}
