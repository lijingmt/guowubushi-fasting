import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { useApp } from '../context/AppContext';
import { isChineseLanguage } from '../utils/date';
import { CRAVING_TRIGGERS } from '../utils/cravingTide';
import type { CravingTrigger } from '../types';
import { fs, rs, vs } from '../theme/responsive';

interface HungerRescueModalProps {
  visible: boolean;
  onClose: () => void;
}

const TOTAL_SECONDS = 15 * 60;
const CYCLE_SECONDS = 14; // 4s inhale + 4s hold + 6s exhale

function getBreathPhase(secInCycle: number, isZh: boolean, isEs: boolean): string {
  if (secInCycle < 4) return isZh ? '缓吸 · 4秒' : isEs ? 'Inhala · 4s' : 'Inhale · 4s';
  if (secInCycle < 8) return isZh ? '屏息 · 4秒' : isEs ? 'Mantén · 4s' : 'Hold · 4s';
  return isZh ? '慢呼 · 6秒' : isEs ? 'Exhala · 6s' : 'Exhale · 6s';
}

/**
 * 「此刻想吃东西？」晚间抗饿急救工具箱：
 * 15 分钟饥饿波峰倒计时 + 4-4-6 正念呼吸 + 无缝雨声 + 磬音 + 一键饮温水 + 抗饿成就记录
 */
