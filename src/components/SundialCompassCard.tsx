import React, { useEffect, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { useApp } from '../context/AppContext';
import type { FastingTier, PauseReason, WeeklySchedule } from '../types';
import {
  FASTING_TIERS,
  PAUSE_REASONS,
  formatMinutesHm,
  getEffectiveDaySchedule,
  getRecommendedTier,
  getSundialRhythmState,
} from '../utils/fastingRhythm';
import { addLocalDays, getLocalDateString, isChineseLanguage } from '../utils/date';
import { getSolarTermInfo } from '../utils/solarTerm';
import { fs, rs, vs } from '../theme/responsive';

interface SundialCompassCardProps {
  onOpenFastingTimer: () => void;
  onOpenZenPoster: () => void;
  onOpenHungerRescue: () => void;
}

const STAGE_ORDER = [
  { id: 'digestion', zh: '0-4h 消化', en: '0-4h Digest' },
  { id: 'steady_glucose', zh: '4-12h 稳糖', en: '4-12h Steady' },
  { id: 'fat_burn', zh: '12-16h 燃脂', en: '12-16h Burn' },
  { id: 'autophagy', zh: '16h+ 清明', en: '16h+ Clear' },
];

const WEEKDAYS = [
  { day: 1, zh: '一', en: 'M' },
  { day: 2, zh: '二', en: 'T' },
  { day: 3, zh: '三', en: 'W' },
  { day: 4, zh: '四', en: 'T' },
  { day: 5, zh: '五', en: 'F' },
  { day: 6, zh: '六', en: 'S' },
  { day: 0, zh: '日', en: 'S' },
];

export const SundialCompassCard: React.FC<SundialCompassCardProps> = ({
  onOpenFastingTimer,
  onOpenZenPoster,
  onOpenHungerRescue,
}) => {
  const { colors, settings, updateSettings, activeFasting, stats, language } = useApp();
  const [now, setNow] = useState(() => new Date());
  const [showTierModal, setShowTierModal] = useState(false);
  const [modalTab, setModalTab] = useState<'tier' | 'flex'>('tier');
  const [pauseDays, setPauseDays] = useState<1 | 3 | 7>(1);
  const [pauseReason, setPauseReason] = useState<PauseReason>('social');

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  const isZh = isChineseLanguage(language);
  const daySchedule = getEffectiveDaySchedule(now, settings);
  const currentTierId: FastingTier = daySchedule.tierId;
  const rhythm = getSundialRhythmState(now, currentTierId, activeFasting);
  const solarTerm = getSolarTermInfo(now);
  const recommendedTier = getRecommendedTier(stats.completedDays);

  const size = rs(126);
  const strokeWidth = rs(10);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - rhythm.dialProgress);
  const ringColor =
    daySchedule.status !== 'active'
      ? colors.info
      : rhythm.mode === 'fasting'
      ? colors.primary
      : colors.warning;

  const handleSelectTier = async (tierId: FastingTier) => {
    Haptics.selectionAsync();
    await updateSettings({ fastingTier: tierId });
    setShowTierModal(false);
  };

  const cycleWeekday = async (weekday: number) => {
    Haptics.selectionAsync();
    const baseTier: FastingTier = settings.fastingTier || 'classic';
    const current = settings.weeklySchedule?.[weekday] || baseTier;
    const order: (FastingTier | 'rest')[] = ['classic', 'intermediate', 'beginner', 'rest'];
    const nextVal = order[(order.indexOf(current) + 1) % order.length];
    const nextWeekly: WeeklySchedule = { ...(settings.weeklySchedule || {}), [weekday]: nextVal };
    await updateSettings({ weeklySchedule: nextWeekly });
  };

  const activatePause = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const today = getLocalDateString();
    const endDate = addLocalDays(today, pauseDays - 1);
    await updateSettings({
      pausePass: { active: true, reason: pauseReason, startDate: today, endDate },
    });
  };

  const cancelPause = async () => {
    Haptics.selectionAsync();
    await updateSettings({ pausePass: null });
  };

  const pauseMeta = PAUSE_REASONS.find((r) => r.id === daySchedule.pauseReason);

  return (
    <>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.topRow}>
          <View style={[styles.shichenPill, { backgroundColor: colors.backgroundSecondary }]}>
            <Text style={[styles.shichenText, { color: colors.text }]}>
              {isZh ? `${rhythm.shichen.nameZh} · ${solarTerm.nameZh}` : `${rhythm.shichen.nameEn} · ${solarTerm.nameEn}`}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.tierPill, { backgroundColor: colors.primary + '16', borderColor: colors.primary + '44' }]}
            onPress={() => {
              Haptics.selectionAsync();
              setModalTab('tier');
              setShowTierModal(true);
            }}
          >
            <Text style={[styles.tierPillText, { color: colors.primary }]}>
              {daySchedule.status === 'paused'
                ? isZh ? '护航暂停中 ▾' : 'Paused ▾'
                : daySchedule.status === 'rest'
                ? isZh ? '弹性休养日 ▾' : 'Rest Day ▾'
                : isZh
                ? `${rhythm.tier.nameZh} (${rhythm.tier.ratio}) ▾`
                : `${rhythm.tier.nameEn} (${rhythm.tier.ratio}) ▾`}
            </Text>
          </TouchableOpacity>
        </View>

        {daySchedule.status !== 'active' && (
          <View style={[styles.pauseBanner, { backgroundColor: colors.info + '18', borderColor: colors.info + '44' }]}>
            <Text style={[styles.pauseBannerText, { color: colors.info }]}>
              {daySchedule.status === 'paused'
                ? isZh
                  ? `${pauseMeta?.icon || '🛡️'} 护航暂停中（${pauseMeta?.labelZh || '调养'} · 至 ${settings.pausePass?.endDate}）：连胜安全保留`
                  : `Pause Pass Active until ${settings.pausePass?.endDate} · Streak Protected`
                : isZh
                ? '🍃 今日为预设弹性休养日：安心饮食，不断连胜'
                : '🍃 Scheduled Flexible Rest Day · Streak Protected'}
            </Text>
          </View>
        )}

        <View style={styles.mainRow}>
          <View style={styles.dialContainer}>
            <Svg width={size} height={size}>
              <Circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke={colors.divider}
                strokeWidth={strokeWidth}
                fill="none"
              />
              <Circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke={ringColor}
                strokeWidth={strokeWidth}
                fill="none"
                strokeDasharray={`${circumference}`}
                strokeDashoffset={dashOffset}
                strokeLinecap="round"
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
              />
            </Svg>
            <View style={styles.dialCenter}>
              <Text style={[styles.dialTag, { color: colors.textSecondary }]}>
                {rhythm.mode === 'eating'
                  ? isZh ? '进食窗口' : 'Eating'
                  : isZh ? '净空轻断' : 'Fasting'}
              </Text>
              <Text style={[styles.dialValue, { color: colors.text }]}>
                {rhythm.mode === 'eating'
                  ? formatMinutesHm(rhythm.countdownMinutes, isZh)
                  : formatMinutesHm(rhythm.fastingElapsedMinutes, isZh)}
              </Text>
              <Text style={[styles.dialSub, { color: colors.textLight }]}>
                {rhythm.mode === 'eating'
                  ? isZh ? `距 ${rhythm.tier.cutoffHour}:00 止食` : `until ${rhythm.tier.cutoffHour}:00`
                  : rhythm.hasActiveTimer
                  ? isZh ? `余 ${formatMinutesHm(rhythm.countdownMinutes, true)}` : `${formatMinutesHm(rhythm.countdownMinutes, false)} left`
                  : isZh ? rhythm.stage.shortZh : rhythm.stage.shortEn}
              </Text>
            </View>
          </View>

          <View style={styles.infoCol}>
            <Text style={[styles.stageLabel, { color: colors.primary }]}>
              {isZh ? `当前节律 · ${rhythm.stage.titleZh}` : `Phase · ${rhythm.stage.titleEn}`}
            </Text>
            <Text style={[styles.stageDetail, { color: colors.textSecondary }]} numberOfLines={3}>
              {rhythm.mode === 'eating'
                ? isZh ? solarTerm.tipZh : solarTerm.tipEn
                : isZh ? rhythm.stage.detailZh : rhythm.stage.detailEn}
            </Text>

            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: colors.primary }]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onOpenFastingTimer();
                }}
              >
                <Text style={styles.actionBtnText} numberOfLines={1}>
                  {rhythm.hasActiveTimer ? (isZh ? '计时中' : 'Timer') : isZh ? '单次断食' : 'Timer'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.posterBtn, { borderColor: colors.warning, backgroundColor: colors.warning + '14' }]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onOpenZenPoster();
                }}
              >
                <Text style={[styles.posterBtnText, { color: colors.warning }]} numberOfLines={1}>
                  {isZh ? '节气日签' : 'Poster'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.rescueBtn, { borderColor: colors.error, backgroundColor: colors.error + '12' }]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onOpenHungerRescue();
                }}
              >
                <Text style={[styles.rescueBtnText, { color: colors.error }]} numberOfLines={1}>
                  {isZh ? '抗饿急救' : 'Craving?'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.stageTrackRow}>
          {STAGE_ORDER.map((item, idx) => {
            const active = rhythm.mode === 'fasting' && idx === rhythm.stage.index;
            const passed = rhythm.mode === 'fasting' && idx < rhythm.stage.index;
            return (
              <View
                key={item.id}
                style={[
                  styles.stageChip,
                  {
                    backgroundColor: active
                      ? colors.primary + '20'
                      : passed
                      ? colors.success + '18'
                      : colors.backgroundSecondary,
                    borderColor: active ? colors.primary : 'transparent',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.stageChipText,
                    { color: active ? colors.primary : passed ? colors.success : colors.textLight },
                  ]}
                  numberOfLines={1}
                >
                  {isZh ? item.zh : item.en}
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      <Modal
        visible={showTierModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowTierModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
            <View style={[styles.modalSwitchRow, { backgroundColor: colors.backgroundSecondary }]}>
              <TouchableOpacity
                style={[styles.modalSwitchBtn, modalTab === 'tier' && { backgroundColor: colors.primary }]}
                onPress={() => setModalTab('tier')}
              >
                <Text style={[styles.modalSwitchText, { color: modalTab === 'tier' ? '#FFF' : colors.textSecondary }]}>
                  {isZh ? '过午阶梯' : 'Tiers'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSwitchBtn, modalTab === 'flex' && { backgroundColor: colors.primary }]}
                onPress={() => setModalTab('flex')}
              >
                <Text style={[styles.modalSwitchText, { color: modalTab === 'flex' ? '#FFF' : colors.textSecondary }]}>
                  {isZh ? '弹性排班 & 护航暂停' : 'Flex & Pause'}
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: vs(430) }}>
              {modalTab === 'tier' ? (
                <>
                  <Text style={[styles.modalSub, { color: colors.textSecondary }]}>
                    {isZh
                      ? `已完成 ${stats.completedDays} 天 · 推荐：${FASTING_TIERS[recommendedTier].nameZh}`
                      : `${stats.completedDays} days done · Recommended: ${FASTING_TIERS[recommendedTier].nameEn}`}
                  </Text>
                  {(['beginner', 'intermediate', 'classic'] as FastingTier[]).map((tierId) => {
                    const tier = FASTING_TIERS[tierId];
                    const selected = tierId === (settings.fastingTier || 'classic');
                    const unlocked = stats.completedDays >= tier.unlockDays;
                    return (
                      <TouchableOpacity
                        key={tierId}
                        style={[
                          styles.tierOption,
                          {
                            backgroundColor: selected ? colors.primary + '16' : colors.backgroundSecondary,
                            borderColor: selected ? colors.primary : colors.border,
                          },
                        ]}
                        onPress={() => handleSelectTier(tierId)}
                      >
                        <View style={styles.tierOptionTop}>
                          <Text style={[styles.tierOptionTitle, { color: colors.text }]}>
                            {isZh ? `${tier.nameZh} · ${tier.windowZh}` : `${tier.nameEn} · ${tier.windowEn}`}
                          </Text>
                          <View
                            style={[
                              styles.unlockTag,
                              { backgroundColor: unlocked ? colors.success + '20' : colors.warning + '20' },
                            ]}
                          >
                            <Text style={[styles.unlockTagText, { color: unlocked ? colors.success : colors.warning }]}>
                              {unlocked ? (isZh ? '已解锁' : 'Unlocked') : isZh ? `建议${tier.unlockDays}天` : `${tier.unlockDays}d goal`}
                            </Text>
                          </View>
                        </View>
                        <Text style={[styles.tierOptionDesc, { color: colors.textSecondary }]}>
                          {isZh ? tier.descZh : tier.descEn}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </>
              ) : (
                <>
                  <Text style={[styles.flexTitle, { color: colors.text }]}>
                    {isZh ? '每周弹性排班（点击切换）' : 'Weekly Schedule (Tap to cycle)'}
                  </Text>
                  <View style={styles.weekdayGrid}>
                    {WEEKDAYS.map((w) => {
                      const val = settings.weeklySchedule?.[w.day] || (settings.fastingTier || 'classic');
                      const shortVal =
                        val === 'rest'
                          ? isZh ? '休' : 'Rest'
                          : `${FASTING_TIERS[val].cutoffHour}:00`;
                      return (
                        <TouchableOpacity
                          key={w.day}
                          style={[
                            styles.weekdayCell,
                            {
                              backgroundColor: val === 'rest' ? colors.info + '1C' : colors.backgroundSecondary,
                              borderColor: val === 'rest' ? colors.info : colors.border,
                            },
                          ]}
                          onPress={() => cycleWeekday(w.day)}
                        >
                          <Text style={[styles.weekdayName, { color: colors.text }]}>{isZh ? w.zh : w.en}</Text>
                          <Text style={[styles.weekdayVal, { color: val === 'rest' ? colors.info : colors.primary }]}>
                            {shortVal}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <Text style={[styles.flexTitle, { color: colors.text, marginTop: vs(12) }]}>
                    {isZh ? '护航请假暂停（保留连胜记录）' : 'Pause Pass (Protect Streak)'}
                  </Text>
                  <View style={styles.reasonWrap}>
                    {PAUSE_REASONS.map((r) => {
                      const active = pauseReason === r.id;
                      return (
                        <TouchableOpacity
                          key={r.id}
                          style={[
                            styles.reasonChip,
                            {
                              backgroundColor: active ? colors.primary + '1C' : colors.backgroundSecondary,
                              borderColor: active ? colors.primary : colors.border,
                            },
                          ]}
                          onPress={() => setPauseReason(r.id)}
                        >
                          <Text style={[styles.reasonText, { color: active ? colors.primary : colors.text }]}>
                            {r.icon} {isZh ? r.labelZh : r.labelEn}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <View style={styles.daysRow}>
                    {([1, 3, 7] as const).map((d) => {
                      const active = pauseDays === d;
                      return (
                        <TouchableOpacity
                          key={d}
                          style={[
                            styles.dayPickBtn,
                            {
                              backgroundColor: active ? colors.primary : colors.backgroundSecondary,
                              borderColor: active ? colors.primary : colors.border,
                            },
                          ]}
                          onPress={() => setPauseDays(d)}
                        >
                          <Text style={{ fontSize: fs(12), fontWeight: '700', color: active ? '#FFF' : colors.text }}>
                            {isZh ? `${d} 天` : `${d}d`}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {settings.pausePass?.active ? (
                    <TouchableOpacity style={[styles.pauseActionBtn, { backgroundColor: colors.error }]} onPress={cancelPause}>
                      <Text style={styles.pauseActionText}>{isZh ? '提前结束护航暂停' : 'End Pause Early'}</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity style={[styles.pauseActionBtn, { backgroundColor: colors.info }]} onPress={activatePause}>
                      <Text style={styles.pauseActionText}>
                        {isZh ? `开启 ${pauseDays} 天护航暂停` : `Activate ${pauseDays}-Day Pause`}
                      </Text>
                    </TouchableOpacity>
                  )}
                </>
              )}
            </ScrollView>

            <TouchableOpacity
              style={[styles.modalClose, { backgroundColor: colors.divider }]}
              onPress={() => setShowTierModal(false)}
            >
              <Text style={[styles.modalCloseText, { color: colors.text }]}>{isZh ? '关闭' : 'Close'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: rs(20),
    borderWidth: 1,
    padding: rs(16),
    marginBottom: vs(14),
    shadowColor: '#1F2A24',
    shadowOffset: { width: 0, height: vs(3) },
    shadowOpacity: 0.06,
    shadowRadius: rs(8),
    elevation: 2,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: vs(10),
    gap: rs(8),
  },
  shichenPill: {
    paddingHorizontal: rs(10),
    paddingVertical: vs(5),
    borderRadius: rs(12),
  },
  shichenText: {
    fontSize: fs(12),
    fontWeight: '700',
  },
  tierPill: {
    paddingHorizontal: rs(10),
    paddingVertical: vs(5),
    borderRadius: rs(12),
    borderWidth: 1,
  },
  tierPillText: {
    fontSize: fs(12),
    fontWeight: '700',
  },
  pauseBanner: {
    borderWidth: 1,
    borderRadius: rs(10),
    paddingHorizontal: rs(10),
    paddingVertical: vs(6),
    marginBottom: vs(10),
  },
  pauseBannerText: {
    fontSize: fs(11.5),
    fontWeight: '700',
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(12),
  },
  dialContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: rs(8),
  },
  dialTag: {
    fontSize: fs(10),
    fontWeight: '600',
  },
  dialValue: {
    fontSize: fs(14),
    fontWeight: '800',
    marginTop: vs(2),
    textAlign: 'center',
  },
  dialSub: {
    fontSize: fs(10),
    marginTop: vs(2),
    textAlign: 'center',
  },
  infoCol: {
    flex: 1,
  },
  stageLabel: {
    fontSize: fs(14),
    fontWeight: '800',
    marginBottom: vs(4),
  },
  stageDetail: {
    fontSize: fs(12),
    lineHeight: fs(17),
    marginBottom: vs(10),
  },
  actionsRow: {
    flexDirection: 'row',
    gap: rs(6),
  },
  actionBtn: {
    flex: 1,
    paddingVertical: vs(8),
    paddingHorizontal: rs(6),
    borderRadius: rs(10),
    alignItems: 'center',
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: fs(11),
    fontWeight: '700',
  },
  posterBtn: {
    flex: 1,
    paddingVertical: vs(8),
    paddingHorizontal: rs(6),
    borderRadius: rs(10),
    borderWidth: 1,
    alignItems: 'center',
  },
  posterBtnText: {
    fontSize: fs(11),
    fontWeight: '700',
  },
  rescueBtn: {
    flex: 1,
    paddingVertical: vs(8),
    paddingHorizontal: rs(6),
    borderRadius: rs(10),
    borderWidth: 1,
    alignItems: 'center',
  },
  rescueBtnText: {
    fontSize: fs(11),
    fontWeight: '700',
  },
  stageTrackRow: {
    flexDirection: 'row',
    gap: rs(6),
    marginTop: vs(14),
  },
  stageChip: {
    flex: 1,
    paddingVertical: vs(6),
    paddingHorizontal: rs(4),
    borderRadius: rs(8),
    borderWidth: 1,
    alignItems: 'center',
  },
  stageChipText: {
    fontSize: fs(10),
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(17, 23, 21, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: rs(18),
  },
  modalCard: {
    width: '100%',
    maxWidth: rs(390),
    borderRadius: rs(20),
    padding: rs(18),
  },
  modalSwitchRow: {
    flexDirection: 'row',
    borderRadius: rs(12),
    padding: rs(3),
    marginBottom: vs(12),
  },
  modalSwitchBtn: {
    flex: 1,
    paddingVertical: vs(8),
    borderRadius: rs(9),
    alignItems: 'center',
  },
  modalSwitchText: {
    fontSize: fs(12.5),
    fontWeight: '700',
  },
  modalSub: {
    fontSize: fs(12),
    textAlign: 'center',
    marginBottom: vs(12),
  },
  tierOption: {
    borderRadius: rs(14),
    borderWidth: 1,
    padding: rs(12),
    marginBottom: vs(10),
  },
  tierOptionTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: vs(4),
  },
  tierOptionTitle: {
    fontSize: fs(14),
    fontWeight: '700',
  },
  unlockTag: {
    borderRadius: rs(8),
    paddingHorizontal: rs(8),
    paddingVertical: vs(2),
  },
  unlockTagText: {
    fontSize: fs(10),
    fontWeight: '700',
  },
  tierOptionDesc: {
    fontSize: fs(12),
    lineHeight: fs(17),
  },
  flexTitle: {
    fontSize: fs(13),
    fontWeight: '800',
    marginBottom: vs(8),
  },
  weekdayGrid: {
    flexDirection: 'row',
    gap: rs(5),
  },
  weekdayCell: {
    flex: 1,
    borderWidth: 1,
    borderRadius: rs(10),
    paddingVertical: vs(8),
    alignItems: 'center',
  },
  weekdayName: {
    fontSize: fs(12),
    fontWeight: '800',
  },
  weekdayVal: {
    fontSize: fs(9.5),
    fontWeight: '700',
    marginTop: vs(3),
  },
  reasonWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: rs(8),
    marginBottom: vs(10),
  },
  reasonChip: {
    borderWidth: 1,
    borderRadius: rs(10),
    paddingHorizontal: rs(10),
    paddingVertical: vs(7),
  },
  reasonText: {
    fontSize: fs(12),
    fontWeight: '700',
  },
  daysRow: {
    flexDirection: 'row',
    gap: rs(8),
    marginBottom: vs(12),
  },
  dayPickBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: rs(10),
    paddingVertical: vs(8),
    alignItems: 'center',
  },
  pauseActionBtn: {
    borderRadius: rs(12),
    paddingVertical: vs(12),
    alignItems: 'center',
    marginBottom: vs(6),
  },
  pauseActionText: {
    color: '#FFFFFF',
    fontSize: fs(13),
    fontWeight: '800',
  },
  modalClose: {
    marginTop: vs(10),
    borderRadius: rs(12),
    paddingVertical: vs(12),
    alignItems: 'center',
  },
  modalCloseText: {
    fontSize: fs(14),
    fontWeight: '700',
  },
});
