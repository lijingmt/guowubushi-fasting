import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Alert,
  ScrollView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useSocial } from '../context/SocialContext';
import { useApp } from '../context/AppContext';
import { Card } from '../components/Card';
import { rs, vs, fs } from '../theme/responsive';

export const FriendsScreen: React.FC = () => {
  const { colors, t, language, retentionState } = useApp();
  const {
    userId,
    friends,
    friendRequests,
    sendFriendRequest,
    respondToFriendRequest,
    removeFriend,
    sendFriendEncouragement,
    onlineUsers,
  } = useSocial();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();

  const [addCode, setAddCode] = useState('');
  const today = new Date().toISOString().split('T')[0];
  const encouragedToday = retentionState.friendEncouragementsSent[today] || [];

  const handleAddFriend = () => {
    const code = addCode.trim();
    if (!code) return;
    if (code === userId) {
      Alert.alert(t.error, language === 'zh' ? '不能加自己为好友' : 'Cannot add yourself');
      return;
    }
    if (friends.find((f) => f.userId === code)) {
      Alert.alert(t.error, language === 'zh' ? '已经是好友了' : 'Already friends');
      return;
    }
    sendFriendRequest(code);
    setAddCode('');
    Alert.alert(t.success, t.requestSent);
  };

  const handleAccept = (requestId: string, fromUserId: string) => {
    respondToFriendRequest(requestId, fromUserId, true);
  };

  const handleReject = (requestId: string, fromUserId: string) => {
    respondToFriendRequest(requestId, fromUserId, false);
  };

  const handleRemoveFriend = (friendUserId: string, friendNickname: string) => {
    Alert.alert(
      t.removeFriend,
      t.removeFriendConfirm,
      [
        { text: language === 'zh' ? '取消' : 'Cancel', style: 'cancel' },
        {
          text: language === 'zh' ? '确定' : 'OK',
          style: 'destructive',
          onPress: () => removeFriend(friendUserId),
        },
      ]
    );
  };

  const handleEncourage = async (friendUserId: string, friendNickname: string) => {
    await sendFriendEncouragement(friendUserId, friendNickname, 'cheer');
    Alert.alert(
      t.success,
      language === 'zh' ? `已鼓励 ${friendNickname || '好友'}，今日社交任务已记录。` : 'Encouragement sent.'
    );
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={[styles.content, { paddingTop: insets.top + vs(20) }]}>
      {/* My friend code */}
      <Card variant="compact">
        <Text style={[styles.sectionTitle, { color: colors.text }]}>{t.friendCode}</Text>
        <View style={styles.codeRow}>
          <Text style={[styles.codeValue, { color: colors.primary }]}>{userId}</Text>
          <TouchableOpacity
            style={[styles.copyBtn, { backgroundColor: colors.primary }]}
            onPress={() => {
              // Copy to clipboard
              const { Clipboard } = require('react-native');
              Clipboard.setString(userId);
              Alert.alert(t.success, t.friendCodeCopied);
            }}
          >
            <Text style={styles.copyBtnText}>{t.copyFriendCode}</Text>
          </TouchableOpacity>
        </View>
      </Card>

      {/* Add friend */}
      <Card variant="compact" style={styles.sectionGap}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>{t.addFriend}</Text>
        <View style={styles.addRow}>
          <TextInput
            style={[styles.addInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
            value={addCode}
            onChangeText={setAddCode}
            placeholder={t.enterFriendCode}
            placeholderTextColor={colors.textSecondary}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: colors.primary }]}
            onPress={handleAddFriend}
          >
            <Text style={styles.addBtnText}>{t.sendRequest}</Text>
          </TouchableOpacity>
        </View>
      </Card>

      {/* Pending friend requests */}
      {friendRequests.length > 0 && (
        <Card variant="compact" style={styles.sectionGap}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {t.pendingRequests} ({friendRequests.length})
          </Text>
          {friendRequests.map((req) => (
            <View key={req.id} style={[styles.requestRow, { borderBottomColor: colors.border }]}>
              <Text style={[styles.requestName, { color: colors.text }]}>
                {req.fromNickname || t.anonymous}
              </Text>
              <View style={styles.requestActions}>
                <TouchableOpacity
                  style={[styles.acceptBtn, { backgroundColor: '#4CAF50' }]}
                  onPress={() => handleAccept(req.id, req.fromUserId)}
                >
                  <Text style={styles.actionBtnText}>{t.accept}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.rejectBtn, { backgroundColor: colors.error || '#f44336' }]}
                  onPress={() => handleReject(req.id, req.fromUserId)}
                >
                  <Text style={styles.actionBtnText}>{t.reject}</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </Card>
      )}

      {/* Friends list */}
      <Card variant="compact" style={styles.sectionGap}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {t.friendsTitle} ({friends.length})
        </Text>
        {friends.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            {t.noFriends}
          </Text>
        ) : (
          friends.map((friend) => {
            const isOnline = onlineUsers.some((u) => u.id === friend.userId);
            const encouraged = encouragedToday.includes(friend.userId);
            return (
              <View key={friend.userId} style={[styles.friendRow, { borderBottomColor: colors.border }]}>
                <TouchableOpacity
                  style={styles.friendMain}
                  onPress={() => navigation.navigate('FriendDetail', { userId: friend.userId, nickname: friend.nickname })}
                >
                  <View style={[styles.avatar, { backgroundColor: isOnline ? colors.success : colors.textSecondary }]}>
                    <Text style={styles.avatarText}>{(friend.nickname || '?')[0].toUpperCase()}</Text>
                  </View>
                  <View style={styles.friendInfo}>
                    <Text style={[styles.friendName, { color: colors.text }]}>{friend.nickname || t.anonymous}</Text>
                    <Text style={[styles.friendStatus, { color: isOnline ? colors.success : colors.textSecondary }]}>
                      {isOnline ? t.onlineStatus : t.offlineStatus}
                    </Text>
                  </View>
                </TouchableOpacity>
                <View style={styles.friendActions}>
                  <TouchableOpacity
                    style={[styles.encourageBtn, { backgroundColor: encouraged ? colors.divider : colors.primary }]}
                    onPress={() => handleEncourage(friend.userId, friend.nickname)}
                    disabled={encouraged}
                  >
                    <Text style={[styles.encourageBtnText, { color: encouraged ? colors.textSecondary : '#fff' }]}>
                      {encouraged ? (language === 'zh' ? '已鼓励' : 'Sent') : (language === 'zh' ? '鼓励' : 'Cheer')}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.removeMiniBtn, { borderColor: colors.error || '#f44336' }]}
                    onPress={() => handleRemoveFriend(friend.userId, friend.nickname)}
                  >
                    <Text style={[styles.removeMiniText, { color: colors.error || '#f44336' }]}>
                      {language === 'zh' ? '移除' : 'Remove'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </Card>

      <View style={{ height: vs(40) }} />
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
  sectionGap: {
    marginTop: vs(12),
  },
  sectionTitle: {
    fontSize: fs(16),
    fontWeight: '600',
    marginBottom: vs(8),
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  codeValue: {
    fontSize: fs(14),
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    flex: 1,
  },
  copyBtn: {
    borderRadius: rs(8),
    paddingHorizontal: rs(12),
    paddingVertical: vs(6),
    marginLeft: rs(8),
  },
  copyBtnText: {
    color: '#fff',
    fontSize: fs(12),
    fontWeight: '600',
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: rs(8),
    paddingHorizontal: rs(12),
    paddingVertical: vs(10),
    fontSize: fs(14),
    marginRight: rs(8),
  },
  addBtn: {
    borderRadius: rs(8),
    paddingHorizontal: rs(16),
    paddingVertical: vs(10),
  },
  addBtnText: {
    color: '#fff',
    fontSize: fs(14),
    fontWeight: '600',
  },
  requestRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: vs(10),
    borderBottomWidth: 1,
  },
  requestName: {
    fontSize: fs(15),
    flex: 1,
  },
  requestActions: {
    flexDirection: 'row',
  },
  acceptBtn: {
    borderRadius: rs(6),
    paddingHorizontal: rs(12),
    paddingVertical: vs(6),
    marginRight: rs(8),
  },
  rejectBtn: {
    borderRadius: rs(6),
    paddingHorizontal: rs(12),
    paddingVertical: vs(6),
  },
  actionBtnText: {
    color: '#fff',
    fontSize: fs(12),
    fontWeight: '600',
  },
  emptyText: {
    fontSize: fs(14),
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: vs(16),
  },
  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: vs(12),
    borderBottomWidth: 1,
    gap: rs(8),
  },
  friendMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
  },
  avatar: {
    width: rs(40),
    height: rs(40),
    borderRadius: rs(20),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: rs(10),
  },
  avatarText: {
    color: '#fff',
    fontSize: fs(16),
    fontWeight: '700',
  },
  friendInfo: {
    flex: 1,
    minWidth: 0,
  },
  friendName: {
    fontSize: fs(15),
    fontWeight: '700',
  },
  friendStatus: {
    fontSize: fs(12),
    marginTop: vs(2),
  },
  friendActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(6),
  },
  encourageBtn: {
    borderRadius: rs(8),
    paddingHorizontal: rs(10),
    paddingVertical: vs(7),
  },
  encourageBtnText: {
    fontSize: fs(12),
    fontWeight: '800',
  },
  removeMiniBtn: {
    borderWidth: 1,
    borderRadius: rs(8),
    paddingHorizontal: rs(8),
    paddingVertical: vs(6),
  },
  removeMiniText: {
    fontSize: fs(11),
    fontWeight: '700',
  },
});
