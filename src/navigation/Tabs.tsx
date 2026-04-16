import React from 'react';
import { Text, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useApp } from '../context/AppContext';
import { HomeScreen } from '../screens/HomeScreen';
import { MealsScreen } from '../screens/MealsScreen';
import { StatsScreen } from '../screens/StatsScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { HistoryScreen } from '../screens/HistoryScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const TabNavigator = () => {
  const { t, colors } = useApp();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          height: 70,
          paddingBottom: 5,
          paddingTop: 10,
        },
        tabBarActiveTintColor: colors.tabBarActive,
        tabBarInactiveTintColor: colors.tabBarInactive,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
          marginTop: 2,
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
        name="History"
        component={HistoryScreen}
        options={{
          tabBarLabel: t.viewHistory,
          tabBarIcon: ({ color }) => (
            <TabIcon name="📅" color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Meals"
        component={MealsScreen}
        options={{
          tabBarLabel: t.tabMeals,
          tabBarIcon: ({ color }) => (
            <TabIcon name="🍽️" color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Stats"
        component={StatsScreen}
        options={{
          tabBarLabel: t.tabStats,
          tabBarIcon: ({ color }) => (
            <TabIcon name="📊" color={color} />
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
    <View style={{ alignItems: 'center' }}>
      <Text style={{ fontSize: 24 }}>{name}</Text>
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
