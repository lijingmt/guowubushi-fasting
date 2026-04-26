import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Alert, ScrollView } from 'react-native';
import { useApp } from '../context/AppContext';
import { responsiveSize, fs, rs, vs } from '../theme/responsive';
import * as Haptics from 'expo-haptics';
import {
  getFastingDisclaimerAgreed,
  saveFastingDisclaimerAgreed,
  getLastFastingDuration,
  saveLastFastingDuration,
} from '../services/storage';

interface FastingTimerCardProps {
  colors: any;
  language: 'zh' | 'en' | 'es';
}

export const FastingTimerCard: React.FC<FastingTimerCardProps> = ({ colors, language }) => {
  const { t, activeFasting, startFastingSession, cancelFastingSession, completeFastingSession } = useApp();
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [showDisclaimerModal, setShowDisclaimerModal] = useState(false);
  const [pendingQuickStart, setPendingQuickStart] = useState(false); // 是否在同意免责声明后快速开始
  const [disclaimerAgreed, setDisclaimerAgreed] = useState(false);
  const [lastFastingDuration, setLastFastingDuration] = useState(8); // 默认8小时
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const [initialized, setInitialized] = useState(false);

  // 加载免责声明同意状态和上次禁食时长
  useEffect(() => {
    loadDisclaimerStatus();
    loadLastDuration();
  }, []);

  const loadDisclaimerStatus = async () => {
    const agreed = await getFastingDisclaimerAgreed();
    setDisclaimerAgreed(agreed);
  };

  const loadLastDuration = async () => {
    const duration = await getLastFastingDuration();
    setLastFastingDuration(duration);
  };

  // 更新倒计时
  useEffect(() => {
    if (!activeFasting) {
      setTimeLeft({ hours: 0, minutes: 0, seconds: 0 });
      setInitialized(false);
      return;
    }

    const updateTimeLeft = () => {
      const now = Date.now();
      const diff = activeFasting.endTime - now;

      if (diff <= 0) {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({ hours, minutes, seconds });
    };

    updateTimeLeft();

    setTimeout(() => {
      setInitialized(true);
    }, 50);

    const interval = setInterval(updateTimeLeft, 1000);

    return () => clearInterval(interval);
  }, [activeFasting]);

  // 检查是否完成
  useEffect(() => {
    if (initialized && activeFasting && timeLeft.hours === 0 && timeLeft.minutes === 0 && timeLeft.seconds === 0) {
      completeFastingSession();
      setInitialized(false);
    }
  }, [timeLeft, activeFasting, initialized]);

  const handleStartPress = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // 检查是否已同意免责声明
    const agreed = await getFastingDisclaimerAgreed();
    if (agreed) {
      setShowSetupModal(true);
    } else {
      setShowDisclaimerModal(true);
    }
  };

  const handleCancel = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await cancelFastingSession();
  };

  const formatTime = (value: number) => String(value).padStart(2, '0');

  const getFastingLabel = () => {
    if (language === 'en') return 'Single Fasting';
    if (language === 'es') return 'Ayuno Único';
    return '单次禁食';
  };

  const getActiveLabel = () => {
    if (language === 'en') return 'Fasting...';
    if (language === 'es') return 'Ayunando...';
    return '禁食中...';
  };

  const getStartLabel = () => {
    if (language === 'en') return 'Start Fasting';
    if (language === 'es') return 'Iniciar Ayuno';
    return '开始禁食';
  };

  const getCancelLabel = () => {
    if (language === 'en') return 'Cancel';
    if (language === 'es') return 'Cancelar';
    return '取消';
  };

  const getHoursLabel = () => {
    if (language === 'en') return 'h';
    if (language === 'es') return 'h';
    return '时';
  };

  const getMinutesLabel = () => {
    if (language === 'en') return 'm';
    if (language === 'es') return 'm';
    return '分';
  };

  const getSecondsLabel = () => {
    if (language === 'en') return 's';
    if (language === 'es') return 's';
    return '秒';
  };

  const handleTest5Sec = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // 检查是否已同意免责声明
    const agreed = await getFastingDisclaimerAgreed();
    if (agreed) {
      await startFastingSession(lastFastingDuration);
    } else {
      setPendingQuickStart(true);
      setShowDisclaimerModal(true);
    }
  };

  return (
    <>
      <View style={[styles.container, { backgroundColor: colors.card }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>
            {activeFasting ? getActiveLabel() : getFastingLabel()}
          </Text>
          {activeFasting && (
            <View style={[styles.badge, { backgroundColor: colors.success + '20' }]}>
              <Text style={[styles.badgeText, { color: colors.success }]}>
                {activeFasting.durationHours}{getHoursLabel()}
              </Text>
            </View>
          )}
        </View>

        {activeFasting ? (
          <View style={styles.timerContainer}>
            <View style={styles.timeSection}>
              <Text style={[styles.timeValue, { color: colors.primary }]}>{formatTime(timeLeft.hours)}</Text>
              <Text style={[styles.timeLabel, { color: colors.textSecondary }]}>{getHoursLabel()}</Text>
            </View>
            <Text style={[styles.timeSeparator, { color: colors.text }]}>:</Text>
            <View style={styles.timeSection}>
              <Text style={[styles.timeValue, { color: colors.primary }]}>{formatTime(timeLeft.minutes)}</Text>
              <Text style={[styles.timeLabel, { color: colors.textSecondary }]}>{getMinutesLabel()}</Text>
            </View>
            <Text style={[styles.timeSeparator, { color: colors.text }]}>:</Text>
            <View style={styles.timeSection}>
              <Text style={[styles.timeValue, { color: colors.primary }]}>{formatTime(timeLeft.seconds)}</Text>
              <Text style={[styles.timeLabel, { color: colors.textSecondary }]}>{getSecondsLabel()}</Text>
            </View>
          </View>
        ) : (
          <>
            <TouchableOpacity
              style={[styles.startButton, { backgroundColor: colors.primary }]}
              onPress={handleStartPress}
            >
              <Text style={styles.startButtonText}>⏰ {getStartLabel()}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.testButton, { backgroundColor: colors.success }]}
              onPress={handleTest5Sec}
            >
              <Text style={styles.testButtonText}>⚡ {language === 'zh' ? `快速开始 ${lastFastingDuration}小时` : language === 'es' ? `Inicio Rápido ${lastFastingDuration}h` : `Quick Start ${lastFastingDuration}h`}</Text>
            </TouchableOpacity>
          </>
        )}

        {activeFasting && (
          <TouchableOpacity
            style={[styles.cancelButton, { backgroundColor: colors.backgroundSecondary }]}
            onPress={handleCancel}
          >
            <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>
              {getCancelLabel()}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <FastingDisclaimerModal
        visible={showDisclaimerModal}
        onClose={() => {
          setShowDisclaimerModal(false);
          setPendingQuickStart(false);
        }}
        onAgree={async () => {
          await saveFastingDisclaimerAgreed(true);
          setDisclaimerAgreed(true);
          setShowDisclaimerModal(false);
          if (pendingQuickStart) {
            // 快速开始模式
            setPendingQuickStart(false);
            await startFastingSession(lastFastingDuration);
          } else {
            // 显示时长选择
            setShowSetupModal(true);
          }
        }}
        colors={colors}
        language={language}
      />

      <FastingSetupModal
        visible={showSetupModal}
        onClose={() => setShowSetupModal(false)}
        onStart={async (hours) => {
          await saveLastFastingDuration(hours);
          setLastFastingDuration(hours);
          await startFastingSession(hours);
          setShowSetupModal(false);
        }}
        colors={colors}
        language={language}
        initialHours={lastFastingDuration}
      />
    </>
  );
};

// 免责声明弹窗
interface FastingDisclaimerModalProps {
  visible: boolean;
  onClose: () => void;
  onAgree: () => void;
  colors: any;
  language: 'zh' | 'en' | 'es';
}

const FastingDisclaimerModal: React.FC<FastingDisclaimerModalProps> = ({
  visible,
  onClose,
  onAgree,
  colors,
  language,
}) => {
  const [allChecked, setAllChecked] = useState(false);
  const [checkboxes, setCheckboxes] = useState({
    healthRisk: false,
    stopImmediately: false,
    notMedicalAdvice: false,
    consultDoctor: false,
  });

  const toggleCheckbox = (key: keyof typeof checkboxes) => {
    Haptics.selectionAsync();
    const newCheckboxes = { ...checkboxes, [key]: !checkboxes[key] };
    setCheckboxes(newCheckboxes);
    setAllChecked(Object.values(newCheckboxes).every((v) => v));
  };

  const handleAgreeAll = () => {
    Haptics.selectionAsync();
    const allTrue = {
      healthRisk: true,
      stopImmediately: true,
      notMedicalAdvice: true,
      consultDoctor: true,
    };
    setCheckboxes(allTrue);
    setAllChecked(true);
  };

  const getTerms = () => {
    if (language === 'en') {
      return {
        title: 'Fasting Disclaimer & Terms',
        subtitle: 'Please read and accept the following terms before starting',
        section1: {
          title: '⚠️ Health Risks',
          content: 'Fasting may not be suitable for everyone. If you have any of the following conditions, please consult a doctor before fasting:\n• Pregnant or breastfeeding\n• Eating disorders\n• Diabetes or blood sugar issues\n• Heart disease\n• Under 18 years old\n• Taking prescription medications',
        },
        section2: {
          title: '🚨 Stop Immediately If Unwell',
          content: 'If you experience any of the following symptoms during fasting, STOP immediately and eat:\n• Dizziness or lightheadedness\n• Palpitations or irregular heartbeat\n• Extreme weakness or fatigue\n• Nausea or vomiting\n• Chest pain\n• Fainting',
        },
        section3: {
          title: '📋 Not Medical Advice',
          content: 'This app provides fasting tracking tools only. The content is not intended to be a substitute for professional medical advice, diagnosis, or treatment.',
        },
        section4: {
          title: '👨‍⚕️ Consult Your Doctor',
          content: 'Always seek the advice of your physician or other qualified health provider with any questions you may have regarding a medical condition or fasting program.',
        },
        agree1: 'I understand the health risks and confirm I am physically able to fast',
        agree2: 'I promise to stop fasting immediately if I feel unwell',
        agree3: 'I understand this is not medical advice',
        agree4: 'I will consult a doctor if I have any health concerns',
        agreeAll: '✓ Agree All',
        agree: 'I Agree & Continue',
        decline: 'Decline',
      };
    }
    if (language === 'es') {
      return {
        title: 'Descargo de Responsabilidad y Términos',
        subtitle: 'Por favor lee y acepta los siguientes términos antes de comenzar',
        section1: {
          title: '⚠️ Riesgos para la Salud',
          content: 'El ayuno puede no ser adecuado para todos. Si tienes alguna de las siguientes condiciones, consulta a un médico antes de ayunar:\n• Embarazo o lactancia\n• Trastornos alimentarios\n• Diabetes o problemas de azúcar en sangre\n• Enfermedades cardíacas\n• Menores de 18 años\n• Tomando medicamentos recetados',
        },
        section2: {
          title: '🚨 Detente Inmediatamente Si Te Sientes Mal',
          content: 'Si experimentas alguno de los siguientes síntomas durante el ayuno, DETENTE inmediatamente y come:\n• Mareos o aturdimiento\n• Palpitaciones o latidos irregulares\n• Debilidad extrema o fatiga\n• Náuseas o vómitos\n• Dolor en el pecho\n• Desmayo',
        },
        section3: {
          title: '📋 No Es Consejo Médico',
          content: 'Esta aplicación solo proporciona herramientas de seguimiento de ayuno. El contenido no tiene como objetivo ser un sustituto del consejo médico profesional, diagnóstico o tratamiento.',
        },
        section4: {
          title: '👨‍⚕️ Consulta a Tu Médico',
          content: 'Siempre busca el consejo de tu médico u otro proveedor de salud calificado si tienes alguna pregunta sobre una condición médica o programa de ayuno.',
        },
        agree1: 'Entiendo los riesgos para la salud y confirmo que puedo físicamente ayunar',
        agree2: 'Prometo detener el ayuno inmediatamente si me siento mal',
        agree3: 'Entiendo que esto no es consejo médico',
        agree4: 'Consultaré a un médico si tengo preocupaciones de salud',
        agreeAll: '✓ Aceptar Todo',
        agree: 'Acepto y Continuar',
        decline: 'Declinar',
      };
    }
    return {
      title: '禁食免责声明与条款',
      subtitle: '开始前请仔细阅读并同意以下条款',
      section1: {
        title: '⚠️ 健康风险',
        content: '禁食可能不适合所有人。如果您有以下任何情况，请在禁食前咨询医生：\n• 孕期或哺乳期\n• 饮食失调\n• 糖尿病或血糖问题\n• 心脏疾病\n• 未满18岁\n• 正在服用处方药物',
      },
      section2: {
        title: '🚨 身体不适立即停止',
        content: '如果在禁食期间出现以下任何症状，请立即停止并进食：\n• 头晕或眼花\n• 心慌或心跳不规律\n• 极度虚弱或疲劳\n• 恶心或呕吐\n• 胸痛\n• 昏厥',
      },
      section3: {
        title: '📋 非医疗建议',
        content: '本应用仅提供禁食记录工具。内容不旨在替代专业医疗建议、诊断或治疗。',
      },
      section4: {
        title: '👨‍⚕️ 咨询医生',
        content: '对于任何医疗状况或禁食计划相关的疑问，请务必咨询您的医生或其他合格的健康提供者。',
      },
      agree1: '我了解健康风险，确认身体状况适合禁食',
      agree2: '我承诺如果感到不适会立即停止禁食',
      agree3: '我了解这不构成医疗建议',
      agree4: '如有健康疑虑，我会咨询医生',
      agreeAll: '✓ 同意全部',
      agree: '同意并继续',
      decline: '取消',
    };
  };

  const terms = getTerms();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.disclaimerContent, { backgroundColor: colors.card }]}>
          <Text style={[styles.disclaimerTitle, { color: colors.text }]}>{terms.title}</Text>
          <Text style={[styles.disclaimerSubtitle, { color: colors.textSecondary }]}>
            {terms.subtitle}
          </Text>

          <ScrollView style={styles.disclaimerScroll} showsVerticalScrollIndicator={false}>
            {/* Section 1 */}
            <View style={[styles.disclaimerSection, { backgroundColor: colors.warning + '10' }]}>
              <Text style={[styles.disclaimerSectionTitle, { color: colors.warning }]}>
                {terms.section1.title}
              </Text>
              <Text style={[styles.disclaimerSectionText, { color: colors.textSecondary }]}>
                {terms.section1.content}
              </Text>
            </View>

            {/* Section 2 */}
            <View style={[styles.disclaimerSection, { backgroundColor: colors.error + '10' }]}>
              <Text style={[styles.disclaimerSectionTitle, { color: colors.error }]}>
                {terms.section2.title}
              </Text>
              <Text style={[styles.disclaimerSectionText, { color: colors.textSecondary }]}>
                {terms.section2.content}
              </Text>
            </View>

            {/* Section 3 */}
            <View style={[styles.disclaimerSection, { backgroundColor: colors.info + '10' }]}>
              <Text style={[styles.disclaimerSectionTitle, { color: colors.info }]}>
                {terms.section3.title}
              </Text>
              <Text style={[styles.disclaimerSectionText, { color: colors.textSecondary }]}>
                {terms.section3.content}
              </Text>
            </View>

            {/* Section 4 */}
            <View style={[styles.disclaimerSection, { backgroundColor: colors.success + '10' }]}>
              <Text style={[styles.disclaimerSectionTitle, { color: colors.success }]}>
                {terms.section4.title}
              </Text>
              <Text style={[styles.disclaimerSectionText, { color: colors.textSecondary }]}>
                {terms.section4.content}
              </Text>
            </View>

            {/* Checkboxes */}
            <View style={styles.disclaimerCheckboxes}>
              <TouchableOpacity
                style={[styles.agreeAllButton, { backgroundColor: colors.primary + '15', borderColor: colors.primary }]}
                onPress={handleAgreeAll}
              >
                <Text style={[styles.agreeAllButtonText, { color: colors.primary }]}>{terms.agreeAll}</Text>
              </TouchableOpacity>
              <DisclaimerCheckbox
                checked={checkboxes.healthRisk}
                onPress={() => toggleCheckbox('healthRisk')}
                text={terms.agree1}
                colors={colors}
              />
              <DisclaimerCheckbox
                checked={checkboxes.stopImmediately}
                onPress={() => toggleCheckbox('stopImmediately')}
                text={terms.agree2}
                colors={colors}
              />
              <DisclaimerCheckbox
                checked={checkboxes.notMedicalAdvice}
                onPress={() => toggleCheckbox('notMedicalAdvice')}
                text={terms.agree3}
                colors={colors}
              />
              <DisclaimerCheckbox
                checked={checkboxes.consultDoctor}
                onPress={() => toggleCheckbox('consultDoctor')}
                text={terms.agree4}
                colors={colors}
              />
            </View>
          </ScrollView>

          {/* Buttons */}
          <View style={styles.disclaimerButtons}>
            <TouchableOpacity
              style={[styles.disclaimerButton, styles.declineButton, { backgroundColor: colors.backgroundSecondary }]}
              onPress={onClose}
            >
              <Text style={[styles.disclaimerButtonText, { color: colors.text }]}>{terms.decline}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.disclaimerButton,
                styles.agreeButton,
                { backgroundColor: allChecked ? colors.primary : colors.divider },
              ]}
              onPress={onAgree}
              disabled={!allChecked}
            >
              <Text style={styles.disclaimerAgreeText}>✓ {terms.agree}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// 单个复选框组件
