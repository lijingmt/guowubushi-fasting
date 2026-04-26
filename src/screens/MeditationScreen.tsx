import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Modal,
} from 'react-native';
import { Audio } from 'expo-av';
import { useApp } from '../context/AppContext';
import { fs, rs, vs, layout } from '../theme/responsive';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

const MEDITATION_DURATION_KEY = '@guowu_meditation_duration';
const MEDITATION_SOUND_KEY = '@guowu_meditation_sound';

const DURATIONS = [1, 5, 10, 15, 30, 60];

type BackgroundSound = 'none' | 'insects';

const BACKGROUND_SOUNDS: Record<BackgroundSound, { zh: string; en: string; es: string }> = {
  none: { zh: '无', en: 'None', es: 'Ninguno' },
  insects: { zh: '🦗 虫鸣', en: '🦗 Insects', es: '🦗 Insectos' },
};

export const MeditationScreen = () => {
  const { t, addPractice, stats, colors, language } = useApp();
  const [selectedDuration, setSelectedDuration] = useState(15);
  const [backgroundSound, setBackgroundSound] = useState<BackgroundSound>('none');
  const [showSoundPicker, setShowSoundPicker] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [hasActiveSession, setHasActiveSession] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const bellSoundRef = useRef<Audio.Sound | null>(null);
  const backgroundSoundRef = useRef<Audio.Sound | null>(null);

  // 播放钟声（用于完成和暂停）
  const playBellSound = async () => {
    try {
      if (bellSoundRef.current) {
        await bellSoundRef.current.unloadAsync();
      }
      const { sound } = await Audio.Sound.createAsync(
        require('../../assets/sounds/bell.mp3'),
        { shouldPlay: true, volume: 1.0 }
      );
      bellSoundRef.current = sound;
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync();
        }
      });
    } catch (error) {
      console.error('Error playing bell sound:', error);
    }
  };

  // 播放背景音乐
  const playBackgroundSound = async (sound: BackgroundSound) => {
    try {
      // 停止之前的背景音乐
      if (backgroundSoundRef.current) {
        await backgroundSoundRef.current.stopAsync();
        await backgroundSoundRef.current.unloadAsync();
        backgroundSoundRef.current = null;
      }

      if (sound === 'none') return;

      let source: any;
      if (sound === 'insects') {
        source = require('../../assets/sounds/insects.mp3');
      }

      if (source) {
        const { sound: newSound } = await Audio.Sound.createAsync(
          source,
          { shouldPlay: true, volume: 0.5, isLooping: true }
        );
        backgroundSoundRef.current = newSound;
      }
    } catch (error) {
      console.error('Error playing background sound:', error);
    }
  };

  // 停止背景音乐
  const stopBackgroundSound = async () => {
    if (backgroundSoundRef.current) {
      try {
        await backgroundSoundRef.current.stopAsync();
        await backgroundSoundRef.current.unloadAsync();
      } catch (e) {
        // Ignore
      }
      backgroundSoundRef.current = null;
    }
  };

  useEffect(() => {
    // 配置音频
    Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
    }).catch(console.error);

    loadSettings();
    return () => {
      cleanup();
    };
  }, []);

  const cleanup = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    stopBackgroundSound();
  };

  const loadSettings = async () => {
    try {
      const savedDuration = await AsyncStorage.getItem(MEDITATION_DURATION_KEY);
      if (savedDuration) {
        setSelectedDuration(parseInt(savedDuration, 10));
      }
      const savedSound = await AsyncStorage.getItem(MEDITATION_SOUND_KEY);
      if (savedSound && (savedSound === 'none' || savedSound === 'insects')) {
        setBackgroundSound(savedSound as BackgroundSound);
      }
    } catch (error) {
      console.error('Error loading meditation settings:', error);
    }
  };

  const saveSettings = async (duration: number) => {
    try {
      await AsyncStorage.setItem(MEDITATION_DURATION_KEY, duration.toString());
    } catch (error) {
      console.error('Error saving meditation settings:', error);
    }
  };

  const saveSoundSetting = async (sound: BackgroundSound) => {
    try {
      await AsyncStorage.setItem(MEDITATION_SOUND_KEY, sound);
      setBackgroundSound(sound);
    } catch (error) {
      console.error('Error saving sound setting:', error);
    }
  };

  const startTimer = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    const totalSeconds = selectedDuration * 60;
    setTimeLeft(totalSeconds);
    setHasActiveSession(true);
    setIsTimerRunning(true);

    // 开始时播放钟声
    playBellSound();

    // 开始播放背景音乐
    playBackgroundSound(backgroundSound);

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          completeSession();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const completeSession = async () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    setIsTimerRunning(false);
    setHasActiveSession(false);

    // 停止背景音乐
    await stopBackgroundSound();

    await addPractice('meditation', selectedDuration);

    // 播放钟声
    await playBellSound();

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const stopTimer = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    // 停止背景音乐
    await stopBackgroundSound();

    const elapsedMinutes = Math.round((selectedDuration * 60 - timeLeft) / 60);
    if (elapsedMinutes > 0) {
      await addPractice('meditation', elapsedMinutes);
    }

    // 播放钟声提示暂停
    await playBellSound();

    setIsTimerRunning(false);
    setHasActiveSession(false);
    setTimeLeft(0);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const getScreenTitle = () => {
    if (language === 'en') return 'Meditation';
    if (language === 'es') return 'Meditación';
    return '打坐冥想';
  };

  const getTimerLabel = () => {
    if (language === 'en') return 'Duration';
    if (language === 'es') return 'Duración';
    return '打坐时长';
  };

  const getBackgroundSoundLabel = () => {
    if (language === 'en') return 'Background Sound';
    if (language === 'es') return 'Sonido de Fondo';
    return '背景音乐';
  };

  const getMinutesLabel = () => {
    if (language === 'en') return 'min';
    if (language === 'es') return 'min';
    return '分钟';
  };

  const getTotalTime = () => {
    return stats.totalMeditationMinutes || 0;
  };

  const getStatsLabel = () => {
    if (language === 'en') return 'Total Meditation';
    if (language === 'es') return 'Meditación Total';
    return '累计打坐';
  };

  const getMeditatingLabel = () => {
    if (language === 'zh') return '打坐中...';
    if (language === 'es') return 'Meditando...';
    return 'Meditating...';
  };

  const getStopLabel = () => {
    if (language === 'zh') return '停止';
    if (language === 'es') return 'Detener';
    return 'Stop';
  };

  const getStartLabel = () => {
    if (language === 'zh') return '开始打坐';
    if (language === 'es') return 'Comenzar';
    return 'Start Meditation';
  };

  const getTodayStatsLabel = () => {
    if (language === 'zh') return '今日打坐';
    if (language === 'es') return 'Meditación de Hoy';
    return "Today's Meditation";
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      {/* 标题和统计 */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>{getScreenTitle()}</Text>
        <View style={[styles.statsCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.statsValue, { color: colors.primary }]}>{getTotalTime()}</Text>
          <Text style={[styles.statsLabel, { color: colors.textSecondary }]}>
            {getStatsLabel()} ({getMinutesLabel()})
          </Text>
        </View>
      </View>

      {/* 打坐计时器 */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>{getTimerLabel()}</Text>

        {/* 背景音乐选择 */}
        {!hasActiveSession && (
          <TouchableOpacity
            style={[styles.soundSelector, { backgroundColor: colors.card }]}
            onPress={() => setShowSoundPicker(true)}
          >
            <Text style={[styles.soundSelectorLabel, { color: colors.textSecondary }]}>
              {getBackgroundSoundLabel()}
            </Text>
            <View style={styles.soundSelectorValue}>
              <Text style={[styles.soundSelectorText, { color: colors.text }]}>
                {BACKGROUND_SOUNDS[backgroundSound][language]}
              </Text>
              <Text style={[styles.soundSelectorArrow, { color: colors.textLight }]}>›</Text>
            </View>
          </TouchableOpacity>
        )}

        {hasActiveSession ? (
          <View style={[styles.timerDisplay, { backgroundColor: colors.card }]}>
            <Text style={[styles.timerValue, { color: colors.primary }]}>{formatTime(timeLeft)}</Text>
            <Text style={[styles.timerLabel, { color: colors.textSecondary }]}>
              {getMeditatingLabel()}
            </Text>
            <TouchableOpacity
              style={[styles.stopButton, { backgroundColor: colors.error }]}
              onPress={stopTimer}
            >
              <Text style={styles.stopButtonText}>{getStopLabel()}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.durationsGrid}>
              {DURATIONS.map((duration) => (
                <TouchableOpacity
                  key={duration}
                  style={[
                    styles.durationCard,
                    selectedDuration === duration
                      ? { backgroundColor: colors.primary }
                      : { backgroundColor: colors.card },
                  ]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setSelectedDuration(duration);
                    saveSettings(duration);
                  }}
                >
                  <View style={styles.durationContent}>
                    <Text
                      style={[
                        styles.durationValue,
                        { color: selectedDuration === duration ? '#fff' : colors.text },
                      ]}
                    >
                      {duration}
                    </Text>
                    <Text
                      style={[
                        styles.durationLabel,
                        { color: selectedDuration === duration ? '#fff' : colors.textSecondary },
                      ]}
                    >
                      {language === 'zh' ? '分钟' : 'm'}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.startButton, { backgroundColor: colors.primary }]}
              onPress={startTimer}
            >
              <Text style={styles.startButtonText}>{getStartLabel()}</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* 今日打坐统计 */}
      <View style={[styles.todayStats, { backgroundColor: colors.card }]}>
        <Text style={[styles.todayStatsTitle, { color: colors.text }]}>
          {getTodayStatsLabel()}
        </Text>
        <Text style={[styles.todayStatsValue, { color: colors.primary }]}>
          {stats.totalMeditationMinutes || 0} {getMinutesLabel()}
        </Text>
      </View>

      {/* 背景音乐选择弹窗 */}
      <Modal
        visible={showSoundPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSoundPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{getBackgroundSoundLabel()}</Text>

            {(Object.keys(BACKGROUND_SOUNDS) as BackgroundSound[]).map((sound) => (
              <TouchableOpacity
                key={sound}
                style={[
                  styles.soundOption,
                  { backgroundColor: colors.backgroundSecondary },
                  backgroundSound === sound && { backgroundColor: colors.primary + '20' },
                ]}
                onPress={async () => {
                  Haptics.selectionAsync();
                  await saveSoundSetting(sound);
                  setShowSoundPicker(false);
                }}
              >
                <Text style={[styles.soundOptionText, { color: colors.text }]}>
                  {BACKGROUND_SOUNDS[sound][language]}
                </Text>
                {backgroundSound === sound && (
                  <Text style={[styles.soundOptionCheck, { color: colors.primary }]}>✓</Text>
                )}
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={[styles.modalCloseButton, { backgroundColor: colors.divider }]}
              onPress={() => setShowSoundPicker(false)}
            >
              <Text style={[styles.modalCloseButtonText, { color: colors.text }]}>
                {language === 'zh' ? '关闭' : language === 'es' ? 'Cerrar' : 'Close'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingTop: vs(60),
    paddingBottom: vs(40),
  },
  header: {
    paddingHorizontal: layout.contentPadding,
    marginBottom: vs(16),
  },
  title: {
    fontSize: fs(28),
    fontWeight: 'bold',
    marginBottom: vs(16),
  },
  statsCard: {
    borderRadius: rs(16),
    padding: rs(20),
    alignItems: 'center',
  },
  statsValue: {
    fontSize: fs(36),
    fontWeight: 'bold',
  },
  statsLabel: {
    fontSize: fs(14),
    marginTop: vs(4),
  },
  section: {
    paddingHorizontal: layout.contentPadding,
    paddingTop: vs(12),
  },
  sectionTitle: {
    fontSize: fs(18),
    fontWeight: '600',
    marginBottom: vs(12),
  },
  soundSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: rs(12),
    padding: rs(16),
    marginBottom: vs(16),
  },
  soundSelectorLabel: {
    fontSize: fs(14),
  },
  soundSelectorValue: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  soundSelectorText: {
    fontSize: fs(16),
    marginRight: rs(8),
  },
  soundSelectorArrow: {
    fontSize: fs(20),
    fontWeight: '300',
  },
  durationsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: rs(12),
    marginBottom: vs(20),
  },
  durationCard: {
    width: (rs(320) - rs(48)) / 3,
    height: rs(50),
    borderRadius: rs(16),
    justifyContent: 'center',
    alignItems: 'center',
  },
  durationContent: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  durationValue: {
    fontSize: fs(18),
    fontWeight: 'bold',
  },
  durationLabel: {
    fontSize: fs(14),
    marginLeft: rs(2),
  },
  timerDisplay: {
    borderRadius: rs(16),
    padding: rs(30),
    alignItems: 'center',
  },
  timerValue: {
    fontSize: fs(48),
    fontWeight: 'bold',
  },
  timerLabel: {
    fontSize: fs(14),
    marginTop: vs(8),
    marginBottom: vs(20),
  },
  stopButton: {
    paddingHorizontal: rs(40),
    paddingVertical: vs(12),
    borderRadius: rs(12),
  },
  stopButtonText: {
    color: '#fff',
    fontSize: fs(16),
    fontWeight: '600',
  },
  startButton: {
    paddingVertical: vs(16),
    borderRadius: rs(16),
    alignItems: 'center',
  },
  startButtonText: {
    color: '#fff',
    fontSize: fs(18),
    fontWeight: '600',
  },
  todayStats: {
    marginHorizontal: layout.contentPadding,
    marginTop: vs(20),
    borderRadius: rs(16),
    padding: rs(16),
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  todayStatsTitle: {
    fontSize: fs(16),
    fontWeight: '600',
  },
  todayStatsValue: {
    fontSize: fs(20),
    fontWeight: 'bold',
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
    borderRadius: rs(20),
    padding: rs(24),
    width: '100%',
    maxWidth: rs(320),
  },
  modalTitle: {
    fontSize: fs(18),
    fontWeight: 'bold',
    marginBottom: vs(16),
    textAlign: 'center',
  },
  soundOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: rs(16),
    borderRadius: rs(12),
    marginBottom: vs(8),
  },
  soundOptionText: {
    fontSize: fs(16),
  },
  soundOptionCheck: {
    fontSize: fs(20),
    fontWeight: 'bold',
  },
  modalCloseButton: {
    paddingVertical: vs(14),
    borderRadius: rs(12),
    alignItems: 'center',
    marginTop: vs(8),
  },
  modalCloseButtonText: {
    fontSize: fs(16),
    fontWeight: '600',
  },
});
