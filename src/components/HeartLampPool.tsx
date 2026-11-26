import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { useApp } from '../context/AppContext';
import { useSocial } from '../context/SocialContext';
import type { SilentGestureType } from '../types';
import { fs, rs, vs } from '../theme/responsive';

const SESSIONS = [
  { hour: 6, minute: 0, zh: '晨修', en: 'Dawn Sit' },
  { hour: 12, minute: 30, zh: '午息', en: 'Noon Pause' },
  { hour: 21, minute: 0, zh: '晚静', en: 'Night Calm' },
];

function getNextCollectiveSession(now: Date): { zh: string; en: string; remainMinutes: number } {
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  for (const s of SESSIONS) {
    const target = s.hour * 60 + s.minute;
    if (target >= nowMinutes) {
      return { zh: s.zh, en: s.en, remainMinutes: target - nowMinutes };
    }
  }
  const first = SESSIONS[0];
  return {
    zh: first.zh,
    en: first.en,
    remainMinutes: 24 * 60 - nowMinutes + first.hour * 60 + first.minute,
  };
}

/**
 * 「星火心灯」无言同频共修池：无自由文本输入，仅有「合十」「点心灯」「敲磬」三种轻触善意手势
 */
export const HeartLampPool: React.FC = () => {
  const { colors, language } = useApp();
  const { onlineUsers, onlineCount, silentRoomCounts, recentSilentGestures, sendSilentGesture } = useSocial();
  const [lastGestureHint, setLastGestureHint] = useState<string>('');
  const [now, setNow] = useState(() => new Date());
  const pulseAnim = useRef(new Animated.Value(0.65)).current;

  const isZh = language === 'zh' || language === 'zh-Hant';

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 1800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.6, duration: 1800, useNativeDriver: true }),
      ])
    );
    loop.start();
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => {
      loop.stop();
      clearInterval(timer);
    };
  }, [pulseAnim]);

  const nextSession = getNextCollectiveSession(now);
  const remainH = Math.floor(nextSession.remainMinutes / 60);
  const remainM = nextSession.remainMinutes % 60;

  const lamps = useMemo(() => {
    const count = Math.max(5, Math.min(18, onlineCount || onlineUsers.length || 5));
    return Array.from({ length: count }).map((_, idx) => {
      const angle = (idx / count) * Math.PI * 2;
      const rx = 28 + (idx % 3) * 14;
      const ry = 18 + ((idx + 1) % 3) * 10;
      const cx = 140 + Math.cos(angle) * rx * 1.45;
      const cy = 54 + Math.sin(angle) * ry;
      const user = onlineUsers[idx];
      return { key: user?.id || `lamp_${idx}`, cx, cy, isLive: idx < onlineCount };
    });
  }, [onlineCount, onlineUsers]);

  const triggerGesture = (gesture: SilentGestureType, labelZh: string, labelEn: string) => {
    Haptics.impactAsync(
      gesture === 'bell' ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light
    );
    sendSilentGesture(gesture);
    setLastGestureHint(isZh ? `已${labelZh} · 与同修共鸣` : `${labelEn} sent`);
  };

  const latestEvent = recentSilentGestures[0];

  return (
    <View style={[styles.container, { backgroundColor: '#162420', borderColor: '#2B3E37' }]}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>{isZh ? '无言同频共修' : 'Silent Practice Pool'}</Text>
          <Text style={styles.subTitle}>
            {isZh
              ? `${Math.max(1, onlineCount)} 位同修在线 · 下场${nextSession.zh} ${remainH}h${String(remainM).padStart(2, '0')}m 后`
              : `${Math.max(1, onlineCount)} online · Next ${nextSession.en} in ${remainH}h ${remainM}m`}
          </Text>
        </View>
      </View>

      <Animated.View style={[styles.pondCanvas, { opacity: pulseAnim }]}>
        <Svg width="100%" height={108} viewBox="0 0 280 108">
          <Path d="M25 86 Q140 72 255 86" stroke="#2F594C" strokeWidth={1.2} fill="none" />
          <Path d="M55 96 Q140 85 225 96" stroke="#26473D" strokeWidth={1} fill="none" />
          {lamps.map((lamp) => (
            <React.Fragment key={lamp.key}>
              <Circle
                cx={lamp.cx}
                cy={lamp.cy}
                r={lamp.isLive ? 7 : 4.5}
                fill={lamp.isLive ? '#F2C14E33' : '#73BC9E22'}
              />
              <Circle
                cx={lamp.cx}
                cy={lamp.cy}
                r={lamp.isLive ? 3 : 2}
                fill={lamp.isLive ? '#F6D167' : '#8AD0B4'}
              />
            </React.Fragment>
          ))}
        </Svg>
      </Animated.View>

      <View style={styles.gesturesRow}>
        <TouchableOpacity
          style={styles.gestureBtn}
          onPress={() => triggerGesture('bow', '合十致意', 'Bow')}
        >
          <Text style={styles.gestureText}>🙏 {isZh ? '合十' : 'Bow'} · {silentRoomCounts.bow}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.gestureBtn}
          onPress={() => triggerGesture('lamp', '点一盏灯', 'Lamp')}
        >
          <Text style={styles.gestureText}>🏮 {isZh ? '点灯' : 'Lamp'} · {silentRoomCounts.lamp}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.gestureBtn}
          onPress={() => triggerGesture('bell', '轻敲一磬', 'Bell')}
        >
          <Text style={styles.gestureText}>🔔 {isZh ? '敲磬' : 'Bell'} · {silentRoomCounts.bell}</Text>
        </TouchableOpacity>
      </View>

      {(lastGestureHint || latestEvent) && (
        <Text style={[styles.hintText, { color: colors.primaryLight }]}>
          {lastGestureHint ||
            (latestEvent
              ? isZh
                ? `${latestEvent.nickname || '同修'} 刚刚点亮一份善意`
                : `${latestEvent.nickname || 'Practitioner'} shared a quiet gesture`
              : '')}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: rs(18),
    borderWidth: 1,
    padding: rs(16),
    marginTop: vs(12),
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: fs(16),
    fontWeight: '800',
    color: '#F3EFE4',
  },
  subTitle: {
    fontSize: fs(12),
    color: '#9CB3A8',
    marginTop: vs(2),
  },
  pondCanvas: {
    marginVertical: vs(8),
    alignItems: 'center',
  },
  gesturesRow: {
    flexDirection: 'row',
    gap: rs(8),
  },
  gestureBtn: {
    flex: 1,
    backgroundColor: '#233630',
    borderWidth: 1,
    borderColor: '#355047',
    borderRadius: rs(12),
    paddingVertical: vs(9),
    alignItems: 'center',
  },
  gestureText: {
    color: '#EAE5D7',
    fontSize: fs(12),
    fontWeight: '700',
  },
  hintText: {
    marginTop: vs(8),
    fontSize: fs(11),
    textAlign: 'center',
  },
});
