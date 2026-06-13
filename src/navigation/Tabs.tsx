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
import { ChatDetailScreen } from '../screens/ChatDetailScreen';
import { ConversationsScreen } from '../screens/ConversationsScreen';
import { RetentionScreen } from '../screens/RetentionScreen';
import { TempleMapScreen } from '../screens/TempleMapScreen';
import { responsiveSize, fs, vs, rs, layout, responsive } from '../theme/responsive';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const TabNavigator = () => {
  const { t, colors, language } = useApp();
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          height: 90,
          paddingBottom: Platform.OS === 'ios' ? 20 : 45 + insets.bottom,
          paddingTop: 10,
        },
        tabBarActiveTintColor: colors.tabBarActive,
        tabBarInactiveTintColor: colors.tabBarInactive,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
        },
        tabBarIconStyle: {
          marginTop: 5,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: t.tabHome,
          tabBarIcon: ({ color }) => (
            <TabIcon name="🏠" color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Fasting"
        component={FastingScreen}
        options={{
          tabBarLabel: language === 'zh' ? '禁食' : language === 'es' ? 'Ayuno' : 'Fasting',
          tabBarIcon: ({ color }) => (
            <TabIcon name="⏰" color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Meditation"
        component={MeditationScreen}
        options={{
          tabBarLabel: language === 'zh' ? '打坐' : language === 'es' ? 'Meditación' : 'Meditation',
          tabBarIcon: ({ color }) => (
            <TabIcon name="🧘" color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="TempleMap"
        component={TempleMapScreen}
        options={{
          tabBarLabel: language === 'zh' ? '地图' : language === 'es' ? 'Mapa' : 'Map',
          tabBarIcon: ({ color }) => (
            <TabIcon name="🗺️" color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="LeaderboardTab"
        component={LeaderboardScreen}
        options={{
          tabBarLabel: language === 'zh' ? '排行' : language === 'es' ? 'Ranking' : 'Ranking',
          tabBarIcon: ({ color }) => (
            <TabIcon name="🏆" color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarLabel: t.tabSettings,
          tabBarIcon: ({ color }) => (
            <TabIcon name="⚙️" color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

const TabIcon = ({ name, color }: { name: string; color: string }) => {
  return (
    <Text style={{ fontSize: 24 }}>{name}</Text>
  );
};

export const AppNavigator = () => {
  const { t, colors, language } = useApp();

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
          name="ChatDetail"
          component={ChatDetailScreen as any}
          options={({ route }: any) => ({
            title: route.params?.nickname || (language === 'zh' ? '私信' : 'Message'),
          })}
        />
        <Stack.Screen
          name="Conversations"
          component={ConversationsScreen}
          options={{ title: language === 'zh' ? '私信' : 'Messages' }}
        />
        <Stack.Screen
          name="Retention"
          component={RetentionScreen as any}
          options={{ title: language === 'zh' ? '今日修行' : 'Daily Practice' }}
        />
        <Stack.Screen
          name="TempleMapDetail"
          component={TempleMapScreen as any}
          options={{ title: language === 'zh' ? '地图' : 'Map' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};
