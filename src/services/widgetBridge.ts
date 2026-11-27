import { NativeModules, Platform } from 'react-native';
import type { WidgetSnapshot } from '../utils/widgetSnapshot';

interface GuowuWidgetBridgeNative {
  updateSnapshot(jsonString: string): Promise<boolean>;
  syncLiveActivity(
    active: boolean,
    mode: string,
    startTimeMs: number,
    endTimeMs: number,
    targetHours: number,
    stageTitleZh: string,
    stageTitleEn: string,
    shichenZh: string,
    shichenEn: string,
    language: string
  ): Promise<boolean>;
}

const nativeModule = NativeModules.GuowuWidgetBridge as GuowuWidgetBridgeNative | undefined;

export async function pushWidgetAndLiveActivitySnapshot(snapshot: WidgetSnapshot): Promise<void> {
  if (Platform.OS !== 'ios' || !nativeModule) return;
  try {
    await nativeModule.updateSnapshot(JSON.stringify(snapshot));
  } catch {
    // Non-fatal in simulator or unsupported targets
  }
  try {
    const isSingleFast = Boolean(snapshot.fastStartEpochMs && snapshot.fastEndEpochMs && snapshot.mode === 'fasting');
    await nativeModule.syncLiveActivity(
      isSingleFast,
      snapshot.mode,
      snapshot.fastStartEpochMs || snapshot.updatedAt,
      snapshot.fastEndEpochMs || snapshot.updatedAt + snapshot.targetDurationHours * 3600000,
      snapshot.targetDurationHours,
      snapshot.stageTitleZh,
      snapshot.stageTitleEn,
      snapshot.shichenZh,
      snapshot.shichenEn,
      snapshot.language
    );
  } catch {
    // Ignore on iOS < 16.2 or when Live Activities are disabled by user
  }
}
