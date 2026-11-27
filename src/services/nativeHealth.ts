import { NativeModules, Platform } from 'react-native';

export interface NativeHealthMetrics {
  available: boolean;
  authorized: boolean;
  latestWeightKg: number | null;
  lastNightSleepHours: number | null;
  todaySteps: number | null;
  sleepByDate: Record<string, number>;
  syncedAt: number;
}

interface GuowuHealthKitNative {
  isAvailable(): Promise<boolean>;
  requestAuthorization(): Promise<boolean>;
  syncLatestMetrics(): Promise<{
    latestWeightKg?: number | null;
    lastNightSleepHours?: number | null;
    todaySteps?: number | null;
    sleepByDate?: Record<string, number>;
  }>;
  saveMindfulMinutes(startMs: number, endMs: number): Promise<boolean>;
}

const nativeModule = NativeModules.GuowuHealthKit as GuowuHealthKitNative | undefined;

export async function isAppleHealthAvailable(): Promise<boolean> {
  if (Platform.OS !== 'ios' || !nativeModule?.isAvailable) return false;
  try {
    return await nativeModule.isAvailable();
  } catch {
    return false;
  }
}

export async function authorizeAppleHealth(): Promise<boolean> {
  if (Platform.OS !== 'ios' || !nativeModule?.requestAuthorization) return false;
  try {
    return await nativeModule.requestAuthorization();
  } catch {
    return false;
  }
}

export async function syncAppleHealthMetrics(): Promise<NativeHealthMetrics> {
  if (Platform.OS !== 'ios' || !nativeModule?.syncLatestMetrics) {
    return {
      available: false,
      authorized: false,
      latestWeightKg: null,
      lastNightSleepHours: null,
      todaySteps: null,
      sleepByDate: {},
      syncedAt: Date.now(),
    };
  }
  try {
    const ok = await authorizeAppleHealth();
    if (!ok) {
      return {
        available: true,
        authorized: false,
        latestWeightKg: null,
        lastNightSleepHours: null,
        todaySteps: null,
        sleepByDate: {},
        syncedAt: Date.now(),
      };
    }
    const raw = await nativeModule.syncLatestMetrics();
    return {
      available: true,
      authorized: true,
      latestWeightKg: typeof raw?.latestWeightKg === 'number' ? raw.latestWeightKg : null,
      lastNightSleepHours: typeof raw?.lastNightSleepHours === 'number' ? raw.lastNightSleepHours : null,
      todaySteps: typeof raw?.todaySteps === 'number' ? Math.round(raw.todaySteps) : null,
      sleepByDate: raw?.sleepByDate && typeof raw.sleepByDate === 'object' ? raw.sleepByDate : {},
      syncedAt: Date.now(),
    };
  } catch {
    return {
      available: true,
      authorized: false,
      latestWeightKg: null,
      lastNightSleepHours: null,
      todaySteps: null,
      sleepByDate: {},
      syncedAt: Date.now(),
    };
  }
}

export async function saveMindfulMinutesToAppleHealth(
  startMs: number,
  endMs: number
): Promise<boolean> {
  if (Platform.OS !== 'ios' || !nativeModule?.saveMindfulMinutes) return false;
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) return false;
  try {
    return await nativeModule.saveMindfulMinutes(startMs, endMs);
  } catch {
    return false;
  }
}
