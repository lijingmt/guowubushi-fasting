import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useApp } from '../context/AppContext';
import { TempleMapScreen } from './TempleMapScreen';
import { LeaderboardScreen } from './LeaderboardScreen';
import { FriendsScreen } from './FriendsScreen';
import { fs, rs, vs } from '../theme/responsive';

type JourneyTab = 'pilgrimage' | 'leaderboard' | 'buddies';

export const JourneyScreen: React.FC = () => {
  const { colors, language } = useApp();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<JourneyTab>('pilgrimage');
  const isZh = language === 'zh' || language === 'zh-Hant';

  const tabs: { id: JourneyTab; label: string }[] = [
    {
      id: 'pilgrimage',
      label: isZh ? '云行脚' : language === 'es' ? 'Ruta' : 'Pilgrimage',
    },
    {
      id: 'leaderboard',
      label: isZh ? '排行榜' : language === 'es' ? 'Ranking' : 'Ranking',
    },
    {
      id: 'buddies',
      label: isZh ? '结伴搭子' : language === 'es' ? 'Compañeros' : 'Buddies',
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.segmentWrapper,
          {
            paddingTop: Math.max(insets.top + vs(8), vs(18)),
            backgroundColor: colors.background,
            borderBottomColor: colors.divider,
          },
        ]}
      >
        <View style={[styles.segmentBar, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
          {tabs.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                style={[
                  styles.segmentButton,
                  active && { backgroundColor: colors.primary },
                ]}
                onPress={() => {
                  Haptics.selectionAsync();
                  setActiveTab(tab.id);
                }}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.segmentText,
                    { color: active ? '#FFFFFF' : colors.textSecondary },
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.content}>
        {activeTab === 'pilgrimage' && <TempleMapScreen embedded />}
        {activeTab === 'leaderboard' && <LeaderboardScreen embedded />}
        {activeTab === 'buddies' && <FriendsScreen embedded />}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  segmentWrapper: {
    paddingHorizontal: rs(16),
    paddingBottom: vs(10),
    borderBottomWidth: 1,
  },
  segmentBar: {
    flexDirection: 'row',
    borderRadius: rs(14),
    padding: rs(4),
    borderWidth: 1,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: vs(8),
    borderRadius: rs(10),
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentText: {
    fontSize: fs(13),
    fontWeight: '700',
  },
  content: {
    flex: 1,
  },
});
