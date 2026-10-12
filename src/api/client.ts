/**
 * Cliente API para comunicarse con el backend PHP (URL configurable con VITE_API_BASE)
 */
import { getAuthToken, hashPassword, setSession, clearSession, AuthUser } from '../auth';
import type { Exercise, Routine, WorkoutLog } from '../types';
import type { ProgressionRule } from '../utils/progressionRules';

const API_BASE = import.meta.env.VITE_API_BASE ?? '/api';

interface FetchOptions {
  method?: 'GET' | 'POST' | 'DELETE';
  body?: any;
}

async function apiCall<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const method = options.method || 'GET';
  const url = `${API_BASE}/${endpoint}`;

  const init: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Gym-Auth': getAuthToken() ?? '',
    },
  };

  if (options.body) {
    init.body = JSON.stringify(options.body);
  }

  let res: Response;
  try {
    res = await fetch(url, init);
  } catch (err) {
    console.error(`API call failed: ${endpoint}`, err);
    throw new Error('No se pudo conectar con el servidor');
  }

  let data: any = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok) {
    const message = data && typeof data.error === 'string' ? data.error : `Error de red (${res.status})`;
    throw new Error(message);
  }

  return data as T;
}

// --- AUTENTICACIÓN ---
export async function register(username: string, email: string, password: string): Promise<AuthUser> {
  const hashed = await hashPassword(password);
  const res = await apiCall<{ token: string; user: AuthUser }>('auth/register', {
    method: 'POST',
    body: { username, email, password: hashed },
  });
  setSession(res.token, res.user);
  return res.user;
}

export async function login(identifier: string, password: string): Promise<AuthUser> {
  const hashed = await hashPassword(password);
  const res = await apiCall<{ token: string; user: AuthUser }>('auth/login', {
    method: 'POST',
    body: { identifier, password: hashed },
  });
  setSession(res.token, res.user);
  return res.user;
}

// --- PASSKEYS (Face ID / huella) ---
export interface PasskeyRegisterOptions {
  challenge: string;
  rp: { id: string; name: string };
  user: { id: string; name: string; displayName: string };
  excludeCredentials: string[];
  timeout: number;
}

export interface PasskeyInfo {
  id: string;
  name: string;
  created_at: string;
  last_used_at: string | null;
}

export async function getPasskeyRegisterOptions(): Promise<PasskeyRegisterOptions> {
  return apiCall<PasskeyRegisterOptions>('passkey/register-options', { method: 'POST', body: {} });
}

export async function savePasskey(body: object): Promise<void> {
  await apiCall('passkey/register', { method: 'POST', body });
}

export async function getPasskeyLoginOptions(): Promise<{ challenge: string; rpId: string; timeout: number }> {
  return apiCall('passkey/login-options', { method: 'POST', body: {} });
}

export async function passkeyLogin(body: object): Promise<AuthUser> {
  const res = await apiCall<{ token: string; user: AuthUser }>('passkey/login', { method: 'POST', body });
  setSession(res.token, res.user);
  return res.user;
}

export async function getPasskeys(): Promise<PasskeyInfo[]> {
  return apiCall<PasskeyInfo[]>('passkey/list');
}

export async function deletePasskey(id: string): Promise<void> {
  await apiCall('passkey/delete', { method: 'POST', body: { id } });
}

export async function fetchCurrentUser(): Promise<AuthUser> {
  const res = await apiCall<{ user: AuthUser }>('auth/me');
  return res.user;
}

export async function logout(): Promise<void> {
  try {
    await apiCall('auth/logout', { method: 'POST' });
  } finally {
    clearSession();
  }
}

// --- ADMINISTRACIÓN DE USUARIOS (requiere rol admin) ---
export interface AdminUserRow extends AuthUser {
  created_at: string;
}

export async function getUsers(): Promise<AdminUserRow[]> {
  return apiCall<AdminUserRow[]>('users');
}

