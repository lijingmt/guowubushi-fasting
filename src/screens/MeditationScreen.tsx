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
import { fs, rs, vs, layout, useResponsiveLayout } from '../theme/responsive';
import { calculatePeriodStats } from '../utils/leaderboardStats';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MeditationShareCard } from '../components/MeditationShareCard';
import { MeditationAnimation } from '../components/MeditationAnimation';
import { OnlineMeditatorsList } from '../components/OnlineMeditatorsList';
import { NicknameEditField } from '../components/NicknameEditField';
import { HeartLampPool } from '../components/HeartLampPool';
import { getLocalDateString } from '../utils/date';
import { saveMindfulMinutesToAppleHealth } from '../services/nativeHealth';
import type { Language } from '../i18n/translations';

const MEDITATION_DURATION_KEY = '@guowu_meditation_duration';
const MEDITATION_SOUND_KEY = '@guowu_meditation_sound';
const MEDITATION_MIXER_KEY = '@guowu_meditation_mixer';
const BG_CROSSFADE_MS = 2500;
const BG_CROSSFADE_STEPS = 10;

const DURATIONS = [1, 5, 10, 15, 30, 60, 120, 180, 300];
const VOLUME_STEPS = [0.25, 0.5, 0.75, 1.0] as const;

type BackgroundSound = 'none' | 'insects' | 'ocean' | 'rain' | 'birds';
type LocalizedSoundLabel = Record<'zh' | 'en' | 'es', string> & Partial<Record<Language, string>>;

const BACKGROUND_SOUNDS: Record<BackgroundSound, LocalizedSoundLabel> = {
  none: { zh: '无', en: 'None', es: 'Ninguno' },
  insects: { zh: '🦗 虫鸣', en: '🦗 Insects', es: '🦗 Insectos' },
  ocean: { zh: '🌊 海潮', en: '🌊 Ocean', es: '🌊 Océano' },
  rain: { zh: '🌧️ 雨声', en: '🌧️ Rain', es: '🌧️ Lluvia' },
  birds: { zh: '🐦 鸟鸣', en: '🐦 Birds', es: '🐦 Pájaros' },
};

const MIXER_PRESETS: Array<{
  id: string;
  zh: string;
  en: string;
  es: string;
  soundA: BackgroundSound;
  volA: number;
  soundB: BackgroundSound;
  volB: number;
}> = [
  { id: 'rainy_temple', zh: '雨夜古刹', en: 'Rainy Temple', es: 'Templo Lluvia', soundA: 'rain', volA: 0.5, soundB: 'insects', volB: 0.25 },
  { id: 'dawn_coast', zh: '晨林听涛', en: 'Dawn Coast', es: 'Costa Alba', soundA: 'ocean', volA: 0.5, soundB: 'birds', volB: 0.5 },
  { id: 'pine_mist', zh: '清幽山寺', en: 'Pine Mist', es: 'Bruma Bosque', soundA: 'birds', volA: 0.5, soundB: 'rain', volB: 0.25 },
];

