import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useApp } from '../context/AppContext';
import { fs, rs, vs, layout } from '../theme/responsive';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

const MEDITATION_DURATION_KEY = '@guowu_meditation_duration';

const DURATIONS = [5, 10, 15, 30, 60];

export const MeditationScreen = () => {
  const { t, addPractice, stats, colors, language } = useApp();
  const [selectedDuration, setSelectedDuration] = useState(15);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [hasActiveSession, setHasActiveSession] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadSettings();
    return () => {
      cleanup();
    };
  }, []);

  const cleanup = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
  };

  const loadSettings = async () => {
    try {
      const savedDuration = await AsyncStorage.getItem(MEDITATION_DURATION_KEY);
      if (savedDuration) {
        setSelectedDuration(parseInt(savedDuration, 10));
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

  const startTimer = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    const totalSeconds = selectedDuration * 60;
    setTimeLeft(totalSeconds);
    setHasActiveSession(true);
    setIsTimerRunning(true);

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

    await addPractice('meditation', selectedDuration);

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const stopTimer = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    const elapsedMinutes = Math.round((selectedDuration * 60 - timeLeft) / 60);
    if (elapsedMinutes > 0) {
      await addPractice('meditation', elapsedMinutes);
    }

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
                    {getMinutesLabel()}
                  </Text>
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
  durationsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: rs(12),
    marginBottom: vs(20),
  },
  durationCard: {
    width: (rs(320) - rs(48)) / 3,
    aspectRatio: 1,
    borderRadius: rs(16),
    justifyContent: 'center',
    alignItems: 'center',
  },
  durationValue: {
    fontSize: fs(24),
    fontWeight: 'bold',
  },
  durationLabel: {
    fontSize: fs(12),
    marginTop: vs(4),
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
});
