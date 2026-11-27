import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useApp } from '../context/AppContext';
import { isChineseLanguage } from '../utils/date';
import { fs, rs, vs } from '../theme/responsive';

const SCORE_LEVELS = [1, 2, 3, 4, 5];

/**
 * 今日身心体感（精力 / 饥饿 / 心情 / 睡眠）+ 腰围快速打点卡
 */
export const WellnessCard: React.FC = () => {
  const { colors, language, settings, todayWellness, saveDailyWellness } = useApp();
  const isZh = isChineseLanguage(language);
  const isEs = language === 'es';
  const useInches = !isZh && settings.weightUnit === 'lb';
  const formatWaistDisplay = (waistCm?: number) => {
    if (typeof waistCm !== 'number' || !Number.isFinite(waistCm)) return '';
    return useInches ? `${(waistCm / 2.54).toFixed(1)} in` : `${waistCm.toFixed(1)} cm`;
  };
  const formatWaistInput = (waistCm?: number) => {
    if (typeof waistCm !== 'number' || !Number.isFinite(waistCm)) return '';
    return useInches ? (waistCm / 2.54).toFixed(1) : String(waistCm);
  };

  const [expanded, setExpanded] = useState(false);
  const [energy, setEnergy] = useState(todayWellness?.energy ?? 4);
  const [hunger, setHunger] = useState(todayWellness?.hunger ?? 2);
  const [mood, setMood] = useState(todayWellness?.mood ?? 4);
  const [sleep, setSleep] = useState(todayWellness?.sleep ?? 4);
  const [waistText, setWaistText] = useState(formatWaistInput(todayWellness?.waistCm));

  useEffect(() => {
    if (todayWellness) {
      setEnergy(todayWellness.energy);
      setHunger(todayWellness.hunger);
      setMood(todayWellness.mood);
      setSleep(todayWellness.sleep);
      setWaistText(formatWaistInput(todayWellness.waistCm));
    }
  }, [todayWellness, useInches]);

  const handleSave = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const parsedInput = parseFloat(waistText.replace(',', '.'));
    const waistCm = useInches ? Math.round(parsedInput * 2.54 * 10) / 10 : parsedInput;
    await saveDailyWellness({
      energy,
      hunger,
      mood,
      sleep,
      waistCm: Number.isFinite(parsedInput) && waistCm > 20 && waistCm < 250 ? waistCm : undefined,
    });
    setExpanded(false);
    Alert.alert(
      isZh ? '已记录今日体感' : isEs ? 'Registro Guardado' : 'Saved',
      isZh
        ? '可在“我的 → 统计 → 身心”查看断食前后状态对比。'
        : isEs
        ? 'Consulta tus tendencias en Perfil → Estadísticas → Bienestar.'
        : 'View your trends under Me → Stats → Wellness.'
    );
  };

  const rows: {
    key: string;
    label: string;
    val: number;
    set: (v: number) => void;
    lowHint: string;
    highHint: string;
  }[] = [
    {
      key: 'energy',
      label: isZh ? '⚡ 精力清醒' : isEs ? '⚡ Energía' : '⚡ Energy',
      val: energy,
      set: setEnergy,
      lowHint: isZh ? '疲倦' : isEs ? 'Baja' : 'Low',
      highHint: isZh ? '清明' : isEs ? 'Alta' : 'High',
    },
    {
      key: 'sleep',
      label: isZh ? '🌙 昨夜睡眠' : isEs ? '🌙 Sueño' : '🌙 Sleep',
      val: sleep,
      set: setSleep,
      lowHint: isZh ? '浅眠' : isEs ? 'Ligero' : 'Poor',
      highHint: isZh ? '深沉' : isEs ? 'Profundo' : 'Deep',
    },
    {
      key: 'mood',
      label: isZh ? '🫧 心境平和' : isEs ? '🫧 Ánimo' : '🫧 Mood',
      val: mood,
      set: setMood,
      lowHint: isZh ? '浮躁' : isEs ? 'Tenso' : 'Tense',
      highHint: isZh ? '安稳' : isEs ? 'Sereno' : 'Calm',
    },
    {
      key: 'hunger',
      label: isZh ? '🍃 饥饿强度' : isEs ? '🍃 Hambre' : '🍃 Hunger',
      val: hunger,
      set: setHunger,
      lowHint: isZh ? '无感' : isEs ? 'Nula' : 'None',
      highHint: isZh ? '较强' : isEs ? 'Fuerte' : 'Strong',
    },
  ];

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <TouchableOpacity
        style={styles.headerRow}
        onPress={() => {
          Haptics.selectionAsync();
          setExpanded(!expanded);
        }}
        activeOpacity={0.85}
      >
        <View style={{ flex: 1 }}>
          <Text style={[styles.eyebrow, { color: colors.primary }]}>
            {isZh ? '身心体感与腰围' : isEs ? 'Cuerpo-Mente y Cintura' : 'Mind-Body & Waist'}
          </Text>
          <Text style={[styles.title, { color: colors.text }]}>
            {todayWellness
              ? isZh
                ? `精力 ${todayWellness.energy}/5 · 睡眠 ${todayWellness.sleep}/5${todayWellness.waistCm ? ` · 腰围 ${todayWellness.waistCm}cm` : ''}`
                : isEs
                ? `Energía ${todayWellness.energy}/5 · Sueño ${todayWellness.sleep}/5${todayWellness.waistCm ? ` · ${formatWaistDisplay(todayWellness.waistCm)}` : ''}`
                : `Energy ${todayWellness.energy}/5 · Sleep ${todayWellness.sleep}/5${todayWellness.waistCm ? ` · ${formatWaistDisplay(todayWellness.waistCm)}` : ''}`
              : isZh
              ? '点此记录今日精力、睡眠、饥饿与腰围'
              : isEs
              ? 'Toca para registrar energía, sueño, hambre y cintura'
              : 'Tap to log energy, sleep, hunger & waist'}
          </Text>
        </View>
        <Text style={[styles.chevron, { color: colors.primary }]}>
          {expanded
            ? isZh ? '收起 ▴' : isEs ? 'Ocultar ▴' : 'Hide ▴'
            : todayWellness
            ? isZh ? '修改 ▾' : isEs ? 'Editar ▾' : 'Edit ▾'
            : isZh ? '打卡 ▾' : isEs ? 'Registrar ▾' : 'Log ▾'}
        </Text>
      </TouchableOpacity>

      {expanded && (
        <View style={[styles.body, { borderTopColor: colors.divider }]}>
          {rows.map((r) => (
            <View key={r.key} style={styles.metricRow}>
              <View style={styles.metricLabelCol}>
                <Text style={[styles.metricLabel, { color: colors.text }]}>{r.label}</Text>
                <Text style={[styles.metricScaleHint, { color: colors.textLight }]}>
                  {r.lowHint} → {r.highHint}
                </Text>
              </View>
              <View style={styles.dotsRow}>
                {SCORE_LEVELS.map((num) => {
                  const active = r.val === num;
                  return (
                    <TouchableOpacity
                      key={num}
                      style={[
                        styles.scoreBtn,
                        {
                          backgroundColor: active ? colors.primary : colors.backgroundSecondary,
                          borderColor: active ? colors.primary : colors.border,
                        },
                      ]}
                      onPress={() => {
                        Haptics.selectionAsync();
                        r.set(num);
                      }}
                    >
                      <Text style={[styles.scoreBtnText, { color: active ? '#FFF' : colors.textSecondary }]}>
                        {num}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ))}

          <View style={styles.waistRow}>
            <Text style={[styles.metricLabel, { color: colors.text }]}>
              {isZh ? '📏 今日腰围 (cm，选填)' : useInches ? (isEs ? '📏 Cintura in (opcional)' : '📏 Waist in (optional)') : (isEs ? '📏 Cintura cm (opcional)' : '📏 Waist cm (optional)')}
            </Text>
            <TextInput
              style={[
                styles.waistInput,
                {
                  color: colors.text,
                  backgroundColor: colors.backgroundSecondary,
                  borderColor: colors.border,
                },
              ]}
              value={waistText}
              onChangeText={setWaistText}
              placeholder={useInches ? 'e.g. 30.5' : 'e.g. 74.5'}
              placeholderTextColor={colors.textLight}
              keyboardType="decimal-pad"
            />
          </View>

          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: colors.primary }]}
            onPress={handleSave}
          >
            <Text style={styles.saveBtnText}>
              {isZh ? '保存今日体感' : isEs ? 'Guardar Registro' : 'Save Daily Log'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: rs(16),
    borderWidth: 1,
    padding: rs(14),
    marginTop: vs(12),
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: rs(8),
  },
  eyebrow: {
    fontSize: fs(11),
    fontWeight: '800',
    marginBottom: vs(2),
  },
  title: {
    fontSize: fs(14),
    fontWeight: '700',
  },
  chevron: {
    fontSize: fs(12),
    fontWeight: '800',
  },
  body: {
    marginTop: vs(12),
    paddingTop: vs(12),
    borderTopWidth: 1,
    gap: vs(10),
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: rs(8),
  },
  metricLabelCol: {
    flex: 1,
  },
  metricLabel: {
    fontSize: fs(13),
    fontWeight: '700',
  },
  metricScaleHint: {
    fontSize: fs(10),
    marginTop: vs(1),
  },
  dotsRow: {
    flexDirection: 'row',
    gap: rs(5),
  },
  scoreBtn: {
    width: rs(30),
    height: rs(30),
    borderRadius: rs(8),
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreBtnText: {
    fontSize: fs(12),
    fontWeight: '800',
  },
  waistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: vs(4),
    gap: rs(10),
  },
  waistInput: {
    width: rs(100),
    borderWidth: 1,
    borderRadius: rs(10),
    paddingHorizontal: rs(10),
    paddingVertical: vs(7),
    fontSize: fs(13),
    textAlign: 'center',
  },
  saveBtn: {
    marginTop: vs(4),
    borderRadius: rs(12),
    paddingVertical: vs(11),
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: fs(14),
    fontWeight: '700',
  },
});
