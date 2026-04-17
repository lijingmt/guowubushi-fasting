import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Share, Alert, Clipboard } from 'react-native';
import { useApp } from '../context/AppContext';
import { Card } from '../components/Card';
import { StatCard } from '../components/StatCard';
import { CheckInCard } from '../components/CheckInCard';
import * as Haptics from 'expo-haptics';
import { responsiveSize, fs, rs, vs, layout, responsive } from '../theme/responsive';

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
    colors,
  } = useApp();

  const [flameAnimation] = useState(false);

  const handleAddWater = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    addWater(250);
  };

  const handleShare = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const getMessage = () => {
      if (hasCheckedToday && todayCheckIn?.completed) {
        return t.shareMessage1
          .replace('{{streak}}', stats.currentStreak.toString())
          .replace('{{days}}', stats.completedDays.toString())
          .replace('{{calories}}', stats.totalCaloriesSaved.toString());
      }
      return t.shareMessage2.replace('{{days}}', stats.completedDays.toString());
    };

    const shareMessage = `🔥 ${getMessage()}`;

    try {
      // Try sharing without URL for better WeChat compatibility
      const result = await Share.share({
        message: shareMessage,
      });

      // If sharing was dismissed, offer to copy to clipboard
      if (result.action === Share.dismissedAction) {
        // Automatically copy to clipboard when dismissed
        await Clipboard.setString(shareMessage);
        Alert.alert(
          t.copied || 'Copied!',
          shareMessage + '\n\n' + (language === 'zh' ? '（已复制到剪贴板，可手动粘贴到微信）' : '(Copied to clipboard, paste to WeChat manually)')
        );
      }
    } catch (error: any) {
      console.error('Error sharing:', error);
      // Automatically copy to clipboard when sharing fails
      await Clipboard.setString(shareMessage);
      Alert.alert(
        t.copied || 'Copied!',
        shareMessage + '\n\n' + (language === 'zh' ? '（已复制到剪贴板，可手动粘贴到微信）' : '(Copied to clipboard, paste to WeChat manually)')
      );
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

  // 响应式样式
  const styles = createResponsiveStyles();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
    >
      <View style={styles.header}>
        <Text style={[styles.greeting, { color: colors.text }]}>{t.welcome}</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{t.appName}</Text>
      </View>

      <CheckInCard />

      {/* Share button */}
      {hasCheckedToday && todayCheckIn?.completed && (
        <TouchableOpacity
          style={[styles.shareButton, { backgroundColor: colors.primary }]}
          onPress={handleShare}
        >
          <Text style={styles.shareButtonText}>📱 {t.shareToMoments}</Text>
        </TouchableOpacity>
      )}

      {/* Streak card */}
      <View style={[styles.streakCard, { backgroundColor: colors.card }]}>
        <Text style={styles.streakEmoji}>{getFlameEmoji()}</Text>
        <Text style={[styles.streakTitle, { color: colors.textSecondary }]}>{t.currentStreak}</Text>
        <Text style={[styles.streakCount, { color: colors.primary }]}>{stats.currentStreak}</Text>
        <Text style={[styles.streakLabel, { color: colors.textSecondary }]}>{t.dayUnit}</Text>
      </View>

      <View style={styles.statsRow}>
        <StatCard
          title={t.totalCompletedDays}
          value={stats.completedDays}
          unit={t.days}
          icon="📅"
          colors={['#FF9800', '#F44336']}
        />
        <StatCard
          title={t.longestStreakLabel}
          value={stats.longestStreak}
          unit={t.days}
          icon="🏆"
          colors={['#FFD700', '#FFA500']}
        />
      </View>

      <View style={styles.statsRow}>
        <StatCard
          title={t.totalCaloriesSaved}
          value={stats.totalCaloriesSaved}
          unit={t.kcal}
          icon="💪"
          colors={['#4CAF50', '#8BC34A']}
        />
        <StatCard
          title={t.totalMealsSkipped}
          value={stats.totalMealsSkipped}
          unit={t.mealsUnit}
          icon="🍽️"
          colors={['#2196F3', '#03A9F4']}
        />
      </View>

      <View style={styles.statsRow}>
        <StatCard
          title={t.longestAbstinenceStreak}
          value={stats.longestAbstinenceStreak}
          unit={t.dayUnit}
          icon="🙏"
          colors={['#9C27B0', '#7B1FA2']}
        />
        <StatCard
          title={t.totalHoursSaved}
          value={stats.totalHoursSaved}
          unit={t.hoursUnit}
          icon="⏰"
          colors={['#FF9800', '#F57C00']}
        />
      </View>

      <Card style={styles.waterCard}>
        <View style={styles.waterHeader}>
          <Text style={[styles.waterTitle, { color: colors.info }]}>{t.waterIntake}</Text>
          <Text style={[styles.waterAmount, { color: colors.info }]}>
            {todayWater} <Text style={styles.waterUnit}>ml</Text>
          </Text>
        </View>
        <View style={[styles.progressBar, { backgroundColor: colors.divider }]}>
          <View
            style={[
              styles.progressFill,
              { backgroundColor: colors.info, width: `${Math.min((todayWater / 2000) * 100, 100)}%` },
            ]}
          />
        </View>
        <TouchableOpacity
          style={[styles.waterButton, { backgroundColor: colors.info }]}
          onPress={handleAddWater}
        >
          <Text style={styles.waterButtonText}>+ 250ml</Text>
        </TouchableOpacity>
      </Card>

      <Card style={styles.calorieCard}>
        <Text style={[styles.calorieTitle, { color: colors.warning }]}>{t.totalCalories}</Text>
        <Text style={[styles.calorieAmount, { color: colors.warning }]}>
          {todayCalories} <Text style={styles.calorieUnit}>/ {settings.dailyCalorieGoal} kcal</Text>
        </Text>
        <View style={[styles.progressBar, { backgroundColor: colors.divider }]}>
          <View
            style={[
              styles.progressFill,
              { backgroundColor: colors.warning, width: `${Math.min((todayCalories / settings.dailyCalorieGoal) * 100, 100)}%` },
            ]}
          />
        </View>
      </Card>
    </ScrollView>
  );
};

