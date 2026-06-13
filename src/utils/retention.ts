import type {
  ActiveFastingState,
  DailyCheckIn,
  DailyRating,
  DailyTask,
  FastingSession,
  GrowthBadge,
  GrowthProfile,
  MealRecord,
  PracticeRecord,
  RetentionMilestone,
  RetentionState,
  UserSettings,
  UserStats,
  WaterRecord,
  WeeklySummary,
} from '../types';

export const DEFAULT_RETENTION_STATE: RetentionState = {
  totalEnergy: 0,
  repairCards: 1,
  claimedDailyRewards: {},
  claimedMilestones: [],
  shareDates: {},
  weeklyShareDates: {},
  friendEncouragementsSent: {},
  friendEncouragementsReceived: [],
};

const DAY_MS = 24 * 60 * 60 * 1000;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const getDateString = (date = new Date()): string => date.toISOString().split('T')[0];

export const addDays = (dateString: string, days: number): string => {
  const date = new Date(dateString);
  date.setUTCDate(date.getUTCDate() + days);
  return getDateString(date);
};

export const getWeekKey = (dateString = getDateString()): string => {
  const date = new Date(dateString);
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() - day + 1);
  return getDateString(date);
};

export const normalizeRetentionState = (state?: Partial<RetentionState> | null): RetentionState => ({
  ...DEFAULT_RETENTION_STATE,
  ...state,
  claimedDailyRewards: state?.claimedDailyRewards || {},
  claimedMilestones: state?.claimedMilestones || [],
  shareDates: state?.shareDates || {},
  weeklyShareDates: state?.weeklyShareDates || {},
  friendEncouragementsSent: state?.friendEncouragementsSent || {},
  friendEncouragementsReceived: state?.friendEncouragementsReceived || [],
});

const isZh = (language: UserSettings['language']) => language === 'zh' || language === 'zh-Hant';

const copy = (language: UserSettings['language']) => {
  const zh = isZh(language);
  return {
    checkinTitle: zh ? '完成过午不食打卡' : 'Complete fasting check-in',
    checkinDesc: zh ? '守住今天的主线目标，连续天数会被保护。' : 'Protect the main daily goal and your streak.',
    checkinAction: zh ? '去打卡' : 'Check in',
    waterTitle: zh ? '饮水达标' : 'Reach water goal',
    waterDesc: zh ? '少食日更要补足水分，目标按你的设置计算。' : 'Hydrate well on light-eating days.',
    waterAction: zh ? '加饮水' : 'Add water',
    mealTitle: zh ? '记录饮食' : 'Log food',
    mealDesc: zh ? '记录早餐或午餐，减少晚间凭感觉补记。' : 'Log breakfast or lunch for better awareness.',
    mealAction: zh ? '记一餐' : 'Log meal',
    meditationTitle: zh ? '静心修行 3 分钟' : 'Practice 3 mindful minutes',
    meditationDesc: zh ? '打坐、站桩、诵经或听经任一项都算。' : 'Meditation, standing, chanting, or listening counts.',
    meditationAction: zh ? '去修行' : 'Practice',
    fastingTitle: zh ? '开启一次禁食' : 'Start a fasting session',
    fastingDesc: zh ? '短禁食也能形成节奏，开始即计入今日目标。' : 'A short session helps keep the rhythm.',
    fastingAction: zh ? '开始禁食' : 'Start',
    shareTitle: zh ? '分享今日卡片' : 'Share today card',
    shareDesc: zh ? '把完成感外化，给自己一个公开承诺。' : 'Turn progress into a visible commitment.',
    shareAction: zh ? '去分享' : 'Share',
    friendTitle: zh ? '鼓励一位好友' : 'Encourage a friend',
    friendDesc: zh ? '轻量互动能把单人打卡变成互相提醒。' : 'Small social nudges help both sides return.',
    friendAction: zh ? '去鼓励' : 'Encourage',
    reward: zh ? '修行力' : 'energy',
  };
};

interface DailyTaskInput {
  date: string;
  language: UserSettings['language'];
  settings: UserSettings;
  checkInRecords: DailyCheckIn[];
  mealRecords: MealRecord[];
  waterRecords: WaterRecord[];
  practiceRecords: PracticeRecord[];
  fastingSessions: FastingSession[];
  activeFasting: ActiveFastingState | null;
  retentionState: RetentionState;
}

