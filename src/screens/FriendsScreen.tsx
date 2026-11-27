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
import * as Clipboard from 'expo-clipboard';
import { useSocial } from '../context/SocialContext';
import { useApp } from '../context/AppContext';
import { Card } from '../components/Card';
import { rs, vs, fs } from '../theme/responsive';
import { getLocalDateString, isChineseLanguage } from '../utils/date';

export const FriendsScreen: React.FC<{ embedded?: boolean }> = ({ embedded = false }) => {
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
    buddyChallenges,
    startBuddyChallenge,
    lightBuddyLamp,
    giftRepairCard,
  } = useSocial();
  const isZh = isChineseLanguage(language);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();

  const [addCode, setAddCode] = useState('');
  const today = getLocalDateString();
  const encouragedToday = retentionState.friendEncouragementsSent[today] || [];

  const handleAddFriend = () => {
    const code = addCode.trim();
    if (!code) return;
    if (code === userId) {
      Alert.alert(t.error, (language === 'zh' || language === 'zh-Hant') ? '不能加自己为好友' : 'Cannot add yourself');
      return;
    }
    if (friends.find((f) => f.userId === code)) {
      Alert.alert(t.error, (language === 'zh' || language === 'zh-Hant') ? '已经是好友了' : 'Already friends');
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
        { text: (language === 'zh' || language === 'zh-Hant') ? '取消' : 'Cancel', style: 'cancel' },
        {
          text: (language === 'zh' || language === 'zh-Hant') ? '确定' : 'OK',
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
      (language === 'zh' || language === 'zh-Hant') ? `已鼓励 ${friendNickname || '好友'}，今日社交任务已记录。` : 'Encouragement sent.'
    );
  };

  const handleGiftRepairCard = async (friendUserId: string, friendNickname: string) => {
    if (retentionState.repairCards <= 0) {
      Alert.alert(
        isZh ? '护航补签卡不足' : 'No Repair Cards',
        isZh ? '完成今日满星或里程碑即可获得护航补签卡。' : 'Earn repair cards from daily milestones first.'
      );
      return;
    }
    const ok = await giftRepairCard(friendUserId);
    if (ok) {
      Alert.alert(
        t.success,
        isZh ? `已向 ${friendNickname || '同修'} 赠送 1 张护航补签卡！` : `Gifted 1 repair card to ${friendNickname || 'Buddy'}!`
      );
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingTop: embedded ? vs(12) : insets.top + vs(16) }]}
    >
      {/* My friend code */}
      <Card variant="compact">
        <Text style={[styles.sectionTitle, { color: colors.text }]}>{t.friendCode}</Text>
        <View style={styles.codeRow}>
          <Text style={[styles.codeValue, { color: colors.primary }]}>{userId}</Text>
          <TouchableOpacity
            style={[styles.copyBtn, { backgroundColor: colors.primary }]}
            onPress={async () => {
              await Clipboard.setStringAsync(userId);
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

      {/* 7天/21天双人结伴挑战 */}
      <Card variant="compact" style={styles.sectionGap}>
        <View style={styles.buddyHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>
            🏮 {isZh ? '双人结伴过午挑战' : '7-Day / 21-Day Buddy Pact'}
          </Text>
          <Text style={[styles.buddyCardBadge, { color: colors.primary }]}>
            {isZh ? `护航卡 ${retentionState.repairCards} 张` : `${retentionState.repairCards} Cards`}
          </Text>
        </View>
        {buddyChallenges.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.textSecondary, paddingVertical: vs(10) }]}>
            {isZh
              ? '在下方好友列表中点击“7天结伴”，互相点亮今日过午心灯！'
              : 'Tap "7d Pact" on any friend below to co-light your daily fasting lamp!'}
          </Text>
        ) : (
          buddyChallenges.map((challenge) => {
            const partnerId = challenge.users.find((id) => id !== userId) || challenge.users[0];
            const partnerName =
              challenge.nicknames?.[partnerId] ||
              friends.find((f) => f.userId === partnerId)?.nickname ||
              t.anonymous;
            const myDates = challenge.litDates?.[userId] || [];
            const partnerDates = challenge.litDates?.[partnerId] || [];
            const myLitToday = myDates.includes(today);
            const partnerLitToday = partnerDates.includes(today);
            return (
              <View key={challenge.id} style={[styles.buddyRow, { borderColor: colors.border, backgroundColor: colors.backgroundSecondary }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.friendName, { color: colors.text }]}>
                    {isZh ? `${challenge.durationDays}天过午搭子 · ${partnerName}` : `${challenge.durationDays}d Pact · ${partnerName}`}
                  </Text>
                  <Text style={[styles.friendStatus, { color: colors.textSecondary }]}>
                    {isZh
                      ? `你 ${myDates.length}/${challenge.durationDays} 天 ${myLitToday ? '🏮' : '·'} | 对方 ${partnerDates.length}/${challenge.durationDays} 天 ${partnerLitToday ? '🏮' : '·'}`
                      : `You ${myDates.length}/${challenge.durationDays}d ${myLitToday ? '🏮' : ''} | Partner ${partnerDates.length}/${challenge.durationDays}d ${partnerLitToday ? '🏮' : ''}`}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.encourageBtn, { backgroundColor: myLitToday ? colors.divider : colors.primary }]}
                  disabled={myLitToday}
                  onPress={() => lightBuddyLamp(partnerId, today)}
                >
                  <Text style={[styles.encourageBtnText, { color: myLitToday ? colors.textSecondary : '#fff' }]}>
                    {myLitToday ? (isZh ? '已点灯' : 'Lit') : (isZh ? '点今日灯' : 'Light')}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })
        )}
      </Card>

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
                <View style={styles.friendTopRow}>
                  <TouchableOpacity
                    style={styles.friendMain}
                    onPress={() => navigation.navigate('FriendDetail', { userId: friend.userId, nickname: friend.nickname })}
                  >
                    <View style={[styles.avatar, { backgroundColor: isOnline ? colors.success : colors.textSecondary }]}>
                      <Text style={styles.avatarText}>{(friend.nickname || '?')[0].toUpperCase()}</Text>
                    </View>
                    <View style={styles.friendInfo}>
                      <Text style={[styles.friendName, { color: colors.text }]} numberOfLines={1}>
                        {friend.nickname || t.anonymous}
                      </Text>
                      <Text style={[styles.friendStatus, { color: isOnline ? colors.success : colors.textSecondary }]}>
                        {isOnline ? t.onlineStatus : t.offlineStatus}
                      </Text>
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.removeMiniBtn, { borderColor: colors.border }]}
                    onPress={() => handleRemoveFriend(friend.userId, friend.nickname)}
                  >
                    <Text style={[styles.removeMiniText, { color: colors.textSecondary }]}>
                      {isZh ? '移除' : 'Remove'}
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.friendActions}>
                  <TouchableOpacity
                    style={[styles.encourageBtn, { backgroundColor: encouraged ? colors.divider : colors.primary }]}
                    onPress={() => handleEncourage(friend.userId, friend.nickname)}
                    disabled={encouraged}
                  >
                    <Text style={[styles.encourageBtnText, { color: encouraged ? colors.textSecondary : '#fff' }]}>
                      {encouraged ? (isZh ? '已鼓励' : 'Sent') : (isZh ? '鼓励' : 'Cheer')}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.pactBtn, { borderColor: colors.primary, backgroundColor: colors.primary + '12' }]}
                    onPress={() => {
                      startBuddyChallenge(friend.userId, friend.nickname, 7);
                      Alert.alert(
                        t.success,
                        isZh ? `已和 ${friend.nickname || '好友'} 开启 7 天结伴过午挑战！` : 'Started 7-day buddy pact!'
                      );
                    }}
                  >
                    <Text style={[styles.removeMiniText, { color: colors.primary }]}>
                      {isZh ? '7天结伴' : '7d Pact'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.pactBtn, { borderColor: colors.info, backgroundColor: colors.info + '12' }]}
                    onPress={() => {
                      startBuddyChallenge(friend.userId, friend.nickname, 21);
                      Alert.alert(
                        t.success,
                        isZh ? `已和 ${friend.nickname || '好友'} 开启 21 天结伴修行挑战！` : 'Started 21-day buddy pact!'
                      );
                    }}
                  >
                    <Text style={[styles.removeMiniText, { color: colors.info }]}>
                      {isZh ? '21天结伴' : '21d Pact'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.pactBtn, { borderColor: colors.warning, backgroundColor: colors.warning + '12' }]}
                    onPress={() => handleGiftRepairCard(friend.userId, friend.nickname)}
                  >
                    <Text style={[styles.removeMiniText, { color: colors.warning }]}>
                      {isZh ? '赠护航卡' : 'Gift Card'}
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
    paddingVertical: vs(12),
    borderBottomWidth: 1,
    gap: vs(10),
  },
  friendTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: rs(8),
  },
  encourageBtn: {
    borderRadius: rs(8),
    paddingHorizontal: rs(12),
    paddingVertical: vs(7),
  },
  encourageBtnText: {
    fontSize: fs(12),
    fontWeight: '800',
  },
  pactBtn: {
    borderWidth: 1,
    borderRadius: rs(8),
    paddingHorizontal: rs(10),
    paddingVertical: vs(6),
  },
  removeMiniBtn: {
    borderWidth: 1,
    borderRadius: rs(8),
    paddingHorizontal: rs(9),
    paddingVertical: vs(5),
  },
  removeMiniText: {
    fontSize: fs(11),
    fontWeight: '700',
  },
  buddyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: vs(8),
  },
  buddyCardBadge: {
    fontSize: fs(12),
    fontWeight: '700',
  },
  buddyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: rs(12),
    padding: rs(10),
    marginTop: vs(8),
    gap: rs(8),
  },
});
