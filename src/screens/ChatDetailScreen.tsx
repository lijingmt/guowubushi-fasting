import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useApp } from '../context/AppContext';
import { useSocial } from '../context/SocialContext';
import { rs, vs, fs, responsiveSize } from '../theme/responsive';
import type { PrivateMessage } from '../types';

export const ChatDetailScreen = ({ route }: any) => {
  const { userId: otherUserId, nickname: otherNickname } = route.params;
  const { t, colors } = useApp();
  const social = useSocial();
  const [text, setText] = useState('');
  const [messages, setMessages] = useState<PrivateMessage[]>([]);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    social.getPrivateMessages(otherUserId);
  }, [otherUserId]);

  useEffect(() => {
    const convMessages = social.getConversationMessages(otherUserId);
    setMessages(convMessages);
  }, [social.privateMessages, otherUserId]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  const handleSend = useCallback(() => {
    if (!text.trim()) return;
    const msgText = text.trim();
    // Optimistic update: show message immediately
    const optimisticMsg: PrivateMessage = {
      id: Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
      fromUserId: social.userId,
      fromNickname: social.nickname,
      toUserId: otherUserId,
      toNickname: otherNickname,
      text: msgText,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, optimisticMsg]);
    social.sendPrivateMessage(otherUserId, otherNickname, msgText);
    setText('');
  }, [text, otherUserId, otherNickname, social]);

  const renderMessage = ({ item }: { item: PrivateMessage }) => {
    const isMe = item.fromUserId === social.userId;
    return (
      <View style={[
        styles.messageRow,
        isMe ? styles.messageRowRight : styles.messageRowLeft,
      ]}>
        <View style={[
          styles.messageBubble,
          {
            backgroundColor: isMe ? colors.primary + '20' : colors.card,
            borderColor: isMe ? colors.primary : colors.border,
          },
        ]}>
          <Text style={[styles.messageText, { color: colors.text }]}>
            {item.text}
          </Text>
          <Text style={[styles.messageTime, { color: colors.textSecondary }]}>
            {formatTime(item.timestamp)}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.listContent}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
      />

      <View style={[styles.inputRow, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
        <TextInput
          style={[styles.input, { color: colors.text, backgroundColor: colors.background }]}
          value={text}
          onChangeText={setText}
          placeholder={t.chatPlaceholder}
          placeholderTextColor={colors.textSecondary}
          maxLength={200}
          returnKeyType="send"
          onSubmitEditing={handleSend}
        />
        <TouchableOpacity
          style={[styles.sendButton, { backgroundColor: text.trim() ? colors.primary : colors.textSecondary + '40' }]}
          onPress={handleSend}
          disabled={!text.trim()}
        >
          <Text style={styles.sendButtonText}>{t.chatSend}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

function formatTime(timestamp: number): string {
  const d = new Date(timestamp);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: responsiveSize.spacing.md,
    paddingTop: vs(8),
    paddingBottom: vs(8),
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: vs(8),
  },
  messageRowLeft: {
    justifyContent: 'flex-start',
  },
  messageRowRight: {
    justifyContent: 'flex-end',
  },
  messageBubble: {
    maxWidth: '75%',
    paddingVertical: vs(10),
    paddingHorizontal: responsiveSize.spacing.md,
    borderRadius: responsiveSize.borderRadius.lg,
    borderWidth: 1,
  },
  messageText: {
    fontSize: fs(14),
    lineHeight: fs(20),
  },
  messageTime: {
    fontSize: fs(11),
    marginTop: vs(4),
    textAlign: 'right',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: responsiveSize.spacing.md,
    paddingTop: vs(24),
    paddingBottom: vs(48),
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    height: vs(40),
    borderRadius: responsiveSize.borderRadius.md,
    paddingHorizontal: responsiveSize.spacing.md,
    fontSize: fs(14),
  },
  sendButton: {
    marginLeft: rs(8),
    paddingHorizontal: rs(16),
    paddingVertical: vs(10),
    borderRadius: responsiveSize.borderRadius.md,
  },
  sendButtonText: {
    color: '#fff',
    fontSize: fs(14),
    fontWeight: '600',
  },
});
