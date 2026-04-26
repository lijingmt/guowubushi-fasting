import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { StatusBar } from 'expo-status-bar';

export const SplashScreen: React.FC<{ onFinished: () => void }> = ({ onFinished }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    console.log('=== SplashScreen: MOUNTED ===');

    // Fade in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start(() => {
      console.log('=== SplashScreen: FADE IN COMPLETE ===');
    });

    // Auto finish after 2 seconds
    const timer = setTimeout(() => {
      console.log('=== SplashScreen: CALLING ONFINISHED ===');
      onFinished();
    }, 2000);

    return () => {
      console.log('=== SplashScreen: UNMOUNTED ===');
      clearTimeout(timer);
    };
  }, [onFinished]);

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        <View style={styles.logoPlaceholder}>
          <Text style={styles.logoPlaceholderText}>视角晶晶</Text>
        </View>
        <Text style={styles.title}>过午不食</Text>
        <Text style={styles.subtitle}>视角晶晶出品</Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FDF6E3',
  },
  content: {
    alignItems: 'center',
  },
  logoPlaceholder: {
    width: 200,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E8DCC0',
    borderRadius: 12,
    marginBottom: 24,
  },
  logoPlaceholderText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#5D4E37',
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    letterSpacing: 4,
    color: '#5D4E37',
  },
  subtitle: {
    fontSize: 16,
    color: '#8B7355',
    marginTop: 8,
    letterSpacing: 2,
  },
});