export const buildDailyTasks = ({
  date,
  language,
  settings,
  checkInRecords,
  mealRecords,
  waterRecords,
  practiceRecords,
  fastingSessions,
  activeFasting,
  retentionState,
}: DailyTaskInput): DailyTask[] => {
  const c = copy(language);
  const today = getDateString();
  const checkIn = checkInRecords.find((r) => r.date === date);
  const waterMl = waterRecords
    .filter((r) => r.date === date)
    .reduce((sum, item) => sum + item.amount, 0);
  const waterGoal = settings.dailyWaterGoal || 2000;
  const mealCount = mealRecords.filter((r) => r.date === date).length;
  const dayPractices = practiceRecords.filter((r) => r.date === date);
  const practiceMinutes = dayPractices.reduce((sum, item) => sum + (item.duration || 0), 0);
  const hasPractice = dayPractices.length > 0 || practiceMinutes >= 3;
  const dateSessions = fastingSessions.filter((session) => session.date === date);
  const hasFastingSession = dateSessions.some((session) => session.status === 'active' || session.status === 'completed');
  const activeFastingProgress =
    date === today && activeFasting
      ? clamp((Date.now() - activeFasting.startTime) / Math.max(activeFasting.endTime - activeFasting.startTime, 1), 0, 1)
      : 0;
  const shareCount = retentionState.shareDates[date] || 0;
  const encouragedCount = retentionState.friendEncouragementsSent[date]?.length || 0;

  return [
    {
      id: 'checkin',
      title: c.checkinTitle,
      description: c.checkinDesc,
      icon: '🔥',
      weight: 35,
      completed: Boolean(checkIn?.completed),
      progress: checkIn?.completed ? 1 : 0,
      goal: 1,
      actionLabel: c.checkinAction,
      target: 'Home',
      rewardText: `+35 ${c.reward}`,
    },
    {
      id: 'water',
      title: c.waterTitle,
      description: c.waterDesc,
      icon: '💧',
      weight: 15,
      completed: waterMl >= waterGoal,
      progress: waterMl,
      goal: waterGoal,
      actionLabel: c.waterAction,
      target: 'Home',
      rewardText: `+15 ${c.reward}`,
    },
    {
      id: 'meal',
      title: c.mealTitle,
      description: c.mealDesc,
      icon: '🍚',
      weight: 10,
      completed: mealCount > 0,
      progress: mealCount,
      goal: 1,
      actionLabel: c.mealAction,
      target: 'Meals',
      rewardText: `+10 ${c.reward}`,
    },
    {
      id: 'meditation',
      title: c.meditationTitle,
      description: c.meditationDesc,
      icon: '🧘',
      weight: 15,
      completed: hasPractice,
      progress: Math.max(practiceMinutes, hasPractice ? 3 : 0),
      goal: 3,
      actionLabel: c.meditationAction,
      target: 'Meditation',
      rewardText: `+15 ${c.reward}`,
    },
    {
      id: 'fasting',
      title: c.fastingTitle,
      description: c.fastingDesc,
      icon: '⏰',
      weight: 15,
      completed: hasFastingSession || Boolean(date === today && activeFasting),
      progress: hasFastingSession ? 1 : activeFastingProgress,
      goal: 1,
      actionLabel: c.fastingAction,
      target: 'Fasting',
      rewardText: `+15 ${c.reward}`,
    },
    {
      id: 'share',
      title: c.shareTitle,
      description: c.shareDesc,
      icon: '📣',
      weight: 5,
      completed: shareCount > 0,
      progress: shareCount,
      goal: 1,
      actionLabel: c.shareAction,
      target: 'Share',
      rewardText: `+5 ${c.reward}`,
    },
    {
      id: 'friendEncourage',
      title: c.friendTitle,
      description: c.friendDesc,
      icon: '🤝',
      weight: 5,
      completed: encouragedCount > 0,
      progress: encouragedCount,
      goal: 1,
      actionLabel: c.friendAction,
      target: 'Friends',
      rewardText: `+5 ${c.reward}`,
    },
  ];
};

export const calculateDailyRating = (tasks: DailyTask[], date = getDateString()): DailyRating => {
  const totalWeight = tasks.reduce((sum, task) => sum + task.weight, 0);
  const completedWeight = tasks.reduce((sum, task) => {
    const ratio = task.goal > 0 ? clamp(task.progress / task.goal, 0, 1) : 0;
    return sum + task.weight * ratio;
  }, 0);
  const progress = totalWeight > 0 ? completedWeight / totalWeight : 0;
  const stars = completedWeight <= 0 ? 0 : Math.min(5, Math.max(1, 1 + Math.floor(progress * 4)));

  return {
    date,
    stars,
    completedWeight: Math.round(completedWeight),
    totalWeight,
    completedCount: tasks.filter((task) => task.completed).length,
    taskCount: tasks.length,
    progress,
  };
};

