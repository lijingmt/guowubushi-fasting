import { NativeModules, Platform } from 'react-native';

export interface CloudSyncStatus {
  available: boolean;
  hasBackup: boolean;
  lastSyncedAt: number | null;
}

interface GuowuCloudSyncNative {
  getStatus(): Promise<{ available?: boolean; hasBackup?: boolean; lastSyncedAt?: number | null }>;
  saveBackup(jsonString: string): Promise<{ success?: boolean; lastSyncedAt?: number }>;
  loadBackup(): Promise<{ found?: boolean; jsonString?: string | null; lastSyncedAt?: number | null }>;
}

const nativeModule = NativeModules.GuowuCloudSync as GuowuCloudSyncNative | undefined;

export async function getICloudStatus(): Promise<CloudSyncStatus> {
  if (Platform.OS !== 'ios' || !nativeModule?.getStatus) {
    return { available: false, hasBackup: false, lastSyncedAt: null };
  }
  try {
    const res = await nativeModule.getStatus();
    return {
      available: Boolean(res?.available),
      hasBackup: Boolean(res?.hasBackup),
      lastSyncedAt: typeof res?.lastSyncedAt === 'number' && res.lastSyncedAt > 0 ? res.lastSyncedAt : null,
    };
  } catch {
    return { available: false, hasBackup: false, lastSyncedAt: null };
  }
}

export async function pushBackupToICloud(
  jsonString: string
): Promise<{ success: boolean; lastSyncedAt: number | null }> {
  if (Platform.OS !== 'ios' || !nativeModule?.saveBackup) {
    return { success: false, lastSyncedAt: null };
  }
  try {
    const res = await nativeModule.saveBackup(jsonString);
    return {
      success: Boolean(res?.success),
      lastSyncedAt: typeof res?.lastSyncedAt === 'number' ? res.lastSyncedAt : Date.now(),
    };
  } catch {
    return { success: false, lastSyncedAt: null };
  }
}

export async function pullBackupFromICloud(): Promise<{
  found: boolean;
  jsonString: string | null;
  lastSyncedAt: number | null;
}> {
  if (Platform.OS !== 'ios' || !nativeModule?.loadBackup) {
    return { found: false, jsonString: null, lastSyncedAt: null };
  }
  try {
    const res = await nativeModule.loadBackup();
    return {
      found: Boolean(res?.found && res?.jsonString),
      jsonString: typeof res?.jsonString === 'string' ? res.jsonString : null,
      lastSyncedAt: typeof res?.lastSyncedAt === 'number' && res.lastSyncedAt > 0 ? res.lastSyncedAt : null,
    };
  } catch {
    return { found: false, jsonString: null, lastSyncedAt: null };
  }
}
