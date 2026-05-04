import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Keyboard,
  Platform,
} from 'react-native';
import { useSocial } from '../context/SocialContext';
import { useApp } from '../context/AppContext';
import { Card } from './Card';
import { rs, vs, fs } from '../theme/responsive';

const MAX_LENGTH = 200;

export const ChatPanel: React.FC = () => {
  const { colors, t } = useApp();
  const { chatMessages, sendChat, userId } = useSocial();
  const [inputText, setInputText] = useState('');
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    const onShow = (e: any) => setKeyboardHeight(e.endCoordinates?.height || 0);
    const onHide = () => setKeyboardHeight(0);
    const showSub = Keyboard.addListener('keyboardDidShow', onShow);
    const hideSub = Keyboard.addListener('keyboardDidHide', onHide);
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  useEffect(() => {
    if (chatMessages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [chatMessages.length]);

  const handleSend = () => {
    const text = inputText.trim();
    if (!text) return;
    sendChat(text);
    setInputText('');
  };

  const formatTime = (timestamp: number) => {
    const d = new Date(timestamp);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  const getDisplayName = (msg: { userId: string; nickname: string }) => {
    if (msg.nickname && msg.nickname !== 'Anonymous') return msg.nickname;
    return `${t.anonymous} #${msg.userId.substring(0, 4)}`;
  };

  return (
    <Card variant="compact" style={styles.container}>
      <Text style={[styles.header, { color: colors.text }]}>
        💬 {t.chatTitle}
      </Text>

      <View style={[styles.messageList, { borderColor: colors.border }]}>
        {chatMessages.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            {t.noMessages}
          </Text>
        ) : (
          <FlatList
            ref={flatListRef}
            data={chatMessages}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.messageRow}>
                <Text style={[styles.messageName, { color: colors.primary }]}>
                  {item.userId === userId ? t.you : getDisplayName(item)}
                </Text>
                <Text style={[styles.messageText, { color: colors.text }]}>
                  {item.text}
                </Text>
                <Text style={[styles.messageTime, { color: colors.textSecondary }]}>
                  {formatTime(item.timestamp)}
                </Text>
              </View>
            )}
            style={styles.flatList}
            scrollEnabled={true}
          />
        )}
      </View>

      <View style={[styles.inputRow, { borderColor: colors.border, marginBottom: keyboardHeight > 0 ? keyboardHeight - 80 : 0 }]}>
        <TextInput
          style={[styles.input, { color: colors.text, borderColor: colors.border }]}
          value={inputText}
          onChangeText={setInputText}
          placeholder={t.chatPlaceholder}
          placeholderTextColor={colors.textSecondary}
          maxLength={MAX_LENGTH}
          onSubmitEditing={handleSend}
          returnKeyType="send"
        />
        <TouchableOpacity
          style={[styles.sendBtn, { backgroundColor: colors.primary }]}
          onPress={handleSend}
          disabled={!inputText.trim()}
        >
          <Text style={styles.sendBtnText}>{t.chatSend}</Text>
        </TouchableOpacity>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: vs(8),
  },
  header: {
    fontSize: fs(14),
    fontWeight: '600',
    marginBottom: vs(8),
  },
  messageList: {
    height: vs(200),
    borderWidth: 1,
    borderRadius: rs(8),
    padding: rs(8),
    marginBottom: vs(8),
  },
  flatList: {
    flex: 1,
  },
  emptyText: {
    fontSize: fs(12),
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: vs(80),
  },
  messageRow: {
    marginBottom: vs(6),
  },
  messageName: {
    fontSize: fs(11),
    fontWeight: '600',
  },
  messageText: {
    fontSize: fs(13),
    marginTop: vs(1),
  },
  messageTime: {
    fontSize: fs(10),
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: vs(8),
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: rs(8),
    paddingHorizontal: rs(12),
    paddingVertical: vs(8),
    fontSize: fs(14),
    marginRight: rs(8),
  },
  sendBtn: {
    borderRadius: rs(8),
    paddingHorizontal: rs(16),
    paddingVertical: vs(10),
  },
  sendBtnText: {
    color: '#fff',
    fontSize: fs(14),
    fontWeight: '600',
  },
});