export const buildWeeklySummary = (input: Omit<DailyTaskInput, 'date'> & { endDate?: string }): WeeklySummary => {
  const endDate = input.endDate || getDateString();
  const dates = Array.from({ length: 7 }, (_, index) => addDays(endDate, index - 6));
  const ratings = dates.map((date) =>
    calculateDailyRating(buildDailyTasks({ ...input, date }), date)
  );

  const checkInDays = input.checkInRecords.filter((r) => dates.includes(r.date) && r.completed).length;
  const fastingDays = checkInDays;
  const meditationMinutes = input.practiceRecords
    .filter((r) => dates.includes(r.date))
    .reduce((sum, item) => sum + (item.duration || 0), 0);
  const waterByDate = dates.map((date) =>
    input.waterRecords
      .filter((r) => r.date === date)
      .reduce((sum, item) => sum + item.amount, 0)
  );
  const waterMl = waterByDate.reduce((sum, amount) => sum + amount, 0);
  const waterGoal = input.settings.dailyWaterGoal || 2000;
  const waterGoalDays = waterByDate.filter((amount) => amount >= waterGoal).length;
  const mealRecordDays = new Set(input.mealRecords.filter((r) => dates.includes(r.date)).map((r) => r.date)).size;
  const fastingSessions = input.fastingSessions.filter((session) => dates.includes(session.date) && session.status === 'completed').length;
  const perfectDays = ratings.filter((rating) => rating.stars >= 5).length;
  const averageStars = ratings.length > 0
    ? Math.round((ratings.reduce((sum, rating) => sum + rating.stars, 0) / ratings.length) * 10) / 10
    : 0;
  const best = ratings.reduce<DailyRating | null>((current, rating) => {
    if (!current || rating.stars > current.stars) return rating;
    return current;
  }, null);

  return {
    weekKey: getWeekKey(endDate),
    startDate: dates[0],
    endDate,
    checkInDays,
    fastingDays,
    meditationMinutes,
    waterMl,
    waterGoalDays,
    mealRecordDays,
    fastingSessions,
    perfectDays,
    averageStars,
    completionRate: Math.round((ratings.reduce((sum, rating) => sum + rating.progress, 0) / ratings.length) * 100),
    bestDay: best?.date,
  };
};

const growthTitles = ['初心', '入门', '持戒', '清心', '精进', '定力', '明净', '自在', '圆融', '不退'];
const growthThresholds = [0, 80, 220, 500, 900, 1500, 2400, 3600, 5200, 7500];

export const buildGrowthProfile = (
  stats: UserStats,
  retentionState: RetentionState,
  weeklySummary: WeeklySummary,
  language: UserSettings['language'],
): GrowthProfile => {
  const lifetimeEnergy = Math.round(
    retentionState.totalEnergy +
      stats.completedDays * 10 +
      stats.totalMeditationMinutes * 0.4 +
      stats.totalStandingMeditationMinutes * 0.3 +
      stats.totalSingleFastingSessions * 12 +
      stats.totalMerit * 0.2
  );
  let level = 1;
  for (let index = 0; index < growthThresholds.length; index += 1) {
    if (lifetimeEnergy >= growthThresholds[index]) {
      level = index + 1;
    }
  }
  const currentThreshold = growthThresholds[level - 1] || 0;
  const nextLevelEnergy = growthThresholds[level] || growthThresholds[growthThresholds.length - 1];
  const progressToNextLevel =
    nextLevelEnergy > currentThreshold
      ? clamp((lifetimeEnergy - currentThreshold) / (nextLevelEnergy - currentThreshold), 0, 1)
      : 1;
  const zh = isZh(language);
  const sentCount = Object.values(retentionState.friendEncouragementsSent).reduce((sum, users) => sum + users.length, 0);

  const badges: GrowthBadge[] = [
    {
      id: 'streak7',
      title: zh ? '七日火苗' : '7-day flame',
      description: zh ? '连续完成 7 天过午不食。' : 'Complete a 7-day fasting streak.',
      icon: '🔥',
      unlocked: stats.longestStreak >= 7,
      progress: Math.min(stats.longestStreak, 7),
      goal: 7,
    },
    {
      id: 'streak30',
      title: zh ? '月度不退' : '30-day discipline',
      description: zh ? '最长连续达到 30 天。' : 'Reach a 30-day streak.',
      icon: '🏆',
      unlocked: stats.longestStreak >= 30,
      progress: Math.min(stats.longestStreak, 30),
      goal: 30,
    },
    {
      id: 'meditation120',
      title: zh ? '静心两小时' : '120 mindful minutes',
      description: zh ? '累计打坐或站桩 120 分钟。' : 'Practice 120 total minutes.',
      icon: '🧘',
      unlocked: stats.totalMeditationMinutes + stats.totalStandingMeditationMinutes >= 120,
      progress: Math.min(stats.totalMeditationMinutes + stats.totalStandingMeditationMinutes, 120),
      goal: 120,
    },
    {
      id: 'water7',
      title: zh ? '清水七日' : 'Hydrated week',
      description: zh ? '近 7 天有 7 天饮水达标。' : 'Reach the water goal for 7 days.',
      icon: '💧',
      unlocked: weeklySummary.waterGoalDays >= 7,
      progress: Math.min(weeklySummary.waterGoalDays, 7),
      goal: 7,
    },
    {
      id: 'social3',
      title: zh ? '互相提醒' : 'Social nudge',
      description: zh ? '累计鼓励好友 3 次。' : 'Encourage friends 3 times.',
      icon: '🤝',
      unlocked: sentCount >= 3,
      progress: Math.min(sentCount, 3),
      goal: 3,
    },
  ];

  return {
    level,
    title: growthTitles[Math.min(level - 1, growthTitles.length - 1)],
    lifetimeEnergy,
    availableEnergy: retentionState.totalEnergy,
    nextLevelEnergy,
    progressToNextLevel,
    badges,
  };
};

