import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface MeditationAnimationProps {
  soundType: 'rain' | 'ocean' | 'insects' | 'birds';
  color?: string;
}

// 雨滴动画组件
const RainDrop = ({ index, color }: { index: number; color?: string }) => {
  const translateY = useSharedValue(-50);
  const opacity = useSharedValue(0);

  useEffect(() => {
    const delay = index * 200;
    const duration = 1000 + Math.random() * 500;

    setTimeout(() => {
      opacity.value = withTiming(1, { duration: 300 });
      translateY.value = withRepeat(
        withTiming(SCREEN_HEIGHT + 50, {
          duration,
          easing: Easing.linear,
        }),
        -1,
        false
      );
    }, delay);
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.rainDrop,
        {
          left: `${10 + (index * 7) % 80}%`,
          width: 2,
          height: 20 + Math.random() * 15,
        },
        animatedStyle,
      ]}
    />
  );
};

// 海浪动画组件
const OceanWave = ({ index, color }: { index: number; color?: string }) => {
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);

  useEffect(() => {
    const duration = 2000 + index * 300;

    translateY.value = withRepeat(
      withSequence(
        withTiming(-10, { duration: duration / 2, easing: Easing.inOut(Easing.ease) }),
        withTiming(10, { duration: duration / 2, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );

    scale.value = withRepeat(
      withSequence(
        withTiming(1.02, { duration: duration / 2, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.98, { duration: duration / 2, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
  }));

  return (
    <Animated.View
      style={[
        styles.wave,
        {
          backgroundColor: color || 'rgba(102, 126, 234, 0.15)',
          bottom: 50 + index * 30,
        },
        animatedStyle,
      ]}
    />
  );
};

// 萤火虫动画组件（虫鸣）
const Firefly = ({ index }: { index: number }) => {
  const x = useSharedValue(Math.random() * SCREEN_WIDTH);
  const y = useSharedValue(100 + Math.random() * 200);
  const opacity = useSharedValue(0.3);
  const scale = useSharedValue(0.5);

  useEffect(() => {
    const moveDuration = 3000 + Math.random() * 2000;
    const glowDuration = 1500 + Math.random() * 1000;

    // 移动动画
    x.value = withRepeat(
      withSequence(
        withTiming(Math.random() * SCREEN_WIDTH, { duration: moveDuration, easing: Easing.inOut(Easing.ease) }),
        withTiming(Math.random() * SCREEN_WIDTH, { duration: moveDuration, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );

    y.value = withRepeat(
      withSequence(
        withTiming(100 + Math.random() * 200, { duration: moveDuration, easing: Easing.inOut(Easing.ease) }),
        withTiming(100 + Math.random() * 200, { duration: moveDuration, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );

    // 闪烁动画
    opacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: glowDuration / 2, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.2, { duration: glowDuration / 2, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );

    scale.value = withRepeat(
      withSequence(
        withTiming(1, { duration: glowDuration / 2, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.5, { duration: glowDuration / 2, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }, { translateY: y.value }, { scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.firefly,
        animatedStyle,
      ]}
    />
  );
};

export const MeditationAnimation: React.FC<MeditationAnimationProps> = ({ soundType, color }) => {
  if (soundType === 'rain') {
    return (
      <View style={styles.container}>
        {Array.from({ length: 20 }).map((_, i) => (
          <RainDrop key={i} index={i} color={color} />
        ))}
      </View>
    );
  }

  if (soundType === 'ocean') {
    return (
      <View style={styles.container}>
        {Array.from({ length: 5 }).map((_, i) => (
          <OceanWave key={i} index={i} color={color} />
        ))}
      </View>
    );
  }

  if (soundType === 'insects') {
    return (
      <View style={styles.container}>
        {Array.from({ length: 15 }).map((_, i) => (
          <Firefly key={i} index={i} />
        ))}
      </View>
    );
  }

  // 鸟鸣 - 无动画，只播放声音
  if (soundType === 'birds') {
    return null;
  }

  return null;
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
    pointerEvents: 'none',
  },
  rainDrop: {
    position: 'absolute',
    backgroundColor: 'rgba(150, 200, 255, 0.6)',
    borderRadius: 1,
  },
  wave: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 80,
    borderRadius: 100,
  },
  firefly: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFD700',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 4,
  },
});
