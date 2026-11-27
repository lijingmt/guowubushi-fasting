import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { LineChart, BarChart } from 'react-native-chart-kit';
import { useApp } from '../context/AppContext';
import { Card } from '../components/Card';
import { AchievementShareCard } from '../components/AchievementShareCard';
import { ACHIEVEMENTS } from '../constants/achievements';
import { getLocalDateString, isChineseLanguage, parseLocalDate } from '../utils/date';
import { computeWellnessSummary } from '../utils/backup';
import { useResponsiveLayout } from '../theme/responsive';

function colorWithOpacity(color: string, opacity: number): string {
  const safeOpacity = Number.isFinite(opacity) ? Math.max(0, Math.min(1, opacity)) : 1;
  if (color.startsWith('#') && (color.length === 7 || color.length === 4)) {
    const hex = color.length === 4
      ? `${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`
      : color.slice(1);
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    if (!Number.isNaN(r) && !Number.isNaN(g) && !Number.isNaN(b)) {
      return `rgba(${r}, ${g}, ${b}, ${safeOpacity})`;
    }
  }
  if (color.startsWith('rgb(')) {
    return color.replace('rgb(', 'rgba(').replace(')', `, ${safeOpacity})`);
  }
  return `rgba(38, 89, 71, ${safeOpacity})`;
}

