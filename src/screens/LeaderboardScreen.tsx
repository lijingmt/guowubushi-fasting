import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useApp } from '../context/AppContext';
import { Card } from '../components/Card';
import * as Haptics from 'expo-haptics';
import { responsiveSize, fs, vs, rs, layout, responsive } from '../theme/responsive';
import { PublicUserData, getDisplayName } from '../services/p2p';
import * as p2p from '../services/p2p';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const LeaderboardScreen: React.FC = () => {
  const { t, colors, language, stats, p2pEnabled, toggleP2P } = useApp();

  const [leaderboard, setLeaderboard] = useState<PublicUserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string>('');
  const [nickname, setNickname] = useState('');
  const [hasCustomNickname, setHasCustomNickname] = useState(false);
  const [showNicknameModal, setShowNicknameModal] = useState(false);
  const [nicknameInput, setNicknameInput] = useState('');

  // Load user ID and nickname on mount
  useEffect(() => {
    p2p.getOrCreateUserId().then(async (id) => {
      setUserId(id);
      // Check if user has custom nickname
      const storedNickname = await AsyncStorage.getItem('@guowu_nickname');
      const displayName = await getDisplayName(id, storedNickname || undefined);
      setNickname(displayName);
      setNicknameInput(storedNickname || '');
      setHasCustomNickname(!!(storedNickname && storedNickname.trim()));
    });
  }, []);

  // Subscribe to leaderboard updates
  useEffect(() => {
    if (!p2pEnabled) {
      setLeaderboard([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const unsubscribe = p2p.subscribeLeaderboard((data) => {
      setLeaderboard(data);
      setLoading(false);
    }, 100);

    return () => {
      unsubscribe();
    };
  }, [p2pEnabled]);

  const handleToggleP2P = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await toggleP2P();
  };

  const handleSetNickname = async () => {
    const trimmed = nicknameInput.trim();
    if (!trimmed) {
      // Clear nickname - revert to anonymous
      await AsyncStorage.removeItem('@guowu_nickname');
      const id = await p2p.getOrCreateUserId();
      const displayName = await getDisplayName(id, undefined);
      setNickname(displayName);
      setHasCustomNickname(false);
      setShowNicknameModal(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Republish stats with new nickname
      if (p2pEnabled) {
        await p2p.publishUserStats(stats);
      }
      return;
    }

    if (trimmed.length >= 2 && trimmed.length <= 20) {
      await p2p.setNickname(trimmed);
      setNickname(trimmed);
      setHasCustomNickname(true);
      setShowNicknameModal(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Republish stats with new nickname
      if (p2pEnabled) {
        await p2p.publishUserStats(stats);
      }
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const openNicknameModal = () => {
    setNicknameInput(hasCustomNickname ? nickname : '');
    setShowNicknameModal(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  // Find current user's rank
  const currentUserData = leaderboard.find(u => u.userId === userId);
  const currentUserRank = currentUserData
    ? leaderboard.findIndex(u => u.userId === userId) + 1
    : null;

  const styles = createResponsiveStyles();

  // Render a leaderboard item
  const renderLeaderboardItem = (user: PublicUserData, index: number, isCurrentUser: boolean) => {
    const rank = index + 1;
    let rankColor = colors.textSecondary;
    let rankEmoji = '';

    if (rank === 1) {
      rankColor = '#FFD700';
      rankEmoji = '🥇';
    } else if (rank === 2) {
      rankColor = '#C0C0C0';
      rankEmoji = '🥈';
    } else if (rank === 3) {
      rankColor = '#CD7F32';
      rankEmoji = '🥉';
    }

    return (
      <Card
        key={user.userId}
        style={[
          styles.leaderboardItem,
          isCurrentUser && styles.currentUserItem,
          isCurrentUser && { backgroundColor: colors.primary + '20', borderColor: colors.primary },
        ]}
      >
        <View style={styles.rankColumn}>
          {rankEmoji ? (
            <Text style={styles.rankEmoji}>{rankEmoji}</Text>
          ) : (
            <Text style={[styles.rankText, { color: rankColor }]}>{rank}</Text>
          )}
        </View>

        <View style={styles.nicknameColumn}>
          <Text style={[styles.nicknameText, { color: colors.text }]} numberOfLines={1}>
            {user.nickname}
          </Text>
          {isCurrentUser && (
            <Text style={[styles.youBadge, { color: colors.primary }]}>（{t.you}）</Text>
          )}
        </View>

        <View style={styles.statsColumn}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.warning }]}>{user.streak}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{(t as any).leaderboardStreak || t.streak}</Text>
          </View>

          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.info }]}>{user.completedDays}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t.completedDays}</Text>
          </View>

          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.success }]}>{user.totalMerit}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{(t as any).leaderboardMerit || (t as any).practiceMerit || '功德'}</Text>
          </View>
        </View>
      </Card>
    );
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
    >
      <Text style={[styles.title, { color: colors.text }]}>{t.leaderboard}</Text>

      {/* P2P Toggle Card */}
      <Card style={styles.p2pCard}>
        <View style={styles.p2pHeader}>
          <View style={styles.p2pInfo}>
            <Text style={[styles.p2pTitle, { color: colors.text }]}>{t.enableP2P}</Text>
            <Text style={[styles.p2pDesc, { color: colors.textSecondary }]}>
              {t.enableP2PDesc}
            </Text>
          </View>
          <TouchableOpacity
            style={[
              styles.p2pToggle,
              p2pEnabled ? { backgroundColor: colors.success } : { backgroundColor: colors.divider },
            ]}
            onPress={handleToggleP2P}
            activeOpacity={0.7}
          >
            <Text style={styles.p2pToggleText}>
              {p2pEnabled ? t.enableLeaderboard : t.disableLeaderboard}
            </Text>
          </TouchableOpacity>
        </View>
        <Text style={[styles.privacyNote, { color: colors.textLight }]}>
          {t.p2pPrivacyNote}
        </Text>
      </Card>

      {/* Set Nickname Card */}
      {p2pEnabled && (
        <Card style={styles.nicknameCard}>
          <View style={styles.nicknameRow}>
            <View style={styles.nicknameInfo}>
              <Text style={[styles.nicknameLabel, { color: colors.textSecondary }]}>
                {t.nickname}
              </Text>
              <View style={styles.nicknameValueRow}>
                <Text style={[styles.currentNickname, { color: colors.text }]}>
                  {nickname}
                </Text>
                {!hasCustomNickname && (
                  <Text style={[styles.autoNicknameBadge, { color: colors.textLight }]}>
                    ({language === 'zh' ? '自动生成' : language === 'es' ? 'Auto' : 'Auto'})
                  </Text>
                )}
              </View>
            </View>
            <TouchableOpacity
              style={[styles.editButton, { backgroundColor: colors.primary }]}
              onPress={openNicknameModal}
            >
              <Text style={styles.editButtonText}>
                {hasCustomNickname ? t.edit : t.setNickname}
              </Text>
            </TouchableOpacity>
          </View>
        </Card>
      )}

      {/* Current User's Rank Card */}
      {p2pEnabled && currentUserRank && (
        <Card style={[styles.yourRankCard, { backgroundColor: colors.primary + '15' }]}>
          <Text style={[styles.yourRankLabel, { color: colors.textSecondary }]}>
            {language === 'zh' ? '您的排名' : 'Your Rank'}
          </Text>
          <Text style={[styles.yourRankValue, { color: colors.primary }]}>
            #{currentUserRank}
          </Text>
          <View style={styles.yourRankStats}>
            <View style={styles.yourRankStatItem}>
              <Text style={[styles.yourRankStatValue, { color: colors.text }]}>
                {stats.currentStreak}
              </Text>
              <Text style={[styles.yourRankStatLabel, { color: colors.textSecondary }]}>
                {t.streak}
              </Text>
            </View>
            <View style={styles.yourRankStatItem}>
              <Text style={[styles.yourRankStatValue, { color: colors.text }]}>
                {stats.completedDays}
              </Text>
              <Text style={[styles.yourRankStatLabel, { color: colors.textSecondary }]}>
                {t.days}
              </Text>
            </View>
            <View style={styles.yourRankStatItem}>
              <Text style={[styles.yourRankStatValue, { color: colors.text }]}>
                {stats.totalMerit}
              </Text>
              <Text style={[styles.yourRankStatLabel, { color: colors.textSecondary }]}>
                {(t as any).leaderboardMerit || (t as any).practiceMerit || '功德'}
              </Text>
            </View>
          </View>
        </Card>
      )}

      {/* Leaderboard List */}
      {!p2pEnabled ? (
        <Card style={styles.emptyCard}>
          <Text style={styles.emptyEmoji}>📊</Text>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            {t.leaderboardDisabled}
          </Text>
          <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>
            {language === 'zh'
              ? '启用排行榜后，查看与其他修行者的排名'
              : 'Enable leaderboard to see your ranking among practitioners'}
          </Text>
        </Card>
      ) : loading ? (
        <Card style={styles.emptyCard}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            {t.loading}
          </Text>
        </Card>
      ) : leaderboard.length === 0 ? (
        <Card style={styles.emptyCard}>
          <Text style={styles.emptyEmoji}>🌱</Text>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            {t.noLeaderboardData}
          </Text>
          <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>
            {language === 'zh' ? '成为第一个上榜的修行者！' : 'Be the first on the leaderboard!'}
          </Text>
        </Card>
      ) : (
        <>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {t.leaderboardTitle}
          </Text>
          {leaderboard.map((user, index) =>
            renderLeaderboardItem(user, index, user.userId === userId)
          )}
        </>
      )}

      {/* Nickname Modal */}
      <Modal
        visible={showNicknameModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowNicknameModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {t.setNickname}
            </Text>
            <Text style={[styles.modalHint, { color: colors.textSecondary }]}>
              {language === 'zh'
                ? '请输入2-20个字符的昵称，留空则使用自动生成的昵称'
                : language === 'es'
                ? 'Ingresa 2-20 caracteres, o déjalo vacío para usar nombre auto-generado'
                : 'Enter 2-20 characters, or leave empty for auto-generated nickname'}
            </Text>
            <TextInput
              style={[styles.nicknameInput, {
                color: colors.text,
                backgroundColor: colors.backgroundSecondary,
                borderColor: colors.border,
              }]}
              value={nicknameInput}
              onChangeText={setNicknameInput}
              placeholder={t.nicknamePlaceholder}
              placeholderTextColor={colors.textLight}
              maxLength={20}
              autoFocus
            />
            <View style={styles.modalButtonRow}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelModalButton, { backgroundColor: colors.divider }]}
                onPress={() => setShowNicknameModal(false)}
              >
                <Text style={[styles.modalButtonText, { color: colors.text }]}>
                  {t.cancel}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveModalButton, { backgroundColor: colors.primary }]}
                onPress={handleSetNickname}
              >
                <Text style={styles.saveButtonText}>
                  {t.save}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const createResponsiveStyles = () => {
  const isTablet = layout.maxWidth >= 600;

  return StyleSheet.create({
    content: {
      padding: layout.contentPadding,
      paddingBottom: vs(40),
    },
    title: {
      fontSize: responsive({
        small: fs(24),
        medium: fs(26),
        large: fs(28),
        tablet: fs(36),
        default: fs(28),
      }),
      fontWeight: 'bold',
      marginBottom: vs(16),
    },
    p2pCard: {
      marginBottom: vs(12),
    },
    p2pHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: rs(8),
    },
    p2pInfo: {
      flex: 1,
      marginRight: rs(12),
    },
    p2pTitle: {
      fontSize: responsiveSize.fontSize.lg,
      fontWeight: '600',
      marginBottom: rs(4),
    },
    p2pDesc: {
      fontSize: responsiveSize.fontSize.sm,
    },
    p2pToggle: {
      paddingHorizontal: rs(16),
      paddingVertical: vs(10),
      borderRadius: responsiveSize.borderRadius.md,
    },
    p2pToggleText: {
      color: '#fff',
      fontSize: responsiveSize.fontSize.sm,
      fontWeight: '600',
    },
    privacyNote: {
      fontSize: responsiveSize.fontSize.xs,
      fontStyle: 'italic',
    },
    nicknameCard: {
      marginBottom: vs(12),
    },
    nicknameRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    nicknameInfo: {
      flex: 1,
    },
    nicknameLabel: {
      fontSize: responsiveSize.fontSize.sm,
      marginBottom: rs(4),
    },
    nicknameValueRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: rs(4),
    },
    currentNickname: {
      fontSize: responsiveSize.fontSize.lg,
      fontWeight: '600',
    },
    autoNicknameBadge: {
      fontSize: responsiveSize.fontSize.xs,
      fontStyle: 'italic',
    },
    editButton: {
      paddingHorizontal: rs(16),
      paddingVertical: vs(10),
      borderRadius: responsiveSize.borderRadius.md,
    },
    editButtonText: {
      color: '#fff',
      fontSize: responsiveSize.fontSize.sm,
      fontWeight: '600',
    },
    yourRankCard: {
      marginBottom: vs(16),
      padding: responsive({
        small: rs(16),
        tablet: rs(24),
        default: rs(20),
      }),
      alignItems: 'center',
    },
    yourRankLabel: {
      fontSize: responsiveSize.fontSize.sm,
      marginBottom: rs(8),
    },
    yourRankValue: {
      fontSize: responsive({
        small: fs(36),
        tablet: fs(48),
        default: fs(42),
      }),
      fontWeight: 'bold',
      marginBottom: vs(12),
    },
    yourRankStats: {
      flexDirection: 'row',
      gap: rs(24),
    },
    yourRankStatItem: {
      alignItems: 'center',
    },
    yourRankStatValue: {
      fontSize: responsive({
        small: fs(18),
        tablet: fs(24),
        default: fs(20),
      }),
      fontWeight: 'bold',
    },
    yourRankStatLabel: {
      fontSize: responsiveSize.fontSize.xs,
    },
    sectionTitle: {
      fontSize: responsiveSize.fontSize.lg,
      fontWeight: '600',
      marginBottom: vs(12),
    },
    leaderboardItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: responsive({
        small: rs(12),
        tablet: rs(16),
        default: rs(14),
      }),
      marginBottom: vs(8),
      borderWidth: 1,
      borderColor: 'transparent',
    },
    currentUserItem: {
      borderWidth: 2,
    },
    rankColumn: {
      width: rs(40),
      alignItems: 'center',
    },
    rankEmoji: {
      fontSize: responsive({
        small: fs(20),
        tablet: fs(28),
        default: fs(24),
      }),
    },
    rankText: {
      fontSize: responsive({
        small: fs(16),
        tablet: fs(20),
        default: fs(18),
      }),
      fontWeight: 'bold',
    },
    nicknameColumn: {
      flex: 1,
      marginLeft: rs(8),
    },
    nicknameText: {
      fontSize: responsive({
        small: fs(14),
        tablet: fs(18),
        default: fs(16),
      }),
      fontWeight: '600',
    },
    youBadge: {
      fontSize: responsiveSize.fontSize.xs,
      fontWeight: '600',
    },
    statsColumn: {
      flexDirection: 'row',
      gap: rs(12),
    },
    statItem: {
      alignItems: 'center',
      minWidth: rs(40),
    },
    statValue: {
      fontSize: responsive({
        small: fs(14),
        tablet: fs(18),
        default: fs(16),
      }),
      fontWeight: 'bold',
    },
    statLabel: {
      fontSize: responsiveSize.fontSize.xs,
    },
    emptyCard: {
      padding: responsive({
        small: rs(24),
        tablet: rs(40),
        default: rs(32),
      }),
      alignItems: 'center',
      marginTop: vs(20),
    },
    emptyEmoji: {
      fontSize: responsive({
        small: fs(40),
        tablet: fs(64),
        default: fs(48),
      }),
      marginBottom: vs(12),
    },
    emptyTitle: {
      fontSize: responsiveSize.fontSize.lg,
      fontWeight: '600',
      marginBottom: rs(8),
    },
    emptyDesc: {
      fontSize: responsiveSize.fontSize.sm,
      textAlign: 'center',
    },
    loadingText: {
      fontSize: responsiveSize.fontSize.sm,
      marginTop: vs(12),
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContent: {
      borderRadius: responsiveSize.borderRadius.xl,
      padding: responsive({
        small: rs(20),
        tablet: rs(32),
        default: rs(24),
      }),
      width: '80%',
      maxWidth: rs(320),
      alignItems: 'center',
    },
    modalTitle: {
      fontSize: responsive({
        small: fs(18),
        tablet: fs(22),
        default: fs(20),
      }),
      fontWeight: 'bold',
      marginBottom: rs(8),
      textAlign: 'center',
    },
    modalHint: {
      fontSize: responsiveSize.fontSize.sm,
      marginBottom: vs(20),
      textAlign: 'center',
    },
    nicknameInput: {
      width: '100%',
      borderWidth: 1,
      borderRadius: responsiveSize.borderRadius.md,
      padding: rs(14),
      fontSize: responsive({
        small: fs(16),
        tablet: fs(20),
        default: fs(18),
      }),
      marginBottom: vs(20),
    },
    modalButtonRow: {
      flexDirection: 'row',
      width: '100%',
      gap: rs(12),
    },
    modalButton: {
      flex: 1,
      paddingVertical: vs(14),
      borderRadius: responsiveSize.borderRadius.md,
      alignItems: 'center',
    },
    cancelModalButton: {},
    saveModalButton: {},
    modalButtonText: {
      fontSize: responsive({
        small: fs(14),
        tablet: fs(18),
        default: fs(16),
      }),
      fontWeight: '600',
    },
    saveButtonText: {
      color: '#fff',
      fontSize: responsive({
        small: fs(14),
        tablet: fs(18),
        default: fs(16),
      }),
      fontWeight: '600',
    },
  });
};