export const HungerRescueModal: React.FC<HungerRescueModalProps> = ({ visible, onClose }) => {
  const { language, addWater, recordHungerRescue, recordCravingEvent, hungerRescueCount, addPractice, openProStore } = useApp();
  const isZh = isChineseLanguage(language);
  const isEs = language === 'es';

  const [secondsLeft, setSecondsLeft] = useState(TOTAL_SECONDS);
  const [breathTick, setBreathTick] = useState(0);
  const [rainPlaying, setRainPlaying] = useState(false);
  const [waterAdded, setWaterAdded] = useState(false);
  const [selectedTrigger, setSelectedTrigger] = useState<CravingTrigger>('habit');
  const [hapticBreath, setHapticBreath] = useState(true);

  const rainSoundRef = useRef<Audio.Sound | null>(null);
  const bellSoundRef = useRef<Audio.Sound | null>(null);
  const breathScale = useRef(new Animated.Value(0.85)).current;

  const stopAllAudio = async () => {
    try {
      if (rainSoundRef.current) {
        await rainSoundRef.current.stopAsync().catch(() => {});
        await rainSoundRef.current.unloadAsync().catch(() => {});
        rainSoundRef.current = null;
      }
      if (bellSoundRef.current) {
        await bellSoundRef.current.unloadAsync().catch(() => {});
        bellSoundRef.current = null;
      }
    } catch {
      // ignore cleanup errors
    }
    setRainPlaying(false);
  };

  useEffect(() => {
    if (!visible) {
      void stopAllAudio();
      return;
    }

    setSecondsLeft(TOTAL_SECONDS);
    setBreathTick(0);
    setWaterAdded(false);

    const timer = setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
      setBreathTick((prev) => {
        const nextTick = prev + 1;
        if (hapticBreath) {
          const sec = nextTick % CYCLE_SECONDS;
          if (sec === 0 || sec === 2) {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          } else if (sec === 4) {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          } else if (sec === 8 || sec === 11) {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
          }
        }
        return nextTick;
      });
    }, 1000);

    const breathLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(breathScale, { toValue: 1.18, duration: 4000, useNativeDriver: true }),
        Animated.delay(4000),
        Animated.timing(breathScale, { toValue: 0.85, duration: 6000, useNativeDriver: true }),
      ])
    );
    breathLoop.start();

    return () => {
      clearInterval(timer);
      breathLoop.stop();
      void stopAllAudio();
    };
  }, [visible, breathScale, hapticBreath]);

  const toggleRainSound = async () => {
    Haptics.selectionAsync();
    if (rainPlaying) {
      await stopAllAudio();
      return;
    }
    try {
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
      const { sound } = await Audio.Sound.createAsync(
        require('../../assets/sounds/rain.mp3'),
        { isLooping: true, shouldPlay: true, volume: 0.45 }
      );
      rainSoundRef.current = sound;
      setRainPlaying(true);
    } catch {
      setRainPlaying(false);
    }
  };

  const playBell = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      if (bellSoundRef.current) {
        await bellSoundRef.current.unloadAsync().catch(() => {});
      }
      const { sound } = await Audio.Sound.createAsync(
        require('../../assets/sounds/temple_bell.mp3'),
        { shouldPlay: true, volume: 0.5 }
      );
      bellSoundRef.current = sound;
    } catch {
      // ignore
    }
  };

  const handleDrinkWater = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await addWater(250);
    setWaterAdded(true);
  };

  const handleOvercameCraving = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const nextCount = await recordHungerRescue();
    const durationSec = Math.max(0, TOTAL_SECONDS - secondsLeft);
    await recordCravingEvent({
      trigger: selectedTrigger,
      survived: true,
      durationSec,
    });
    const elapsedMin = Math.floor(durationSec / 60);
    if (elapsedMin >= 3) {
      await addPractice('meditation', elapsedMin, 'single_leg');
    }
    await stopAllAudio();
    onClose();
    Alert.alert(
      isZh ? '🪷 念起即觉 · 成功稳住' : isEs ? '🪷 ¡Antojo Superado!' : 'Craving Surfed!',
      isZh
        ? `你又熬过了一轮饥饿波峰！已累计成功抗饿 ${nextCount} 次，本次触发源已绘入「十二时辰欲念潮汐」。`
        : isEs
        ? `¡Pasaste otra ola de hambre! Total superadas: ${nextCount}.`
        : `Another hunger wave passed! Total rescues: ${nextCount}. Logged to your 12-Shichen Craving Tide.`
    );
  };

  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const progress = 1 - secondsLeft / TOTAL_SECONDS;
  const size = rs(164);
  const strokeWidth = rs(9);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - progress);
  const phaseLabel = getBreathPhase(breathTick % CYCLE_SECONDS, isZh, isEs);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.topRow}>
            <Text style={styles.badge}>
              {isZh
                ? `饥饿波峰急救 · 已成功 ${hungerRescueCount} 次`
                : isEs
                ? `Rescate de Antojo · ${hungerRescueCount} logrados`
                : `Craving Rescue · ${hungerRescueCount} won`}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.title}>
            {isZh ? '先停 15 分钟，欲望会自动退潮' : isEs ? 'Pausa 15 Min · El Antojo Pasa Solo' : 'Pause 15 Min · Urges Naturally Fade'}
          </Text>
          <Text style={styles.subtitle}>
            {isZh
              ? '饥饿素（Ghrelin）峰值通常只持续 10–15 分钟，喝一杯温水、跟呼吸 4-4-6 走几轮，渴望就会消散。'
              : isEs
              ? 'Las olas de grelina suelen bajar en 10–15 minutos. Bebe agua tibia y sigue la respiración 4-4-6.'
              : 'Hunger hormone waves peak and fade within 10–15 minutes. Sip warm water and follow the 4-4-6 breath.'}
          </Text>

          <View style={styles.ringWrapper}>
            <Animated.View style={[styles.halo, { transform: [{ scale: breathScale }] }]} />
            <Svg width={size} height={size}>
              <Circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke="#294038"
                strokeWidth={strokeWidth}
                fill="none"
              />
              <Circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke="#C68B33"
                strokeWidth={strokeWidth}
                fill="none"
                strokeDasharray={`${circumference}`}
                strokeDashoffset={dashOffset}
                strokeLinecap="round"
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
              />
            </Svg>
            <View style={styles.ringCenter}>
              <Text style={styles.countdownText}>
                {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
              </Text>
              <Text style={styles.breathText}>{phaseLabel}</Text>
            </View>
          </View>

          <View style={styles.triggerSection}>
            <Text style={styles.triggerHeading}>
              {isZh ? '觉察念头（一键标记原因）' : isEs ? '¿Qué detonó el antojo?' : 'Spot the trigger'}
            </Text>
            <View style={styles.triggerRow}>
              {CRAVING_TRIGGERS.map((tr) => {
                const active = selectedTrigger === tr.id;
                return (
                  <TouchableOpacity
                    key={tr.id}
                    style={[styles.triggerChip, active && styles.triggerChipActive]}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setSelectedTrigger(tr.id);
                    }}
                  >
                    <Text style={[styles.triggerText, active && styles.triggerTextActive]}>
                      {tr.icon} {isZh ? tr.zh : isEs ? tr.es : tr.en}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.toolsRow}>
            <TouchableOpacity
              style={[styles.toolBtn, rainPlaying && styles.toolBtnActive]}
              onPress={toggleRainSound}
            >
              <Text style={styles.toolBtnText}>
                {rainPlaying
                  ? isZh ? '🌧️ 停止雨声' : isEs ? '🌧️ Lluvia Off' : '🌧️ Rain Off'
                  : isZh ? '🌧️ 听雨声' : isEs ? '🌧️ Lluvia' : '🌧️ Rain'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toolBtn, hapticBreath && styles.toolBtnActive]}
              onPress={() => {
                Haptics.selectionAsync();
                setHapticBreath((prev) => !prev);
              }}
            >
              <Text style={styles.toolBtnText}>
                {isZh ? (hapticBreath ? '🪷 闭眼触振开' : '🪷 闭眼触振关') : isEs ? '🪷 Vibración' : '🪷 Haptic Guide'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.toolBtn} onPress={playBell}>
              <Text style={styles.toolBtnText}>
                {isZh ? '🔔 一磬' : '🔔 Bell'}
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.waterBtn, waterAdded && styles.waterBtnDone]}
            onPress={handleDrinkWater}
            disabled={waterAdded}
          >
            <Text style={styles.waterBtnText}>
              {waterAdded
                ? isZh ? '✓ 已记录 +250ml 温水' : isEs ? '✓ +250 ml Registrados' : '✓ Logged +250ml Water'
                : isZh ? '💧 先喝一杯温水 (+250ml)' : isEs ? '💧 Beber Agua Tibia (+250 ml)' : '💧 Drink Warm Water (+250ml)'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.winBtn} onPress={handleOvercameCraving}>
            <Text style={styles.winBtnText}>
              {isZh ? '🪷 我稳住了！（完成本轮急救）' : isEs ? '🪷 ¡Antojo Superado! (Registrar)' : '🪷 Craving Passed! (Log Win)'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{ marginTop: vs(10), paddingVertical: vs(4) }}
            onPress={() => {
              Haptics.selectionAsync();
              void stopAllAudio();
              onClose();
              openProStore();
            }}
          >
            <Text style={{ fontSize: fs(11.5), color: '#D4B475', textAlign: 'center', fontWeight: '600' }}>
              {isZh
                ? '如觉有帮助，欢迎随喜请作者喝杯清茶 →'
                : isEs
                ? '¿Te ayudó? Invita un té al autor →'
                : 'Helpful? Buy the indie developer a cup of tea →'}
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
    backgroundColor: 'rgba(13, 20, 18, 0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: rs(18),
  },
  card: {
    width: '100%',
    maxWidth: rs(380),
    backgroundColor: '#162420',
    borderRadius: rs(24),
    borderWidth: 1,
    borderColor: '#2E463E',
    padding: rs(20),
    alignItems: 'center',
  },
  topRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: vs(10),
  },
  badge: {
    fontSize: fs(11),
    fontWeight: '700',
    color: '#E0A84E',
    backgroundColor: '#E0A84E20',
    paddingHorizontal: rs(10),
    paddingVertical: vs(4),
    borderRadius: rs(10),
  },
  closeBtn: {
    width: rs(30),
    height: rs(30),
    borderRadius: rs(15),
    backgroundColor: '#243831',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    color: '#C7D3CD',
    fontSize: fs(14),
    fontWeight: '700',
  },
  title: {
    fontSize: fs(19),
    fontWeight: '800',
    color: '#F6F2E9',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: fs(12),
    lineHeight: fs(18),
    color: '#A8B8B0',
    textAlign: 'center',
    marginTop: vs(6),
    marginBottom: vs(16),
  },
  ringWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: vs(18),
  },
  halo: {
    position: 'absolute',
    width: rs(142),
    height: rs(142),
    borderRadius: rs(71),
    backgroundColor: '#52A3821A',
    borderWidth: 1,
    borderColor: '#52A38244',
  },
  ringCenter: {
    position: 'absolute',
    alignItems: 'center',
  },
  countdownText: {
    fontSize: fs(30),
    fontWeight: '900',
    color: '#F6F2E9',
  },
  breathText: {
    fontSize: fs(13),
    fontWeight: '700',
    color: '#73BC9E',
    marginTop: vs(4),
  },
  triggerSection: {
    width: '100%',
    marginBottom: vs(10),
  },
  triggerHeading: {
    fontSize: fs(11),
    fontWeight: '700',
    color: '#A8B8B0',
    marginBottom: vs(6),
    textAlign: 'center',
  },
  triggerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: rs(6),
    justifyContent: 'center',
  },
  triggerChip: {
    paddingHorizontal: rs(9),
    paddingVertical: vs(5),
    borderRadius: rs(10),
    backgroundColor: '#20332D',
    borderWidth: 1,
    borderColor: '#345047',
  },
  triggerChipActive: {
    backgroundColor: '#C68B3330',
    borderColor: '#E0A84E',
  },
  triggerText: {
    fontSize: fs(11),
    fontWeight: '700',
    color: '#C7D3CD',
  },
  triggerTextActive: {
    color: '#FFE3B0',
  },
  toolsRow: {
    flexDirection: 'row',
    gap: rs(10),
    width: '100%',
    marginBottom: vs(10),
  },
  toolBtn: {
    flex: 1,
    backgroundColor: '#223630',
    borderWidth: 1,
    borderColor: '#365249',
    borderRadius: rs(12),
    paddingVertical: vs(11),
    alignItems: 'center',
  },
  toolBtnActive: {
    backgroundColor: '#265947',
    borderColor: '#73BC9E',
  },
  toolBtnText: {
    color: '#EFE9DC',
    fontSize: fs(12),
    fontWeight: '700',
  },
  waterBtn: {
    width: '100%',
    backgroundColor: '#2B4A59',
    borderRadius: rs(12),
    paddingVertical: vs(12),
    alignItems: 'center',
    marginBottom: vs(10),
  },
  waterBtnDone: {
    backgroundColor: '#265947',
  },
  waterBtnText: {
    color: '#FFFFFF',
    fontSize: fs(13),
    fontWeight: '700',
  },
  winBtn: {
    width: '100%',
    backgroundColor: '#C68B33',
    borderRadius: rs(14),
    paddingVertical: vs(14),
    alignItems: 'center',
  },
  winBtnText: {
    color: '#FFFFFF',
    fontSize: fs(15),
    fontWeight: '800',
  },
});