export async function adminCreateUser(
  username: string,
  email: string,
  password: string,
  role: 'user' | 'admin'
): Promise<AdminUserRow> {
  const hashed = await hashPassword(password);
  return apiCall<AdminUserRow>('users', {
    method: 'POST',
    body: { username, email, password: hashed, role },
  });
}

export async function adminDeleteUser(id: string) {
  return apiCall('users', { method: 'DELETE', body: { id } });
}

export async function adminSetUserRole(id: string, role: 'user' | 'admin') {
  return apiCall('users/role', { method: 'POST', body: { id, role } });
}

// --- ROUTINES ---
export async function getRoutines(): Promise<Routine[]> {
  return apiCall<Routine[]>('routines');
}

export async function saveRoutine(routine: Routine) {
  return apiCall('routines', { method: 'POST', body: routine });
}

export async function saveRoutines(routines: Routine[]) {
  for (const routine of routines) {
    await saveRoutine(routine);
  }
}

export async function deleteRoutine(id: string) {
  return apiCall('routines', { method: 'DELETE', body: { id } });
}

// --- LOGS ---
export async function getLogs(): Promise<WorkoutLog[]> {
  return apiCall<WorkoutLog[]>('logs');
}

export async function saveLog(log: WorkoutLog) {
  return apiCall('logs', { method: 'POST', body: log });
}

export async function saveLogs(logs: WorkoutLog[]) {
  for (const log of logs) {
    await saveLog(log);
  }
}

export async function deleteLog(id: string) {
  return apiCall('logs', { method: 'DELETE', body: { id } });
}

// --- EXERCISES ---
export async function getExercises(): Promise<Exercise[]> {
  return apiCall<Exercise[]>('exercises');
}

export async function saveExercises(exercises: Exercise[]) {
  // El endpoint acepta un array (bulk)
  return apiCall('exercises', { method: 'POST', body: exercises });
}

// --- ACTIVE WORKOUT ---
export async function getActiveWorkout(): Promise<any> {
  return apiCall<any>('active-workout');
}

export async function saveActiveWorkout(workout: any) {
  if (!workout) {
    return deleteActiveWorkout();
  }
  return apiCall('active-workout', { method: 'POST', body: workout });
}

export async function deleteActiveWorkout() {
  return apiCall('active-workout', { method: 'DELETE' });
}

// --- FOTOS Y VÍDEOS PROPIOS (de ejercicios, entrenamientos y progreso físico) ---
export type MediaKind = 'exercise' | 'workout' | 'progress';
export type ProgressMuscle = 'Pecho' | 'Espalda' | 'Hombros' | 'Brazos' | 'Abdomen' | 'Piernas';

export interface MediaItem {
  id: string;
  exerciseId: string;
  hash: string;
  mime: string;
  size: number;
  isPrimary: boolean;
  url: string;
  createdAt: string;
  kind: MediaKind;
  logId: string | null; // fotos de entrenamiento ("active:<inicio>" mientras está en curso)
  muscle: ProgressMuscle | null; // fotos de progreso físico
  measureMm: number | null; // medida opcional del músculo, en milímetros
  takenAt: string; // día de la foto, AAAA-MM-DD
}

// A qué va una foto al subirla
export type MediaTarget =
  | { kind: 'exercise'; exerciseId: string }
  | { kind: 'workout'; logId: string; takenAt?: string }
  | { kind: 'progress'; muscle: ProgressMuscle; measureMm?: number | null; takenAt?: string };

export async function getMyMedia(): Promise<MediaItem[]> {
  return apiCall<MediaItem[]>('media');
}

