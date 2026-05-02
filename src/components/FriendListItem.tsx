import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSocial } from '../context/SocialContext';
import { useApp } from '../context/AppContext';
import { rs, vs, fs } from '../theme/responsive';

interface Props {
  userId: string;
  nickname: string;
  onPress?: () => void;
}

export const FriendListItem: React.FC<Props> = ({ userId, nickname, onPress }) => {
  const { colors, t } = useApp();
  const { onlineUsers } = useSocial();
  const isOnline = onlineUsers.some((u) => u.id === userId);

  return (
    <TouchableOpacity style={[styles.row, { borderBottomColor: colors.border }]} onPress={onPress}>
      <View style={[styles.avatar, { backgroundColor: isOnline ? '#4CAF50' : colors.textSecondary }]}>
        <Text style={styles.avatarText}>
          {(nickname || '?')[0].toUpperCase()}
        </Text>
      </View>
      <View style={styles.info}>
        <Text style={[styles.name, { color: colors.text }]}>
          {nickname || t.anonymous}
        </Text>
        <Text style={[styles.status, { color: isOnline ? '#4CAF50' : colors.textSecondary }]}>
          {isOnline ? t.onlineStatus : t.offlineStatus}
        </Text>
      </View>
      <View style={[styles.dot, { backgroundColor: isOnline ? '#4CAF50' : 'transparent' }]} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: vs(12),
    borderBottomWidth: 1,
  },
  avatar: {
    width: rs(40),
    height: rs(40),
    borderRadius: rs(20),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: rs(12),
  },
  avatarText: {
    color: '#fff',
    fontSize: fs(16),
    fontWeight: '600',
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: fs(16),
    fontWeight: '500',
  },
  status: {
    fontSize: fs(12),
    marginTop: vs(2),
  },
  dot: {
    width: rs(10),
    height: rs(10),
    borderRadius: rs(5),
  },
});