// 创建响应式样式
const createResponsiveStyles = () => {
  const isTablet = layout.maxWidth >= 600;

  return StyleSheet.create({
    container: {
      flex: 1,
    },
    content: {
      padding: layout.contentPadding,
      paddingBottom: vs(40),
    },
    header: {
      marginBottom: vs(20),
    },
    greeting: {
      fontSize: responsive({
        small: fs(24),
        medium: fs(26),
        large: fs(28),
        tablet: fs(36),
        default: fs(28),
      }),
      fontWeight: 'bold',
    },
    subtitle: {
      fontSize: responsiveSize.fontSize.lg,
      marginTop: vs(4),
    },
    shareButton: {
      paddingVertical: vs(14),
      borderRadius: responsiveSize.borderRadius.md,
      alignItems: 'center',
      marginTop: vs(16),
      marginBottom: vs(16),
      shadowColor: '#FF5722',
      shadowOffset: { width: 0, height: vs(2) },
      shadowOpacity: 0.3,
      shadowRadius: rs(4),
      elevation: 4,
    },
    shareButtonText: {
      color: '#fff',
      fontSize: responsive({
        small: fs(14),
        tablet: fs(18),
        default: fs(16),
      }),
      fontWeight: '600',
    },
    streakCard: {
      borderRadius: responsive({
        small: rs(16),
        tablet: rs(24),
        default: rs(20),
      }),
      padding: responsive({
        small: rs(16),
        tablet: rs(32),
        default: rs(24),
      }),
      alignItems: 'center',
      marginBottom: vs(20),
      shadowColor: '#000',
      shadowOffset: { width: 0, height: vs(4) },
      shadowOpacity: 0.3,
      shadowRadius: rs(8),
      elevation: 8,
    },
    streakEmoji: {
      fontSize: responsive({
        small: fs(40),
        tablet: fs(64),
        default: fs(48),
      }),
      marginBottom: rs(8),
    },
    streakTitle: {
      fontSize: responsiveSize.fontSize.lg,
      marginBottom: rs(8),
    },
    streakCount: {
      fontSize: responsive({
        small: fs(44),
        medium: fs(52),
        tablet: fs(72),
        default: fs(56),
      }),
      fontWeight: 'bold',
    },
    streakLabel: {
      fontSize: responsiveSize.fontSize.xl,
    },
    statsRow: {
      flexDirection: 'row',
      marginTop: vs(16),
      gap: rs(8),
    },
    waterCard: {
      marginTop: vs(16),
    },
    waterHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: vs(12),
    },
    waterTitle: {
      fontSize: responsiveSize.fontSize.xl,
      fontWeight: '600',
    },
    waterAmount: {
      fontSize: responsive({
        small: fs(20),
        tablet: fs(28),
        default: fs(24),
      }),
      fontWeight: 'bold',
    },
    waterUnit: {
      fontSize: responsiveSize.fontSize.lg,
      fontWeight: 'normal',
    },
    progressBar: {
      height: vs(8),
      borderRadius: rs(4),
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      borderRadius: rs(4),
    },
    waterButton: {
      marginTop: vs(12),
      paddingVertical: vs(12),
      borderRadius: responsiveSize.borderRadius.md,
      alignItems: 'center',
    },
    waterButtonText: {
      color: '#fff',
      fontSize: responsive({
        small: fs(14),
        tablet: fs(18),
        default: fs(16),
      }),
      fontWeight: '600',
    },
    calorieCard: {
      marginTop: vs(16),
    },
    calorieTitle: {
      fontSize: responsiveSize.fontSize.xl,
      fontWeight: '600',
      marginBottom: vs(8),
    },
    calorieAmount: {
      fontSize: responsive({
        small: fs(20),
        tablet: fs(28),
        default: fs(24),
      }),
      fontWeight: 'bold',
    },
    calorieUnit: {
      fontSize: responsiveSize.fontSize.lg,
      fontWeight: 'normal',
    },
    calorieProgress: {
      backgroundColor: '#FF9800',
    },
  });
};
