import React, { useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useApp } from '../context/AppContext';
import { buildRefeedRitual } from '../utils/refeedRitual';
import { isChineseLanguage } from '../utils/date';
import { fs, rs, vs } from '../theme/responsive';

interface RefeedRitualModalProps {
  visible: boolean;
  fastingHours: number;
  onClose: () => void;
}

/**
 * 「温润开食仪式 · Mindful Refeed Ritual」
 * 根据刚完成的断食时长 + 当日 24 节气生成温和 3 步开食序列，并支持一键记录第一口。
 */
export const RefeedRitualModal: React.FC<RefeedRitualModalProps> = ({
  visible,
  fastingHours,
  onClose,
}) => {
  const { colors, language, addMeal } = useApp();
  const isZh = isChineseLanguage(language);
  const isEs = language === 'es';
  const plan = useMemo(() => buildRefeedRitual(fastingHours, new Date()), [fastingHours]);
  const [checkedSteps, setCheckedSteps] = useState<Record<string, boolean>>({});
  const [loggedMeal, setLoggedMeal] = useState(false);

  const toggleStep = (id: string) => {
    Haptics.selectionAsync();
    setCheckedSteps((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleLogFirstBite = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const mealName = isZh
      ? plan.suggestedMealZh
      : isEs
      ? plan.suggestedMealEs
      : plan.suggestedMealEn;
    await addMeal({
      time: `${hh}:${mm}`,
      name: mealName,
      calories: plan.suggestedCalories,
      type: now.getHours() < 11 ? 'breakfast' : 'lunch',
      notes: `${plan.fastingHours}h Refeed`,
    });
    setLoggedMeal(true);
    Alert.alert(
      isZh ? '🍵 已记录温润开食' : isEs ? '🍵 Reapertura Registrada' : '🍵 First Bite Logged',
      isZh
        ? `已将「${mealName}」（约 ${plan.suggestedCalories} kcal）记入今日饮食。`
        : isEs
        ? `Registrado: ${mealName} (~${plan.suggestedCalories} kcal).`
        : `Logged ${mealName} (~${plan.suggestedCalories} kcal) in Today's Meals.`
    );
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.topRow}>
            <View style={[styles.termBadge, { backgroundColor: plan.solarTermColor + '1A' }]}>
              <Text style={[styles.termBadgeText, { color: plan.solarTermColor }]}>
                {isZh ? `${plan.solarTermZh}开食仪式` : `${plan.solarTermEn} Refeed`}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={[styles.closeText, { color: colors.textSecondary }]}>✕</Text>
            </TouchableOpacity>
          </View>

          <Text style={[styles.title, { color: colors.text }]}>
            {isZh ? plan.headlineZh : isEs ? plan.headlineEs : plan.headlineEn}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {isZh
              ? '顺应脾胃慢醒节奏，三步温和复食，护住轻盈代谢与血糖平稳。'
              : isEs
              ? 'Tres pasos suaves para proteger tu digestión y evitar picos de glucosa.'
              : 'Three calm steps to wake digestion gently and keep post-fast glucose steady.'}
          </Text>

          <ScrollView style={styles.stepsList} showsVerticalScrollIndicator={false}>
            {plan.steps.map((step) => {
              const done = Boolean(checkedSteps[step.id]);
              return (
                <TouchableOpacity
                  key={step.id}
                  style={[
                    styles.stepCard,
                    {
                      backgroundColor: done ? colors.primary + '14' : colors.backgroundSecondary,
                      borderColor: done ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => toggleStep(step.id)}
                  activeOpacity={0.85}
                >
                  <View style={styles.stepHeader}>
                    <Text style={styles.stepIcon}>{step.icon}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.stepTitle, { color: colors.text }]}>
                        {step.order}. {isZh ? step.titleZh : isEs ? step.titleEs : step.titleEn}
                      </Text>
                      <Text style={[styles.stepTiming, { color: colors.primary }]}>
                        ~{step.waitMinutes} {isZh ? '分钟节奏' : 'min pace'}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.checkCircle,
                        {
                          backgroundColor: done ? colors.primary : 'transparent',
                          borderColor: done ? colors.primary : colors.textLight,
                        },
                      ]}
                    >
                      {done && <Text style={styles.checkMark}>✓</Text>}
                    </View>
                  </View>
                  <Text style={[styles.stepDesc, { color: colors.textSecondary }]}>
                    {isZh ? step.descZh : isEs ? step.descEs : step.descEn}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <TouchableOpacity
            style={[
              styles.logBtn,
              { backgroundColor: loggedMeal ? colors.success : colors.primary },
            ]}
            onPress={handleLogFirstBite}
            disabled={loggedMeal}
          >
            <Text style={styles.logBtnText}>
              {loggedMeal
                ? isZh ? '✓ 已记录开食第一口' : isEs ? '✓ Registrado' : '✓ First Bite Logged'
                : isZh
                ? `🥢 一键记录第一餐（~${plan.suggestedCalories} kcal）`
                : isEs
                ? `🥢 Registrar Primera Comida (~${plan.suggestedCalories} kcal)`
                : `🥢 Log First Bite (~${plan.suggestedCalories} kcal)`}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.laterBtn} onPress={onClose}>
            <Text style={[styles.laterText, { color: colors.textSecondary }]}>
              {isZh ? '稍后自己吃 · 完成仪式' : isEs ? 'Listo · Cerrar' : 'Done · Close'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 22, 19, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: rs(18),
  },
  card: {
    width: '100%',
    maxWidth: rs(390),
    maxHeight: '86%',
    borderRadius: rs(22),
    borderWidth: 1,
    padding: rs(18),
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: vs(10),
  },
  termBadge: {
    borderRadius: rs(10),
    paddingHorizontal: rs(10),
    paddingVertical: vs(4),
  },
  termBadgeText: {
    fontSize: fs(11),
    fontWeight: '800',
  },
  closeBtn: {
    width: rs(28),
    height: rs(28),
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    fontSize: fs(16),
    fontWeight: '700',
  },
  title: {
    fontSize: fs(18),
    fontWeight: '900',
    lineHeight: fs(24),
  },
  subtitle: {
    fontSize: fs(12),
    lineHeight: fs(17),
    marginTop: vs(4),
    marginBottom: vs(12),
  },
  stepsList: {
    marginBottom: vs(12),
  },
  stepCard: {
    borderRadius: rs(14),
    borderWidth: 1,
    padding: rs(12),
    marginBottom: vs(8),
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(8),
    marginBottom: vs(5),
  },
  stepIcon: {
    fontSize: fs(20),
  },
  stepTitle: {
    fontSize: fs(13.5),
    fontWeight: '800',
  },
  stepTiming: {
    fontSize: fs(10.5),
    fontWeight: '700',
    marginTop: vs(1),
  },
  checkCircle: {
    width: rs(22),
    height: rs(22),
    borderRadius: rs(11),
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMark: {
    color: '#FFFFFF',
    fontSize: fs(12),
    fontWeight: '900',
  },
  stepDesc: {
    fontSize: fs(12),
    lineHeight: fs(17),
  },
  logBtn: {
    borderRadius: rs(12),
    paddingVertical: vs(12),
    alignItems: 'center',
  },
  logBtnText: {
    color: '#FFFFFF',
    fontSize: fs(13.5),
    fontWeight: '800',
  },
  laterBtn: {
    paddingVertical: vs(10),
    alignItems: 'center',
  },
  laterText: {
    fontSize: fs(12.5),
    fontWeight: '700',
  },
});
