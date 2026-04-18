import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  NativeModules,
} from 'react-native';
import { useApp } from '../context/AppContext';
import { Card } from '../components/Card';

// GameCenter types
interface GameCenterScore {
  rank: number;
  playerID: string;
  score: number;
}

interface LeaderboardData {
  streak: GameCenterScore[];
  totalDays: GameCenterScore[];
  merit: GameCenterScore[];
  myRank?: {
    streak: number;
    totalDays: number;
    merit: number;
  };
}

type LeaderboardType = 'streak' | 'totalDays' | 'merit';

export const LeaderboardScreen: React.FC = () => {
  const { t, colors, language, stats } = useApp();
  const [selectedTab, setSelectedTab] = useState<LeaderboardType>('streak');
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardData>({
    streak: [],
    totalDays: [],
    merit: [],
  });
  const [error, setError] = useState<string | null>(null);

  // GameCenter leaderboard IDs
  const LEADERBOARD_IDS = {
    streak: 'com.guowu.fasting.streak',
    totalDays: 'com.guowu.fasting.totaldays',
    merit: 'com.guowu.fasting.merit',
  };

  useEffect(() => {
    if (Platform.OS === 'ios') {
      authenticateAndLoadLeaderboard();
    } else {
      setLoading(false);
    }
  }, []);

  const authenticateAndLoadLeaderboard = async () => {
    try {
      setLoading(true);
      setError(null);

      // Try to authenticate with GameCenter
      const isAuthenticated = await GameCenter.authenticatePlayer();
      setIsAuthenticated(isAuthenticated);

      if (isAuthenticated) {
        // Load leaderboards
        await loadLeaderboards();
        // Submit current score
        await submitScores();
      }
    } catch (err) {
      setError(t.gameCenterRequired);
    } finally {
      setLoading(false);
    }
  };

  const loadLeaderboards = async () => {
    try {
      const streak = await GameCenter.loadLeaderboard(LEADERBOARD_IDS.streak);
      const totalDays = await GameCenter.loadLeaderboard(LEADERBOARD_IDS.totalDays);
      const merit = await GameCenter.loadLeaderboard(LEADERBOARD_IDS.merit);

      setLeaderboardData({
        streak: streak.scores,
        totalDays: totalDays.scores,
        merit: merit.scores,
        myRank: {
          streak: streak.localPlayerScore?.rank,
          totalDays: totalDays.localPlayerScore?.rank,
          merit: merit.localPlayerScore?.rank,
        },
      });
    } catch (err) {
      console.error('Failed to load leaderboards:', err);
    }
  };

  const submitScores = async () => {
    try {
      // Submit current stats to GameCenter
      await GameCenter.submitScore({
        leaderboardID: LEADERBOARD_IDS.streak,
        score: stats.currentStreak,
      });
      await GameCenter.submitScore({
        leaderboardID: LEADERBOARD_IDS.totalDays,
        score: stats.completedDays,
      });
      await GameCenter.submitScore({
        leaderboardID: LEADERBOARD_IDS.merit,
        score: stats.totalMerit || 0,
      });
    } catch (err) {
      console.error('Failed to submit scores:', err);
    }
  };

  const showGameCenterLeaderboard = async (leaderboardID: string) => {
    try {
      await GameCenter.showLeaderboard(leaderboardID);
    } catch (err) {
      console.error('Failed to show GameCenter leaderboard:', err);
    }
  };

  const renderContent = () => {
    // Android - show coming soon
    if (Platform.OS === 'android') {
      return (
        <View style={styles.centerContainer}>
          <Text style={styles.comingSoonIcon}>🎮</Text>
          <Text style={[styles.comingSoonText, { color: colors.text }]}>
            {t.comingSoon}
          </Text>
          <Text style={[styles.comingSoonSubtext, { color: colors.textSecondary }]}>
            {t.androidComingSoon}
          </Text>
        </View>
      );
    }

    // Loading
    if (loading) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            {t.loading}
          </Text>
        </View>
      );
    }

    // Not authenticated
    if (!isAuthenticated) {
      return (
        <View style={styles.centerContainer}>
          <Text style={styles.gameCenterIcon}>🎮</Text>
          <Text style={[styles.notAuthTitle, { color: colors.text }]}>
            {t.notLoggedIn}
          </Text>
          <Text style={[styles.notAuthText, { color: colors.textSecondary }]}>
            {t.gameCenterRequired}
          </Text>
          <TouchableOpacity
            style={[styles.loginButton, { backgroundColor: colors.primary }]}
            onPress={authenticateAndLoadLeaderboard}
          >
            <Text style={styles.loginButtonText}>{t.loginGameCenter}</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // Leaderboard content
    return (
      <View style={styles.leaderboardContainer}>
        {/* Tab selector */}
        <View style={styles.tabSelector}>
          <TouchableOpacity
            style={[
              styles.tab,
              selectedTab === 'streak' && [styles.tabActive, { backgroundColor: colors.primary }],
            ]}
            onPress={() => setSelectedTab('streak')}
          >
            <Text
              style={[
                styles.tabText,
                { color: selectedTab === 'streak' ? '#fff' : colors.textSecondary },
              ]}
            >
              {t.leaderboardStreak}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.tab,
              selectedTab === 'totalDays' && [styles.tabActive, { backgroundColor: colors.primary }],
            ]}
            onPress={() => setSelectedTab('totalDays')}
          >
            <Text
              style={[
                styles.tabText,
                { color: selectedTab === 'totalDays' ? '#fff' : colors.textSecondary },
              ]}
            >
              {t.leaderboardTotal}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.tab,
              selectedTab === 'merit' && [styles.tabActive, { backgroundColor: colors.primary }],
            ]}
            onPress={() => setSelectedTab('merit')}
          >
            <Text
              style={[
                styles.tabText,
                { color: selectedTab === 'merit' ? '#fff' : colors.textSecondary },
              ]}
            >
              {t.leaderboardMerit}
            </Text>
          </TouchableOpacity>
        </View>

        {/* My rank */}
        {leaderboardData.myRank && (
          <Card style={styles.myRankCard}>
            <View style={styles.myRankContent}>
              <View>
                <Text style={[styles.myRankLabel, { color: colors.textSecondary }]}>
                  {t.myRank}
                </Text>
                <Text style={[styles.myRankValue, { color: colors.primary }]}>
                  #{leaderboardData.myRank[selectedTab] || '-'}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.viewGameCenterButton, { backgroundColor: colors.backgroundSecondary }]}
                onPress={() => showGameCenterLeaderboard(LEADERBOARD_IDS[selectedTab])}
              >
                <Text style={[styles.viewGameCenterText, { color: colors.text }]}>
                  GameCenter →
                </Text>
              </TouchableOpacity>
            </View>
          </Card>
        )}

        {/* Leaderboard list */}
        <ScrollView style={styles.leaderboardList}>
          {leaderboardData[selectedTab].map((item, index) => (
            <Card key={item.playerID} style={styles.leaderboardItem}>
              <View style={styles.leaderboardItemContent}>
                <View style={styles.rankContainer}>
                  <Text
                    style={[
                      styles.rankNumber,
                      { color: index < 3 ? colors.primary : colors.textSecondary },
                    ]}
                  >
                    {item.rank}
                  </Text>
                  {index < 3 && (
                    <Text style={styles.rankMedal}>
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                    </Text>
                  )}
                </View>
                <View style={styles.playerInfo}>
                  <Text style={[styles.playerName, { color: colors.text }]}>
                    {`${t.nickname} ${item.rank}`}
                  </Text>
                </View>
                <Text style={[styles.playerScore, { color: colors.primary }]}>
                  {item.score}
                </Text>
              </View>
            </Card>
          ))}
        </ScrollView>

        {/* Refresh button */}
        <TouchableOpacity
          style={[styles.refreshButton, { backgroundColor: colors.backgroundSecondary }]}
          onPress={loadLeaderboards}
        >
          <Text style={[styles.refreshButtonText, { color: colors.text }]}>
            {t.refresh}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>{t.leaderboardTitle}</Text>
      {renderContent()}
    </View>
  );
};

