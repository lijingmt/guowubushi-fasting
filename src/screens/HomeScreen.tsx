import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Share } from 'react-native';
import { useApp } from '../context/AppContext';
import { Card } from '../components/Card';
import { StatCard } from '../components/StatCard';
import { CheckInCard } from '../components/CheckInCard';
import * as Haptics from 'expo-haptics';

export const HomeScreen: React.FC = () => {
  const {
    t,
    stats,
    todayWater,
    todayCalories,
    settings,
    addWater,
    hasCheckedToday,
    todayCheckIn,
  } = useApp();

  const [flameAnimation] = useState(false);

  const handleAddWater = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    addWater(250);
  };

  const handleShare = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const message = hasCheckedToday && todayCheckIn?.completed
      ? `🔥 我已连续${stats.currentStreak}天完成过午不食！\n累计完成${stats.completedDays}天，节省${stats.totalCaloriesSaved}卡路里\n\n一起来过午不食吧！`
      : `🔥 我正在坚持过午不食！\n已累计完成${stats.completedDays}天\n\n一起来过午不食吧！`;

    try {
      await Share.share({
        message: message,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  // 获取火焰emoji，根据连胜天数变化
  const getFlameEmoji = () => {
    if (stats.currentStreak >= 30) return '🔥🔥🔥';
    if (stats.currentStreak >= 14) return '🔥🔥';
    if (stats.currentStreak >= 7) return '🔥';
    if (stats.currentStreak >= 3) return '✨';
    return '💪';
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.greeting}>{t.welcome}</Text>
        <Text style={styles.subtitle}>{t.appName}</Text>
      </View>

      <CheckInCard />

      {/* 分享按钮 */}
      {hasCheckedToday && todayCheckIn?.completed && (
        <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
          <Text style={styles.shareButtonText}>📱 分享到朋友圈</Text>
        </TouchableOpacity>
      )}

      {/* 连胜统计卡片 */}
      <View style={styles.streakCard}>
        <Text style={styles.streakEmoji}>{getFlameEmoji()}</Text>
        <Text style={styles.streakTitle}>当前连胜</Text>
        <Text style={styles.streakCount}>{stats.currentStreak}</Text>
        <Text style={styles.streakLabel}>天</Text>
      </View>

      <View style={styles.statsRow}>
        <StatCard
          title={t.totalFastingDays}
          value={stats.completedDays}
          unit={t.days}
          icon="📅"
          colors={['#FF9800', '#F44336']}
        />
        <StatCard
          title={t.longestStreak}
          value={stats.longestStreak}
          unit={t.days}
          icon="🏆"
          colors={['#FFD700', '#FFA500']}
        />
      </View>

      <View style={styles.statsRow}>
        <StatCard
          title="节省卡路里"
          value={stats.totalCaloriesSaved}
          unit="kcal"
          icon="💪"
          colors={['#4CAF50', '#8BC34A']}
        />
        <StatCard
          title="少吃晚饭"
          value={stats.totalMealsSkipped}
          unit="顿"
          icon="🍽️"
          colors={['#2196F3', '#03A9F4']}
        />
      </View>

      <View style={styles.statsRow}>
        <StatCard
          title="最长禁欲"
          value={stats.longestAbstinenceStreak}
          unit="天"
          icon="🙏"
          colors={['#9C27B0', '#7B1FA2']}
        />
        <StatCard
          title="节约小时"
          value={stats.totalHoursSaved}
          unit="小时"
          icon="⏰"
          colors={['#FF9800', '#F57C00']}
        />
      </View>

      <Card style={styles.waterCard}>
        <View style={styles.waterHeader}>
          <Text style={styles.waterTitle}>{t.waterIntake}</Text>
          <Text style={styles.waterAmount}>
            {todayWater} <Text style={styles.waterUnit}>ml</Text>
          </Text>
        </View>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${Math.min((todayWater / 2000) * 100, 100)}%` },
            ]}
          />
        </View>
        <TouchableOpacity style={styles.waterButton} onPress={handleAddWater}>
          <Text style={styles.waterButtonText}>+ 250ml</Text>
        </TouchableOpacity>
      </Card>

      <Card style={styles.calorieCard}>
        <Text style={styles.calorieTitle}>{t.totalCalories}</Text>
        <Text style={styles.calorieAmount}>
          {todayCalories} <Text style={styles.calorieUnit}>/ {settings.dailyCalorieGoal} kcal</Text>
        </Text>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              styles.calorieProgress,
              { width: `${Math.min((todayCalories / settings.dailyCalorieGoal) * 100, 100)}%` },
            ]}
          />
        </View>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    marginBottom: 20,
  },
  greeting: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  shareButton: {
    backgroundColor: '#FF5722',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 16,
    shadowColor: '#FF5722',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  shareButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  streakCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  streakEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  streakTitle: {
    fontSize: 16,
    color: '#999',
    marginBottom: 8,
  },
  streakCount: {
    fontSize: 56,
    fontWeight: 'bold',
    color: '#FF5722',
  },
  streakLabel: {
    fontSize: 18,
    color: '#999',
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: 16,
  },
  waterCard: {
    marginTop: 16,
  },
  waterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  waterTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2196F3',
  },
  waterAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  waterUnit: {
    fontSize: 16,
    fontWeight: 'normal',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#2196F3',
    borderRadius: 4,
  },
  waterButton: {
    marginTop: 12,
    backgroundColor: '#2196F3',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  waterButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  calorieCard: {
    marginTop: 16,
  },
  calorieTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FF9800',
    marginBottom: 8,
  },
  calorieAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF9800',
  },
  calorieUnit: {
    fontSize: 16,
    fontWeight: 'normal',
  },
  calorieProgress: {
    backgroundColor: '#FF9800',
  },
});
