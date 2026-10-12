import { WorkoutLog, Routine } from '../types';

export interface DataRevision {
  version: number;
  timestamp: string;
  data: any;
  hash: string;
  deviceId: string;
}

export interface SyncState {
  lastSyncedVersion: number;
  currentVersion: number;
  pendingChanges: boolean;
  lastSyncedAt?: string;
  conflicts: ConflictRecord[];
}

export interface ConflictRecord {
  id: string;
  field: string;
  localValue: any;
  remoteValue: any;
  resolution: 'local' | 'remote' | 'manual';
  resolvedAt?: string;
}

export interface DeviceInfo {
  id: string;
  name: string;
  lastActive: string;
  platform: 'web' | 'mobile' | 'desktop';
}

/**
 * Generate device ID (unique per device)
 */
export function generateDeviceId(): string {
  let deviceId = localStorage.getItem('hevy_device_id');
  if (!deviceId) {
    deviceId = `device-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    localStorage.setItem('hevy_device_id', deviceId);
  }
  return deviceId;
}

/**
 * Calculate hash of data for change detection
 */
export function calculateDataHash(data: any): string {
  const str = JSON.stringify(data);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16);
}

/**
 * Create a data revision snapshot
 */
export function createRevision(
  version: number,
  data: any,
  deviceId: string
): DataRevision {
  return {
    version,
    timestamp: new Date().toISOString(),
    data,
    hash: calculateDataHash(data),
    deviceId,
  };
}

/**
 * Detect conflicts between local and remote versions
 */
export function detectConflicts(
  localData: any,
  remoteData: any,
  currentRevision: number
): ConflictRecord[] {
  const conflicts: ConflictRecord[] = [];

  // Compare top-level keys
  const allKeys = new Set([...Object.keys(localData || {}), ...Object.keys(remoteData || {})]);

  for (const key of allKeys) {
    const localValue = localData?.[key];
    const remoteValue = remoteData?.[key];

    if (JSON.stringify(localValue) !== JSON.stringify(remoteValue)) {
      conflicts.push({
        id: `conflict-${currentRevision}-${key}`,
        field: key,
        localValue,
        remoteValue,
        resolution: 'manual',
      });
    }
  }

  return conflicts;
}

/**
 * Merge strategy: Last-Write-Wins (LWW)
 */
export function mergeLastWriteWins(
  localData: any,
  remoteData: any,
  localTimestamp: Date,
  remoteTimestamp: Date
): any {
  if (localTimestamp >= remoteTimestamp) {
    return localData;
  }
  return remoteData;
}

/**
 * Merge strategy: Deep merge (for objects)
 */
export function mergeDeep(localData: any, remoteData: any): any {
  const merged = { ...remoteData };

  for (const key in localData) {
    if (typeof localData[key] === 'object' && localData[key] !== null && !Array.isArray(localData[key])) {
      merged[key] = mergeDeep(localData[key], remoteData[key] || {});
    } else {
      // Take local if it's more recent (for now)
      merged[key] = localData[key];
    }
  }

  return merged;
}

/**
 * Apply conflict resolution
 */
export function resolveConflict(
  conflict: ConflictRecord,
  resolution: 'local' | 'remote'
): ConflictRecord {
  return {
    ...conflict,
    resolution,
    resolvedAt: new Date().toISOString(),
  };
}

/**
 * Check if sync is needed
 */
export function isSyncNeeded(syncState: SyncState): boolean {
  return syncState.currentVersion > syncState.lastSyncedVersion || syncState.pendingChanges;
}

/**
 * Get sync status
 */
export function getSyncStatus(syncState: SyncState): 'synced' | 'pending' | 'conflict' {
  if (syncState.conflicts.length > 0) {
    return 'conflict';
  }
  if (isSyncNeeded(syncState)) {
    return 'pending';
  }
  return 'synced';
}

/**
 * Initialize sync state
 */
export function initializeSyncState(): SyncState {
  return {
    lastSyncedVersion: 0,
    currentVersion: 1,
    pendingChanges: false,
    conflicts: [],
  };
}

/**
 * Update sync state after successful sync
 */
export function updateSyncState(syncState: SyncState, version: number): SyncState {
  return {
    ...syncState,
    lastSyncedVersion: version,
    currentVersion: version,
    pendingChanges: false,
    lastSyncedAt: new Date().toISOString(),
  };
}

/**
 * Mark data as changed
 */
export function markAsChanged(syncState: SyncState): SyncState {
  return {
    ...syncState,
    currentVersion: syncState.currentVersion + 1,
    pendingChanges: true,
  };
}

/**
 * Export sync metadata for backup
 */
export function exportSyncMetadata(syncState: SyncState, revisions: DataRevision[]): string {
  return JSON.stringify(
    {
      syncState,
      revisions: revisions.map((r) => ({
        version: r.version,
        timestamp: r.timestamp,
        hash: r.hash,
        deviceId: r.deviceId,
      })),
    },
    null,
    2
  );
}