export const MeditationScreen = () => {
  const { t, addPractice, stats, settings, checkInRecords, practiceRecords, colors, language, isProUnlocked, openProStore } = useApp();
  const rl = useResponsiveLayout();
  const social = useSocial();
  const isZh = language === 'zh' || language === 'zh-Hant';
  const isEs = language === 'es';
  const [selectedDuration, setSelectedDuration] = useState(15);
  const [backgroundSound, setBackgroundSound] = useState<BackgroundSound>('none');
  const [secondarySound, setSecondarySound] = useState<BackgroundSound>('none');
  const [primaryVolume, setPrimaryVolume] = useState<number>(0.5);
  const [secondaryVolume, setSecondaryVolume] = useState<number>(0.25);
  const [hapticBreathEnabled, setHapticBreathEnabled] = useState<boolean>(false);
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
  const secondaryAudioRef = useRef<Audio.Sound | null>(null);
  const primaryVolumeRef = useRef(0.5);
  const hapticTickRef = useRef(0);
  const sessionStartMsRef = useRef(0);
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

  useEffect(() => {
    primaryVolumeRef.current = primaryVolume;
  }, [primaryVolume]);

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

    const sounds = [activeSoundRef.current, standbySoundRef.current, secondaryAudioRef.current];
    activeSoundRef.current = null;
    standbySoundRef.current = null;
    secondaryAudioRef.current = null;

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

  const getSoundAssetSource = (sound: BackgroundSound) => {
    if (sound === 'insects') return require('../../assets/sounds/insects.mp3');
    if (sound === 'ocean') return require('../../assets/sounds/ocean.mp3');
    if (sound === 'rain') return require('../../assets/sounds/rain.mp3');
    if (sound === 'birds') return require('../../assets/sounds/birds.mp3');
    return null;
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
      const targetVol = primaryVolumeRef.current;
      const inVol = targetVol * Math.sin((progress * Math.PI) / 2);
      const outVol = targetVol * Math.cos((progress * Math.PI) / 2);

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
            await standby.setVolumeAsync(primaryVolumeRef.current);
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

  // 播放双轨自定义混音背景音乐（主音轨无损淡化 + 环境副音叠加）
  const playBackgroundSound = async (
    sound: BackgroundSound,
    soundB: BackgroundSound = secondarySound,
    volA: number = primaryVolume,
    volB: number = secondaryVolume
  ) => {
    try {
      await stopBackgroundSound();
      const effectiveSoundB = isProUnlocked ? soundB : 'none';
      if (sound === 'none' && effectiveSoundB === 'none') return;

      const sessionId = audioSessionIdRef.current;
      const sourceA = getSoundAssetSource(sound);
      const sourceB = getSoundAssetSource(effectiveSoundB);

      if (sourceA) {
        const [{ sound: trackA }, { sound: trackB }] = await Promise.all([
          Audio.Sound.createAsync(sourceA, {
            shouldPlay: true,
            volume: volA,
            isLooping: false,
            progressUpdateIntervalMillis: 250,
          }),
          Audio.Sound.createAsync(sourceA, {
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
      }

      if (sourceB) {
        const { sound: layerB } = await Audio.Sound.createAsync(sourceB, {
          shouldPlay: true,
          volume: volB,
          isLooping: true,
        });
        if (audioSessionIdRef.current !== sessionId) {
          await layerB.stopAsync().catch(() => {});
          await layerB.unloadAsync().catch(() => {});
          return;
        }
        secondaryAudioRef.current = layerB;
      }
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
      const savedMixer = await AsyncStorage.getItem(MEDITATION_MIXER_KEY);
      if (savedMixer) {
        const parsed = JSON.parse(savedMixer);
        if (parsed.soundA) setBackgroundSound(parsed.soundA);
        if (parsed.soundB) setSecondarySound(parsed.soundB);
        if (typeof parsed.volA === 'number') setPrimaryVolume(parsed.volA);
        if (typeof parsed.volB === 'number') setSecondaryVolume(parsed.volB);
        if (typeof parsed.hapticBreath === 'boolean') setHapticBreathEnabled(parsed.hapticBreath);
      } else {
        const savedSound = await AsyncStorage.getItem(MEDITATION_SOUND_KEY);
        if (savedSound && (savedSound === 'none' || savedSound === 'insects' || savedSound === 'ocean' || savedSound === 'rain' || savedSound === 'birds')) {
          setBackgroundSound(savedSound as BackgroundSound);
        }
      }
    } catch (error) {
      console.error('Error loading meditation settings:', error);
    }
  };

  const persistMixer = async (next: {
    soundA?: BackgroundSound;
    soundB?: BackgroundSound;
    volA?: number;
    volB?: number;
    hapticBreath?: boolean;
  }) => {
    const payload = {
      soundA: next.soundA ?? backgroundSound,
      soundB: next.soundB ?? secondarySound,
      volA: next.volA ?? primaryVolume,
      volB: next.volB ?? secondaryVolume,
      hapticBreath: next.hapticBreath ?? hapticBreathEnabled,
    };
    await AsyncStorage.setItem(MEDITATION_MIXER_KEY, JSON.stringify(payload)).catch(() => {});
    await AsyncStorage.setItem(MEDITATION_SOUND_KEY, payload.soundA).catch(() => {});
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

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    const totalSeconds = selectedDuration * 60;
    completingRef.current = false;
    selectedDurationRef.current = selectedDuration;
    sessionStartMsRef.current = Date.now();
    hapticTickRef.current = 0;
    endTimeRef.current = Date.now() + totalSeconds * 1000;
    isTimerRunningRef.current = true;
    setTimeLeft(totalSeconds);
    setHasActiveSession(true);
    setIsTimerRunning(true);

    // 开始时播放钟声
    playBellSound();

    // 开始播放双轨混音背景音乐
    playBackgroundSound(backgroundSound, secondarySound, primaryVolume, secondaryVolume);

    timerRef.current = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((endTimeRef.current - Date.now()) / 1000));
      setTimeLeft(remaining);
      hapticTickRef.current += 1;
      if (hapticBreathEnabled) {
        const secInCycle = hapticTickRef.current % 14;
        if (secInCycle === 0 || secInCycle === 2) {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } else if (secInCycle === 4) {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        } else if (secInCycle === 8 || secInCycle === 11) {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
        }
      }
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
    if (settings.appleHealthEnabled && sessionStartMsRef.current > 0) {
      void saveMindfulMinutesToAppleHealth(sessionStartMsRef.current, Date.now());
    }

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
      if (settings.appleHealthEnabled && sessionStartMsRef.current > 0) {
        void saveMindfulMinutesToAppleHealth(sessionStartMsRef.current, Date.now());
      }
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
    if ((language === 'zh' || language === 'zh-Hant')) return '打坐中...';
    if (language === 'es') return 'Meditando...';
    return 'Meditating...';
  };

  const getStopLabel = () => {
    if ((language === 'zh' || language === 'zh-Hant')) return '停止';
    if (language === 'es') return 'Detener';
    return 'Stop';
  };

  const getStartLabel = () => {
    if ((language === 'zh' || language === 'zh-Hant')) return '开始打坐';
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
    if ((language === 'zh' || language === 'zh-Hant')) return '今日打坐';
    if (language === 'es') return 'Meditación de Hoy';
    return "Today's Meditation";
  };

  return (
    <ScrollView
      ref={scrollRef}
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content,
        {
          maxWidth: rl.singleColumnMaxWidth,
          width: '100%',
          alignSelf: 'center',
          ...(rl.isCompactHeight ? { paddingTop: vs(20), paddingBottom: vs(24) } : {}),
        },
      ]}
    >
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

        {/* 背景音乐双轨混音选择 + 闭眼触觉观息 */}
        {!hasActiveSession && (
          <View style={{ gap: vs(8), marginBottom: vs(14) }}>
            <TouchableOpacity
              style={[styles.soundSelector, { backgroundColor: colors.card, marginBottom: 0 }]}
              onPress={() => setShowSoundPicker(true)}
            >
              <Text style={[styles.soundSelectorLabel, { color: colors.textSecondary }]}>
                {isZh ? '双轨氛围混音' : isEs ? 'Mezclador Dual' : 'Dual Sound Mixer'}
              </Text>
              <View style={styles.soundSelectorValue}>
                <Text style={[styles.soundSelectorText, { color: colors.text }]}>
                  {isProUnlocked && secondarySound !== 'none'
                    ? `${getSoundLabel(backgroundSound)} + ${getSoundLabel(secondarySound)}`
                    : getSoundLabel(backgroundSound)}
                </Text>
                <Text style={[styles.soundSelectorArrow, { color: colors.textLight }]}>›</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.soundSelector, { backgroundColor: colors.card, marginBottom: 0 }]}
              onPress={() => {
                const next = !hapticBreathEnabled;
                Haptics.selectionAsync();
                setHapticBreathEnabled(next);
                void persistMixer({ hapticBreath: next });
              }}
            >
              <Text style={[styles.soundSelectorLabel, { color: colors.textSecondary }]}>
                {isZh ? '🪷 闭眼触觉观息 (4-4-6)' : isEs ? '🪷 Guía Táctil 4-4-6' : '🪷 Eyes-Closed Haptic Breath'}
              </Text>
              <Text style={{ fontSize: fs(13), fontWeight: '800', color: hapticBreathEnabled ? colors.primary : colors.textLight }}>
                {hapticBreathEnabled ? (isZh ? '已开启' : 'ON') : (isZh ? '关闭' : 'OFF')}
              </Text>
            </TouchableOpacity>
          </View>
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
                      {(language === 'zh' || language === 'zh-Hant') ? '分钟' : 'm'}
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

      {/* 无言同频共修心灯池（零自由文本，100%合规） */}
      <View style={{ marginHorizontal: layout.contentPadding }}>
        <HeartLampPool />
      </View>

      {/* Social panel */}
      <View style={[styles.socialSection, { marginHorizontal: layout.contentPadding, marginTop: vs(12) }]}>
        <TouchableOpacity
          style={[styles.socialToggle, { backgroundColor: colors.card }]}
          onPress={() => setShowSocial(!showSocial)}
        >
          <Text style={[styles.socialToggleText, { color: colors.text }]}>
            👥 {social.onlineCount} {(language === 'zh' || language === 'zh-Hant') ? '人打坐中' : language === 'es' ? 'meditando' : 'meditating'}
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
          📤 {(language === 'zh' || language === 'zh-Hant') ? '分享我的打坐' : language === 'es' ? 'Compartir' : 'Share My Meditation'}
        </Text>
      </TouchableOpacity>

      {/* 音效来源说明 */}
      <Text style={[styles.attributionText, { color: colors.textLight }]}>
        {(language === 'zh' || language === 'zh-Hant') ? '部分音效来源' : language === 'es' ? 'Algunas fuentes de sonido' : 'Some Sound Effects'}: Pixabay (royalty-free)
      </Text>

      {Platform.OS === 'ios' && (
        <TouchableOpacity
          onPress={() => {
            Haptics.selectionAsync();
            openProStore();
          }}
          style={{ alignItems: 'center', marginTop: vs(8), marginBottom: vs(6) }}
        >
          <Text style={{ fontSize: fs(12), color: colors.primary, fontWeight: '600' }}>
            {isZh
              ? '🪷 静坐圆满，如觉有帮助，欢迎随喜奉茶 →'
              : isEs
              ? '🪷 ¿Paz interior? Invita un té al autor →'
              : '🪷 Mindful calm — buy the creator a cup of tea →'}
          </Text>
        </TouchableOpacity>
      )}

      {/* 双轨环境音混音台弹窗 */}
      <Modal
        visible={showSoundPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSoundPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card, maxWidth: rs(360), maxHeight: '86%' }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {isZh ? '🎧 双轨氛围混音台' : isEs ? '🎧 Mezclador Ambiental' : '🎧 Dual Ambient Mixer'}
            </Text>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={{ fontSize: fs(11.5), fontWeight: '700', color: colors.textSecondary, marginBottom: vs(6) }}>
                {isZh ? '一键禅意预设' : isEs ? 'Preajustes Rápidos' : 'Quick Presets'}
                {!isProUnlocked ? ' (Pro 🔒)' : ''}
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: rs(6), marginBottom: vs(12) }}>
                {MIXER_PRESETS.map((preset) => (
                  <TouchableOpacity
                    key={preset.id}
                    style={{
                      paddingHorizontal: rs(10),
                      paddingVertical: vs(6),
                      borderRadius: rs(10),
                      borderWidth: 1,
                      borderColor: colors.primary + '55',
                      backgroundColor: colors.primary + '14',
                    }}
                    onPress={() => {
                      Haptics.selectionAsync();
                      if (!isProUnlocked) {
                        setShowSoundPicker(false);
                        openProStore(
                          isZh
                            ? '白噪音双轨混音台与禅意预设属于清修 Pro 订阅体验'
                            : isEs
                            ? 'Los preajustes duales requieren Guowu Pro.'
                            : 'Dual-track mixer presets require Guowu Pro.'
                        );
                        return;
                      }
                      setBackgroundSound(preset.soundA);
                      setSecondarySound(preset.soundB);
                      setPrimaryVolume(preset.volA);
                      setSecondaryVolume(preset.volB);
                      void persistMixer({ soundA: preset.soundA, soundB: preset.soundB, volA: preset.volA, volB: preset.volB });
                    }}
                  >
                    <Text style={{ fontSize: fs(11.5), fontWeight: '700', color: colors.primary }}>
                      {isZh ? preset.zh : isEs ? preset.es : preset.en}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={{ fontSize: fs(12), fontWeight: '800', color: colors.text, marginBottom: vs(6) }}>
                {isZh ? `主音轨 · 音量 ${Math.round(primaryVolume * 100)}%` : `Track A · Vol ${Math.round(primaryVolume * 100)}%`}
              </Text>
              <View style={{ flexDirection: 'row', gap: rs(6), marginBottom: vs(8) }}>
                {VOLUME_STEPS.map((vol) => (
                  <TouchableOpacity
                    key={`va-${vol}`}
                    style={{
                      flex: 1,
                      paddingVertical: vs(5),
                      borderRadius: rs(8),
                      alignItems: 'center',
                      backgroundColor: primaryVolume === vol ? colors.primary : colors.backgroundSecondary,
                    }}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setPrimaryVolume(vol);
                      void persistMixer({ volA: vol });
                    }}
                  >
                    <Text style={{ fontSize: fs(11), fontWeight: '700', color: primaryVolume === vol ? '#FFF' : colors.textSecondary }}>
                      {Math.round(vol * 100)}%
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              {(Object.keys(BACKGROUND_SOUNDS) as BackgroundSound[]).map((sound) => (
                <TouchableOpacity
                  key={`a-${sound}`}
                  style={[
                    styles.soundOption,
                    { backgroundColor: colors.backgroundSecondary, padding: rs(11), marginBottom: vs(5) },
                    backgroundSound === sound && { backgroundColor: colors.primary + '20' },
                  ]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setBackgroundSound(sound);
                    void persistMixer({ soundA: sound });
                  }}
                >
                  <Text style={[styles.soundOptionText, { color: colors.text, fontSize: fs(14) }]}>
                    {getSoundLabel(sound)}
                  </Text>
                  {backgroundSound === sound && (
                    <Text style={[styles.soundOptionCheck, { color: colors.primary }]}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}

              <Text style={{ fontSize: fs(12), fontWeight: '800', color: colors.text, marginTop: vs(10), marginBottom: vs(6) }}>
                {isZh ? `叠加副音轨 · 音量 ${Math.round(secondaryVolume * 100)}%` : `Layer B · Vol ${Math.round(secondaryVolume * 100)}%`}
                {!isProUnlocked ? ' (Pro 🔒)' : ''}
              </Text>
              <View style={{ flexDirection: 'row', gap: rs(6), marginBottom: vs(8) }}>
                {VOLUME_STEPS.map((vol) => (
                  <TouchableOpacity
                    key={`vb-${vol}`}
                    style={{
                      flex: 1,
                      paddingVertical: vs(5),
                      borderRadius: rs(8),
                      alignItems: 'center',
                      backgroundColor: secondaryVolume === vol ? colors.primary : colors.backgroundSecondary,
                    }}
                    onPress={() => {
                      Haptics.selectionAsync();
                      if (!isProUnlocked) {
                        setShowSoundPicker(false);
                        openProStore(
                          isZh
                            ? '白噪音双轨叠加与独立音量调节为清修 Pro 专属'
                            : 'Dual-track ambient sound mixer requires Guowu Pro.'
                        );
                        return;
                      }
                      setSecondaryVolume(vol);
                      void persistMixer({ volB: vol });
                    }}
                  >
                    <Text style={{ fontSize: fs(11), fontWeight: '700', color: secondaryVolume === vol ? '#FFF' : colors.textSecondary }}>
                      {Math.round(vol * 100)}%
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              {(Object.keys(BACKGROUND_SOUNDS) as BackgroundSound[]).map((sound) => (
                <TouchableOpacity
                  key={`b-${sound}`}
                  style={[
                    styles.soundOption,
                    { backgroundColor: colors.backgroundSecondary, padding: rs(11), marginBottom: vs(5) },
                    isProUnlocked && secondarySound === sound && { backgroundColor: colors.primary + '20' },
                  ]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    if (!isProUnlocked && sound !== 'none') {
                      setShowSoundPicker(false);
                      openProStore(
                        isZh
                          ? '白噪音双轨混音台（如雨声 + 虫鸣）为清修 Pro 专属体验'
                          : isEs
                          ? 'La segunda pista ambiental requiere Guowu Pro.'
                          : 'Dual-track ambient sound mixer requires Guowu Pro.'
                      );
                      return;
                    }
                    setSecondarySound(sound);
                    void persistMixer({ soundB: sound });
                  }}
                >
                  <Text style={[styles.soundOptionText, { color: colors.text, fontSize: fs(14) }]}>
                    {getSoundLabel(sound)}
                  </Text>
                  {isProUnlocked && secondarySound === sound && (
                    <Text style={[styles.soundOptionCheck, { color: colors.primary }]}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={[styles.modalCloseButton, { backgroundColor: colors.primary }]}
              onPress={() => setShowSoundPicker(false)}
            >
              <Text style={[styles.modalCloseButtonText, { color: '#FFFFFF' }]}>
                {isZh ? '完成混音' : isEs ? 'Listo' : 'Done'}
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
