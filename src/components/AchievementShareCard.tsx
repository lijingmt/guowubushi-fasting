import React, { useRef } from 'react';
import { View, Text, StyleSheet, Image, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { captureRef } from 'react-native-view-shot';
import * as FileSystem from 'expo-file-system';
import { shareAsync } from 'expo-sharing';
import { responsiveSize, fs, rs, vs } from '../theme/responsive';

interface AchievementShareCardProps {
  stats: {
    currentStreak: number;
    totalCompletedDays: number;
    totalCaloriesSaved: number;
    totalMealsSkipped: number;
    longestAbstinenceStreak: number;
  };
  unlockedAchievements: string[];
  language: string;
  colors: any;
}

export const AchievementShareCard: React.FC<AchievementShareCardProps> = ({
  stats,
  unlockedAchievements,
  language,
  colors,
}) => {
  const viewRef = useRef<View>(null);

  const getAchievementEmoji = (key: string): string => {
    const emojiMap: Record<string, string> = {
      first_day: '🌟',
      streak_3: '🔥',
      streak_7: '⚡',
      streak_14: '💫',
      streak_30: '👑',
      streak_100: '💎',
      calories_1000: '🍎',
      calories_5000: '🥗',
      calories_10000: '🥇',
      perfect_week: '🏆',
      perfect_month: '🎯',
      total_100: '🌈',
    };
    return emojiMap[key] || '🏅';
  };

  const getAchievementTitle = (key: string): string => {
    const titles: Record<string, { zh: string; en: string; es: string }> = {
      first_day: { zh: '初次打卡', en: 'First Day', es: 'Primer Día' },
      streak_3: { zh: '连续3天', en: '3 Day Streak', es: 'Racha de 3' },
      streak_7: { zh: '连续7天', en: '7 Day Streak', es: 'Racha de 7' },
      streak_14: { zh: '连续14天', en: '14 Day Streak', es: 'Racha de 14' },
      streak_30: { zh: '连续30天', en: '30 Day Streak', es: 'Racha de 30' },
      streak_100: { zh: '连续100天', en: '100 Day Streak', es: 'Racha de 100' },
      calories_1000: { zh: '节省1000卡', en: '1000 kcal Saved', es: '1000 kcal Ahorradas' },
      calories_5000: { zh: '节省5000卡', en: '5000 kcal Saved', es: '5000 kcal Ahorradas' },
      calories_10000: { zh: '节省10000卡', en: '10000 kcal Saved', es: '10000 kcal Ahorradas' },
      perfect_week: { zh: '完美一周', en: 'Perfect Week', es: 'Semana Perfecta' },
      perfect_month: { zh: '完美一月', en: 'Perfect Month', es: 'Mes Perfecto' },
      total_100: { zh: '百日达成', en: '100 Days Total', es: '100 Días Totales' },
    };
    const title = titles[key];
    return title ? (title as any)[language] || title.zh : key;
  };

  const getGreeting = () => {
    if (language === 'en') return 'My Fasting Journey';
    if (language === 'es') return 'Mi Viaje de Ayuno';
    return '我的禁食之路';
  };

  const getSubtitle = () => {
    if (language === 'en') return 'Building healthy habits, one day at a time';
    if (language === 'es') return 'Construyendo hábitos saludables, día a día';
    return '培养健康习惯，一天天坚持';
  };

  const getDownloadText = () => {
    if (language === 'en') return 'Download the app:';
    if (language === 'es') return 'Descarga la app:';
    return '下载app：';
  };

  const shareAchievement = async () => {
    try {
      const uri = await captureRef(viewRef, {
        format: 'png',
        quality: 1,
      });

      const localUri = await FileSystem.copyAsync({
        from: uri,
        to: FileSystem.cacheDirectory + 'achievement.png',
      });

      await shareAsync(localUri, {
        mimeType: 'image/png',
        dialogTitle: language === 'zh' ? '分享成就' : language === 'es' ? 'Compartir logro' : 'Share Achievement',
      });
    } catch (error) {
      console.error('Error sharing achievement:', error);
    }
  };

  // Render the card content (can be used for preview)
  const renderCardContent = () => (
    <View style={styles.cardContainer}>
      {/* Background gradient */}
      <LinearGradient
        colors={['#FF6B6B', '#FF8E53', '#FFA726']}
        style={styles.backgroundGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Decorative circles */}
      <View style={[styles.circle, styles.circle1]} />
      <View style={[styles.circle, styles.circle2]} />
      <View style={[styles.circle, styles.circle3]} />

      {/* Content */}
      <View style={styles.content}>
        {/* Header */}
        <Text style={styles.greeting}>{getGreeting()}</Text>
        <Text style={styles.subtitle}>{getSubtitle()}</Text>

        {/* Main Stats */}
        <View style={styles.mainStatsContainer}>
          <View style={styles.mainStatItem}>
            <Text style={styles.mainStatValue}>{stats.currentStreak}</Text>
            <Text style={styles.mainStatLabel}>
              {language === 'en' ? 'Day Streak' : language === 'es' ? 'Días Racha' : '连续天数'}
            </Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.mainStatItem}>
            <Text style={styles.mainStatValue}>{stats.totalCompletedDays}</Text>
            <Text style={styles.mainStatLabel}>
              {language === 'en' ? 'Total Days' : language === 'es' ? 'Días Totales' : '累计天数'}
            </Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.mainStatItem}>
            <Text style={styles.mainStatValue}>{stats.totalCaloriesSaved.toLocaleString()}</Text>
            <Text style={styles.mainStatLabel}>
              {language === 'en' ? 'kcal Saved' : language === 'es' ? 'kcal Ahorradas' : '节省卡路里'}
            </Text>
          </View>
        </View>

        {/* Secondary Stats */}
        <View style={styles.secondaryStats}>
          <View style={styles.secondaryStatItem}>
            <Text style={styles.secondaryStatIcon}>🍽️</Text>
            <Text style={styles.secondaryStatText}>
              {stats.totalMealsSkipped} {language === 'zh' ? '餐' : language === 'es' ? 'comidas' : 'meals'}
            </Text>
          </View>
          <View style={styles.secondaryStatItem}>
            <Text style={styles.secondaryStatIcon}>🏆</Text>
            <Text style={styles.secondaryStatText}>
              {stats.longestAbstinenceStreak} {language === 'zh' ? '天最长' : language === 'es' ? 'días máximo' : 'days best'}
            </Text>
          </View>
        </View>

        {/* Achievements */}
        {unlockedAchievements.length > 0 && (
          <View style={styles.achievementsContainer}>
            <Text style={styles.achievementsTitle}>
              {language === 'zh' ? `已解锁 ${unlockedAchievements.length} 个成就` :
               language === 'es' ? `${unlockedAchievements.length} logros` :
               `${unlockedAchievements.length} Achievements Unlocked`}
            </Text>
            <View style={styles.achievementsGrid}>
              {unlockedAchievements.slice(0, 6).map((key) => (
                <View key={key} style={styles.achievementBadge}>
                  <Text style={styles.achievementEmoji}>{getAchievementEmoji(key)}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* App Link */}
        <View style={styles.footer}>
          <View style={styles.footerLine} />
          <Text style={styles.footerText}>{getDownloadText()}</Text>
          <Text style={styles.footerLink}>apps.apple.com/app/id6762360504</Text>
          <Text style={styles.footerBrand}>"过午不食" Fasting App</Text>
        </View>
      </View>
    </View>
  );

  return (
    <>
      {/* Hidden view for capture */}
      <View ref={viewRef} collapsable={false} style={styles.hiddenCard}>
        {renderCardContent()}
      </View>

      {/* Preview/Share button */}
      <View style={styles.previewContainer}>
        {renderCardContent()}
      </View>

      {/* Share button */}
      <View style={styles.shareButtonContainer}>
        <Text style={styles.shareButton} onPress={shareAchievement}>
          {language === 'zh' ? '📤 分享成就' : language === 'es' ? '📤 Compartir' : '📤 Share Achievement'}
        </Text>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  // Hidden card for capture (fixed size for consistency)
  hiddenCard: {
    position: 'absolute',
    left: -1000,
    width: 375,
    height: 600,
  },
  cardContainer: {
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  },
  backgroundGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  circle: {
    position: 'absolute',
    borderRadius: 1000,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  circle1: {
    width: 200,
    height: 200,
    top: -50,
    right: -50,
  },
  circle2: {
    width: 150,
    height: 150,
    bottom: 100,
    left: -30,
  },
  circle3: {
    width: 100,
    height: 100,
    bottom: -30,
    right: 50,
  },
  content: {
    flex: 1,
    padding: 30,
    alignItems: 'center',
  },
  greeting: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 40,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 30,
    textAlign: 'center',
  },
  mainStatsContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    width: '100%',
    justifyContent: 'space-around',
  },
  mainStatItem: {
    alignItems: 'center',
  },
  mainStatValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  mainStatLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 4,
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  secondaryStats: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 20,
  },
  secondaryStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  secondaryStatIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  secondaryStatText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
  achievementsContainer: {
    width: '100%',
    marginTop: 10,
  },
  achievementsTitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 12,
    textAlign: 'center',
    fontWeight: '600',
  },
  achievementsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
  },
  achievementBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  achievementEmoji: {
    fontSize: 20,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    alignItems: 'center',
  },
  footerLine: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    width: '100%',
    marginBottom: 12,
  },
  footerText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 4,
  },
  footerLink: {
    fontSize: 12,
    color: '#fff',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  footerBrand: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  // Preview styles (for visible card)
  previewContainer: {
    width: '100%',
    aspectRatio: 375 / 600,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 20,
  },
  shareButtonContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  shareButton: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF6B6B',
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
  },
});
