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
import { useSocial } from '../context/SocialContext';
import { useApp } from '../context/AppContext';
import { Card } from '../components/Card';
import { FriendListItem } from '../components/FriendListItem';
import { rs, vs, fs } from '../theme/responsive';

export const FriendsScreen: React.FC = () => {
  const { colors, t, language } = useApp();
  const {
    userId,
    nickname,
    friends,
    friendRequests,
    sendFriendRequest,
    respondToFriendRequest,
    removeFriend,
  } = useSocial();
  const insets = useSafeAreaInsets();

  const [addCode, setAddCode] = useState('');

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
          friends.map((friend) => (
            <FriendListItem
              key={friend.userId}
              userId={friend.userId}
              nickname={friend.nickname}
              onPress={() => handleRemoveFriend(friend.userId, friend.nickname)}
            />
          ))
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
});