// XMLHttpRequest (y no fetch) para poder mostrar el progreso de subida de vídeos
export function uploadMedia(
  file: Blob,
  fileName: string,
  target: MediaTarget,
  onProgress?: (fraction: number) => void
): Promise<MediaItem> {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append('file', file, fileName);
    form.append('kind', target.kind);
    if (target.kind === 'exercise') form.append('exerciseId', target.exerciseId);
    if (target.kind === 'workout') form.append('logId', target.logId);
    if (target.kind === 'progress') {
      form.append('muscle', target.muscle);
      if (target.measureMm) form.append('measureMm', String(target.measureMm));
    }
    if (target.kind !== 'exercise' && target.takenAt) form.append('takenAt', target.takenAt);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_BASE}/media`);
    xhr.setRequestHeader('X-Gym-Auth', getAuthToken() ?? '');
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(e.loaded / e.total);
    };
    xhr.onload = () => {
      let data: any = null;
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        // respuesta no JSON (p. ej. 413 de Nginx)
      }
      if (xhr.status >= 200 && xhr.status < 300 && data) resolve(data);
      else if (xhr.status === 413) reject(new Error('El archivo es demasiado grande para el servidor.'));
      else reject(new Error(data?.error || `Error de subida (${xhr.status})`));
    };
    xhr.onerror = () => reject(new Error('No se pudo conectar con el servidor'));
    xhr.send(form);
  });
}

export async function setPrimaryMedia(id: string) {
  return apiCall('media', { method: 'POST', body: { action: 'primary', id } });
}

export async function deleteMedia(id: string) {
  return apiCall('media', { method: 'DELETE', body: { id } });
}

// Corrige la fecha (o el músculo y la medida) de una foto de entrenamiento/progreso
export async function updateMedia(
  id: string,
  changes: { takenAt?: string; muscle?: ProgressMuscle; measureMm?: number | null }
): Promise<MediaItem> {
  return apiCall<MediaItem>('media', { method: 'POST', body: { action: 'update', id, ...changes } });
}

// Pasa las fotos del entrenamiento en curso al entrenamiento ya guardado
export async function relinkWorkoutMedia(from: string, to: string) {
  return apiCall('media', { method: 'POST', body: { action: 'relink', from, to } });
}

// --- PANEL DE ADMINISTRACIÓN ---
export interface AdminStats {
  users: number;
  admins: number;
  activeLast7: number;
  activeLast30: number;
  workouts: number;
  workoutsLast30: number;
  mediaCount: number;
  mediaDiskBytes: number;
  pushDevices: number;
  coachRunsLast30: number;
  perUser: {
    id: string;
    username: string;
    role: string;
    createdAt: string;
    lastLogin: string | null;
    workouts: number;
    workoutsLast30: number;
    lastWorkout: string | null;
    mediaCount: number;
    mediaBytes: number;
  }[];
}

export interface AuditEntry {
  id: number;
  created_at: string;
  action: string;
  user_id: string | null;
  username: string | null;
  ip: string;
  detail: string;
}

export async function getAdminStats(): Promise<AdminStats> {
  return apiCall('admin/stats');
}

export async function getAuditLog(): Promise<AuditEntry[]> {
  return apiCall('admin/audit?limit=300');
}

export async function getAdminSettings(): Promise<{ registrationEnabled: boolean }> {
  return apiCall('admin/settings');
}

export async function saveAdminSettings(settings: { registrationEnabled: boolean }): Promise<{ registrationEnabled: boolean }> {
  return apiCall('admin/settings', { method: 'POST', body: settings });
}

// Público (sin sesión): la pantalla de acceso decide si muestra el registro
export async function getRegistrationStatus(): Promise<boolean> {
  const res = await apiCall<{ enabled: boolean }>('auth/registration');
  return !!res.enabled;
}

// --- COACH IA ---
export interface CoachSuggestion {
  titulo: string;
  detalle: string;
  prioridad: 'alta' | 'media' | 'baja';
  categoria: string;
}

export interface CoachRun {
  id: string;
  status: 'pending' | 'done' | 'error';
  createdAt: string;
  result: {
    resumen: string;
    sugerencias: CoachSuggestion[];
    proveedor?: string;
    modelo?: string;
    intentosFallidos?: string[];
  } | null;
  error: string | null;
}

export interface CoachStatus {
  configured: boolean;
  isAdmin: boolean;
  remainingToday: number;
  totalTimeoutSeconds: number;
  connections: { providerName: string; model: string; free: boolean }[];
}

export interface CoachProvider {
  id: string;
  name: string;
  free: boolean;
  defaultModel: string;
  keyUrl: string;
  note: string;
}

export interface CoachConnection {
  id: string;
  provider: string;
  providerName: string;
  free: boolean;
  model: string;
  enabled: boolean;
  hasKey: boolean;
  keyHint: string;
}

export interface CoachConfigData {
  providers: CoachProvider[];
  connections: CoachConnection[];
  timeoutSeconds: number;
  totalTimeoutSeconds: number;
}

// Lo que se envía al guardar: sin apiKey se conserva la clave ya guardada de esa conexión
export interface CoachConnectionInput {
  id?: string;
  provider: string;
  model: string;
  enabled: boolean;
  apiKey?: string;
}

export async function getCoachStatus(): Promise<CoachStatus> {
  return apiCall('coach/status');
}

export async function getCoachConfig(): Promise<CoachConfigData> {
  return apiCall('coach/config');
}

export async function saveCoachConfig(config: {
  connections: CoachConnectionInput[];
  timeoutSeconds: number;
  totalTimeoutSeconds: number;
}): Promise<Omit<CoachConfigData, 'providers'>> {
  return apiCall('coach/config', { method: 'POST', body: config });
}

// Conexión guardada (connectionId) o nueva sin guardar (provider + apiKey)
type CoachConnectionRef = { connectionId?: string; provider?: string; apiKey?: string; model?: string };

export async function getCoachModels(ref: CoachConnectionRef): Promise<{ id: string; name: string; free: boolean }[]> {
  return apiCall('coach/models', { method: 'POST', body: ref });
}

export async function testCoachConnection(ref: CoachConnectionRef): Promise<{ ok: boolean; ms?: number; message: string }> {
  return apiCall('coach/test', { method: 'POST', body: ref });
}

export async function cancelCoachRun(id: string) {
  return apiCall('coach/cancel', { method: 'POST', body: { id } });
}

export async function getCoachHistory(): Promise<CoachRun[]> {
  return apiCall('coach/history');
}

export async function requestCoachAnalysis(summary: object): Promise<{ id: string; status: string }> {
  return apiCall('coach/analyze', { method: 'POST', body: { summary } });
}

// --- PUSH (aviso de fin de descanso con la app cerrada) ---
export async function getPushKey(): Promise<string> {
  const res = await apiCall<{ publicKey: string }>('push/key');
  return res.publicKey;
}

export async function subscribePush(subscription: PushSubscriptionJSON) {
  return apiCall('push/subscribe', { method: 'POST', body: subscription });
}

export async function unsubscribePush(endpoint: string) {
  return apiCall('push/unsubscribe', { method: 'POST', body: { endpoint } });
}

export async function testPush(): Promise<{ success: boolean; sent: number }> {
  return apiCall('push/test', { method: 'POST' });
}

export async function scheduleRestPush(endsAt: number, exerciseName: string) {
  return apiCall('push/rest', { method: 'POST', body: { endsAt, exerciseName } });
}

export async function cancelRestPush() {
  return apiCall('push/rest-cancel', { method: 'POST' });
}

// --- PROGRESSION RULES ---
export async function getProgressionRules(): Promise<ProgressionRule[]> {
  return apiCall<ProgressionRule[]>('progression-rules');
}

export async function saveProgressionRule(rule: ProgressionRule) {
  return apiCall('progression-rules', { method: 'POST', body: rule });
}

export async function deleteProgressionRule(exerciseId: string) {
  return apiCall('progression-rules', { method: 'DELETE', body: { exerciseId } });
}
