import React from 'react';
import { Text, View, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { HomeScreen } from '../screens/HomeScreen';
import { MealsScreen } from '../screens/MealsScreen';
import { StatsScreen } from '../screens/StatsScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { HistoryScreen } from '../screens/HistoryScreen';
import { FastingScreen } from '../screens/FastingScreen';
import { MeditationScreen } from '../screens/MeditationScreen';
import { FriendsScreen } from '../screens/FriendsScreen';
import { FriendDetailScreen } from '../screens/FriendDetailScreen';
import { LeaderboardScreen } from '../screens/LeaderboardScreen';
import { RetentionScreen } from '../screens/RetentionScreen';
import { TempleMapScreen } from '../screens/TempleMapScreen';
import { JourneyScreen } from '../screens/JourneyScreen';
import { SundialTabIcon, LotusTabIcon, MountainTabIcon, SealTabIcon } from '../components/TabIcons';
import { responsiveSize, fs, vs, rs, layout, responsive } from '../theme/responsive';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const TabNavigator = () => {
  const { t, colors, language } = useApp();
  const insets = useSafeAreaInsets();
  const isZh = language === 'zh' || language === 'zh-Hant';

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          height: Platform.OS === 'ios' ? 84 : 68 + insets.bottom,
          paddingBottom: Platform.OS === 'ios' ? 22 : Math.max(10, insets.bottom),
          paddingTop: 8,
        },
        tabBarActiveTintColor: colors.tabBarActive,
        tabBarInactiveTintColor: colors.tabBarInactive,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
        tabBarIconStyle: {
          marginTop: 2,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: isZh ? '今日' : language === 'es' ? 'Hoy' : 'Today',
          tabBarIcon: ({ color, focused }) => (
            <SundialTabIcon color={color} focused={focused} size={23} />
          ),
        }}
      />
      <Tab.Screen
        name="Meditation"
        component={MeditationScreen}
        options={{
          tabBarLabel: isZh ? '静心' : language === 'es' ? 'Calma' : 'Zen',
          tabBarIcon: ({ color, focused }) => (
            <LotusTabIcon color={color} focused={focused} size={23} />
          ),
        }}
      />
      <Tab.Screen
        name="Explore"
        component={JourneyScreen}
        options={{
          tabBarLabel: isZh ? '行脚' : language === 'es' ? 'Camino' : 'Journey',
          tabBarIcon: ({ color, focused }) => (
            <MountainTabIcon color={color} focused={focused} size={23} />
          ),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarLabel: isZh ? '我的' : language === 'es' ? 'Perfil' : 'Me',
          tabBarIcon: ({ color, focused }) => (
            <SealTabIcon color={color} focused={focused} size={23} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

export const AppNavigator = () => {
  const { t, colors, language } = useApp();
  const isZh = language === 'zh' || language === 'zh-Hant';

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: true,
          headerShadowVisible: false,
          headerStyle: { backgroundColor: colors.card },
          contentStyle: { backgroundColor: colors.background },
          headerTitleStyle: { fontSize: 18, fontWeight: '600', color: colors.text },
          headerTintColor: colors.primary,
        }}
      >
        <Stack.Screen
          name="Main"
          component={TabNavigator}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Stats"
          component={StatsScreen}
          options={{ title: t.statistics }}
        />
        <Stack.Screen
          name="History"
          component={HistoryScreen}
          options={{ title: t.checkInHistory }}
        />
        <Stack.Screen
          name="Meals"
          component={MealsScreen}
          options={{ title: t.meals }}
        />
        <Stack.Screen
          name="Friends"
          component={FriendsScreen}
          options={{ title: t.friendsTitle || 'Friends' }}
        />
        <Stack.Screen
          name="FriendDetail"
          component={FriendDetailScreen as any}
        />
        <Stack.Screen
          name="Leaderboard"
          component={LeaderboardScreen}
          options={{ title: '修行排行榜' }}
        />
        <Stack.Screen
          name="Retention"
          component={RetentionScreen as any}
          options={{ title: language === 'zh' ? '今日修行' : 'Daily Practice' }}
        />
        <Stack.Screen
          name="TempleMapDetail"
          component={TempleMapScreen as any}
          options={{ title: isZh ? '圣地行脚' : 'Pilgrimage Map' }}
        />
        <Stack.Screen
          name="Fasting"
          component={FastingScreen}
          options={{ title: isZh ? '单次轻断食' : language === 'es' ? 'Ayuno' : 'Fasting Timer' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};
