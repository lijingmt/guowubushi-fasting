import React, { useEffect, useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { useApp } from '../context/AppContext';
import type { FastingTier } from '../types';
import {
  FASTING_TIERS,
  formatMinutesHm,
  getRecommendedTier,
  getSundialRhythmState,
} from '../utils/fastingRhythm';
import { getSolarTermInfo } from '../utils/solarTerm';
import { fs, rs, vs } from '../theme/responsive';

interface SundialCompassCardProps {
  onOpenFastingTimer: () => void;
  onOpenZenPoster: () => void;
}

const STAGE_ORDER = [
  { id: 'digestion', zh: '0-4h 消化', en: '0-4h Digest' },
  { id: 'steady_glucose', zh: '4-12h 稳糖', en: '4-12h Steady' },
  { id: 'fat_burn', zh: '12-16h 燃脂', en: '12-16h Burn' },
  { id: 'autophagy', zh: '16h+ 清明', en: '16h+ Clear' },
];

export const SundialCompassCard: React.FC<SundialCompassCardProps> = ({
  onOpenFastingTimer,
  onOpenZenPoster,
}) => {
  const { colors, settings, updateSettings, activeFasting, stats, language } = useApp();
  const [now, setNow] = useState(() => new Date());
  const [showTierModal, setShowTierModal] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  const isZh = language === 'zh' || language === 'zh-Hant';
  const currentTierId: FastingTier = settings.fastingTier || 'classic';
  const rhythm = getSundialRhythmState(now, currentTierId, activeFasting);
  const solarTerm = getSolarTermInfo(now);
  const recommendedTier = getRecommendedTier(stats.completedDays);

  const size = rs(126);
  const strokeWidth = rs(10);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - rhythm.dialProgress);
  const ringColor = rhythm.mode === 'fasting' ? colors.primary : colors.warning;

  const handleSelectTier = async (tierId: FastingTier) => {
    Haptics.selectionAsync();
    await updateSettings({ fastingTier: tierId });
    setShowTierModal(false);
  };

  return (
    <>
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
          },
        ]}
      >
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
              setShowTierModal(true);
            }}
          >
            <Text style={[styles.tierPillText, { color: colors.primary }]}>
              {isZh ? `${rhythm.tier.nameZh} (${rhythm.tier.ratio})` : `${rhythm.tier.nameEn} (${rhythm.tier.ratio})`} ▾
            </Text>
          </TouchableOpacity>
        </View>

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
                  ? isZh
                    ? '进食窗口'
                    : 'Eating'
                  : isZh
                  ? '净空轻断'
                  : 'Fasting'}
              </Text>
              <Text style={[styles.dialValue, { color: colors.text }]}>
                {rhythm.mode === 'eating'
                  ? formatMinutesHm(rhythm.countdownMinutes, isZh)
                  : formatMinutesHm(rhythm.fastingElapsedMinutes, isZh)}
              </Text>
              <Text style={[styles.dialSub, { color: colors.textLight }]}>
                {rhythm.mode === 'eating'
                  ? isZh
                    ? `距 ${rhythm.tier.cutoffHour}:00 止食`
                    : `until ${rhythm.tier.cutoffHour}:00`
                  : rhythm.hasActiveTimer
                  ? isZh
                    ? `余 ${formatMinutesHm(rhythm.countdownMinutes, true)}`
                    : `${formatMinutesHm(rhythm.countdownMinutes, false)} left`
                  : isZh
                  ? rhythm.stage.shortZh
                  : rhythm.stage.shortEn}
              </Text>
            </View>
          </View>

          <View style={styles.infoCol}>
            <Text style={[styles.stageLabel, { color: colors.primary }]}>
              {isZh ? `当前节律 · ${rhythm.stage.titleZh}` : `Phase · ${rhythm.stage.titleEn}`}
            </Text>
            <Text style={[styles.stageDetail, { color: colors.textSecondary }]} numberOfLines={3}>
              {rhythm.mode === 'eating'
                ? isZh
                  ? solarTerm.tipZh
                  : solarTerm.tipEn
                : isZh
                ? rhythm.stage.detailZh
                : rhythm.stage.detailEn}
            </Text>

            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: colors.primary }]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onOpenFastingTimer();
                }}
              >
                <Text style={styles.actionBtnText}>
                  {rhythm.hasActiveTimer
                    ? isZh
                      ? '断食计时中'
                      : 'Timer Live'
                    : isZh
                    ? '单次断食'
                    : 'Fast Timer'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.posterBtn, { borderColor: colors.warning, backgroundColor: colors.warning + '14' }]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onOpenZenPoster();
                }}
              >
                <Text style={[styles.posterBtnText, { color: colors.warning }]}>
                  {isZh ? '节气日签' : 'Zen Card'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Physiological 4-stage bar */}
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
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {isZh ? '选择过午节律阶梯' : 'Choose Fasting Rhythm'}
            </Text>
            <Text style={[styles.modalSub, { color: colors.textSecondary }]}>
              {isZh
                ? `已完成 ${stats.completedDays} 天 · 推荐：${FASTING_TIERS[recommendedTier].nameZh}`
                : `${stats.completedDays} days completed · Recommended: ${FASTING_TIERS[recommendedTier].nameEn}`}
            </Text>

            {(['beginner', 'intermediate', 'classic'] as FastingTier[]).map((tierId) => {
              const tier = FASTING_TIERS[tierId];
              const selected = tierId === currentTierId;
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
                        {unlocked
                          ? isZh
                            ? '已解锁'
                            : 'Unlocked'
                          : isZh
                          ? `建议${tier.unlockDays}天`
                          : `${tier.unlockDays}d goal`}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.tierOptionDesc, { color: colors.textSecondary }]}>
                    {isZh ? tier.descZh : tier.descEn}
                  </Text>
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity
              style={[styles.modalClose, { backgroundColor: colors.divider }]}
              onPress={() => setShowTierModal(false)}
            >
              <Text style={[styles.modalCloseText, { color: colors.text }]}>
                {isZh ? '关闭' : 'Close'}
              </Text>
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
    marginBottom: vs(12),
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
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(14),
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
    lineHeight: fs(18),
    marginBottom: vs(10),
  },
  actionsRow: {
    flexDirection: 'row',
    gap: rs(8),
  },
  actionBtn: {
    flex: 1,
    paddingVertical: vs(8),
    paddingHorizontal: rs(10),
    borderRadius: rs(10),
    alignItems: 'center',
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: fs(12),
    fontWeight: '700',
  },
  posterBtn: {
    flex: 1,
    paddingVertical: vs(8),
    paddingHorizontal: rs(10),
    borderRadius: rs(10),
    borderWidth: 1,
    alignItems: 'center',
  },
  posterBtnText: {
    fontSize: fs(12),
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
    padding: rs(20),
  },
  modalCard: {
    width: '100%',
    maxWidth: rs(380),
    borderRadius: rs(20),
    padding: rs(20),
  },
  modalTitle: {
    fontSize: fs(18),
    fontWeight: '800',
    textAlign: 'center',
  },
  modalSub: {
    fontSize: fs(12),
    textAlign: 'center',
    marginTop: vs(4),
    marginBottom: vs(14),
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
  modalClose: {
    marginTop: vs(6),
    borderRadius: rs(12),
    paddingVertical: vs(12),
    alignItems: 'center',
  },
  modalCloseText: {
    fontSize: fs(14),
    fontWeight: '700',
  },
});
