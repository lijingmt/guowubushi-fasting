import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Image, Animated } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { getLocales } from 'expo-localization';
import { resolveDeviceLocale, type DeviceLocaleInput } from '../utils/locale';

function detectSplashLocale() {
  try {
    return resolveDeviceLocale(getLocales() as readonly DeviceLocaleInput[]);
  } catch {
    return resolveDeviceLocale(null);
  }
}

export const SplashScreen: React.FC<{ onFinished: () => void }> = ({ onFinished }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const { language } = detectSplashLocale();
  const isZh = language === 'zh' || language === 'zh-Hant';
  const isEs = language === 'es';

  useEffect(() => {
    // Fade in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();

    // Auto finish after 2 seconds
    const timer = setTimeout(() => {
      onFinished();
    }, 2000);

    return () => {
      clearTimeout(timer);
    };
  }, [onFinished]);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        <Image
          source={require('../../assets/brand_logo.jpg')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.title}>
          {language === 'zh-Hant' ? '過午不食' : isZh ? '过午不食' : isEs ? 'Guowu Ayuno' : 'Guowu Fasting'}
        </Text>
        {!isZh && (
          <Text style={styles.subtitle}>
            {isEs ? '过午不食 · Ayuno Circadiano Zen' : '过午不食 · Circadian Zen'}
          </Text>
        )}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  content: {
    alignItems: 'center',
  },
  logo: {
    width: 280,
    height: 100,
    marginBottom: 30,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    letterSpacing: 4,
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 16,
    color: '#AAAAAA',
    marginTop: 8,
    letterSpacing: 2,
  },
});
