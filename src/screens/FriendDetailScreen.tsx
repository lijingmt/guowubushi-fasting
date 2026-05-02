import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSocial } from '../context/SocialContext';
import { useApp } from '../context/AppContext';
import { Card } from '../components/Card';
import { rs, vs, fs } from '../theme/responsive';
import type { SharedStats } from '../types';

interface Props {
  route: {
    params: {
      userId: string;
      nickname: string;
    };
  };
}

export const FriendDetailScreen: React.FC<Props> = ({ route }) => {
  const { userId: friendId, nickname } = route.params;
  const { colors, t, language } = useApp();
  const { getFriendStats, removeFriend } = useSocial();
  const insets = useSafeAreaInsets();

  const [stats, setStats] = useState<SharedStats | null>(null);

  useEffect(() => {
    // Request stats from server
    // The response will come via WebSocket; for now, try requesting
    getFriendStats(friendId);
  }, [friendId]);

  const handleRemove = () => {
    Alert.alert(
      t.removeFriend,
      t.removeFriendConfirm,
      [
        { text: language === 'zh' ? '取消' : 'Cancel', style: 'cancel' },
        {
          text: language === 'zh' ? '确定' : 'OK',
          style: 'destructive',
          onPress: () => {
            removeFriend(friendId);
          },
        },
      ]
    );
  };

  const statItems = stats ? [
    { label: language === 'zh' ? '连胜天数' : 'Streak', value: `${stats.streak}`, icon: '🔥' },
    { label: language === 'zh' ? '总打坐时长' : 'Total Time', value: `${stats.totalMeditationMinutes}min`, icon: '⏱️' },
    { label: language === 'zh' ? '打坐次数' : 'Sessions', value: `${stats.meditationSessionCount}`, icon: '🧘' },
    { label: language === 'zh' ? '最长单次' : 'Longest', value: `${stats.longestMeditationSession}min`, icon: '🏆' },
    { label: language === 'zh' ? '打坐天数' : 'Days', value: `${stats.totalMeditationDays}`, icon: '📅' },
    { label: language === 'zh' ? '功德值' : 'Merit', value: `${stats.totalMerit}`, icon: '✨' },
  ] : [];

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={[styles.content, { paddingTop: insets.top + vs(20) }]}>
      <Text style={[styles.title, { color: colors.text }]}>
        {nickname || t.anonymous}
      </Text>

      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        {t.friendStats}
      </Text>

      {stats ? (
        <View style={styles.statsGrid}>
          {statItems.map((item) => (
            <Card key={item.label} variant="compact" style={styles.statCard}>
              <Text style={styles.statIcon}>{item.icon}</Text>
              <Text style={[styles.statValue, { color: colors.primary }]}>{item.value}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{item.label}</Text>
            </Card>
          ))}
        </View>
      ) : (
        <Card variant="compact">
          <Text style={[styles.noStats, { color: colors.textSecondary }]}>
            {language === 'zh' ? '对方未分享修行数据或当前不在线' : 'Stats not available (user offline or not sharing)'}
          </Text>
        </Card>
      )}

      <TouchableOpacity
        style={[styles.removeBtn, { borderColor: colors.error || '#f44336' }]}
        onPress={handleRemove}
      >
        <Text style={[styles.removeBtnText, { color: colors.error || '#f44336' }]}>
          {t.removeFriend}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: rs(16),
  },
  title: {
    fontSize: fs(24),
    fontWeight: 'bold',
    marginBottom: vs(4),
  },
  subtitle: {
    fontSize: fs(14),
    marginBottom: vs(16),
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: rs(10),
  },
  statCard: {
    width: (rs(320) - rs(42)) / 3,
    alignItems: 'center',
    paddingVertical: vs(12),
  },
  statIcon: {
    fontSize: fs(24),
    marginBottom: vs(4),
  },
  statValue: {
    fontSize: fs(18),
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: fs(11),
    marginTop: vs(2),
  },
  noStats: {
    fontSize: fs(14),
    textAlign: 'center',
    paddingVertical: vs(20),
  },
  removeBtn: {
    marginTop: vs(24),
    borderWidth: 1,
    borderRadius: rs(12),
    paddingVertical: vs(14),
    alignItems: 'center',
  },
  removeBtnText: {
    fontSize: fs(16),
    fontWeight: '600',
  },
});
