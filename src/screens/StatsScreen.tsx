import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { LineChart, BarChart } from 'react-native-chart-kit';
import { useApp } from '../context/AppContext';
import { Card } from '../components/Card';
import { AchievementShareCard } from '../components/AchievementShareCard';
import { ACHIEVEMENTS } from '../constants/achievements';

const { width } = Dimensions.get('window');

export const StatsScreen: React.FC = () => {
  const { t, stats, checkInRecords, weightRecords, colors, language } = useApp();
  const [viewMode, setViewMode] = useState<'overview' | 'weight' | 'achievements'>('overview');
  const [showShareModal, setShowShareModal] = useState(false);

  // 准备图表数据 - 最近7天的打卡记录
  const getLast7DaysData = () => {
    const days: string[] = [];
    const completed: number[] = [];

    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const dayName = t.weekdayShort[date.getDay()];
      days.push(dayName);

      const record = checkInRecords.find((r) => r.date === dateStr);
      completed.push(record?.completed ? 1 : 0);
    }

    return { labels: days, data: completed };
  };

  // 准备体重变化数据
  const getWeightData = () => {
    const recentWeights = weightRecords.slice(-7);
    return {
      labels: recentWeights.map((r) => {
        const d = new Date(r.date);
        return `${d.getMonth() + 1}/${d.getDate()}`;
      }),
      data: recentWeights.map((r) => r.weight),
    };
  };

  const weekData = getLast7DaysData();
  const weightData = getWeightData();

  const unlockedAchievements = ACHIEVEMENTS.filter((a) =>
    a.condition(stats)
  );

  const chartConfig = {
    backgroundColor: colors.background,
    backgroundGradientFrom: colors.background,
    backgroundGradientTo: colors.background,
    decimalPlaces: 0,
    color: (opacity = 1) => colors.primary.replace(')', `, ${opacity})`).replace('rgb', 'rgba').replace('#', 'rgba(255, 87, 34,'),
    labelColor: (opacity = 1) => isDarkMode ? `rgba(255, 255, 255, ${opacity})` : `rgba(0, 0, 0, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '4',
      strokeWidth: '2',
      stroke: colors.primary,
    },
  };

  const isDarkMode = colors.background === '#121212';

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={styles.content}>
      <Text style={[styles.title, { color: colors.text }]}>{t.statistics}</Text>

      <View style={[styles.tabContainer, { backgroundColor: colors.card }]}>
        <TouchableOpacity
          style={[styles.tab, viewMode === 'overview' && [styles.tabActive, { backgroundColor: colors.primary }]]}
          onPress={() => setViewMode('overview')}
        >
          <Text
            style={[
              styles.tabText,
              { color: colors.textSecondary },
              viewMode === 'overview' && styles.tabTextActive,
            ]}
          >
            {t.overview}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, viewMode === 'weight' && [styles.tabActive, { backgroundColor: colors.primary }]]}
          onPress={() => setViewMode('weight')}
        >
          <Text
            style={[
              styles.tabText,
              { color: colors.textSecondary },
              viewMode === 'weight' && styles.tabTextActive,
            ]}
          >
            {t.weight}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, viewMode === 'achievements' && [styles.tabActive, { backgroundColor: colors.primary }]]}
          onPress={() => setViewMode('achievements')}
        >
          <Text
            style={[
              styles.tabText,
              { color: colors.textSecondary },
              viewMode === 'achievements' && styles.tabTextActive,
            ]}
          >
            {t.achievements}
          </Text>
        </TouchableOpacity>
      </View>

      {viewMode === 'overview' && (
        <>
          <Card style={styles.chartCard}>
            <Text style={[styles.chartTitle, { color: colors.text }]}>{t.weeklyProgress}</Text>
            <BarChart
              data={{
                labels: weekData.labels,
                datasets: [
                  {
                    data: weekData.data,
                  },
                ],
              }}
              width={width - 64}
              height={200}
              chartConfig={chartConfig}
              yAxisLabel=""
              yAxisSuffix=""
              fromZero
            />
          </Card>

          <View style={styles.statsGrid}>
            <Card style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.primary }]}>{stats.completedDays}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t.totalCompletedDays}</Text>
            </Card>
            <Card style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.primary }]}>{stats.currentStreak}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t.currentStreakLabel}</Text>
            </Card>
            <Card style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.primary }]}>{stats.longestStreak}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t.longestStreakLabel}</Text>
            </Card>
            <Card style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.primary }]}>{stats.completionRate}%</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t.completionRate}</Text>
            </Card>
          </View>

          <View style={styles.statsGrid}>
            <Card style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.primary }]}>{stats.totalCaloriesSaved}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t.totalCaloriesSaved}</Text>
            </Card>
            <Card style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.primary }]}>{stats.totalMealsSkipped}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t.totalMealsSkipped}</Text>
            </Card>
          </View>

          <View style={styles.statsGrid}>
            <Card style={styles.statItem}>
              <Text style={styles.statIcon}>🙏</Text>
              <Text style={[styles.statValue, { color: colors.primary }]}>{stats.longestAbstinenceStreak}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t.longestAbstinenceStreak}</Text>
            </Card>
            <Card style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.primary }]}>{stats.totalHoursSaved}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t.totalHoursSaved}</Text>
            </Card>
          </View>
        </>
      )}

      {viewMode === 'weight' && (
        <>
          {weightRecords.length >= 2 ? (
            <Card style={styles.chartCard}>
              <Text style={[styles.chartTitle, { color: colors.text }]}>{t.weightTrend}</Text>
              <LineChart
                data={{
                  labels: weightData.labels,
                  datasets: [
                    {
                      data: weightData.data,
                    },
                  ],
                }}
                width={width - 64}
                height={220}
                chartConfig={chartConfig}
                bezier
                withDots
                withInnerLines={false}
                withOuterLines={false}
                withVerticalLines={false}
              />
            </Card>
          ) : (
            <Card style={styles.emptyCard}>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                {t.needMoreWeightRecords}
              </Text>
            </Card>
          )}

          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t.weightRecords}</Text>
          {weightRecords.slice(-10).reverse().map((record) => (
            <Card key={record.id} style={styles.weightRecordCard}>
              <View style={styles.weightRecordRow}>
                <Text style={[styles.weightDate, { color: colors.textSecondary }]}>{record.date}</Text>
                <Text style={[styles.weightValue, { color: colors.text }]}>{record.weight} kg</Text>
              </View>
              {record.note && (
                <Text style={[styles.weightNote, { color: colors.textLight }]}>{record.note}</Text>
              )}
            </Card>
          ))}
        </>
      )}

      {viewMode === 'achievements' && (
        <>
          <Card style={styles.achievementSummary}>
            <Text style={[styles.achievementCount, { color: colors.primary }]}>
              {unlockedAchievements.length} / {ACHIEVEMENTS.length}
            </Text>
            <Text style={[styles.achievementLabel, { color: colors.textSecondary }]}>{t.unlockedAchievements}</Text>
          </Card>

          {/* Share Achievement Button */}
          <TouchableOpacity
            style={[styles.shareAchievementButton, { backgroundColor: colors.primary }]}
            onPress={() => setShowShareModal(true)}
          >
            <Text style={styles.shareAchievementButtonText}>
              {language === 'zh' ? '📤 分享我的成就' : language === 'es' ? '📤 Compartir logros' : '📤 Share My Achievements'}
            </Text>
          </TouchableOpacity>

          {ACHIEVEMENTS.map((achievement) => {
            const isUnlocked = achievement.condition(stats);
            return (
              <Card
                key={achievement.id}
                style={StyleSheet.flatten([
                  isUnlocked ? styles.achievementCard : styles.achievementCardLocked,
                  !isUnlocked ? { opacity: 0.6 } : {},
                ])}
              >
                <View style={[styles.achievementIconContainer, { backgroundColor: colors.backgroundSecondary }]}>
                  <Text style={styles.achievementIcon}>
                    {isUnlocked ? achievement.icon : '🔒'}
                  </Text>
                </View>
                <View style={styles.achievementInfo}>
                  <Text
                    style={[
                      styles.achievementTitle,
                      { color: colors.text },
                      !isUnlocked && { color: colors.textLight },
                    ]}
                  >
                    {t[achievement.titleKey as keyof typeof t] || achievement.titleKey}
                  </Text>
                  <Text
                    style={[
                      styles.achievementDesc,
                      { color: colors.textSecondary },
                      !isUnlocked && { color: colors.textLight },
                    ]}
                  >
                    {t[achievement.descriptionKey as keyof typeof t] || achievement.descriptionKey}
                  </Text>
                </View>
                {isUnlocked && (
                  <Text style={[styles.achievementUnlocked, { color: colors.success }]}>✓</Text>
                )}
              </Card>
            );
          })}
        </>
      )}

      {/* Share Achievement Modal */}
      <Modal
        visible={showShareModal}
        animationType="slide"
        onRequestClose={() => setShowShareModal(false)}
      >
        <View style={[styles.shareModalContainer, { backgroundColor: colors.background }]}>
          <View style={styles.shareModalHeader}>
            <TouchableOpacity onPress={() => setShowShareModal(false)}>
              <Text style={[styles.shareModalCloseText, { color: colors.text }]}>✕</Text>
            </TouchableOpacity>
            <Text style={[styles.shareModalTitle, { color: colors.text }]}>
              {language === 'zh' ? '分享成就' : language === 'es' ? 'Compartir' : 'Share Achievement'}
            </Text>
            <View style={{ width: 20 }} />
          </View>
          <ScrollView
            style={styles.shareModalContent}
            contentContainerStyle={styles.shareModalScrollContent}
          >
            <AchievementShareCard
              stats={{
                currentStreak: stats.currentStreak,
                totalCompletedDays: stats.completedDays,
                totalCaloriesSaved: stats.totalCaloriesSaved,
                totalMealsSkipped: stats.totalMealsSkipped,
                longestAbstinenceStreak: stats.longestAbstinenceStreak,
              }}
              unlockedAchievements={unlockedAchievements.map(a => a.id)}
              language={language}
              colors={colors}
            />
          </ScrollView>
        </View>
      </Modal>
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
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 50,
    marginBottom: 16,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: '#FF5722',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  tabTextActive: {
    color: '#fff',
  },
  chartCard: {
    marginBottom: 16,
    padding: 16,
    alignItems: 'center',
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
    marginTop: 16,
  },
  statItem: {
    width: '50%',
    padding: 16,
    marginHorizontal: 4,
    marginBottom: 8,
    alignItems: 'center',
  },
  fullWidthCard: {
    width: '100%',
    padding: 16,
    alignItems: 'center',
    marginHorizontal: 0,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FF5722',
  },
  statIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  statHint: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 12,
  },
  weightRecordCard: {
    marginBottom: 8,
    padding: 12,
  },
  weightRecordRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  weightDate: {
    fontSize: 14,
    color: '#666',
  },
  weightValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  weightNote: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  emptyCard: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  achievementSummary: {
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
  },
  achievementCount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FF5722',
  },
  achievementLabel: {
    fontSize: 14,
    color: '#666',
  },
  achievementCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 12,
  },
  achievementCardLocked: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 12,
    opacity: 0.6,
  },
  achievementIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFF3E0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  achievementIcon: {
    fontSize: 24,
  },
  achievementInfo: {
    flex: 1,
  },
  achievementTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  achievementTitleLocked: {
    color: '#999',
  },
  achievementDesc: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  achievementDescLocked: {
    color: '#999',
  },
  achievementUnlocked: {
    fontSize: 24,
    color: '#4CAF50',
  },
  shareAchievementButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  shareAchievementButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  shareModalContainer: {
    flex: 1,
  },
  shareModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  shareModalCloseText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  shareModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  shareModalContent: {
    flex: 1,
  },
  shareModalScrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
});
