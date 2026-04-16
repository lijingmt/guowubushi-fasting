import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { LineChart, BarChart } from 'react-native-chart-kit';
import { useApp } from '../context/AppContext';
import { Card } from '../components/Card';
import { ACHIEVEMENTS } from '../constants/achievements';

const { width } = Dimensions.get('window');

export const StatsScreen: React.FC = () => {
  const { t, stats, checkInRecords, weightRecords } = useApp();
  const [viewMode, setViewMode] = useState<'overview' | 'weight' | 'achievements'>('overview');

  // 准备图表数据 - 最近7天的打卡记录
  const getLast7DaysData = () => {
    const days: string[] = [];
    const completed: number[] = [];

    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const dayName = ['日', '一', '二', '三', '四', '五', '六'][date.getDay()];
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
    backgroundColor: '#ffffff',
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(255, 87, 34, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '4',
      strokeWidth: '2',
      stroke: '#FF5722',
    },
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{t.statistics}</Text>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, viewMode === 'overview' && styles.tabActive]}
          onPress={() => setViewMode('overview')}
        >
          <Text
            style={[
              styles.tabText,
              viewMode === 'overview' && styles.tabTextActive,
            ]}
          >
            概览
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, viewMode === 'weight' && styles.tabActive]}
          onPress={() => setViewMode('weight')}
        >
          <Text
            style={[
              styles.tabText,
              viewMode === 'weight' && styles.tabTextActive,
            ]}
          >
            体重
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, viewMode === 'achievements' && styles.tabActive]}
          onPress={() => setViewMode('achievements')}
        >
          <Text
            style={[
              styles.tabText,
              viewMode === 'achievements' && styles.tabTextActive,
            ]}
          >
            成就
          </Text>
        </TouchableOpacity>
      </View>

      {viewMode === 'overview' && (
        <>
          <Card style={styles.chartCard}>
            <Text style={styles.chartTitle}>本周完成情况</Text>
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
              <Text style={styles.statValue}>{stats.completedDays}</Text>
              <Text style={styles.statLabel}>总完成天数</Text>
            </Card>
            <Card style={styles.statItem}>
              <Text style={styles.statValue}>{stats.currentStreak}</Text>
              <Text style={styles.statLabel}>当前连胜</Text>
            </Card>
            <Card style={styles.statItem}>
              <Text style={styles.statValue}>{stats.longestStreak}</Text>
              <Text style={styles.statLabel}>最长连胜</Text>
            </Card>
            <Card style={styles.statItem}>
              <Text style={styles.statValue}>{stats.completionRate}%</Text>
              <Text style={styles.statLabel}>完成率</Text>
            </Card>
          </View>

          <View style={styles.statsGrid}>
            <Card style={styles.statItem}>
              <Text style={styles.statValue}>{stats.totalCaloriesSaved}</Text>
              <Text style={styles.statLabel}>节省卡路里</Text>
            </Card>
            <Card style={styles.statItem}>
              <Text style={styles.statValue}>{stats.totalMealsSkipped}</Text>
              <Text style={styles.statLabel}>少吃晚饭</Text>
            </Card>
          </View>

          <View style={styles.statsGrid}>
            <Card style={styles.statItem}>
              <Text style={styles.statIcon}>🙏</Text>
              <Text style={styles.statValue}>{stats.longestAbstinenceStreak}</Text>
              <Text style={styles.statLabel}>最长禁欲</Text>
            </Card>
            <Card style={styles.statItem}>
              <Text style={styles.statValue}>{stats.totalHoursSaved}</Text>
              <Text style={styles.statLabel}>节约小时</Text>
            </Card>
          </View>
        </>
      )}

      {viewMode === 'weight' && (
        <>
          {weightRecords.length >= 2 ? (
            <Card style={styles.chartCard}>
              <Text style={styles.chartTitle}>体重变化趋势</Text>
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
              <Text style={styles.emptyText}>
                需要至少2条体重记录才能显示趋势图
              </Text>
            </Card>
          )}

          <Text style={styles.sectionTitle}>体重记录</Text>
          {weightRecords.slice(-10).reverse().map((record) => (
            <Card key={record.id} style={styles.weightRecordCard}>
              <View style={styles.weightRecordRow}>
                <Text style={styles.weightDate}>{record.date}</Text>
                <Text style={styles.weightValue}>{record.weight} kg</Text>
              </View>
              {record.note && (
                <Text style={styles.weightNote}>{record.note}</Text>
              )}
            </Card>
          ))}
        </>
      )}

      {viewMode === 'achievements' && (
        <>
          <Card style={styles.achievementSummary}>
            <Text style={styles.achievementCount}>
              {unlockedAchievements.length} / {ACHIEVEMENTS.length}
            </Text>
            <Text style={styles.achievementLabel}>已解锁成就</Text>
          </Card>

          {ACHIEVEMENTS.map((achievement) => {
            const isUnlocked = achievement.condition(stats);
            return (
              <Card
                key={achievement.id}
                style={isUnlocked ? styles.achievementCard : styles.achievementCardLocked}
              >
                <View style={styles.achievementIconContainer}>
                  <Text style={styles.achievementIcon}>
                    {isUnlocked ? achievement.icon : '🔒'}
                  </Text>
                </View>
                <View style={styles.achievementInfo}>
                  <Text
                    style={[
                      styles.achievementTitle,
                      !isUnlocked && styles.achievementTitleLocked,
                    ]}
                  >
                    {achievement.title}
                  </Text>
                  <Text
                    style={[
                      styles.achievementDesc,
                      !isUnlocked && styles.achievementDescLocked,
                    ]}
                  >
                    {achievement.description}
                  </Text>
                </View>
                {isUnlocked && (
                  <Text style={styles.achievementUnlocked}>✓</Text>
                )}
              </Card>
            );
          })}
        </>
      )}
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
});
