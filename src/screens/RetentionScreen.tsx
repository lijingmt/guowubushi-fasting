import React from 'react';
import { Alert, Share, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useApp } from '../context/AppContext';
import { Card } from '../components/Card';
import type { DailyTask } from '../types';
import { fs, layout, responsiveSize, rs, vs } from '../theme/responsive';

interface Props {
  navigation: any;
}

export const RetentionScreen: React.FC<Props> = ({ navigation }) => {
  const {
    colors,
    language,
    stats,
    dailyTasks,
    dailyRating,
    growthProfile,
    weeklySummary,
    milestoneRewards,
    retentionState,
    claimDailyReward,
    useStreakRepairCard,
    claimMilestoneReward,
    recordShareAction,
  } = useApp();
  const insets = useSafeAreaInsets();
  const zh = language === 'zh' || language === 'zh-Hant';

  const text = {
    title: zh ? '今日修行' : 'Daily Practice',
    subtitle: zh ? '把大目标拆成能每天完成的小动作' : 'Small actions that compound daily',
    level: zh ? '等级' : 'Level',
    available: zh ? '可用修行力' : 'Available energy',
    repairCards: zh ? '补签卡' : 'Repair cards',
    todayStars: zh ? '今日星级' : 'Today stars',
    claim: zh ? '领取奖励' : 'Claim reward',
    claimed: zh ? '已领' : 'Claimed',
    tasks: zh ? '今日任务' : 'Daily tasks',
    repairTitle: zh ? '连续保护' : 'Streak protection',
    repairDesc: zh ? '漏掉昨天时，可以消耗 1 张补签卡恢复连续记录。只支持补昨天，保证记录真实。' : 'Use one card to repair yesterday only.',
    repairAction: zh ? '使用补签卡' : 'Use card',
    milestones: zh ? '里程碑奖励' : 'Milestone rewards',
    weekly: zh ? '本周总结' : 'Weekly summary',
    shareWeekly: zh ? '分享周总结' : 'Share weekly summary',
    badges: zh ? '成长徽章' : 'Growth badges',
  };

  const claimedToday = (retentionState.claimedDailyRewards[dailyRating.date] || 0) >= dailyRating.stars && dailyRating.stars > 0;
  const pendingTasks = dailyTasks.filter((task) => !task.completed);

  const handleClaimDaily = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const result = await claimDailyReward();
    Alert.alert(result.claimed ? (zh ? '领取成功' : 'Claimed') : (zh ? '提示' : 'Notice'), result.message);
  };

  const handleRepair = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const result = await useStreakRepairCard();
    Alert.alert(result.success ? (zh ? '已恢复' : 'Repaired') : (zh ? '无法补签' : 'Cannot repair'), result.message);
  };

  const handleMilestone = async (milestoneId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const result = await claimMilestoneReward(milestoneId);
    Alert.alert(result.success ? (zh ? '领取成功' : 'Claimed') : (zh ? '提示' : 'Notice'), result.message);
  };

  const handleTaskAction = async (task: DailyTask) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (task.target === 'Share') {
      await Share.share({
        message: zh
          ? `我今天过午不食修行拿到${dailyRating.stars}星，连续${stats.currentStreak}天。`
          : `I earned ${dailyRating.stars} stars today and kept a ${stats.currentStreak}-day fasting streak.`,
      });
      await recordShareAction('daily');
      return;
    }
    if (task.target === 'Fasting' || task.target === 'Meditation' || task.target === 'Home') {
      navigation.navigate('Main', { screen: task.target });
      return;
    }
    navigation.navigate(task.target);
  };

  const handleShareWeekly = async () => {
    const message = zh
      ? `本周过午不食${weeklySummary.checkInDays}/7天，满星${weeklySummary.perfectDays}天，修行${weeklySummary.meditationMinutes}分钟，饮水达标${weeklySummary.waterGoalDays}天。`
      : `This week: ${weeklySummary.checkInDays}/7 fasting days, ${weeklySummary.perfectDays} perfect days, ${weeklySummary.meditationMinutes} mindful minutes, ${weeklySummary.waterGoalDays} hydration days.`;
    await Share.share({ message });
    await recordShareAction('weekly');
  };

  const renderStars = (stars: number) => (
    <View style={styles.starsRow}>
      {Array.from({ length: 5 }).map((_, index) => (
        <Text key={index} style={[styles.star, { color: index < stars ? '#F5B942' : colors.textTertiary }]}>★</Text>
      ))}
    </View>
  );

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + vs(14), paddingBottom: insets.bottom + vs(36) }]}
    >
      <LinearGradient
        colors={['#173A33', '#2E7D5B', '#F0C24B']}
        style={styles.hero}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Text style={styles.heroEyebrow}>{text.title}</Text>
        <Text style={styles.heroTitle}>{growthProfile.title}</Text>
        <Text style={styles.heroSubtitle}>{text.subtitle}</Text>

        <View style={styles.heroStats}>
          <View style={styles.heroStat}>
            <Text style={styles.heroStatValue}>{growthProfile.level}</Text>
            <Text style={styles.heroStatLabel}>{text.level}</Text>
          </View>
          <View style={styles.heroStat}>
            <Text style={styles.heroStatValue}>{growthProfile.availableEnergy}</Text>
            <Text style={styles.heroStatLabel}>{text.available}</Text>
          </View>
          <View style={styles.heroStat}>
            <Text style={styles.heroStatValue}>{retentionState.repairCards}</Text>
            <Text style={styles.heroStatLabel}>{text.repairCards}</Text>
          </View>
        </View>

        <View style={styles.heroProgressTrack}>
          <View style={[styles.heroProgressFill, { width: `${Math.round(growthProfile.progressToNextLevel * 100)}%` }]} />
        </View>
        <Text style={styles.heroProgressText}>
          {growthProfile.lifetimeEnergy}/{growthProfile.nextLevelEnergy}
        </Text>
      </LinearGradient>

      <Card style={styles.section}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{text.todayStars}</Text>
            <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
              {zh
                ? `${dailyRating.completedCount}/${dailyRating.taskCount}项完成，${pendingTasks.length}项待办`
                : `${dailyRating.completedCount}/${dailyRating.taskCount} done, ${pendingTasks.length} pending`}
            </Text>
          </View>
          {renderStars(dailyRating.stars)}
        </View>
        <View style={[styles.progressTrack, { backgroundColor: colors.divider }]}>
          <View style={[styles.progressFill, { backgroundColor: colors.primary, width: `${Math.round(dailyRating.progress * 100)}%` }]} />
        </View>
        <TouchableOpacity
          style={[styles.primaryButton, { backgroundColor: claimedToday ? colors.textTertiary : colors.primary }]}
          onPress={handleClaimDaily}
          disabled={claimedToday}
        >
          <Text style={styles.primaryButtonText}>{claimedToday ? text.claimed : text.claim}</Text>
        </TouchableOpacity>
      </Card>

      <Text style={[styles.blockTitle, { color: colors.text }]}>{text.tasks}</Text>
      {dailyTasks.map((task) => {
        const pct = task.goal > 0 ? Math.min(task.progress / task.goal, 1) : 0;
        return (
          <Card key={task.id} style={styles.taskCard} variant="compact">
            <View style={styles.taskTop}>
              <Text style={styles.taskIcon}>{task.completed ? '✅' : task.icon}</Text>
              <View style={styles.taskBody}>
                <Text style={[styles.taskTitle, { color: colors.text }]}>{task.title}</Text>
                <Text style={[styles.taskDesc, { color: colors.textSecondary }]}>{task.description}</Text>
              </View>
              <Text style={[styles.rewardText, { color: colors.primary }]}>{task.rewardText}</Text>
            </View>
            <View style={[styles.taskProgressTrack, { backgroundColor: colors.divider }]}>
              <View style={[styles.taskProgressFill, { backgroundColor: task.completed ? colors.success : colors.primary, width: `${Math.round(pct * 100)}%` }]} />
            </View>
            {!task.completed && (
              <TouchableOpacity style={[styles.taskButton, { borderColor: colors.primary }]} onPress={() => handleTaskAction(task)}>
                <Text style={[styles.taskButtonText, { color: colors.primary }]}>{task.actionLabel}</Text>
              </TouchableOpacity>
            )}
          </Card>
        );
      })}

      <Card style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.flexOne}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{text.repairTitle}</Text>
            <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>{text.repairDesc}</Text>
          </View>
          <Text style={[styles.cardCount, { color: colors.primary }]}>{retentionState.repairCards}</Text>
        </View>
        <TouchableOpacity style={[styles.outlineButton, { borderColor: colors.warning }]} onPress={handleRepair}>
          <Text style={[styles.outlineButtonText, { color: colors.warning }]}>{text.repairAction}</Text>
        </TouchableOpacity>
      </Card>

      <Text style={[styles.blockTitle, { color: colors.text }]}>{text.milestones}</Text>
      {milestoneRewards.map((milestone) => (
        <Card key={milestone.id} style={styles.milestoneCard} variant="compact">
          <View style={styles.taskTop}>
            <Text style={styles.taskIcon}>{milestone.icon}</Text>
            <View style={styles.taskBody}>
              <Text style={[styles.taskTitle, { color: colors.text }]}>{milestone.title}</Text>
              <Text style={[styles.taskDesc, { color: colors.textSecondary }]}>{milestone.description}</Text>
              <Text style={[styles.milestoneProgress, { color: colors.textSecondary }]}>
                {milestone.progress}/{milestone.goal}
              </Text>
            </View>
            <TouchableOpacity
              style={[
                styles.smallButton,
                { backgroundColor: milestone.reached && !milestone.claimed ? colors.primary : colors.divider },
              ]}
              onPress={() => handleMilestone(milestone.id)}
              disabled={!milestone.reached || milestone.claimed}
            >
              <Text style={[styles.smallButtonText, { color: milestone.reached && !milestone.claimed ? '#fff' : colors.textSecondary }]}>
                {milestone.claimed ? text.claimed : text.claim}
              </Text>
            </TouchableOpacity>
          </View>
        </Card>
      ))}

      <Card style={styles.section}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{text.weekly}</Text>
            <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
              {weeklySummary.startDate} - {weeklySummary.endDate}
            </Text>
          </View>
          <Text style={[styles.weekScore, { color: colors.primary }]}>{weeklySummary.completionRate}%</Text>
        </View>
        <View style={styles.summaryGrid}>
          <SummaryItem label={zh ? '过午' : 'Fasting'} value={`${weeklySummary.checkInDays}/7`} color={colors.primary} />
          <SummaryItem label={zh ? '满星' : 'Perfect'} value={`${weeklySummary.perfectDays}`} color="#F5B942" />
          <SummaryItem label={zh ? '修行' : 'Practice'} value={`${weeklySummary.meditationMinutes}m`} color={colors.success} />
          <SummaryItem label={zh ? '饮水' : 'Water'} value={`${weeklySummary.waterGoalDays}/7`} color={colors.info} />
        </View>
        <TouchableOpacity style={[styles.primaryButton, { backgroundColor: colors.primary }]} onPress={handleShareWeekly}>
          <Text style={styles.primaryButtonText}>{text.shareWeekly}</Text>
        </TouchableOpacity>
      </Card>

      <Text style={[styles.blockTitle, { color: colors.text }]}>{text.badges}</Text>
      <View style={styles.badgeGrid}>
        {growthProfile.badges.map((badge) => (
          <Card key={badge.id} style={badge.unlocked ? styles.badgeCard : styles.badgeCardLocked} variant="compact">
            <Text style={styles.badgeIcon}>{badge.unlocked ? badge.icon : '🔒'}</Text>
            <Text style={[styles.badgeTitle, { color: colors.text }]}>{badge.title}</Text>
            <Text style={[styles.badgeDesc, { color: colors.textSecondary }]}>{badge.progress}/{badge.goal}</Text>
          </Card>
        ))}
      </View>
    </ScrollView>
  );
};