export const StatsScreen: React.FC = () => {
  const { t, stats, settings, checkInRecords, weightRecords, wellnessRecords, hungerRescueCount, colors, language } = useApp();
  const rl = useResponsiveLayout();
  const isZh = isChineseLanguage(language);
  const isEs = language === 'es';
  const useInches = !isZh && settings.weightUnit === 'lb';
  const formatWaist = (cm: number) => (useInches ? `${(cm / 2.54).toFixed(1)} in` : `${cm.toFixed(1)} cm`);
  const formatWaistDelta = (deltaCm: number) => {
    const val = useInches ? Math.abs(deltaCm) / 2.54 : Math.abs(deltaCm);
    const unit = useInches ? 'in' : 'cm';
    if (deltaCm > 0) return `-${val.toFixed(1)} ${unit}`;
    if (deltaCm < 0) return `+${val.toFixed(1)} ${unit}`;
    return `0.0 ${unit}`;
  };
  const [viewMode, setViewMode] = useState<'overview' | 'weight' | 'wellness' | 'achievements'>('overview');
  const [showShareModal, setShowShareModal] = useState(false);

  // 准备图表数据 - 最近7天的打卡记录
  const getLast7DaysData = () => {
    const days: string[] = [];
    const completed: number[] = [];

    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = getLocalDateString(date);
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
        const d = parseLocalDate(r.date);
        return `${d.getMonth() + 1}/${d.getDate()}`;
      }),
      data: recentWeights.map((r) => r.weight),
    };
  };

  const weekData = getLast7DaysData();
  const weightData = getWeightData();
  const wellnessSummary = computeWellnessSummary(wellnessRecords, checkInRecords);
  const waistRecords = wellnessRecords
    .filter((r) => typeof r.waistCm === 'number' && Number.isFinite(r.waistCm) && r.waistCm > 0)
    .slice(-10)
    .reverse();

  const unlockedAchievements = ACHIEVEMENTS.filter((a) =>
    a.condition(stats)
  );

  const isDarkMode = colors.background === '#121212';

  const chartConfig = {
    backgroundColor: colors.background,
    backgroundGradientFrom: colors.background,
    backgroundGradientTo: colors.background,
    decimalPlaces: 1,
    color: (opacity = 1) => colorWithOpacity(colors.primary, opacity),
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

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[
        styles.content,
        {
          maxWidth: rl.singleColumnMaxWidth,
          width: '100%',
          alignSelf: 'center',
          paddingHorizontal: rl.horizontalPadding,
        },
      ]}
    >
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
            {isZh ? '体重·围度' : t.weight}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, viewMode === 'wellness' && [styles.tabActive, { backgroundColor: colors.primary }]]}
          onPress={() => setViewMode('wellness')}
        >
          <Text
            style={[
              styles.tabText,
              { color: colors.textSecondary },
              viewMode === 'wellness' && styles.tabTextActive,
            ]}
          >
            {isZh ? '身心状态' : isEs ? 'Bienestar' : 'Wellness'}
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
              width={rl.chartWidth}
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
                width={rl.chartWidth}
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

          <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 16 }]}>
            {isZh ? '📏 腰围变化 (首页「身心体感」录入)' : isEs ? '📏 Registro de Cintura' : '📏 Waist Tracker'}
          </Text>
          {wellnessSummary.latestWaistCm !== null ? (
            <>
              <Card style={styles.chartCard}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-around', width: '100%' }}>
                  <View style={{ alignItems: 'center' }}>
                    <Text style={[styles.statValue, { color: colors.primary }]}>
                      {formatWaist(wellnessSummary.latestWaistCm)}
                    </Text>
                    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                      {isZh ? '最近腰围' : isEs ? 'Última Cintura' : 'Latest Waist'}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'center' }}>
                    <Text style={[styles.statValue, { color: (wellnessSummary.waistDeltaCm ?? 0) >= 0 ? colors.success : colors.primary }]}>
                      {wellnessSummary.waistDeltaCm === null
                        ? '--'
                        : formatWaistDelta(wellnessSummary.waistDeltaCm)}
                    </Text>
                    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                      {isZh ? '累计变化' : isEs ? 'Cambio Total' : 'Total Change'}
                    </Text>
                  </View>
                </View>
              </Card>
              {waistRecords.map((record) => (
                <Card key={`waist-${record.id}`} style={styles.weightRecordCard}>
                  <View style={styles.weightRecordRow}>
                    <Text style={[styles.weightDate, { color: colors.textSecondary }]}>{record.date}</Text>
                    <Text style={[styles.weightValue, { color: colors.text }]}>
                      {typeof record.waistCm === 'number' ? formatWaist(record.waistCm) : '--'}
                    </Text>
                  </View>
                </Card>
              ))}
            </>
          ) : (
            <Card style={styles.emptyCard}>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                {isZh
                  ? '暂无腰围记录，可在首页「今日身心体感」卡片一并记录腰围。'
                  : isEs
                  ? 'Sin registros de cintura. Anótala en la tarjeta de Bienestar en Inicio.'
                  : 'No waist entries yet. Log waist in the Home wellness card.'}
              </Text>
            </Card>
          )}
        </>
      )}

      {viewMode === 'wellness' && (
        <>
          <View style={styles.statsGrid}>
            <Card style={styles.statItem}>
              <Text style={styles.statIcon}>⚡</Text>
              <Text style={[styles.statValue, { color: colors.primary }]}>
                {wellnessSummary.totalRecords > 0 ? wellnessSummary.avgEnergy : '--'}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                {isZh ? '近7日精力 (/5)' : '7d Energy (/5)'}
              </Text>
            </Card>
            <Card style={styles.statItem}>
              <Text style={styles.statIcon}>🌙</Text>
              <Text style={[styles.statValue, { color: colors.primary }]}>
                {wellnessSummary.totalRecords > 0 ? wellnessSummary.avgSleep : '--'}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                {isZh ? '近7日睡眠 (/5)' : '7d Sleep (/5)'}
              </Text>
            </Card>
            <Card style={styles.statItem}>
              <Text style={styles.statIcon}>🪷</Text>
              <Text style={[styles.statValue, { color: colors.primary }]}>
                {wellnessSummary.totalRecords > 0 ? wellnessSummary.avgMood : '--'}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                {isZh ? '近7日心境 (/5)' : '7d Mood (/5)'}
              </Text>
            </Card>
            <Card style={styles.statItem}>
              <Text style={styles.statIcon}>🍃</Text>
              <Text style={[styles.statValue, { color: colors.primary }]}>
                {wellnessSummary.totalRecords > 0 ? wellnessSummary.avgHunger : '--'}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                {isZh ? '近7日轻饥 (/5)' : '7d Hunger (/5)'}
              </Text>
            </Card>
          </View>

          {wellnessSummary.totalRecords > 0 ? (
            <>
              <Card style={styles.chartCard}>
                <Text style={[styles.chartTitle, { color: colors.text }]}>
                  {isZh ? '近7日四维体感均值' : '7-Day Wellness Averages'}
                </Text>
                <BarChart
                  data={{
                    labels: isZh ? ['精力', '睡眠', '心境', '饥饿'] : ['Energy', 'Sleep', 'Mood', 'Hunger'],
                    datasets: [
                      {
                        data: [
                          wellnessSummary.avgEnergy,
                          wellnessSummary.avgSleep,
                          wellnessSummary.avgMood,
                          wellnessSummary.avgHunger,
                        ],
                      },
                    ],
                  }}
                  width={rl.chartWidth}
                  height={200}
                  chartConfig={chartConfig}
                  yAxisLabel=""
                  yAxisSuffix=""
                  fromZero
                />
              </Card>

              <Card style={styles.chartCard}>
                <Text style={[styles.chartTitle, { color: colors.text }]}>
                  {isZh ? '断食日 vs 普通日体感对比' : 'Fasting Days vs Ordinary Days'}
                </Text>
                <View style={{ width: '100%', gap: 10 }}>
                  <View style={styles.weightRecordRow}>
                    <Text style={{ fontSize: 13, color: colors.textSecondary }}>
                      {isZh ? '断食打卡日 睡眠 / 精力' : 'Fasting Days Sleep / Energy'}
                    </Text>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: colors.primary }}>
                      {wellnessSummary.fastingDaySleepAvg ?? '--'} / {wellnessSummary.fastingDayEnergyAvg ?? '--'}
                    </Text>
                  </View>
                  <View style={styles.weightRecordRow}>
                    <Text style={{ fontSize: 13, color: colors.textSecondary }}>
                      {isZh ? '非断食日 睡眠 / 精力' : 'Ordinary Days Sleep / Energy'}
                    </Text>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>
                      {wellnessSummary.nonFastingDaySleepAvg ?? '--'} / {wellnessSummary.nonFastingDayEnergyAvg ?? '--'}
                    </Text>
                  </View>
                  <View style={styles.weightRecordRow}>
                    <Text style={{ fontSize: 13, color: colors.textSecondary }}>
                      {isZh ? '🌊 成功渡过抗饿冲浪' : '🌊 Hunger Waves Surfed'}
                    </Text>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: colors.primary }}>
                      {hungerRescueCount} {isZh ? '次' : 'times'}
                    </Text>
                  </View>
                </View>
              </Card>

              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {isZh ? '近期体感记录' : 'Recent Wellness Logs'}
              </Text>
              {wellnessRecords.slice(-7).reverse().map((rec) => (
                <Card key={rec.id} style={styles.weightRecordCard}>
                  <View style={styles.weightRecordRow}>
                    <Text style={[styles.weightDate, { color: colors.textSecondary }]}>{rec.date}</Text>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>
                      ⚡{rec.energy} · 🌙{rec.sleep} · 🪷{rec.mood} · 🍃{rec.hunger}
                      {typeof rec.waistCm === 'number' ? ` · 📏${formatWaist(rec.waistCm)}` : ''}
                    </Text>
                  </View>
                  {rec.note && (
                    <Text style={[styles.weightNote, { color: colors.textLight }]}>{rec.note}</Text>
                  )}
                </Card>
              ))}
            </>
          ) : (
            <Card style={styles.emptyCard}>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                {isZh
                  ? `暂无体感记录。可在首页「今日身心体感」打分（已渡过抗饿冲浪 ${hungerRescueCount} 次）。`
                  : `No wellness logs yet. Score daily energy & sleep on Home (${hungerRescueCount} cravings surfed).`}
              </Text>
            </Card>
          )}
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
              {(language === 'zh' || language === 'zh-Hant') ? '📤 分享我的成就' : language === 'es' ? '📤 Compartir logros' : '📤 Share My Achievements'}
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
              {(language === 'zh' || language === 'zh-Hant') ? '分享成就' : language === 'es' ? 'Compartir' : 'Share Achievement'}
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
    backgroundColor: '#F6F2E9',
  },
  content: {
    padding: 16,
    paddingTop: 16,
    paddingBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
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
    backgroundColor: '#265947',
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
    color: '#265947',
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
    color: '#265947',
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
