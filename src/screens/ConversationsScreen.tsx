import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useApp } from '../context/AppContext';
import { useSocial } from '../context/SocialContext';
import { rs, vs, fs, responsiveSize } from '../theme/responsive';

export const ConversationsScreen = () => {
  const { t, colors, language } = useApp();
  const social = useSocial();
  const navigation = useNavigation<any>();

  const conversations = social.getConversations();

  const renderItem = ({ item }: { item: { userId: string; nickname: string; lastMessage: any; unreadCount: number } }) => (
    <TouchableOpacity
      style={[styles.row, { backgroundColor: colors.card, borderColor: item.unreadCount > 0 ? colors.primary : colors.border }]}
      onPress={() => {
        social.markMessagesAsRead(item.userId);
        navigation.navigate('ChatDetail', {
          userId: item.userId,
          nickname: item.nickname || `${t.anonymous}`,
        });
      }}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>
          {(item.nickname || '?')[0].toUpperCase()}
        </Text>
      </View>
      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
            {item.nickname || `${t.anonymous} #${item.userId.substring(0, 4)}`}
          </Text>
          <Text style={[styles.time, { color: colors.textSecondary }]}>
            {formatTime(item.lastMessage.timestamp)}
          </Text>
        </View>
        <View style={styles.messageRow}>
          <Text style={[styles.lastMessage, { color: colors.textSecondary }]} numberOfLines={1}>
            {item.lastMessage.text}
          </Text>
          {item.unreadCount > 0 && (
            <View style={[styles.badge, { backgroundColor: colors.primary }]}>
              <Text style={styles.badgeText}>{item.unreadCount}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {conversations.length > 0 ? (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.userId}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
        />
      ) : (
        <View style={styles.empty}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            {language === 'zh' ? '暂无私信' : 'No messages yet'}
          </Text>
          <Text style={[styles.emptyHint, { color: colors.textSecondary }]}>
            {language === 'zh' ? '在排行榜加好友后可发私信' : 'Add friends from leaderboard to chat'}
          </Text>
        </View>
      )}
    </View>
  );
};

function formatTime(timestamp: number): string {
  const d = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 86400000 && d.getDate() === now.getDate()) {
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }
  if (diff < 172800000) return '昨天';
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: { padding: responsiveSize.spacing.md, paddingTop: vs(16) },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: responsiveSize.spacing.md,
    borderRadius: responsiveSize.borderRadius.lg,
    borderWidth: 1,
    marginBottom: vs(8),
  },
  avatar: {
    width: rs(44),
    height: rs(44),
    borderRadius: rs(22),
    backgroundColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: rs(12),
  },
  avatarText: { color: '#fff', fontSize: fs(18), fontWeight: '600' },
  info: { flex: 1 },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: vs(4),
  },
  name: { fontSize: fs(15), fontWeight: '600', flex: 1 },
  time: { fontSize: fs(12), marginLeft: rs(8) },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  lastMessage: { fontSize: fs(13), flex: 1 },
  badge: {
    minWidth: rs(20),
    height: rs(20),
    borderRadius: rs(10),
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: rs(6),
    marginLeft: rs(8),
  },
  badgeText: { color: '#fff', fontSize: fs(11), fontWeight: '600' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: rs(40) },
  emptyText: { fontSize: fs(16), fontWeight: '600', marginBottom: vs(8) },
  emptyHint: { fontSize: fs(13), textAlign: 'center' },
});
