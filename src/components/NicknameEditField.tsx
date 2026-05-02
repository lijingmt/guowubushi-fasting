import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { useSocial } from '../context/SocialContext';
import { useApp } from '../context/AppContext';
import { rs, vs, fs } from '../theme/responsive';

export const NicknameEditField: React.FC = () => {
  const { colors, t } = useApp();
  const { nickname, updateNickname } = useSocial();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(nickname);

  const handleSave = () => {
    const name = draft.trim();
    updateNickname(name);
    setEditing(false);
  };

  if (editing) {
    return (
      <View style={styles.container}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>
          {t.nickname}
        </Text>
        <View style={[styles.editRow, { borderColor: colors.border }]}>
          <TextInput
            style={[styles.input, { color: colors.text }]}
            value={draft}
            onChangeText={setDraft}
            placeholder={t.setNickname}
            placeholderTextColor={colors.textSecondary}
            maxLength={20}
            autoFocus
            onSubmitEditing={handleSave}
            onBlur={handleSave}
            returnKeyType="done"
          />
        </View>
      </View>
    );
  }

  return (
    <TouchableOpacity style={styles.container} onPress={() => { setDraft(nickname); setEditing(true); }}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>
        {t.nickname}
      </Text>
      <Text style={[styles.value, { color: nickname ? colors.text : colors.textSecondary }]}>
        {nickname || t.setNickname}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: vs(4),
  },
  label: {
    fontSize: fs(11),
    marginBottom: vs(2),
  },
  value: {
    fontSize: fs(15),
    fontWeight: '500',
  },
  editRow: {
    borderWidth: 1,
    borderRadius: rs(8),
    paddingHorizontal: rs(12),
    paddingVertical: vs(8),
  },
  input: {
    fontSize: fs(15),
    padding: 0,
  },
});