// GameCenter API (uses native module)
const GameCenter = Platform.OS === 'ios' ? {
  authenticatePlayer: (): Promise<boolean> => {
    return (NativeModules.GameCenter as any)?.authenticatePlayer() || Promise.resolve(false);
  },
  loadLeaderboard: (leaderboardID: string): Promise<{ scores: any[]; localPlayerScore?: any }> => {
    return (NativeModules.GameCenter as any)?.loadLeaderboard(leaderboardID) || Promise.resolve({ scores: [] });
  },
  submitScore: (params: { leaderboardID: string; score: number }): Promise<void> => {
    return (NativeModules.GameCenter as any)?.submitScore(params.leaderboardID, params.score) || Promise.resolve();
  },
  showLeaderboard: (leaderboardID: string): Promise<void> => {
    return (NativeModules.GameCenter as any)?.showLeaderboard(leaderboardID) || Promise.resolve();
  },
} : {
  // Android fallback
  authenticatePlayer: (): Promise<boolean> => Promise.resolve(false),
  loadLeaderboard: (): Promise<{ scores: any[]; localPlayerScore?: any }> => Promise.resolve({ scores: [] }),
  submitScore: (): Promise<void> => Promise.resolve(),
  showLeaderboard: (): Promise<void> => Promise.resolve(),
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  comingSoonIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  comingSoonText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  comingSoonSubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
  gameCenterIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  notAuthTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  notAuthText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  loginButton: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 25,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
  },
  leaderboardContainer: {
    flex: 1,
  },
  tabSelector: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  tabActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
  },
  myRankCard: {
    marginBottom: 16,
  },
  myRankContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  myRankLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  myRankValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  viewGameCenterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  viewGameCenterText: {
    fontSize: 12,
    fontWeight: '600',
  },
  leaderboardList: {
    flex: 1,
  },
  leaderboardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginBottom: 8,
  },
  leaderboardItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  rankContainer: {
    width: 50,
    alignItems: 'center',
  },
  rankNumber: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  rankMedal: {
    fontSize: 20,
    marginTop: 2,
  },
  playerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  playerName: {
    fontSize: 15,
    fontWeight: '500',
  },
  playerScore: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  refreshButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  refreshButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
