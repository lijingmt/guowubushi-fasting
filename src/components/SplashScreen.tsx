import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Image, Animated } from 'react-native';
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
      <StatusBar style="light" />
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        <Image
          source={require('../../assets/brand_logo.jpg')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.title}>过午不食</Text>
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
