import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { useSocial } from '../context/SocialContext';
import { useApp } from '../context/AppContext';
import { Card } from './Card';
import { rs, vs, fs } from '../theme/responsive';

export const OnlineMeditatorsList: React.FC = () => {
  const { colors, t } = useApp();
  const { onlineUsers } = useSocial();

  const getDisplayName = (user: { id: string; nickname: string }) => {
    if (user.nickname) return user.nickname;
    return `${t.anonymous} #${user.id.substring(0, 4)}`;
  };

  const getElapsedTime = (startedAt: number) => {
    const minutes = Math.floor((Date.now() - startedAt) / 60000);
    if (minutes < 1) return '< 1min';
    if (minutes < 60) return `${minutes}min`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h${minutes % 60}m`;
  };

  return (
    <Card variant="compact">
      <Text style={[styles.header, { color: colors.text }]}>
        🧘 {onlineUsers.length} {t.meditatingNow}
      </Text>
      {onlineUsers.length === 0 ? (
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          {t.noOnlineUsers}
        </Text>
      ) : (
        <FlatList
          data={onlineUsers}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.userRow}>
              <View style={[styles.dot, { backgroundColor: colors.primary }]} />
              <Text style={[styles.userName, { color: colors.text }]}>
                {getDisplayName(item)}
              </Text>
              <Text style={[styles.elapsed, { color: colors.textSecondary }]}>
                {getElapsedTime(item.startedAt)}
              </Text>
            </View>
          )}
          scrollEnabled={false}
        />
      )}
    </Card>
  );
};

const styles = StyleSheet.create({
  header: {
    fontSize: fs(14),
    fontWeight: '600',
    marginBottom: vs(8),
  },
  emptyText: {
    fontSize: fs(12),
    fontStyle: 'italic',
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: vs(4),
  },
  dot: {
    width: rs(8),
    height: rs(8),
    borderRadius: rs(4),
    marginRight: rs(8),
  },
  userName: {
    flex: 1,
    fontSize: fs(13),
  },
  elapsed: {
    fontSize: fs(11),
  },
});