const SummaryItem = ({ label, value, color }: { label: string; value: string; color: string }) => (
  <View style={styles.summaryItem}>
    <Text style={[styles.summaryValue, { color }]}>{value}</Text>
    <Text style={styles.summaryLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: layout.contentPadding,
  },
  hero: {
    borderRadius: responsiveSize.borderRadius.xl,
    padding: rs(20),
    overflow: 'hidden',
    marginBottom: vs(16),
  },
  heroEyebrow: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: fs(13),
    fontWeight: '700',
  },
  heroTitle: {
    color: '#fff',
    fontSize: fs(34),
    lineHeight: fs(42),
    fontWeight: '900',
    marginTop: vs(4),
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: fs(14),
    lineHeight: fs(20),
    marginTop: vs(4),
  },
  heroStats: {
    flexDirection: 'row',
    gap: rs(8),
    marginTop: vs(18),
  },
  heroStat: {
    flex: 1,
    minHeight: vs(72),
    borderRadius: rs(12),
    backgroundColor: 'rgba(255,255,255,0.16)',
    paddingVertical: vs(10),
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroStatValue: {
    color: '#fff',
    fontSize: fs(22),
    fontWeight: '900',
  },
  heroStatLabel: {
    color: 'rgba(255,255,255,0.76)',
    fontSize: fs(11),
    marginTop: vs(4),
    textAlign: 'center',
  },
  heroProgressTrack: {
    height: vs(8),
    backgroundColor: 'rgba(255,255,255,0.24)',
    borderRadius: rs(999),
    marginTop: vs(16),
    overflow: 'hidden',
  },
  heroProgressFill: {
    height: '100%',
    backgroundColor: '#FFF2A8',
    borderRadius: rs(999),
  },
  heroProgressText: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: fs(11),
    marginTop: vs(6),
    textAlign: 'right',
  },
  section: {
    marginBottom: vs(14),
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: rs(12),
  },
  sectionTitle: {
    fontSize: fs(18),
    fontWeight: '800',
  },
  sectionSubtitle: {
    fontSize: fs(12),
    lineHeight: fs(18),
    marginTop: vs(4),
  },
  starsRow: {
    flexDirection: 'row',
  },
  star: {
    fontSize: fs(19),
    marginLeft: rs(1),
  },
  progressTrack: {
    height: vs(9),
    borderRadius: rs(999),
    overflow: 'hidden',
    marginTop: vs(14),
  },
  progressFill: {
    height: '100%',
    borderRadius: rs(999),
  },
  primaryButton: {
    marginTop: vs(14),
    borderRadius: rs(10),
    paddingVertical: vs(12),
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: fs(15),
    fontWeight: '800',
  },
  blockTitle: {
    fontSize: fs(18),
    fontWeight: '900',
    marginBottom: vs(10),
    marginTop: vs(4),
  },
  taskCard: {
    marginBottom: vs(10),
  },
  milestoneCard: {
    marginBottom: vs(10),
  },
  taskTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(10),
  },
  taskIcon: {
    width: rs(34),
    fontSize: fs(24),
    textAlign: 'center',
  },
  taskBody: {
    flex: 1,
    minWidth: 0,
  },
  taskTitle: {
    fontSize: fs(15),
    fontWeight: '800',
  },
  taskDesc: {
    fontSize: fs(12),
    lineHeight: fs(17),
    marginTop: vs(3),
  },
  rewardText: {
    fontSize: fs(11),
    fontWeight: '800',
  },
  taskProgressTrack: {
    height: vs(6),
    borderRadius: rs(999),
    overflow: 'hidden',
    marginTop: vs(10),
  },
  taskProgressFill: {
    height: '100%',
    borderRadius: rs(999),
  },
  taskButton: {
    alignSelf: 'flex-end',
    borderWidth: 1,
    borderRadius: rs(8),
    paddingHorizontal: rs(12),
    paddingVertical: vs(7),
    marginTop: vs(10),
  },
  taskButtonText: {
    fontSize: fs(12),
    fontWeight: '800',
  },
  flexOne: {
    flex: 1,
  },
  cardCount: {
    fontSize: fs(34),
    fontWeight: '900',
  },
  outlineButton: {
    marginTop: vs(14),
    borderWidth: 1,
    borderRadius: rs(10),
    paddingVertical: vs(12),
    alignItems: 'center',
  },
  outlineButtonText: {
    fontSize: fs(15),
    fontWeight: '800',
  },
  milestoneProgress: {
    fontSize: fs(11),
    marginTop: vs(4),
  },
  smallButton: {
    borderRadius: rs(8),
    paddingHorizontal: rs(12),
    paddingVertical: vs(8),
  },
  smallButtonText: {
    fontSize: fs(12),
    fontWeight: '800',
  },
  weekScore: {
    fontSize: fs(26),
    fontWeight: '900',
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: rs(8),
    marginTop: vs(14),
  },
  summaryItem: {
    width: '48%',
    minHeight: vs(72),
    borderRadius: rs(12),
    backgroundColor: 'rgba(128,128,128,0.09)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: fs(21),
    fontWeight: '900',
  },
  summaryLabel: {
    fontSize: fs(11),
    color: '#777',
    marginTop: vs(3),
  },
  badgeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: rs(10),
  },
  badgeCard: {
    width: '47.8%',
    minHeight: vs(112),
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeCardLocked: {
    width: '47.8%',
    minHeight: vs(112),
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.62,
  },
  badgeIcon: {
    fontSize: fs(28),
    marginBottom: vs(6),
  },
  badgeTitle: {
    fontSize: fs(14),
    fontWeight: '800',
    textAlign: 'center',
  },
  badgeDesc: {
    fontSize: fs(12),
    marginTop: vs(4),
  },
});