const DisclaimerCheckbox: React.FC<{
  checked: boolean;
  onPress: () => void;
  text: string;
  colors: any;
}> = ({ checked, onPress, text, colors }) => (
  <TouchableOpacity style={styles.disclaimerCheckboxRow} onPress={onPress}>
    <View style={[styles.disclaimerCheckbox, checked && { backgroundColor: colors.primary, borderColor: colors.primary }]}>
      {checked && <Text style={styles.disclaimerCheckmark}>✓</Text>}
    </View>
    <Text style={[styles.disclaimerCheckboxText, { color: colors.text }]}>{text}</Text>
  </TouchableOpacity>
);

interface FastingSetupModalProps {
  visible: boolean;
  onClose: () => void;
  onStart: (hours: number) => void;
  colors: any;
  language: 'zh' | 'en' | 'es';
  initialHours?: number;
}

const FastingSetupModal: React.FC<FastingSetupModalProps> = ({
  visible,
  onClose,
  onStart,
  colors,
  language,
  initialHours = 8,
}) => {
  const [selectedHours, setSelectedHours] = useState(initialHours);
  const [warningAcknowledged, setWarningAcknowledged] = useState(false);

  // 当弹窗打开时，更新选择的时长为初始值
  useEffect(() => {
    if (visible) {
      setSelectedHours(initialHours);
    }
  }, [visible, initialHours]);

  const hours = [1, 2, 4, 6, 8, 10, 12];

  const getModalTitle = () => {
    if (language === 'en') return 'Select Duration';
    if (language === 'es') return 'Seleccionar Duración';
    return '选择时长';
  };

  const getHealthWarningTitle = () => {
    if (language === 'en') return 'Reminder';
    if (language === 'es') return 'Recordatorio';
    return '温馨提示';
  };

  const getHealthWarningText = () => {
    if (language === 'en') {
      return 'Listen to your body. If you feel unwell, stop fasting immediately.';
    }
    if (language === 'es') {
      return 'Escucha a tu cuerpo. Si te sientes mal, deja de ayunar inmediatamente.';
    }
    return '请听从身体的声音。如果感到不适，请立即停止禁食。';
  };

  const getAcknowledgeText = () => {
    if (language === 'en') return 'I understand';
    if (language === 'es') return 'Entiendo';
    return '我已了解';
  };

  const getStartText = () => {
    if (language === 'en') return 'Start';
    if (language === 'es') return 'Iniciar';
    return '开始';
  };

  const t = {
    cancel: language === 'zh' ? '取消' : language === 'es' ? 'Cancelar' : 'Cancel',
  };

  const handleStart = () => {
    if (!warningAcknowledged) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    onStart(selectedHours);
    setWarningAcknowledged(false);

    const getSuccessTitle = () => {
      if (language === 'zh') return '禁食开始！';
      if (language === 'es') return '¡Ayuno iniciado!';
      return 'Fasting Started!';
    };
    const getSuccessMessage = () => {
      if (language === 'zh') return `${selectedHours}小时倒计时开始，加油！`;
      if (language === 'es') return `¡Cuenta regresiva de ${selectedHours} horas iniciada, ¡ tú puedes!`;
      return `${selectedHours}h countdown started. You got this!`;
    };
    setTimeout(() => {
      Alert.alert(getSuccessTitle(), getSuccessMessage());
    }, 100);
  };

  const handleClose = () => {
    setWarningAcknowledged(false);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>{getModalTitle()}</Text>

          <View style={styles.hoursGrid}>
            {hours.map((h) => (
              <TouchableOpacity
                key={h}
                style={[
                  styles.hourButton,
                  selectedHours === h ? { backgroundColor: colors.primary } : { backgroundColor: colors.backgroundSecondary },
                ]}
                onPress={() => {
                  Haptics.selectionAsync();
                  setSelectedHours(h);
                }}
              >
                <Text
                  style={[
                    styles.hourButtonText,
                    selectedHours === h ? { color: '#fff' } : { color: colors.text },
                  ]}
                >
                  {h}h
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={[styles.warningBox, { backgroundColor: colors.warning + '15' }]}>
            <Text style={[styles.warningTitle, { color: colors.warning }]}>⚠️ {getHealthWarningTitle()}</Text>
            <Text style={[styles.warningText, { color: colors.textSecondary }]}>
              {getHealthWarningText()}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.checkboxRow}
            onPress={() => {
              Haptics.selectionAsync();
              setWarningAcknowledged(!warningAcknowledged);
            }}
          >
            <View style={[styles.checkbox, warningAcknowledged && { backgroundColor: colors.primary }]}>
              {warningAcknowledged && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={[styles.checkboxLabel, { color: colors.text }]}>{getAcknowledgeText()}</Text>
          </TouchableOpacity>

          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelModalButton, { backgroundColor: colors.backgroundSecondary }]}
              onPress={handleClose}
            >
              <Text style={[styles.modalButtonText, { color: colors.text }]}>{t.cancel}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.modalButton,
                styles.startModalButton,
                { backgroundColor: warningAcknowledged ? colors.primary : colors.divider },
              ]}
              onPress={handleStart}
              disabled={!warningAcknowledged}
            >
              <Text style={styles.startButtonText}>⏰ {getStartText()}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: rs(20),
    padding: rs(20),
    marginBottom: vs(16),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: vs(2) },
    shadowOpacity: 0.1,
    shadowRadius: rs(4),
    elevation: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: vs(16),
  },
  title: {
    fontSize: fs(18),
    fontWeight: '600',
  },
  badge: {
    paddingHorizontal: rs(12),
    paddingVertical: vs(4),
    borderRadius: rs(12),
  },
  badgeText: {
    fontSize: fs(12),
    fontWeight: '600',
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: vs(20),
  },
  timeSection: {
    alignItems: 'center',
  },
  timeValue: {
    fontSize: fs(36),
    fontWeight: 'bold',
    minWidth: rs(60),
    textAlign: 'center',
  },
  timeLabel: {
    fontSize: fs(12),
    marginTop: vs(4),
  },
  timeSeparator: {
    fontSize: fs(32),
    fontWeight: 'bold',
    marginHorizontal: rs(8),
  },
  startButton: {
    paddingVertical: vs(16),
    borderRadius: rs(14),
    alignItems: 'center',
  },
  startButtonText: {
    color: '#fff',
    fontSize: fs(16),
    fontWeight: '600',
  },
  testButton: {
    marginTop: vs(12),
    paddingVertical: vs(12),
    borderRadius: rs(14),
    alignItems: 'center',
  },
  testButtonText: {
    color: '#fff',
    fontSize: fs(14),
    fontWeight: '600',
  },
  cancelButton: {
    marginTop: vs(12),
    paddingVertical: vs(12),
    borderRadius: rs(12),
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: fs(14),
    fontWeight: '500',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: rs(20),
  },
  modalContent: {
    borderRadius: rs(24),
    padding: rs(24),
    width: '100%',
    maxWidth: rs(360),
  },
  modalTitle: {
    fontSize: fs(20),
    fontWeight: 'bold',
    marginBottom: vs(20),
    textAlign: 'center',
  },
  hoursGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: rs(10),
    marginBottom: vs(20),
  },
  hourButton: {
    width: rs(70),
    height: rs(50),
    borderRadius: rs(12),
    justifyContent: 'center',
    alignItems: 'center',
  },
  hourButtonText: {
    fontSize: fs(16),
    fontWeight: '600',
  },
  warningBox: {
    borderRadius: rs(12),
    padding: rs(16),
    marginBottom: vs(16),
  },
  warningTitle: {
    fontSize: fs(14),
    fontWeight: '600',
    marginBottom: vs(8),
  },
  warningText: {
    fontSize: fs(13),
    lineHeight: vs(20),
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: vs(20),
  },
  checkbox: {
    width: rs(24),
    height: rs(24),
    borderRadius: rs(6),
    borderWidth: 2,
    borderColor: '#ccc',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: rs(12),
  },
  checkmark: {
    color: '#fff',
    fontSize: fs(14),
    fontWeight: 'bold',
  },
  checkboxLabel: {
    fontSize: fs(14),
    flex: 1,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: rs(12),
  },
  modalButton: {
    flex: 1,
    paddingVertical: vs(14),
    borderRadius: rs(12),
    alignItems: 'center',
  },
  cancelModalButton: {},
  startModalButton: {},
  modalButtonText: {
    fontSize: fs(16),
    fontWeight: '600',
  },
  // Disclaimer modal styles
  disclaimerContent: {
    borderRadius: rs(24),
    padding: rs(24),
    width: '100%',
    maxWidth: rs(400),
    maxHeight: '80%',
  },
  disclaimerTitle: {
    fontSize: fs(22),
    fontWeight: 'bold',
    marginBottom: vs(8),
    textAlign: 'center',
  },
  disclaimerSubtitle: {
    fontSize: fs(14),
    marginBottom: vs(16),
    textAlign: 'center',
  },
  disclaimerScroll: {
    maxHeight: vs(400),
    marginBottom: vs(16),
  },
  disclaimerSection: {
    borderRadius: rs(12),
    padding: rs(16),
    marginBottom: vs(12),
  },
  disclaimerSectionTitle: {
    fontSize: fs(15),
    fontWeight: '700',
    marginBottom: vs(8),
  },
  disclaimerSectionText: {
    fontSize: fs(13),
    lineHeight: vs(20),
  },
  disclaimerCheckboxes: {
    marginTop: vs(8),
  },
  agreeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: vs(12),
    paddingHorizontal: rs(20),
    borderRadius: rs(12),
    borderWidth: 1,
    marginBottom: vs(8),
  },
  agreeAllButtonText: {
    fontSize: fs(15),
    fontWeight: '600',
  },
  disclaimerCheckboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: vs(12),
    paddingVertical: vs(4),
  },
  disclaimerCheckbox: {
    width: rs(24),
    height: rs(24),
    borderRadius: rs(6),
    borderWidth: 2,
    borderColor: '#ccc',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: rs(12),
    marginTop: vs(2),
  },
  disclaimerCheckmark: {
    color: '#fff',
    fontSize: fs(14),
    fontWeight: 'bold',
  },
  disclaimerCheckboxText: {
    fontSize: fs(13),
    flex: 1,
    lineHeight: vs(20),
  },
  disclaimerButtons: {
    flexDirection: 'row',
    gap: rs(12),
  },
  disclaimerButton: {
    flex: 1,
    paddingVertical: vs(14),
    borderRadius: rs(12),
    alignItems: 'center',
  },
  declineButton: {},
  agreeButton: {},
  disclaimerButtonText: {
    fontSize: fs(16),
    fontWeight: '600',
  },
  disclaimerAgreeText: {
    color: '#fff',
    fontSize: fs(16),
    fontWeight: '600',
  },
});
