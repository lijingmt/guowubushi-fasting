import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { fs, rs, vs } from '../theme/responsive';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import type { Language } from '../i18n/translations';
import type { FastingGoal, FastingTier } from '../types';
import { FASTING_GOALS, FASTING_TIERS } from '../utils/fastingRhythm';

const TERMS_AGREED_KEY = '@guowu_terms_agreed';

export interface OnboardingResult {
  fastingGoal: FastingGoal;
  fastingTier: FastingTier;
  traditionalMode: boolean;
}

interface WelcomeScreenProps {
  onDismiss: () => void;
  onComplete?: (prefs: OnboardingResult) => Promise<void> | void;
  colors: any;
  language: Language;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  onDismiss,
  onComplete,
  colors,
  language,
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedGoal, setSelectedGoal] = useState<FastingGoal>('mindful_discipline');
  const [selectedTier, setSelectedTier] = useState<FastingTier>('intermediate');
  const [agreed, setAgreed] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  const isZh = language === 'zh' || language === 'zh-Hant';
  const isEs = language === 'es';

  const handleGoalSelect = (goalId: FastingGoal) => {
    Haptics.selectionAsync();
    setSelectedGoal(goalId);
    const meta = FASTING_GOALS.find((g) => g.id === goalId);
    if (meta) {
      setSelectedTier(meta.recommendedTier);
    }
  };

  const handleGetStarted = async () => {
    if (!agreed) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    const goalMeta = FASTING_GOALS.find((g) => g.id === selectedGoal);
    await AsyncStorage.setItem(TERMS_AGREED_KEY, 'true');
    if (onComplete) {
      await onComplete({
        fastingGoal: selectedGoal,
        fastingTier: selectedTier,
        traditionalMode: Boolean(goalMeta?.traditionalMode),
      });
    }
    onDismiss();
  };

  const getTermsCopy = () => {
    if (isEs) {
      return {
        appName: 'Guowu · Ayuno Consciente',
        agreeText: 'He leído y acepto los ',
        termsLink: 'Términos de Servicio',
        getStarted: 'Comenzar Mi Ritmo',
        termsTitle: 'Términos de Servicio',
        terms: [
          {
            title: '⚠️ Descargo de Responsabilidad de Salud',
            color: colors.warning,
            content:
              'Esta aplicación es solo para fines informativos y no sustituye el consejo médico. Consulta a un profesional de la salud calificado antes de iniciar cualquier programa de ayuno, especialmente si eres menor de 18 años, estás embarazada o lactando, tienes diabetes, hipoglucemia, enfermedades cardíacas, trastornos alimentarios o tomas medicamentos recetados.',
          },
          {
            title: '🚨 Detente Si Te Sientes Mal',
            color: colors.error,
            content:
              'Si experimentas mareos, desmayos, dolor en el pecho, palpitaciones, dolor de cabeza severo, debilidad extrema o náuseas, detén el ayuno inmediatamente, aliméntate y busca atención médica si persisten.',
          },
          {
            title: '⚖️ Limitación de Responsabilidad',
            color: colors.textSecondary,
            content:
              'Esta aplicación y sus creadores no se responsabilizan por lesiones, problemas de salud o daños derivados del uso de la aplicación. Úsala de forma racional bajo tu propia responsabilidad.',
          },
          {
            title: '🔒 Privacidad y Datos',
            color: colors.text,
            content:
              'Tus registros de ayuno y salud se guardan localmente en tu dispositivo. Los rankings y funciones sociales opcionales son anónimos.',
          },
        ],
      };
    }
    if (!isZh) {
      return {
        appName: 'Guowu · Circadian Fasting',
        agreeText: 'I have read and agree to the ',
        termsLink: 'Terms of Service',
        getStarted: 'Start My Rhythm',
        termsTitle: 'Terms of Service',
        terms: [
          {
            title: '⚠️ Health Disclaimer',
            color: colors.warning,
            content:
              'This app is for informational purposes only and is not medical advice. Always consult a qualified healthcare professional before starting any fasting program, especially if under 18, pregnant or nursing, have diabetes, hypoglycemia, heart disease, eating disorders, or take prescription medications.',
          },
          {
            title: '🚨 Stop If Unwell',
            color: colors.error,
            content:
              'If you experience dizziness, fainting, chest pain, palpitations, severe headache, extreme weakness, or nausea, stop fasting immediately, eat, and seek medical care if needed.',
          },
          {
            title: '⚖️ Limitation of Liability',
            color: colors.textSecondary,
            content:
              'This app and its creators are not liable for any injury, health issue, or damages resulting from use of this app. Listen to your body and use at your own risk.',
          },
          {
            title: '🔒 Privacy & Data',
            color: colors.text,
            content:
              'Your fasting, meal, water, and weight records remain locally on your device. Optional leaderboard and buddy features sync anonymously.',
          },
        ],
      };
    }
    return {
      appName: '过午不食',
      agreeText: '我已阅读并同意',
      termsLink: '《用户服务条款》',
      getStarted: '开启今日节律',
      termsTitle: '用户服务条款与健康声明',
      terms: [
        {
          title: '⚠️ 健康免责声明',
          color: colors.warning,
          content:
            '本应用仅供生活节律与信息参考，不构成医疗建议或诊疗意见。开始轻断食前请评估自身状况并建议咨询医生，尤其是未满 18 岁、孕期或哺乳期、糖尿病、低血糖、心脏疾病、饮食失调或正在服用处方药物人群。',
        },
        {
          title: '🚨 身体不适立即停止',
          color: colors.error,
          content:
            '若出现头晕、昏厥、胸痛、心慌、剧烈头痛、极度乏力或恶心等不适症状，请立即停止禁食并正常进食，症状持续请及时就医。',
        },
        {
          title: '⚖️ 责任限制',
          color: colors.textSecondary,
          content:
            '本应用及其创作者不对因使用本应用导致的任何伤害、健康问题或损害承担责任。请结合自身健康状况理性使用，使用风险由您自行承担。',
        },
        {
          title: '🔒 隐私与数据安全',
          color: colors.text,
          content:
            '您的打卡、饮食、饮水与体重数据仅保存在本机设备；排行榜与结伴共修采用匿名 ID 同步，绝不出售任何个人信息。',
        },
      ],
    };
  };

  const termsCopy = getTermsCopy();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Step Indicator */}
        <View style={styles.stepRow}>
          {[1, 2, 3].map((num) => (
            <View
              key={num}
              style={[
                styles.stepDot,
                {
                  backgroundColor: step >= num ? colors.primary : colors.divider,
                  width: step === num ? rs(28) : rs(10),
                },
              ]}
            />
          ))}
        </View>

        <View style={[styles.emblem, { backgroundColor: colors.primary + '16', borderColor: colors.primary + '44' }]}>
          <Text style={styles.emblemIcon}>{step === 1 ? '🌿' : step === 2 ? '⏳' : '🪷'}</Text>
        </View>

        <Text style={[styles.appName, { color: colors.primary }]}>{termsCopy.appName}</Text>

        {step === 1 && (
          <>
            <Text style={[styles.stepTitle, { color: colors.text }]}>
              {isZh ? '第一步 · 选择你的核心目标' : isEs ? 'Paso 1 · Tu Objetivo' : 'Step 1 · Your Main Goal'}
            </Text>
            <Text style={[styles.stepSubtitle, { color: colors.textSecondary }]}>
              {isZh
                ? '30 秒为你定制顺应昼夜的东方轻断食节奏'
                : isEs
                ? 'Ayuno circadiano con raíces orientales de 2,500 años — listo en 30 s'
                : 'Modern circadian fasting rooted in 2,500-year-old Eastern rhythm — personalized in 30s'}
            </Text>

            <View style={styles.optionsList}>
              {FASTING_GOALS.map((goal) => {
                const active = selectedGoal === goal.id;
                return (
                  <TouchableOpacity
                    key={goal.id}
                    style={[
                      styles.optionCard,
                      {
                        backgroundColor: active ? colors.primary + '14' : colors.card,
                        borderColor: active ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => handleGoalSelect(goal.id)}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.optionIcon}>{goal.icon}</Text>
                    <View style={styles.optionBody}>
                      <Text style={[styles.optionTitle, { color: colors.text }]}>
                        {isZh ? goal.titleZh : isEs ? goal.titleEs : goal.titleEn}
                      </Text>
                      <Text style={[styles.optionSub, { color: colors.textSecondary }]}>
                        {isZh ? goal.subtitleZh : isEs ? goal.subtitleEs : goal.subtitleEn}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setStep(2);
              }}
            >
              <Text style={styles.primaryBtnText}>
                {isZh ? '下一步：选择断食阶梯' : isEs ? 'Siguiente: Elegir Ritmo' : 'Next: Pick Rhythm'}
              </Text>
            </TouchableOpacity>
          </>
        )}

        {step === 2 && (
          <>
            <Text style={[styles.stepTitle, { color: colors.text }]}>
              {isZh ? '第二步 · 选择过午阶梯' : isEs ? 'Paso 2 · Elige Tu Nivel' : 'Step 2 · Choose Starting Tier'}
            </Text>
            <Text style={[styles.stepSubtitle, { color: colors.textSecondary }]}>
              {isZh
                ? '不必一刀切过午，顺应作息循序渐进更易坚持'
                : isEs
                ? 'Empieza suave y avanza cuando te sientas listo'
                : 'Start gently and advance whenever you feel ready'}
            </Text>

            <View style={styles.optionsList}>
              {(['beginner', 'intermediate', 'classic'] as FastingTier[]).map((tierId) => {
                const tier = FASTING_TIERS[tierId];
                const active = selectedTier === tierId;
                return (
                  <TouchableOpacity
                    key={tierId}
                    style={[
                      styles.tierCard,
                      {
                        backgroundColor: active ? colors.primary + '14' : colors.card,
                        borderColor: active ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setSelectedTier(tierId);
                    }}
                    activeOpacity={0.85}
                  >
                    <View style={styles.tierHeader}>
                      <Text style={[styles.optionTitle, { color: colors.text }]}>
                        {isZh ? `${tier.nameZh} · ${tier.windowZh}` : isEs ? `${tier.nameEs} · ${tier.windowEs}` : `${tier.nameEn} · ${tier.windowEn}`}
                      </Text>
                      <View style={[styles.ratioBadge, { backgroundColor: colors.primary + '20' }]}>
                        <Text style={[styles.ratioText, { color: colors.primary }]}>{tier.ratio}</Text>
                      </View>
                    </View>
                    <Text style={[styles.optionSub, { color: colors.textSecondary }]}>
                      {isZh ? tier.descZh : isEs ? tier.descEs : tier.descEn}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.navRow}>
              <TouchableOpacity
                style={[styles.backBtn, { backgroundColor: colors.divider }]}
                onPress={() => setStep(1)}
              >
                <Text style={[styles.backBtnText, { color: colors.text }]}>
                  {isZh ? '上一步' : isEs ? 'Atrás' : 'Back'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.nextBtn, { backgroundColor: colors.primary }]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setStep(3);
                }}
              >
                <Text style={styles.primaryBtnText}>
                  {isZh ? '下一步：安全确认' : isEs ? 'Siguiente: Seguridad' : 'Next: Terms'}
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {step === 3 && (
          <>
            <Text style={[styles.stepTitle, { color: colors.text }]}>
              {isZh ? '第三步 · 科学安心开始' : isEs ? 'Paso 3 · Seguridad Consciente' : 'Step 3 · Mindful Safety'}
            </Text>
            <Text style={[styles.stepSubtitle, { color: colors.textSecondary }]}>
              {isZh
                ? `已为你配置：${FASTING_TIERS[selectedTier].nameZh} (${FASTING_TIERS[selectedTier].windowZh})`
                : isEs
                ? `Elegido: ${FASTING_TIERS[selectedTier].nameEs} · ${FASTING_TIERS[selectedTier].windowEs} (${FASTING_TIERS[selectedTier].ratio})`
                : `Selected: ${FASTING_TIERS[selectedTier].nameEn} · ${FASTING_TIERS[selectedTier].windowEn} (${FASTING_TIERS[selectedTier].ratio})`}
            </Text>

            <View style={[styles.summaryBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.summaryText, { color: colors.textSecondary }]}>
                {isZh
                  ? '· 本应用仅供节律参考，不构成医疗建议，使用风险由您自行承担\n· 未满18岁、孕期/哺乳期、糖尿病/低血糖、心脏病、饮食失调或服药人群请先遵医嘱\n· 若出现头晕、胸痛、心慌、昏厥等不适，请立即停止禁食并进食，必要时就医\n· 断食期间请足量饮水，可在设置中随时切换方案或开启护航暂停券'
                  : isEs
                  ? '· Solo fines informativos y de estilo de vida, no consejo médico; úsala bajo tu responsabilidad\n· Menores de 18, embarazo/lactancia, diabetes, hipoglucemia o trastornos alimentarios: consulta a tu médico\n· Detente y aliméntate de inmediato si sientes mareo, dolor en el pecho o palpitaciones\n· Mantente hidratado y ajusta el nivel o la Pausa Protectora cuando quieras en Ajustes'
                  : '· Informational lifestyle tool only, not medical advice; use at your own risk\n· Under 18, pregnant/nursing, diabetes/hypoglycemia, heart disease, eating disorders, or on Rx meds: consult a doctor first\n· Stop & eat immediately if dizzy, faint, chest pain, or palpitations occur\n· Hydrate well and adjust tier or Pause Pass anytime in Settings'}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={() => {
                Haptics.selectionAsync();
                setAgreed(!agreed);
              }}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.checkbox,
                  agreed && { backgroundColor: colors.primary, borderColor: colors.primary },
                ]}
              >
                {agreed && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={[styles.agreeText, { color: colors.text }]}>
                {termsCopy.agreeText}
                <Text
                  style={[styles.termsLink, { color: colors.primary }]}
                  onPress={() => setShowTerms(true)}
                >
                  {termsCopy.termsLink}
                </Text>
              </Text>
            </TouchableOpacity>

            <View style={styles.navRow}>
              <TouchableOpacity
                style={[styles.backBtn, { backgroundColor: colors.divider }]}
                onPress={() => setStep(2)}
              >
                <Text style={[styles.backBtnText, { color: colors.text }]}>
                  {isZh ? '上一步' : isEs ? 'Atrás' : 'Back'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.nextBtn, { backgroundColor: agreed ? colors.primary : colors.divider }]}
                onPress={handleGetStarted}
                disabled={!agreed}
              >
                <Text style={styles.primaryBtnText}>{termsCopy.getStarted}</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>

      {showTerms && (
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{termsCopy.termsTitle}</Text>
            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              {termsCopy.terms.map((section) => (
                <View key={section.title} style={[styles.termsSection, { backgroundColor: colors.backgroundSecondary }]}>
                  <Text style={[styles.termsSectionTitle, { color: section.color }]}>{section.title}</Text>
                  <Text style={[styles.termsSectionText, { color: colors.textSecondary }]}>{section.content}</Text>
                </View>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={[styles.modalCloseButton, { backgroundColor: colors.primary }]}
              onPress={() => setShowTerms(false)}
            >
              <Text style={styles.modalCloseButtonText}>{isZh ? '关闭' : isEs ? 'Cerrar' : 'Close'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: rs(22),
  },
  stepRow: {
    flexDirection: 'row',
    gap: rs(8),
    marginBottom: vs(18),
  },
  stepDot: {
    height: vs(8),
    borderRadius: rs(4),
  },
  emblem: {
    width: rs(66),
    height: rs(66),
    borderRadius: rs(33),
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: vs(10),
  },
  emblemIcon: {
    fontSize: fs(30),
  },
  appName: {
    fontSize: fs(26),
    fontWeight: '800',
    marginBottom: vs(6),
  },
  stepTitle: {
    fontSize: fs(18),
    fontWeight: '800',
    textAlign: 'center',
  },
  stepSubtitle: {
    fontSize: fs(13),
    textAlign: 'center',
    marginTop: vs(4),
    marginBottom: vs(18),
  },
  optionsList: {
    width: '100%',
    gap: vs(10),
    marginBottom: vs(18),
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: rs(14),
    padding: rs(13),
    gap: rs(12),
  },
  optionIcon: {
    fontSize: fs(24),
  },
  optionBody: {
    flex: 1,
  },
  optionTitle: {
    fontSize: fs(15),
    fontWeight: '700',
  },
  optionSub: {
    fontSize: fs(12),
    marginTop: vs(2),
    lineHeight: fs(17),
  },
  tierCard: {
    borderWidth: 1.5,
    borderRadius: rs(14),
    padding: rs(13),
  },
  tierHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: vs(4),
  },
  ratioBadge: {
    borderRadius: rs(8),
    paddingHorizontal: rs(8),
    paddingVertical: vs(2),
  },
  ratioText: {
    fontSize: fs(11),
    fontWeight: '800',
  },
  summaryBox: {
    width: '100%',
    borderRadius: rs(14),
    borderWidth: 1,
    padding: rs(14),
    marginBottom: vs(18),
  },
  summaryText: {
    fontSize: fs(13),
    lineHeight: fs(21),
  },
  primaryBtn: {
    width: '100%',
    paddingVertical: vs(15),
    borderRadius: rs(14),
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: fs(16),
    fontWeight: '700',
  },
  navRow: {
    flexDirection: 'row',
    width: '100%',
    gap: rs(10),
  },
  backBtn: {
    flex: 0.9,
    paddingVertical: vs(15),
    borderRadius: rs(14),
    alignItems: 'center',
  },
  backBtnText: {
    fontSize: fs(15),
    fontWeight: '700',
  },
  nextBtn: {
    flex: 1.6,
    paddingVertical: vs(15),
    borderRadius: rs(14),
    alignItems: 'center',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: vs(20),
  },
  checkbox: {
    width: rs(26),
    height: rs(26),
    borderRadius: rs(8),
    borderWidth: 2,
    borderColor: '#B8C0BA',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: rs(10),
  },
  checkmark: {
    color: '#fff',
    fontSize: fs(16),
    fontWeight: 'bold',
  },
  agreeText: {
    fontSize: fs(14),
    flex: 1,
  },
  termsLink: {
    textDecorationLine: 'underline',
    fontWeight: '700',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: rs(20),
  },
  modalContent: {
    width: '100%',
    maxWidth: rs(380),
    borderRadius: rs(22),
    padding: rs(22),
    maxHeight: '72%',
  },
  modalTitle: {
    fontSize: fs(19),
    fontWeight: 'bold',
    marginBottom: vs(14),
    textAlign: 'center',
  },
  modalScroll: {
    maxHeight: vs(340),
  },
  termsSection: {
    borderRadius: rs(12),
    padding: rs(14),
    marginBottom: vs(10),
  },
  termsSectionTitle: {
    fontSize: fs(14),
    fontWeight: '700',
    marginBottom: vs(6),
  },
  termsSectionText: {
    fontSize: fs(13),
    lineHeight: vs(20),
  },
  modalCloseButton: {
    marginTop: vs(12),
    paddingVertical: vs(13),
    borderRadius: rs(12),
    alignItems: 'center',
  },
  modalCloseButtonText: {
    color: '#fff',
    fontSize: fs(15),
    fontWeight: '600',
  },
});

export const checkTermsAgreed = async (): Promise<boolean> => {
  try {
    const agreed = await AsyncStorage.getItem(TERMS_AGREED_KEY);
    return agreed === 'true';
  } catch {
    return false;
  }
};
