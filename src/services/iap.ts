import { NativeModules, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ALL_IAP_PRODUCT_IDS,
  TEA_TIP_IDS,
  getCurrentYearMonth,
} from '../utils/proCatalog';

const PRO_STATE_KEY = '@guowu_pro_state';

export interface StoreKitProductInfo {
  id: string;
  displayName: string;
  description: string;
  displayPrice: string;
  price: number;
  type: 'autoRenewable' | 'consumable' | 'other';
  hasFreeTrial: boolean;
  trialDays: number;
}

export interface ProEntitlementState {
  isPro: boolean;
  activeProductIds: string[];
  expiresAtMs: number | null;
  teaTipsCount: number;
  lastCheckedAt: number | null;
  pausePassUsageMonth?: string;
  pausePassMonthlyCount?: number;
}

export type PurchaseResultStatus =
  | 'purchased'
  | 'cancelled'
  | 'pending'
  | 'unverified'
  | 'unavailable'
  | 'error';

export interface NativePurchaseResult {
  status: PurchaseResultStatus;
  productId?: string;
  transactionId?: string;
  expirationDateMs?: number | null;
  errorMessage?: string;
}

export const DEFAULT_PRO_STATE: ProEntitlementState = {
  isPro: false,
  activeProductIds: [],
  expiresAtMs: null,
  teaTipsCount: 0,
  lastCheckedAt: null,
};

interface NativeStoreKitModule {
  isAvailable(): Promise<boolean>;
  fetchProducts(productIds: string[]): Promise<StoreKitProductInfo[]>;
  purchase(productId: string): Promise<NativePurchaseResult>;
  getCurrentEntitlements(): Promise<{
    isPro: boolean;
    activeProductIds: string[];
    expiresAtMs?: number | null;
  }>;
  restorePurchases(): Promise<{
    isPro: boolean;
    activeProductIds: string[];
    expiresAtMs?: number | null;
  }>;
}

function getNativeStoreKit(): NativeStoreKitModule | null {
  if (Platform.OS !== 'ios') return null;
  const mod = (NativeModules as Record<string, unknown>).GuowuStoreKit as
    | NativeStoreKitModule
    | undefined;
  return mod || null;
}

export async function loadProState(): Promise<ProEntitlementState> {
  try {
    const raw = await AsyncStorage.getItem(PRO_STATE_KEY);
    if (!raw) return DEFAULT_PRO_STATE;
    const parsed = JSON.parse(raw) as Partial<ProEntitlementState>;
    return {
      ...DEFAULT_PRO_STATE,
      ...parsed,
      isPro: Boolean(parsed.isPro),
      activeProductIds: Array.isArray(parsed.activeProductIds) ? parsed.activeProductIds : [],
      teaTipsCount: typeof parsed.teaTipsCount === 'number' ? parsed.teaTipsCount : 0,
    };
  } catch {
    return DEFAULT_PRO_STATE;
  }
}

export async function saveProState(state: ProEntitlementState): Promise<void> {
  try {
    await AsyncStorage.setItem(PRO_STATE_KEY, JSON.stringify(state));
  } catch {
    // ignore persistence errors
  }
}

export async function fetchStoreKitProducts(): Promise<StoreKitProductInfo[]> {
  const mod = getNativeStoreKit();
  if (!mod) return [];
  try {
    const items = await mod.fetchProducts([...ALL_IAP_PRODUCT_IDS]);
    return Array.isArray(items) ? items : [];
  } catch {
    return [];
  }
}

export async function syncNativeEntitlements(
  current?: ProEntitlementState
): Promise<ProEntitlementState> {
  const base = current || (await loadProState());
  const mod = getNativeStoreKit();
  if (!mod) {
    return base;
  }
  try {
    const summary = await mod.getCurrentEntitlements();
    const next: ProEntitlementState = {
      ...base,
      isPro: Boolean(summary?.isPro),
      activeProductIds: Array.isArray(summary?.activeProductIds) ? summary.activeProductIds : [],
      expiresAtMs: typeof summary?.expiresAtMs === 'number' ? summary.expiresAtMs : null,
      lastCheckedAt: Date.now(),
    };
    await saveProState(next);
    return next;
  } catch {
    return base;
  }
}

export async function restoreNativePurchases(
  current?: ProEntitlementState
): Promise<{ state: ProEntitlementState; ok: boolean; error?: string }> {
  const base = current || (await loadProState());
  const mod = getNativeStoreKit();
  if (!mod) {
    return { state: base, ok: false, error: 'StoreKit unavailable' };
  }
  try {
    const summary = await mod.restorePurchases();
    const next: ProEntitlementState = {
      ...base,
      isPro: Boolean(summary?.isPro),
      activeProductIds: Array.isArray(summary?.activeProductIds) ? summary.activeProductIds : [],
      expiresAtMs: typeof summary?.expiresAtMs === 'number' ? summary.expiresAtMs : null,
      lastCheckedAt: Date.now(),
    };
    await saveProState(next);
    return { state: next, ok: true };
  } catch (err) {
    return {
      state: base,
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function purchaseNativeProduct(
  productId: string,
  current?: ProEntitlementState
): Promise<{ result: NativePurchaseResult; state: ProEntitlementState }> {
  const base = current || (await loadProState());
  const mod = getNativeStoreKit();
  if (!mod) {
    return {
      result: { status: 'unavailable', productId },
      state: base,
    };
  }

  try {
    const result = await mod.purchase(productId);
    if (result.status !== 'purchased') {
      return { result, state: base };
    }

    const isTeaTip = (TEA_TIP_IDS as readonly string[]).includes(productId);
    if (isTeaTip) {
      const next: ProEntitlementState = {
        ...base,
        teaTipsCount: base.teaTipsCount + 1,
        lastCheckedAt: Date.now(),
      };
      await saveProState(next);
      return { result, state: next };
    }

    const refreshed = await syncNativeEntitlements({
      ...base,
      isPro: true,
      activeProductIds: Array.from(new Set([...base.activeProductIds, productId])),
      expiresAtMs:
        typeof result.expirationDateMs === 'number' ? result.expirationDateMs : base.expiresAtMs,
    });
    return { result, state: refreshed };
  } catch (err) {
    return {
      result: {
        status: 'error',
        productId,
        errorMessage: err instanceof Error ? err.message : String(err),
      },
      state: base,
    };
  }
}

export async function incrementMonthlyPausePassUsage(
  current?: ProEntitlementState
): Promise<ProEntitlementState> {
  const base = current || (await loadProState());
  const ym = getCurrentYearMonth();
  const prevCount = base.pausePassUsageMonth === ym ? base.pausePassMonthlyCount || 0 : 0;
  const next: ProEntitlementState = {
    ...base,
    pausePassUsageMonth: ym,
    pausePassMonthlyCount: prevCount + 1,
  };
  await saveProState(next);
  return next;
}
