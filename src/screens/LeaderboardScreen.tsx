import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { useApp } from '../context/AppContext';

export const LeaderboardScreen: React.FC = () => {
  const { t, colors } = useApp();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>{t.leaderboardTitle}</Text>
      <View style={styles.centerContainer}>
        <Text style={styles.comingSoonIcon}>🎮</Text>
        <Text style={[styles.comingSoonText, { color: colors.text }]}>
          {t.comingSoon}
        </Text>
        <Text style={[styles.comingSoonSubtext, { color: colors.textSecondary }]}>
          排行榜功能开发中...
        </Text>
      </View>
    </View>
  );
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
});
