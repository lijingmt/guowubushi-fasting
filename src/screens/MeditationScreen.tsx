import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Modal,
  AppState,
  AppStateStatus,
  Keyboard,
} from 'react-native';
import { Audio } from 'expo-av';
import { useApp } from '../context/AppContext';
import { useSocial } from '../context/SocialContext';
import { fs, rs, vs, layout } from '../theme/responsive';
import { calculatePeriodStats } from '../utils/leaderboardStats';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MeditationShareCard } from '../components/MeditationShareCard';
import { MeditationAnimation } from '../components/MeditationAnimation';
import { OnlineMeditatorsList } from '../components/OnlineMeditatorsList';
import { NicknameEditField } from '../components/NicknameEditField';
import { getLocalDateString } from '../utils/date';
import type { Language } from '../i18n/translations';

const MEDITATION_DURATION_KEY = '@guowu_meditation_duration';
const MEDITATION_SOUND_KEY = '@guowu_meditation_sound';
const BG_TARGET_VOLUME = 0.5;
const BG_CROSSFADE_MS = 2500;
const BG_CROSSFADE_STEPS = 10;

const DURATIONS = [1, 5, 10, 15, 30, 60, 120, 180, 300];

type BackgroundSound = 'none' | 'insects' | 'ocean' | 'rain' | 'birds';
type LocalizedSoundLabel = Record<'zh' | 'en' | 'es', string> & Partial<Record<Language, string>>;

const BACKGROUND_SOUNDS: Record<BackgroundSound, LocalizedSoundLabel> = {
  none: { zh: '无', en: 'None', es: 'Ninguno' },
  insects: { zh: '🦗 虫鸣', en: '🦗 Insects', es: '🦗 Insectos' },
  ocean: { zh: '🌊 海潮', en: '🌊 Ocean', es: '🌊 Océano' },
  rain: { zh: '🌧️ 雨声', en: '🌧️ Rain', es: '🌧️ Lluvia' },
  birds: { zh: '🐦 鸟鸣', en: '🐦 Birds', es: '🐦 Pájaros' },
};

