import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Alert } from 'react-native';
import { useApp } from '../context/AppContext';
import { responsiveSize, fs, rs, vs } from '../theme/responsive';
import * as Haptics from 'expo-haptics';

interface FastingTimerCardProps {
  colors: any;
  language: 'zh' | 'en' | 'es';
}

export const FastingTimerCard: React.FC<FastingTimerCardProps> = ({ colors, language }) => {
  const { t, activeFasting, startFastingSession, cancelFastingSession, completeFastingSession } = useApp();
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const [initialized, setInitialized] = useState(false); // 标记倒计时是否已初始化

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

    // 立即计算一次剩余时间
    updateTimeLeft();

    // 标记已初始化（在setTimeout中确保状态已更新）
    setTimeout(() => {
      setInitialized(true);
    }, 50);

    const interval = setInterval(updateTimeLeft, 1000);

    return () => clearInterval(interval);
  }, [activeFasting]);

  // 检查是否完成（只在已初始化且倒计时为0时）
  useEffect(() => {
    if (initialized && activeFasting && timeLeft.hours === 0 && timeLeft.minutes === 0 && timeLeft.seconds === 0) {
      // 时间到了，自动完成
      completeFastingSession();
      setInitialized(false);
    }
  }, [timeLeft, activeFasting, initialized]);

  const handleStartPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowSetupModal(true);
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

  // 测试按钮：5秒禁食
  const handleTest5Sec = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await startFastingSession(5 / 3600); // 5秒 = 5/3600 小时
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
          // 倒计时显示
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
          // 开始按钮
          <>
            <TouchableOpacity
              style={[styles.startButton, { backgroundColor: colors.primary }]}
              onPress={handleStartPress}
            >
              <Text style={styles.startButtonText}>⏰ {getStartLabel()}</Text>
            </TouchableOpacity>
            {/* 测试按钮：5秒禁食 */}
            <TouchableOpacity
              style={[styles.testButton, { backgroundColor: colors.warning }]}
              onPress={handleTest5Sec}
            >
              <Text style={styles.testButtonText}>⚡ 测试5秒</Text>
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

      <FastingSetupModal
        visible={showSetupModal}
        onClose={() => setShowSetupModal(false)}
        onStart={async (hours) => {
          await startFastingSession(hours);
          setShowSetupModal(false);
        }}
        colors={colors}
        language={language}
      />
    </>
  );
};

interface FastingSetupModalProps {
  visible: boolean;
  onClose: () => void;
  onStart: (hours: number) => void;
  colors: any;
  language: 'zh' | 'en' | 'es';
}

const FastingSetupModal: React.FC<FastingSetupModalProps> = ({ visible, onClose, onStart, colors, language }) => {
  const [selectedHours, setSelectedHours] = useState(8);
  const [warningAcknowledged, setWarningAcknowledged] = useState(false);

  const hours = [1, 2, 4, 6, 8, 10, 12];

  const getModalTitle = () => {
    if (language === 'en') return 'Select Duration';
    if (language === 'es') return 'Seleccionar Duración';
    return '选择时长';
  };

  const getHealthWarningTitle = () => {
    if (language === 'en') return 'Health Warning';
    if (language === 'es') return 'Advertencia de Salud';
    return '健康提醒';
  };

  const getHealthWarningText = () => {
    if (language === 'en') {
      return 'If you feel unwell (dizziness, palpitations, weakness, etc.), please stop fasting immediately and eat. Health comes first!';
    }
    if (language === 'es') {
      return 'Si te sientes mal (mareos, palpitaciones, debilidad, etc.), por favor deja de ayunar inmediatamente y come. ¡La salud es lo primero!';
    }
    return '如果感到不适（头晕、心慌、虚弱等），请立即停止禁食并进食。健康第一！';
  };

  const getAcknowledgeText = () => {
    if (language === 'en') return 'I understand the health risks';
    if (language === 'es') return 'Entiendo los riesgos para la salud';
    return '我已了解健康风险';
  };

  const getStartText = () => {
    if (language === 'en') return 'Start';
    if (language === 'es') return 'Iniciar';
    return '开始';
  };

  const getCancelText = () => {
    return t.cancel;
  };

  const t = {
    cancel: language === 'zh' ? '取消' : language === 'es' ? 'Cancelar' : 'Cancel',
  };

  const handleStart = () => {
    if (!warningAcknowledged) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    console.log('Starting fasting session with hours:', selectedHours);

    onStart(selectedHours);
    setSelectedHours(8);
    setWarningAcknowledged(false);

    // 显示开始成功提示
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
    const title = getSuccessTitle();
    const message = getSuccessMessage();
    console.log('Showing alert:', title, message);
    setTimeout(() => {
      Alert.alert(title, message);
    }, 100);
  };

  const handleClose = () => {
    setSelectedHours(8);
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

          {/* 时长选择 */}
          <View style={styles.hoursGrid}>
            {hours.map((hours) => (
              <TouchableOpacity
                key={hours}
                style={[
                  styles.hourButton,
                  selectedHours === hours && { backgroundColor: colors.primary },
                  selectedHours !== hours && { backgroundColor: colors.backgroundSecondary },
                ]}
                onPress={() => {
                  Haptics.selectionAsync();
                  setSelectedHours(hours);
                }}
              >
                <Text
                  style={[
                    styles.hourButtonText,
                    selectedHours === hours ? { color: '#fff' } : { color: colors.text },
                  ]}
                >
                  {hours}h
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* 健康警告 */}
          <View style={[styles.warningBox, { backgroundColor: colors.warning + '15' }]}>
            <Text style={[styles.warningTitle, { color: colors.warning }]}>⚠️ {getHealthWarningTitle()}</Text>
            <Text style={[styles.warningText, { color: colors.textSecondary }]}>
              {getHealthWarningText()}
            </Text>
          </View>

          {/* 确认复选框 */}
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

          {/* 按钮 */}
          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelModalButton, { backgroundColor: colors.backgroundSecondary }]}
              onPress={handleClose}
            >
              <Text style={[styles.modalButtonText, { color: colors.text }]}>{getCancelText()}</Text>
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
              <Text style={styles.startButtonText}>
                ⏰ {getStartText()}
              </Text>
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
});
