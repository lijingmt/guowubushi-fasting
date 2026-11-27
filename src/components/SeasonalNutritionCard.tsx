import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useApp } from '../context/AppContext';
import { isChineseLanguage } from '../utils/date';
import { getSeasonalNutritionGuide } from '../utils/solarTerm';
import { RefeedRitualModal } from './RefeedRitualModal';
import { fs, rs, vs } from '../theme/responsive';

interface SeasonalNutritionCardProps {
  compact?: boolean;
}

/**
 * 「节气食养与复食建议」：告诉用户在进食窗吃什么最抗饿、复食第一口吃什么护胃
 */
export const SeasonalNutritionCard: React.FC<SeasonalNutritionCardProps> = ({ compact = false }) => {
  const { colors, language } = useApp();
  const [showRefeed, setShowRefeed] = useState(false);
  const isZh = isChineseLanguage(language);
  const isEs = language === 'es';
  const guide = useMemo(() => getSeasonalNutritionGuide(new Date()), []);

  const combos = isZh ? guide.mealCombosZh : guide.mealCombosEn;
  const drinks = isZh ? guide.afternoonDrinksZh : guide.afternoonDrinksEn;

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: colors.text }]}>
          {isZh ? `🥣 ${guide.solarTerm.nameZh}食养 · 抗饿与复食` : isEs ? `🥣 Nutrición Estacional` : `🥣 ${guide.solarTerm.nameEn} Nutrition`}
        </Text>
        <View style={[styles.seasonPill, { backgroundColor: guide.solarTerm.seasonColor + '1C' }]}>
          <Text style={[styles.seasonText, { color: guide.solarTerm.seasonColor }]}>
            {isZh ? guide.seasonZh : guide.seasonEn}
          </Text>
        </View>
      </View>

      {!compact && (
        <View style={[styles.sectionBox, { backgroundColor: colors.backgroundSecondary }]}>
          <Text style={[styles.sectionHeading, { color: colors.primary }]}>
            {isZh ? '早午抗饿搭配（减缓下午馋意）' : isEs ? 'Ideas Saciantes de Día' : 'Satiating Meal Ideas'}
          </Text>
          {combos.map((line, i) => (
            <Text key={i} style={[styles.bodyText, { color: colors.text }]}>
              • {line}
            </Text>
          ))}
        </View>
      )}

      <View style={[styles.sectionBox, { backgroundColor: colors.backgroundSecondary }]}>
        <Text style={[styles.sectionHeading, { color: colors.warning }]}>
          {isZh ? '破食 / 复食第一口' : isEs ? 'Primer Bocado al Romper el Ayuno' : 'Gentle Refeed First Bite'}
        </Text>
        <Text style={[styles.bodyText, { color: colors.text }]}>
          {isZh ? guide.refeedFirstBiteZh : guide.refeedFirstBiteEn}
        </Text>
        <TouchableOpacity
          style={[styles.ritualBtn, { backgroundColor: colors.primary + '16', borderColor: colors.primary + '44' }]}
          onPress={() => {
            Haptics.selectionAsync();
            setShowRefeed(true);
          }}
        >
          <Text style={[styles.ritualBtnText, { color: colors.primary }]}>
            {isZh ? '🍵 开启 3 步温润开食仪式 →' : isEs ? '🍵 Ritual de Reapertura (3 Pasos) →' : '🍵 Start 3-Step Mindful Refeed Ritual →'}
          </Text>
        </TouchableOpacity>
      </View>

      <RefeedRitualModal
        visible={showRefeed}
        fastingHours={16}
        onClose={() => setShowRefeed(false)}
      />

      <View style={styles.drinksRow}>
        <Text style={[styles.drinksLabel, { color: colors.textSecondary }]}>
          {isZh ? '午后零卡推荐：' : isEs ? 'Té / Agua por la Tarde:' : 'Afternoon Tea/Water:'}
        </Text>
        <View style={styles.chipsWrap}>
          {drinks.map((drink) => (
            <View key={drink} style={[styles.chip, { backgroundColor: colors.primary + '14' }]}>
              <Text style={[styles.chipText, { color: colors.primary }]}>{drink}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: rs(16),
    borderWidth: 1,
    padding: rs(14),
    marginBottom: vs(14),
    gap: vs(10),
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: rs(6),
  },
  title: {
    fontSize: fs(15),
    fontWeight: '800',
  },
  seasonPill: {
    borderRadius: rs(10),
    paddingHorizontal: rs(8),
    paddingVertical: vs(3),
  },
  seasonText: {
    fontSize: fs(10.5),
    fontWeight: '700',
  },
  sectionBox: {
    borderRadius: rs(12),
    padding: rs(10),
    gap: vs(4),
  },
  sectionHeading: {
    fontSize: fs(12),
    fontWeight: '800',
    marginBottom: vs(2),
  },
  bodyText: {
    fontSize: fs(12),
    lineHeight: fs(18),
  },
  drinksRow: {
    gap: vs(6),
  },
  drinksLabel: {
    fontSize: fs(11.5),
    fontWeight: '700',
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: rs(6),
  },
  chip: {
    borderRadius: rs(10),
    paddingHorizontal: rs(9),
    paddingVertical: vs(4),
  },
  chipText: {
    fontSize: fs(11),
    fontWeight: '700',
  },
  ritualBtn: {
    marginTop: vs(6),
    borderRadius: rs(10),
    borderWidth: 1,
    paddingHorizontal: rs(10),
    paddingVertical: vs(7),
    alignItems: 'center',
  },
  ritualBtnText: {
    fontSize: fs(11.5),
    fontWeight: '800',
  },
});
