import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useApp } from '../context/AppContext';
import { useSocial } from '../context/SocialContext';
import { rs, vs, fs, responsiveSize } from '../theme/responsive';
import { calculatePeriodStats } from '../utils/leaderboardStats';
import type { LeaderboardEntry } from '../types';

type Category = 'fasting' | 'meditation';
type Period = 'weekly' | 'monthly' | 'yearly';

const TROPHIES = ['🥇', '🥈', '🥉'];

export const LeaderboardScreen = () => {
  const { t, colors, stats, checkInRecords, practiceRecords } = useApp();
  const social = useSocial();
  const navigation = useNavigation<any>();
  const [category, setCategory] = useState<Category>('fasting');
  const [period, setPeriod] = useState<Period>('weekly');
  const [refreshing, setRefreshing] = useState(false);

  // Publish my stats to leaderboard on mount
  useEffect(() => {
    if (social.isConnected && social.userId && stats) {
      const entry = calculatePeriodStats(
        social.userId,
        social.nickname,
        checkInRecords,
        practiceRecords,
        stats.currentStreak,
      );
      social.publishLeaderboardStats(entry);
    }
  }, [social.isConnected, social.userId, social.nickname, stats]);

  useEffect(() => {
    social.requestLeaderboard(category, period);
  }, [category, period]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    social.requestLeaderboard(category, period);
    setTimeout(() => setRefreshing(false), 1000);
  }, [category, period, social]);

  const entries = social.leaderboardData[category][period] || [];

  const myRank = entries.find((e: LeaderboardEntry) => e.userId === social.userId);

  const getEntryValue = (entry: LeaderboardEntry): string => {
    if (category === 'fasting') {
      const days = period === 'weekly' ? entry.fastingDaysThisWeek
        : period === 'monthly' ? entry.fastingDaysThisMonth
        : entry.fastingDaysThisYear;
      return `${days} ${t.fastingDays}`;
    }
    const mins = period === 'weekly' ? entry.meditationMinutesThisWeek
      : period === 'monthly' ? entry.meditationMinutesThisMonth
      : entry.meditationMinutesThisYear;
    return `${mins} ${t.meditationMinsUnit}`;
  };

  const isFriend = (otherUserId: string) => {
    return social.friends.some((f) => f.userId === otherUserId);
  };

  const handleAddFriend = (entry: LeaderboardEntry) => {
    social.sendFriendRequest(entry.userId);
  };

  const handleSendMessage = (entry: LeaderboardEntry) => {
    navigation.navigate('ChatDetail', {
      userId: entry.userId,
      nickname: entry.nickname || `${t.anonymous} #${entry.userId.substring(0, 4)}`,
    });
  };

  const renderItem = ({ item, index }: { item: LeaderboardEntry; index: number }) => {
    const rank = item.rank || index + 1;
    const isMe = item.userId === social.userId;
    const friend = isFriend(item.userId);

    return (
      <View style={[
        styles.row,
        {
          backgroundColor: isMe ? colors.primary + '15' : colors.card,
          borderColor: isMe ? colors.primary : colors.border,
        },
      ]}>
        <View style={styles.rankContainer}>
          <Text style={[
            styles.rankText,
            { color: rank <= 3 ? colors.primary : colors.textSecondary },
          ]}>
            {rank <= 3 ? TROPHIES[rank - 1] : `#${rank}`}
          </Text>
        </View>

        <View style={styles.nameContainer}>
          <Text style={[styles.nameText, { color: colors.text }]} numberOfLines={1}>
            {item.nickname || `${t.anonymous} #${item.userId.substring(0, 4)}`}
          </Text>
          {isMe && (
            <Text style={[styles.meLabel, { color: colors.primary }]}>{t.you}</Text>
          )}
        </View>

        <View style={styles.valueContainer}>
          <Text style={[styles.valueText, { color: colors.text }]}>
            {getEntryValue(item)}
          </Text>
        </View>

        {!isMe && (
          <View style={styles.actionContainer}>
            {friend ? (
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: colors.primary + '20' }]}
                onPress={() => handleSendMessage(item)}
              >
                <Text style={[styles.actionText, { color: colors.primary }]}>
                  {t.sendPrivateMessage}
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: colors.success + '20' }]}
                onPress={() => handleAddFriend(item)}
              >
                <Text style={[styles.actionText, { color: colors.success }]}>
                  {t.addAsFriend}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Period tabs */}
      <View style={[styles.tabRow, { backgroundColor: colors.card }]}>
        {(['weekly', 'monthly', 'yearly'] as Period[]).map((p) => (
          <TouchableOpacity
            key={p}
            style={[
              styles.tab,
              period === p && { backgroundColor: colors.primary + '20' },
            ]}
            onPress={() => setPeriod(p)}
          >
            <Text style={[
              styles.tabText,
              { color: period === p ? colors.primary : colors.textSecondary },
            ]}>
              {p === 'weekly' ? t.weeklyRank : p === 'monthly' ? t.monthlyRank : t.yearlyRank}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Category tabs */}
      <View style={[styles.tabRow, { backgroundColor: colors.card }]}>
        {(['fasting', 'meditation'] as Category[]).map((c) => (
          <TouchableOpacity
            key={c}
            style={[
              styles.categoryTab,
              category === c && { backgroundColor: colors.primary + '20' },
            ]}
            onPress={() => setCategory(c)}
          >
            <Text style={[
              styles.categoryTabText,
              { color: category === c ? colors.primary : colors.textSecondary },
            ]}>
              {c === 'fasting' ? t.fastingRank : t.meditationRank}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* My rank card */}
      {social.isConnected && (
        <View style={[styles.myRankCard, { backgroundColor: colors.card, borderColor: colors.primary }]}>
          <Text style={[styles.myRankLabel, { color: colors.textSecondary }]}>
            {t.yourRank}
          </Text>
          <Text style={[styles.myRankValue, { color: myRank ? colors.primary : colors.textSecondary }]}>
            {myRank ? `#${myRank.rank}` : t.notRanked}
          </Text>
          <Text style={[styles.participantsText, { color: colors.textSecondary }]}>
            {social.totalParticipants} {t.totalParticipants}
          </Text>
        </View>
      )}

      {/* Leaderboard list */}
      <FlatList
        data={entries}
        keyExtractor={(item) => item.userId}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {t.noLeaderboardData}
            </Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: responsiveSize.spacing.md,
    paddingTop: vs(8),
    paddingBottom: vs(4),
  },
  tab: {
    flex: 1,
    paddingVertical: vs(8),
    alignItems: 'center',
    borderRadius: responsiveSize.borderRadius.md,
    marginHorizontal: rs(4),
  },
  tabText: {
    fontSize: fs(14),
    fontWeight: '500',
  },
  categoryTab: {
    flex: 1,
    paddingVertical: vs(10),
    alignItems: 'center',
    borderRadius: responsiveSize.borderRadius.md,
    marginHorizontal: rs(4),
    marginBottom: vs(8),
  },
  categoryTabText: {
    fontSize: fs(15),
    fontWeight: '600',
  },
  myRankCard: {
    marginHorizontal: responsiveSize.spacing.md,
    marginVertical: vs(8),
    padding: responsiveSize.spacing.lg,
    borderRadius: responsiveSize.borderRadius.lg,
    borderWidth: 1,
    alignItems: 'center',
  },
  myRankLabel: {
    fontSize: fs(13),
    marginBottom: vs(4),
  },
  myRankValue: {
    fontSize: fs(24),
    fontWeight: 'bold',
  },
  participantsText: {
    fontSize: fs(12),
    marginTop: vs(4),
  },
  listContent: {
    paddingHorizontal: responsiveSize.spacing.md,
    paddingBottom: vs(20),
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: vs(12),
    paddingHorizontal: responsiveSize.spacing.md,
    borderRadius: responsiveSize.borderRadius.md,
    borderWidth: 1,
    marginBottom: vs(6),
  },
  rankContainer: {
    width: rs(50),
    alignItems: 'center',
  },
  rankText: {
    fontSize: fs(16),
    fontWeight: '600',
  },
  nameContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: rs(8),
  },
  nameText: {
    fontSize: fs(14),
    fontWeight: '500',
    flex: 1,
  },
  meLabel: {
    fontSize: fs(11),
    fontWeight: '600',
    marginLeft: rs(6),
  },
  valueContainer: {
    marginRight: rs(8),
  },
  valueText: {
    fontSize: fs(14),
    fontWeight: '600',
  },
  actionContainer: {
    marginLeft: rs(4),
  },
  actionButton: {
    paddingHorizontal: rs(10),
    paddingVertical: vs(5),
    borderRadius: responsiveSize.borderRadius.md,
  },
  actionText: {
    fontSize: fs(12),
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: vs(80),
  },
  emptyText: {
    fontSize: fs(15),
  },
});