export const buildMilestoneRewards = (
  stats: UserStats,
  weeklySummary: WeeklySummary,
  retentionState: RetentionState,
  language: UserSettings['language'],
): RetentionMilestone[] => {
  const zh = isZh(language);
  const claimed = new Set(retentionState.claimedMilestones);
  const make = (
    id: string,
    title: string,
    description: string,
    icon: string,
    progress: number,
    goal: number,
    rewardEnergy: number,
    rewardRepairCards: number,
  ): RetentionMilestone => ({
    id,
    title,
    description,
    icon,
    progress: Math.min(progress, goal),
    goal,
    reached: progress >= goal,
    claimed: claimed.has(id),
    rewardEnergy,
    rewardRepairCards,
  });

  return [
    make(
      'streak_3',
      zh ? '三日成势' : '3-day rhythm',
      zh ? '连续 3 天完成过午不食。' : 'Complete a 3-day fasting streak.',
      '✨',
      stats.longestStreak,
      3,
      30,
      1,
    ),
    make(
      'streak_7',
      zh ? '七日稳住' : '7-day steady',
      zh ? '连续 7 天完成过午不食。' : 'Complete a 7-day streak.',
      '🔥',
      stats.longestStreak,
      7,
      80,
      1,
    ),
    make(
      'streak_14',
      zh ? '双周清醒' : '14-day clarity',
      zh ? '连续 14 天完成过午不食。' : 'Complete a 14-day streak.',
      '🌿',
      stats.longestStreak,
      14,
      140,
      1,
    ),
    make(
      'streak_30',
      zh ? '月度不退' : '30-day discipline',
      zh ? '连续 30 天完成过午不食。' : 'Complete a 30-day streak.',
      '🏆',
      stats.longestStreak,
      30,
      360,
      2,
    ),
    make(
      'meditation_120',
      zh ? '静心两小时' : '120 mindful minutes',
      zh ? '累计打坐和站桩达到 120 分钟。' : 'Reach 120 mindful practice minutes.',
      '🧘',
      stats.totalMeditationMinutes + stats.totalStandingMeditationMinutes,
      120,
      120,
      0,
    ),
    make(
      'weekly_5star_5',
      zh ? '五星周节奏' : 'Five-star week',
      zh ? '近 7 天拿到 5 个满星日。' : 'Earn five perfect days in the last week.',
      '⭐',
      weeklySummary.perfectDays,
      5,
      160,
      1,
    ),
  ];
};

export const canRepairYesterday = (checkInRecords: DailyCheckIn[]): { canRepair: boolean; date: string } => {
  const date = addDays(getDateString(), -1);
  const record = checkInRecords.find((item) => item.date === date);
  return { canRepair: !record?.completed, date };
};

export const countPerfectRewardDays = (retentionState: RetentionState): number =>
  Object.values(retentionState.claimedDailyRewards).filter((stars) => stars >= 5).length;
