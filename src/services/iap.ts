import { NativeModules, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ALL_IAP_PRODUCT_IDS,
  TEA_TIP_IDS,
  getCurrentYearMonth,
  resolveBillingEnabledFromChannel,
  resolveSubscriptionTier,
  type SubscriptionTier,
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
  tier: SubscriptionTier;
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
  tier: 'free',
  isPro: false,
  activeProductIds: [],
  expiresAtMs: null,
  teaTipsCount: 0,
  lastCheckedAt: null,
};

interface NativeBillingModule {
  isAvailable(): Promise<boolean>;
  getBillingMode?(): Promise<{ enabled: boolean; channel: string; buildMode?: string }>;
  fetchProducts(productIds: string[]): Promise<StoreKitProductInfo[]>;
  purchase(productId: string): Promise<NativePurchaseResult>;
  getCurrentEntitlements(): Promise<{
    tier?: SubscriptionTier;
    isLite?: boolean;
    isPro: boolean;
    activeProductIds: string[];
    expiresAtMs?: number | null;
  }>;
  restorePurchases(): Promise<{
    tier?: SubscriptionTier;
    isLite?: boolean;
    isPro: boolean;
    activeProductIds: string[];
    expiresAtMs?: number | null;
  }>;
}

function getNativeStoreKit(): NativeBillingModule | null {
  const mods = NativeModules as Record<string, unknown>;
  if (Platform.OS === 'ios') {
    return (mods.GuowuStoreKit as NativeBillingModule | undefined) || null;
  }
  if (Platform.OS === 'android') {
    return (mods.GuowuPlayBilling as NativeBillingModule | undefined) || null;
  }
  return null;
}

export async function detectNativeBillingSupport(): Promise<{
  enabled: boolean;
  channel: 'app_store' | 'google_play' | 'direct_free';
}> {
  if (Platform.OS === 'ios') {
    return { enabled: true, channel: 'app_store' };
  }
  if (Platform.OS === 'android') {
    const mod = getNativeStoreKit();
    if (!mod?.getBillingMode) {
      return { enabled: false, channel: 'direct_free' };
    }
    try {
      const mode = await mod.getBillingMode();
      const enabled = resolveBillingEnabledFromChannel('android', Boolean(mode?.enabled));
      return {
        enabled,
        channel: enabled ? 'google_play' : 'direct_free',
      };
    } catch {
      return { enabled: false, channel: 'direct_free' };
    }
  }
  return { enabled: false, channel: 'direct_free' };
}

export async function loadProState(): Promise<ProEntitlementState> {
  try {
    const raw = await AsyncStorage.getItem(PRO_STATE_KEY);
    if (!raw) return DEFAULT_PRO_STATE;
    const parsed = JSON.parse(raw) as Partial<ProEntitlementState>;
    const activeIds = Array.isArray(parsed.activeProductIds) ? parsed.activeProductIds : [];
    const tier: SubscriptionTier =
      parsed.tier === 'pro' || parsed.tier === 'lite' || parsed.tier === 'free'
        ? parsed.tier
        : parsed.isPro
        ? 'pro'
        : resolveSubscriptionTier(activeIds);
    return {
      ...DEFAULT_PRO_STATE,
      ...parsed,
      tier,
      isPro: tier === 'pro',
      activeProductIds: activeIds,
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
    const activeIds = Array.isArray(summary?.activeProductIds) ? summary.activeProductIds : [];
    const derivedTier = resolveSubscriptionTier(activeIds);
    const tier: SubscriptionTier =
      summary?.tier === 'pro' || summary?.tier === 'lite' ? summary.tier : derivedTier;
    const next: ProEntitlementState = {
      ...base,
      tier,
      isPro: tier === 'pro',
      activeProductIds: activeIds,
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
    const activeIds = Array.isArray(summary?.activeProductIds) ? summary.activeProductIds : [];
    const derivedTier = resolveSubscriptionTier(activeIds);
    const tier: SubscriptionTier =
      summary?.tier === 'pro' || summary?.tier === 'lite' ? summary.tier : derivedTier;
    const next: ProEntitlementState = {
      ...base,
      tier,
      isPro: tier === 'pro',
      activeProductIds: activeIds,
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

    const nextIds = Array.from(new Set([...base.activeProductIds, productId]));
    const derivedTier = resolveSubscriptionTier(nextIds);
    const refreshed = await syncNativeEntitlements({
      ...base,
      tier: derivedTier,
      isPro: derivedTier === 'pro',
      activeProductIds: nextIds,
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
