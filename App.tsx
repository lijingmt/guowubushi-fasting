import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { View, ActivityIndicator } from 'react-native';
import { AppProvider, useApp } from './src/context/AppContext';
import { AppNavigator } from './src/navigation/Tabs';
import { WelcomeScreen, checkTermsAgreed } from './src/components/WelcomeScreen';
import { SplashScreen } from './src/components/SplashScreen';

// 开发模式：加载模拟数据脚本
if (__DEV__) {
  import('./scripts/mockData');
}

// 内部组件：处理欢迎页面的显示逻辑
const AppContent: React.FC = () => {
  const { colors, language, isLoading } = useApp();
  const [showSplash, setShowSplash] = useState(true);
  const [showWelcome, setShowWelcome] = useState<boolean | null>(null);

  useEffect(() => {
    console.log('AppContent: mounted, checking welcome status');
    checkWelcomeStatus();
  }, []);

  const checkWelcomeStatus = async () => {
    const agreed = await checkTermsAgreed();
    console.log('AppContent: terms agreed =', agreed);
    setShowWelcome(!agreed);
  };

  console.log('AppContent: render, showSplash =', showSplash, 'isLoading =', isLoading, 'showWelcome =', showWelcome);

  // 显示启动画面
  if (showSplash) {
    console.log('AppContent: rendering SplashScreen');
    return <SplashScreen onFinished={() => {
      console.log('AppContent: splash finished');
      setShowSplash(false);
    }} />;
  }

  // 等待初始化完成
  if (isLoading || showWelcome === null) {
    console.log('AppContent: rendering loading spinner');
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // 显示欢迎页面
  if (showWelcome) {
    console.log('AppContent: rendering WelcomeScreen');
    return <WelcomeScreen colors={colors} language={language} onDismiss={() => setShowWelcome(false)} />;
  }

  // 显示主应用
  console.log('AppContent: rendering AppNavigator');
  return <AppNavigator />;
};

export default function App() {
  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <AppProvider>
          <AppContent />
          <StatusBar style="auto" />
        </AppProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