export const MeditationScreen = () => {
  const { t, addPractice, stats, checkInRecords, practiceRecords, colors, language } = useApp();
  const social = useSocial();
  const [selectedDuration, setSelectedDuration] = useState(15);
  const [backgroundSound, setBackgroundSound] = useState<BackgroundSound>('none');
  const [showSoundPicker, setShowSoundPicker] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showSocial, setShowSocial] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [hasActiveSession, setHasActiveSession] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const bellSoundRef = useRef<Audio.Sound | null>(null);
  const activeSoundRef = useRef<Audio.Sound | null>(null);
  const standbySoundRef = useRef<Audio.Sound | null>(null);
  const fadeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const crossfadingRef = useRef(false);
  const audioSessionIdRef = useRef(0);
  const isTimerRunningRef = useRef(false);
  const endTimeRef = useRef<number>(0);
  const selectedDurationRef = useRef(15);
  const completingRef = useRef(false);
  const scrollRef = useRef<ScrollView>(null);
  const getSoundLabel = (sound: BackgroundSound) => (
    BACKGROUND_SOUNDS[sound][language] || BACKGROUND_SOUNDS[sound].en
  );

  useEffect(() => {
    selectedDurationRef.current = selectedDuration;
  }, [selectedDuration]);

  // 播放钟声（用于完成和暂停）
  const playBellSound = async () => {
    try {
      if (bellSoundRef.current) {
        await bellSoundRef.current.unloadAsync();
      }
      const { sound } = await Audio.Sound.createAsync(
        require('../../assets/sounds/temple_bell.mp3'),
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

  // 停止背景音乐（安全卸载双轨实例与淡化定时器）
  const stopBackgroundSound = async () => {
    audioSessionIdRef.current += 1;
    if (fadeIntervalRef.current) {
      clearInterval(fadeIntervalRef.current);
      fadeIntervalRef.current = null;
    }
    crossfadingRef.current = false;

    const sounds = [activeSoundRef.current, standbySoundRef.current];
    activeSoundRef.current = null;
    standbySoundRef.current = null;

    await Promise.all(
      sounds.map(async (sound) => {
        if (!sound) return;
        try {
          sound.setOnPlaybackStatusUpdate(null);
          await sound.stopAsync();
          await sound.unloadAsync();
        } catch (e) {
          // Ignore
        }
      })
    );
  };

  // A/B 双轨等响度交叉淡化，彻底消除循环接缝与 seek 停顿
  const runCrossfade = async (outgoing: Audio.Sound, incoming: Audio.Sound, sessionId: number) => {
    if (crossfadingRef.current || audioSessionIdRef.current !== sessionId) return;
    crossfadingRef.current = true;
    outgoing.setOnPlaybackStatusUpdate(null);

    try {
      await incoming.setPositionAsync(0);
      await incoming.setVolumeAsync(0);
      await incoming.playAsync();
    } catch (error) {
      crossfadingRef.current = false;
      return;
    }

    if (audioSessionIdRef.current !== sessionId) {
      crossfadingRef.current = false;
      return;
    }

    let step = 0;
    const stepMs = Math.max(50, Math.floor(BG_CROSSFADE_MS / BG_CROSSFADE_STEPS));
    fadeIntervalRef.current = setInterval(() => {
      if (audioSessionIdRef.current !== sessionId) {
        if (fadeIntervalRef.current) {
          clearInterval(fadeIntervalRef.current);
          fadeIntervalRef.current = null;
        }
        crossfadingRef.current = false;
        return;
      }

      step += 1;
      const progress = Math.min(1, step / BG_CROSSFADE_STEPS);
      const inVol = BG_TARGET_VOLUME * Math.sin((progress * Math.PI) / 2);
      const outVol = BG_TARGET_VOLUME * Math.cos((progress * Math.PI) / 2);

      void incoming.setVolumeAsync(inVol).catch(() => {});
      void outgoing.setVolumeAsync(outVol).catch(() => {});

      if (step >= BG_CROSSFADE_STEPS) {
        if (fadeIntervalRef.current) {
          clearInterval(fadeIntervalRef.current);
          fadeIntervalRef.current = null;
        }
        void (async () => {
          try {
            await outgoing.stopAsync();
            await outgoing.setPositionAsync(0);
            await outgoing.setVolumeAsync(0);
          } catch (e) {
            // Ignore
          }
          if (audioSessionIdRef.current !== sessionId) {
            crossfadingRef.current = false;
            return;
          }
          activeSoundRef.current = incoming;
          standbySoundRef.current = outgoing;
          crossfadingRef.current = false;
          attachLoopMonitor(incoming, outgoing, sessionId);
        })();
      }
    }, stepMs);
  };

  const attachLoopMonitor = (active: Audio.Sound, standby: Audio.Sound, sessionId: number) => {
    active.setOnPlaybackStatusUpdate((status) => {
      if (audioSessionIdRef.current !== sessionId || !status.isLoaded) return;

      if (
        status.durationMillis &&
        status.durationMillis > BG_CROSSFADE_MS + 1000 &&
        status.positionMillis >= status.durationMillis - BG_CROSSFADE_MS &&
        !crossfadingRef.current
      ) {
        void runCrossfade(active, standby, sessionId);
        return;
      }

      // 兜底：若系统延迟触发，立即切到备用轨继续播放
      if (status.didJustFinish && !crossfadingRef.current) {
        active.setOnPlaybackStatusUpdate(null);
        void (async () => {
          try {
            await standby.setPositionAsync(0);
            await standby.setVolumeAsync(BG_TARGET_VOLUME);
            await standby.playAsync();
            await active.setPositionAsync(0);
            await active.setVolumeAsync(0);
          } catch (e) {
            return;
          }
          if (audioSessionIdRef.current !== sessionId) return;
          activeSoundRef.current = standby;
          standbySoundRef.current = active;
          attachLoopMonitor(standby, active, sessionId);
        })();
      }
    });
  };

  // 播放背景音乐（双轨无缝无限循环）
  const playBackgroundSound = async (sound: BackgroundSound) => {
    try {
      await stopBackgroundSound();
      if (sound === 'none') return;

      const sessionId = audioSessionIdRef.current;

      let source: any;
      if (sound === 'insects') {
        source = require('../../assets/sounds/insects.mp3');
      } else if (sound === 'ocean') {
        source = require('../../assets/sounds/ocean.mp3');
      } else if (sound === 'rain') {
        source = require('../../assets/sounds/rain.mp3');
      } else if (sound === 'birds') {
        source = require('../../assets/sounds/birds.mp3');
      }

      if (!source) return;

      const [{ sound: trackA }, { sound: trackB }] = await Promise.all([
        Audio.Sound.createAsync(source, {
          shouldPlay: true,
          volume: BG_TARGET_VOLUME,
          isLooping: false,
          progressUpdateIntervalMillis: 250,
        }),
        Audio.Sound.createAsync(source, {
          shouldPlay: false,
          volume: 0,
          isLooping: false,
          progressUpdateIntervalMillis: 250,
        }),
      ]);

      if (audioSessionIdRef.current !== sessionId) {
        await Promise.all([
          trackA.stopAsync().catch(() => {}),
          trackA.unloadAsync().catch(() => {}),
          trackB.stopAsync().catch(() => {}),
          trackB.unloadAsync().catch(() => {}),
        ]);
        return;
      }

      activeSoundRef.current = trackA;
      standbySoundRef.current = trackB;
      attachLoopMonitor(trackA, trackB, sessionId);
    } catch (error) {
      console.error('Error playing background sound:', error);
    }
  };

  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', () => {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    });
    return () => showSub.remove();
  }, []);

  useEffect(() => {
    // 配置音频
    Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
    }).catch(console.error);

    loadSettings();

    // Connect to social and go online
    social.connect();
    social.goOnline('meditation');

    // Auto-publish leaderboard stats
    if (stats && checkInRecords) {
      const entry = calculatePeriodStats(
        social.userId, social.nickname,
        checkInRecords, practiceRecords,
        stats.currentStreak,
      );
      social.publishLeaderboardStats(entry);
    }

    // 监听应用状态变化
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      cleanup();
      subscription.remove();
      // Don't disconnect - keep WebSocket alive for other tabs (leaderboard, chat)
    };
  }, []);

  // 处理应用状态变化（后台/前台）
  const handleAppStateChange = (nextAppState: AppStateStatus) => {
    if (nextAppState === 'active' && isTimerRunningRef.current && endTimeRef.current > 0) {
      const remaining = Math.max(0, Math.ceil((endTimeRef.current - Date.now()) / 1000));
      if (remaining <= 0) {
        setTimeLeft(0);
        void completeSession();
      } else {
        setTimeLeft(remaining);
      }
    }
  };

  const cleanup = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    isTimerRunningRef.current = false;
    endTimeRef.current = 0;
    stopBackgroundSound();
  };

  const loadSettings = async () => {
    try {
      const savedDuration = await AsyncStorage.getItem(MEDITATION_DURATION_KEY);
      if (savedDuration) {
        setSelectedDuration(parseInt(savedDuration, 10));
      }
      const savedSound = await AsyncStorage.getItem(MEDITATION_SOUND_KEY);
      if (savedSound && (savedSound === 'none' || savedSound === 'insects' || savedSound === 'ocean' || savedSound === 'rain' || savedSound === 'birds')) {
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

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    const totalSeconds = selectedDuration * 60;
    completingRef.current = false;
    selectedDurationRef.current = selectedDuration;
    endTimeRef.current = Date.now() + totalSeconds * 1000;
    isTimerRunningRef.current = true;
    setTimeLeft(totalSeconds);
    setHasActiveSession(true);
    setIsTimerRunning(true);

    // 开始时播放钟声
    playBellSound();

    // 开始播放背景音乐
    playBackgroundSound(backgroundSound);

    timerRef.current = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((endTimeRef.current - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining <= 0) {
        void completeSession();
      }
    }, 1000);
  };

  const completeSession = async () => {
    if (completingRef.current || !isTimerRunningRef.current) return;
    completingRef.current = true;
    isTimerRunningRef.current = false;
    endTimeRef.current = 0;

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    setIsTimerRunning(false);
    setHasActiveSession(false);

    // 停止背景音乐
    await stopBackgroundSound();

    await addPractice('meditation', selectedDurationRef.current);

    // 播放钟声
    await playBellSound();

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const stopTimer = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    const durationMins = selectedDurationRef.current;
    const remaining = endTimeRef.current > 0
      ? Math.max(0, Math.ceil((endTimeRef.current - Date.now()) / 1000))
      : timeLeft;
    isTimerRunningRef.current = false;
    endTimeRef.current = 0;

    // 停止背景音乐
    await stopBackgroundSound();

    const elapsedMinutes = Math.round((durationMins * 60 - remaining) / 60);
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

  const getTodayMinutes = () => {
    const today = getLocalDateString();
    return practiceRecords
      .filter((r) => r.type === 'meditation' && r.date === today)
      .reduce((sum, r) => sum + (r.duration || 0), 0);
  };

  const getTodayStatsLabel = () => {
    if (language === 'zh') return '今日打坐';
    if (language === 'es') return 'Meditación de Hoy';
    return "Today's Meditation";
  };

  return (
    <ScrollView ref={scrollRef} style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
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
                {getSoundLabel(backgroundSound)}
              </Text>
              <Text style={[styles.soundSelectorArrow, { color: colors.textLight }]}>›</Text>
            </View>
          </TouchableOpacity>
        )}

        {hasActiveSession ? (
          <View style={[styles.timerDisplay, { backgroundColor: colors.card }]}>
            {/* 背景音效动画 */}
            {isTimerRunning && backgroundSound !== 'none' && (
              <MeditationAnimation soundType={backgroundSound as 'rain' | 'ocean' | 'insects' | 'birds'} />
            )}
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
          {getTodayMinutes()} {getMinutesLabel()}
        </Text>
      </View>

      {/* Social panel */}
      <View style={[styles.socialSection, { marginHorizontal: layout.contentPadding, marginTop: vs(12) }]}>
        <TouchableOpacity
          style={[styles.socialToggle, { backgroundColor: colors.card }]}
          onPress={() => setShowSocial(!showSocial)}
        >
          <Text style={[styles.socialToggleText, { color: colors.text }]}>
            👥 {social.onlineCount} {language === 'zh' ? '人打坐中' : language === 'es' ? 'meditando' : 'meditating'}
          </Text>
          <Text style={[styles.socialToggleArrow, { color: colors.textSecondary }]}>
            {showSocial ? '▼' : '▶'}
          </Text>
        </TouchableOpacity>

        {showSocial && (
          <View style={styles.socialContent}>
            <NicknameEditField />
            <OnlineMeditatorsList />
          </View>
        )}
      </View>

      {/* 分享按钮 */}
      <TouchableOpacity
        style={[styles.shareButton, { backgroundColor: colors.primary }]}
        onPress={() => setShowShareModal(true)}
      >
        <Text style={styles.shareButtonText}>
          📤 {language === 'zh' ? '分享我的打坐' : language === 'es' ? 'Compartir' : 'Share My Meditation'}
        </Text>
      </TouchableOpacity>

      {/* 音效来源说明 */}
      <Text style={[styles.attributionText, { color: colors.textLight }]}>
        {language === 'zh' ? '部分音效来源' : language === 'es' ? 'Algunas fuentes de sonido' : 'Some Sound Effects'}: Pixabay (royalty-free)
      </Text>

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
                  {getSoundLabel(sound)}
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

      {/* 分享弹窗 */}
      {showShareModal && (
        <MeditationShareCard
          totalMinutes={stats.totalMeditationMinutes || 0}
          sessionCount={stats.meditationSessionCount || 0}
          longestSession={stats.longestMeditationSession || 0}
          language={language}
          colors={colors}
          onClose={() => setShowShareModal(false)}
        />
      )}
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
  shareButton: {
    marginHorizontal: layout.contentPadding,
    marginTop: vs(12),
    paddingVertical: vs(16),
    borderRadius: rs(16),
    alignItems: 'center',
  },
  shareButtonText: {
    color: '#fff',
    fontSize: fs(18),
    fontWeight: '600',
  },
  attributionText: {
    fontSize: fs(11),
    textAlign: 'center',
    marginTop: vs(8),
    paddingHorizontal: layout.contentPadding,
  },
  // Social styles
  socialSection: {},
  socialToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: rs(12),
    padding: rs(14),
  },
  socialToggleText: {
    fontSize: fs(15),
    fontWeight: '600',
  },
  socialToggleArrow: {
    fontSize: fs(12),
  },
  socialContent: {
    marginTop: vs(8),
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
