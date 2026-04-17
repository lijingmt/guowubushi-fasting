import React from 'react';
import { Text, View, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useApp } from '../context/AppContext';
import { HomeScreen } from '../screens/HomeScreen';
import { MealsScreen } from '../screens/MealsScreen';
import { StatsScreen } from '../screens/StatsScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { HistoryScreen } from '../screens/HistoryScreen';
import { responsiveSize, fs, vs, rs, layout, responsive } from '../theme/responsive';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const TabNavigator = () => {
  const { t, colors } = useApp();

  // 响应式Tab高度
  const tabBarHeight = responsive({
    small: 60,
    medium: 65,
    large: 70,
    tablet: 80,
    default: 70,
  });

  // 响应式图标大小
  const iconSize = responsive({
    small: fs(20),
    tablet: fs(28),
    default: fs(24),
  });

  // 响应式标签字体大小
  const labelFontSize = responsive({
    small: fs(10),
    tablet: fs(14),
    default: fs(11),
  });

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          height: tabBarHeight,
          paddingBottom: Platform.OS === 'ios' ? vs(5) : vs(8),
          paddingTop: vs(10),
        },
        tabBarActiveTintColor: colors.tabBarActive,
        tabBarInactiveTintColor: colors.tabBarInactive,
        tabBarLabelStyle: {
          fontSize: labelFontSize,
          fontWeight: '500',
          marginTop: vs(2),
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: t.tabHome,
          tabBarIcon: ({ color }) => (
            <TabIcon name="🏠" color={color} size={iconSize} />
          ),
        }}
      />
      <Tab.Screen
        name="History"
        component={HistoryScreen}
        options={{
          tabBarLabel: t.viewHistory,
          tabBarIcon: ({ color }) => (
            <TabIcon name="📅" color={color} size={iconSize} />
          ),
        }}
      />
      <Tab.Screen
        name="Meals"
        component={MealsScreen}
        options={{
          tabBarLabel: t.tabMeals,
          tabBarIcon: ({ color }) => (
            <TabIcon name="🍽️" color={color} size={iconSize} />
          ),
        }}
      />
      <Tab.Screen
        name="Stats"
        component={StatsScreen}
        options={{
          tabBarLabel: t.tabStats,
          tabBarIcon: ({ color }) => (
            <TabIcon name="📊" color={color} size={iconSize} />
          ),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarLabel: t.tabSettings,
          tabBarIcon: ({ color }) => (
            <TabIcon name="⚙️" color={color} size={iconSize} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

const TabIcon = ({ name, color, size }: { name: string; color: string; size: number }) => {
  return (
    <View style={{ alignItems: 'center' }}>
      <Text style={{ fontSize: size }}>{name}</Text>
    </View>
  );
};

export const AppNavigator = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Main" component={TabNavigator} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};
