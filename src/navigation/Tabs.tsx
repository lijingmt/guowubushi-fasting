import React from 'react';
import { Text, View, Platform, TouchableOpacity, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator, type NativeStackHeaderProps } from '@react-navigation/native-stack';
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
import { QiZhengScreen } from '../screens/QiZhengScreen';
import { SundialTabIcon, LotusTabIcon, MountainTabIcon, SealTabIcon } from '../components/TabIcons';
import { responsiveSize, fs, vs, rs, layout, responsive, useResponsiveLayout } from '../theme/responsive';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const TabNavigator = () => {
  const { t, colors, language } = useApp();
  const insets = useSafeAreaInsets();
  const rl = useResponsiveLayout();
  const isZh = language === 'zh' || language === 'zh-Hant';
  const baseHeight = rl.isCompactHeight ? 54 : 60;
  const bottomPad = Math.max(insets.bottom, Platform.OS === 'ios' ? (rl.isCompactHeight ? 8 : 18) : 10);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          height: baseHeight + bottomPad,
          paddingBottom: bottomPad,
          paddingTop: rl.isCompactHeight ? 6 : 8,
          paddingHorizontal: rl.isDualColumn ? Math.max(24, Math.floor((rl.width - 720) / 2)) : 0,
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

const CustomStackHeader: React.FC<NativeStackHeaderProps> = ({
  navigation,
  route,
  options,
  back,
}) => {
  const { colors, language } = useApp();
  const insets = useSafeAreaInsets();
  const rl = useResponsiveLayout();
  const isZh = language === 'zh' || language === 'zh-Hant';
  const backLabel = isZh ? '‹ 返回' : language === 'es' ? '‹ Atrás' : '‹ Back';
  const titleText =
    typeof options.headerTitle === 'string'
      ? options.headerTitle
      : options.title ?? route.name;
  const barHeight = rl.isCompactHeight ? 44 : 48;
  const canReturn = Boolean(back) || navigation.canGoBack();

  return (
    <View
      style={{
        paddingTop: insets.top,
        backgroundColor: colors.card,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: colors.divider,
      }}
    >
      <View
        style={{
          height: barHeight,
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 8,
        }}
      >
        <View style={{ width: 82, alignItems: 'flex-start', justifyContent: 'center' }}>
          {canReturn && (
            <TouchableOpacity
              onPress={() => {
                if (navigation.canGoBack()) {
                  navigation.goBack();
                } else {
                  navigation.navigate('Main' as never);
                }
              }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 16 }}
              activeOpacity={0.65}
              style={{
                height: 40,
                paddingHorizontal: 8,
                justifyContent: 'center',
                alignItems: 'flex-start',
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: '600', color: colors.primary }}>
                {backLabel}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <Text
          numberOfLines={1}
          style={{
            flex: 1,
            textAlign: 'center',
            fontSize: 17,
            fontWeight: '700',
            color: colors.text,
          }}
        >
          {titleText}
        </Text>

        <View style={{ width: 82 }} />
      </View>
    </View>
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
          gestureEnabled: true,
          fullScreenGestureEnabled: true,
          header: (props) => <CustomStackHeader {...props} />,
          contentStyle: { backgroundColor: colors.background },
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
        <Stack.Screen
          name="QiZheng"
          component={QiZhengScreen}
          options={{ title: isZh ? '七政流注 · 24h' : '7 Luminaries 24h' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};
