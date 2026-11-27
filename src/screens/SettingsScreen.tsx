import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Modal,
  TextInput,
  Linking,
  Share,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import Constants from 'expo-constants';
import { File, Paths } from 'expo-file-system';
import * as Notifications from 'expo-notifications';
import { isAvailableAsync as isSharingAvailableAsync, shareAsync } from 'expo-sharing';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useApp } from '../context/AppContext';
import { useSocial } from '../context/SocialContext';
import { Card } from '../components/Card';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { getLocalDateString, isChineseLanguage } from '../utils/date';
import { vs, useResponsiveLayout } from '../theme/responsive';
import { THEME_SKINS } from '../theme/colors';
import { FASTING_GOALS, FASTING_TIERS, PAUSE_REASONS } from '../utils/fastingRhythm';
import { getTeaSupporterBadge, isProSkin } from '../utils/proCatalog';
import { parseAndValidateBackupPayload } from '../utils/backup';
import { computePilgrimageProgress } from '../utils/pilgrimage';
import * as Haptics from 'expo-haptics';
import type { FastingGoal, FastingTier } from '../types';

// 开发者模式
const IS_DEV = __DEV__;

// 语言列表 - 包含原生名称
const LANGUAGE_LIST = [
  { code: 'zh', name: '中文', nativeName: '简体中文' },
  { code: 'zh-Hant', name: 'Chinese (Traditional)', nativeName: '繁體中文' },
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'es', name: 'Español', nativeName: 'Español' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語' },
  { code: 'ko', name: 'Korean', nativeName: '한국어' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt' },
  { code: 'th', name: 'Thai', nativeName: 'ไทย' },
];

export const SettingsScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const {
    t,
    settings,
    updateSettings,
    colors,
    isDarkMode,
    language,
    stats,
    growthProfile,
    retentionState,
    healthMetrics,
    syncAppleHealth,
    cloudSyncStatus,
    syncToICloud,
    restoreFromICloud,
    exportBackupJson,
    importBackupJson,
    proState,
    subscriptionTier,
    isLiteUnlocked,
    isProUnlocked,
    openProStore,
    restoreProPurchases,
  } = useApp();
  const social = useSocial();
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [tempTime, setTempTime] = useState(settings.reminderTime);
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [showWeightUnitPicker, setShowWeightUnitPicker] = useState(false);
  const [showTierPicker, setShowTierPicker] = useState(false);
  const [showGoalPicker, setShowGoalPicker] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importJsonText, setImportJsonText] = useState('');
  const [isBackupBusy, setIsBackupBusy] = useState(false);

  const insets = useSafeAreaInsets();
  const rl = useResponsiveLayout();
  const isZh = isChineseLanguage(language);
  const isEs = language === 'es';
  const currentTier = FASTING_TIERS[settings.fastingTier || 'classic'];
  const currentGoal = FASTING_GOALS.find((g) => g.id === (settings.fastingGoal || 'mindful_discipline')) || FASTING_GOALS[2];
  const pilgrimage = useMemo(
    () => computePilgrimageProgress(stats, settings.selectedPilgrimageRouteId),
    [stats, settings.selectedPilgrimageRouteId]
  );
  const teaBadge = getTeaSupporterBadge(proState.teaTipsCount);

  const handleToggleNotifications = async (value: boolean) => {
    if (value) {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t.permissionNeeded, t.notificationPermissionNeeded);
        return;
      }
    }
    await updateSettings({ enableNotifications: value });
  };

  const handleSaveTime = () => {
    updateSettings({ reminderTime: tempTime });
    setShowTimePicker(false);
  };

  const handleShareApp = async () => {
    const appUrl = 'https://apps.apple.com/app/id6762360504';
    const shareMessage = (language === 'zh' || language === 'zh-Hant')
      ? `我正在使用"过午不食"app来追踪禁食习惯，推荐你也试试！\n${appUrl}`
      : language === 'es'
      ? `Estoy usando la app "Guowu · Ayuno Circadiano" para seguir mis hábitos de ayuno. ¡Te la recomiendo!\n${appUrl}`
      : `I'm practicing Circadian Zen Fasting with Guowu — mindful fasting meets Eastern rhythm!\n${appUrl}`;

    const copyAndAlert = async () => {
      await Clipboard.setStringAsync(appUrl);
      const copyMsg = (language === 'zh' || language === 'zh-Hant') ? '链接已复制到剪贴板' : language === 'es' ? 'Enlace copiado' : 'Link copied to clipboard';
      const openWeChatMsg = (language === 'zh' || language === 'zh-Hant')
        ? '\n\n请打开微信，粘贴链接发送给朋友'
        : language === 'es'
        ? '\n\nPega el enlace en WhatsApp, Mensajes o cualquier app para compartir.'
        : '\n\nPaste the link in Messages, WhatsApp, or any app to share.';
      Alert.alert(copyMsg, openWeChatMsg);
    };

    // Show options
    Alert.alert(
      (language === 'zh' || language === 'zh-Hant') ? '分享应用' : language === 'es' ? 'Compartir App' : 'Share App',
      (language === 'zh' || language === 'zh-Hant')
        ? '选择分享方式'
        : language === 'es'
        ? 'Elige cómo compartir'
        : 'Choose how to share',
      [
        {
          text: (language === 'zh' || language === 'zh-Hant') ? '复制链接' : language === 'es' ? 'Copiar enlace' : 'Copy Link',
          onPress: copyAndAlert,
        },
        {
          text: (language === 'zh' || language === 'zh-Hant') ? '系统分享' : language === 'es' ? 'Compartir' : 'Share',
          onPress: async () => {
            try {
              await Share.share({
                message: shareMessage,
                url: appUrl,
              });
            } catch (error) {
              await copyAndAlert();
            }
          },
        },
        {
          text: (language === 'zh' || language === 'zh-Hant') ? '取消' : language === 'es' ? 'Cancelar' : 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  // 开发者测试功能
  const getDateDaysAgo = (days: number) => {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return getLocalDateString(date);
  };

  const generateCheckInRecord = (date: string, completed: boolean) => ({
    id: `checkin-${date}`,
    date,
    completed,
    brokeAfterNoon: !completed,
    checkInTime: new Date(date + 'T20:00:00').getTime(),
    notes: completed ? '完成过午不食' : '未完成',
  });

  const mockFrozenFlame = async () => {
    const today = getDateDaysAgo(0);
    const yesterday = getDateDaysAgo(1);

    const records = [];
    for (let i = 10; i >= 2; i--) {
      records.push(generateCheckInRecord(getDateDaysAgo(i), true));
    }
    records.push(generateCheckInRecord(yesterday, false));
    records.push(generateCheckInRecord(today, false));

    await AsyncStorage.setItem('@guowu_checkin_records', JSON.stringify(records));
    Alert.alert('🧊 冰冻场景', '已生成冰冻火苗数据！\n\n连续打卡10天后，昨天和今天未打卡。\n\n下拉刷新查看效果！');
  };

  const mockGracePeriod = async () => {
    const today = getDateDaysAgo(0);
    const yesterday = getDateDaysAgo(1);

    const records = [];
    for (let i = 10; i >= 2; i--) {
      records.push(generateCheckInRecord(getDateDaysAgo(i), true));
    }
    records.push(generateCheckInRecord(yesterday, false));
    records.push(generateCheckInRecord(today, true));

    await AsyncStorage.setItem('@guowu_checkin_records', JSON.stringify(records));
    Alert.alert('🛡️ 宽限期场景', '已生成宽限期数据！\n\n连续打卡9天，昨天未打卡但今天打卡（使用宽限期）。\n\n下拉刷新查看效果！');
  };

  const mockStreakBroken = async () => {
    const today = getDateDaysAgo(0);
    const yesterday = getDateDaysAgo(1);
    const dayBefore = getDateDaysAgo(2);

    const records = [];
    for (let i = 12; i >= 4; i--) {
      records.push(generateCheckInRecord(getDateDaysAgo(i), true));
    }
    records.push(generateCheckInRecord(dayBefore, false));
    records.push(generateCheckInRecord(yesterday, false));
    records.push(generateCheckInRecord(today, true));

    await AsyncStorage.setItem('@guowu_checkin_records', JSON.stringify(records));
    Alert.alert('💔 连胜中断', '已生成连胜中断数据！\n\n之前连胜10天，但前天和昨天都未打卡（超过宽限期）。\n\n下拉刷新查看效果！');
  };

  const clearMockData = async () => {
    await AsyncStorage.removeItem('@guowu_checkin_records');
    Alert.alert('🗑️ 数据已清除', '所有打卡数据已删除！');
  };

  const SettingItem = ({
    label,
    value,
    onPress,
    rightElement,
  }: {
    label: string;
    value?: string;
    onPress?: () => void;
    rightElement?: React.ReactNode;
  }) => (
    <TouchableOpacity
      style={styles.settingItem}
      onPress={onPress}
      disabled={!onPress}
    >
      <Text style={[styles.settingLabel, { color: colors.text }]}>{label}</Text>
      {value && <Text style={[styles.settingValue, { color: colors.textLight }]}>{value}</Text>}
      {rightElement}
      {onPress && !rightElement && (
        <Text style={[styles.settingValue, { color: colors.textLight }]}>›</Text>
      )}
    </TouchableOpacity>
  );

  const Divider = () => <View style={[styles.divider, { backgroundColor: colors.divider }]} />;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: Math.max(insets.top + (rl.isCompactHeight ? 6 : vs(10)), rl.isCompactHeight ? 12 : vs(20)),
          maxWidth: rl.singleColumnMaxWidth,
          width: '100%',
          alignSelf: 'center',
          paddingHorizontal: rl.horizontalPadding,
        },
      ]}
    >
      <Text style={[styles.title, { color: colors.text }]}>{isZh ? '我的修行档案' : t.settings}</Text>

      {/* 个人档案概览卡片 */}
      <Card style={{ marginBottom: 14 }}>
        <View style={styles.profileHeader}>
          <View style={[styles.profileSeal, { backgroundColor: colors.primary + '1A', borderColor: colors.primary }]}>
            <Text style={[styles.profileSealText, { color: colors.primary }]}>Lv.{growthProfile.level}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
              <Text style={[styles.profileName, { color: colors.text }]}>
                {social.nickname || (isZh ? '清修同修' : 'Mindful Practitioner')}
              </Text>
              {teaBadge && (
                <View
                  style={{
                    backgroundColor: '#B93A321A',
                    borderColor: '#B93A32',
                    borderWidth: 1,
                    borderRadius: 8,
                    paddingHorizontal: 7,
                    paddingVertical: 2,
                  }}
                >
                  <Text style={{ fontSize: 10.5, fontWeight: '800', color: '#B93A32' }}>
                    {isZh ? teaBadge.titleZh : isEs ? teaBadge.titleEs : teaBadge.titleEn}
                  </Text>
                </View>
              )}
            </View>
            <Text style={[styles.profileMeta, { color: colors.textSecondary }]}>
              {isZh
                ? `${growthProfile.title} · 连胜 ${stats.currentStreak} 天 · 行脚 ${pilgrimage.totalKm} km`
                : `Lv.${growthProfile.level} · ${stats.currentStreak}d streak · ${pilgrimage.totalKm} km`}
            </Text>
          </View>
        </View>
        <View style={styles.profileStatsRow}>
          <View style={[styles.profileMiniTile, { backgroundColor: colors.backgroundSecondary }]}>
            <Text style={[styles.profileMiniVal, { color: colors.primary }]}>{retentionState.repairCards}</Text>
            <Text style={[styles.profileMiniLbl, { color: colors.textSecondary }]}>{isZh ? '护航补签卡' : 'Repair Cards'}</Text>
          </View>
          <View style={[styles.profileMiniTile, { backgroundColor: colors.backgroundSecondary }]}>
            <Text style={[styles.profileMiniVal, { color: colors.error }]}>{pilgrimage.unlockedStamps.length}</Text>
            <Text style={[styles.profileMiniLbl, { color: colors.textSecondary }]}>{isZh ? '已获印章' : 'Stamps'}</Text>
          </View>
          <View style={[styles.profileMiniTile, { backgroundColor: colors.backgroundSecondary }]}>
            <Text style={[styles.profileMiniVal, { color: colors.warning }]}>{stats.totalMeditationMinutes}m</Text>
            <Text style={[styles.profileMiniLbl, { color: colors.textSecondary }]}>{isZh ? '累计静坐' : 'Zen Min'}</Text>
          </View>
        </View>
        <View style={styles.quickNavGrid}>
          {[
            { label: isZh ? '📊 统计' : '📊 Stats', route: 'Stats' },
            { label: isZh ? '📅 历史' : '📅 History', route: 'History' },
            { label: isZh ? '🍽️ 饮食' : '🍽️ Meals', route: 'Meals' },
            { label: isZh ? '✨ 今日修行' : '✨ Practice', route: 'Retention' },
          ].map((item) => (
            <TouchableOpacity
              key={item.route}
              style={[styles.quickNavBtn, { backgroundColor: colors.backgroundSecondary }]}
              onPress={() => navigation.navigate(item.route)}
            >
              <Text style={[styles.quickNavText, { color: colors.text }]}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </Card>

      {Platform.OS === 'ios' && (
        <>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            {isZh ? '清修会员与随喜奉茶' : isEs ? 'Membresía Guowu y Té' : 'Guowu Membership & Tea'}
          </Text>
          <Card>
            <SettingItem
              label={
                isProUnlocked
                  ? isZh ? '🪷 禅境全享 Pro 生效中' : isEs ? '🪷 Guowu Pro Activo' : '🪷 Guowu Pro Active'
                  : isLiteUnlocked
                  ? isZh ? '🎋 雅致清修 Lite 生效中' : isEs ? '🎋 Guowu Lite Activo' : '🎋 Guowu Lite Active'
                  : isZh ? '🪷 清修会员 · 雅致 / 全享 Pro' : isEs ? '🪷 Membresía Lite y Pro' : '🪷 Guowu Lite & Pro Plans'
              }
              value={
                subscriptionTier === 'pro'
                  ? isZh ? '管理与茶礼' : 'Manage'
                  : subscriptionTier === 'lite'
                  ? isZh ? '升级全享 Pro' : 'Upgrade Pro'
                  : isZh ? '¥6/月起 · 7天试用' : 'Lite · Pro'
              }
              onPress={() => openProStore(undefined, isLiteUnlocked ? 'pro' : 'pro')}
            />
            <Divider />
            <SettingItem
              label={isZh ? '🍵 随喜奉茶 · 支持独立开发' : isEs ? '🍵 Invitar un Té al Autor' : '🍵 Voluntary Tea Tip'}
              value={proState.teaTipsCount > 0 ? `×${proState.teaTipsCount}` : isZh ? '不锁功能' : 'Optional'}
              onPress={() => openProStore()}
            />
            <Divider />
            <SettingItem
              label={isZh ? '🔄 恢复购买' : isEs ? '🔄 Restaurar Compras' : '🔄 Restore Purchases'}
              onPress={() => {
                Haptics.selectionAsync();
                void restoreProPurchases();
              }}
            />
          </Card>
        </>
      )}

      {/* 节律与模式 */}
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
        {isZh ? '节律与模式' : isEs ? 'Ritmo y Modo' : 'Rhythm & Mode'}
      </Text>
      <Card>
        <SettingItem
          label={isZh ? '当前目标' : isEs ? 'Objetivo Principal' : 'Main Goal'}
          value={isZh ? currentGoal.titleZh : isEs ? currentGoal.titleEs : currentGoal.titleEn}
          onPress={() => setShowGoalPicker(true)}
        />
        <Divider />
        <SettingItem
          label={isZh ? '过午阶梯' : isEs ? 'Nivel de Ayuno' : 'Fasting Tier'}
          value={isZh ? `${currentTier.nameZh} (${currentTier.windowZh})` : isEs ? `${currentTier.nameEs} (${currentTier.ratio})` : `${currentTier.nameEn} (${currentTier.ratio})`}
          onPress={() => setShowTierPicker(true)}
        />
        <Divider />
        <View style={styles.settingItem}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text style={[styles.settingLabel, { color: colors.text }]}>
              {isZh ? '传统过午修行风格' : isEs ? 'Estilo Tradicional Guowu' : 'Traditional Practice Style'}
            </Text>
            <Text style={[styles.settingDesc, { color: colors.textLight }]}>
              {isZh
                ? '开启后突出传统典籍与清修称谓，关闭则偏向现代轻断食'
                : isEs
                ? 'Destaca términos orientales clásicos o usa un tono moderno de bienestar'
                : 'Emphasize classical terms or keep modern wellness phrasing'}
            </Text>
          </View>
          <Switch
            value={Boolean(settings.traditionalMode)}
            onValueChange={(val) => updateSettings({ traditionalMode: val })}
            trackColor={{ false: '#ccc', true: colors.primary }}
            thumbColor="#fff"
          />
        </View>
        {settings.pausePass && (
          <>
            <Divider />
            <SettingItem
              label={isZh ? '🛡️ 护航暂停券生效中' : '🛡️ Active Pause Pass'}
              value={`${
                PAUSE_REASONS.find((r) => r.id === settings.pausePass?.reason)?.[isZh ? 'labelZh' : 'labelEn'] || settings.pausePass.reason
              } (${settings.pausePass.startDate} ~ ${settings.pausePass.endDate}) · ${isZh ? '点此解除' : 'Tap to clear'}`}
              onPress={() => {
                Alert.alert(
                  isZh ? '提前结束护航暂停？' : 'End Pause Pass Early?',
                  isZh ? '解除后将恢复正常节律判定，已保护天数继续保留连胜。' : 'Resume regular schedule while keeping protected streak days.',
                  [
                    { text: t.cancel, style: 'cancel' },
                    {
                      text: isZh ? '确认解除' : 'Clear',
                      onPress: () => updateSettings({ pausePass: null }),
                    },
                  ]
                );
              }}
            />
          </>
        )}
      </Card>

      {/* 打卡提醒设置 */}
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{t.checkInReminder}</Text>
      <Card>
        <View style={styles.settingItem}>
          <Text style={[styles.settingLabel, { color: colors.text }]}>{t.enableDailyReminder}</Text>
          <Switch
            value={settings.enableNotifications}
            onValueChange={handleToggleNotifications}
            trackColor={{ false: '#ccc', true: colors.primary }}
            thumbColor="#fff"
          />
        </View>
        {settings.enableNotifications && (
          <>
            <Divider />
            <SettingItem
              label={t.notificationTime}
              value={tempTime}
              onPress={() => {
                setTempTime(settings.reminderTime);
                setShowTimePicker(true);
              }}
            />
          </>
        )}
      </Card>

      {/* 数据记录 */}
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
        {(language === 'zh' || language === 'zh-Hant') ? '数据记录' : language === 'es' ? 'Registros' : 'Records'}
      </Text>
      <Card>
        <SettingItem
          label={(language === 'zh' || language === 'zh-Hant') ? '📊 统计数据' : language === 'es' ? '📊 Estadísticas' : '📊 Statistics'}
          onPress={() => navigation.navigate('Stats')}
        />
        <Divider />
        <SettingItem
          label={(language === 'zh' || language === 'zh-Hant') ? '📅 打卡历史' : language === 'es' ? '📅 Historial' : '📅 History'}
          onPress={() => navigation.navigate('History')}
        />
        <Divider />
        <SettingItem
          label={(language === 'zh' || language === 'zh-Hant') ? '🍽️ 饮食记录' : language === 'es' ? '🍽️ Comidas' : '🍽️ Meals'}
          onPress={() => navigation.navigate('Meals')}
        />
        <Divider />
        <SettingItem
          label={isZh ? '🪐 七政流注 · 24h 经络盘' : isEs ? '🧭 Reloj Corporal MTC · 24h' : '🧭 TCM Body Clock · 24h'}
          value={isZh ? '七政值时 · 旺相 · 脏腑' : isEs ? 'Circadiano · Elementos · Meridianos' : 'Circadian · Five Elements · Meridians'}
          onPress={() => navigation.navigate('QiZheng')}
        />
      </Card>

      {/* Social / Community */}
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
        {(language === 'zh' || language === 'zh-Hant') ? '同修社区' : language === 'es' ? 'Comunidad' : 'Community'}
      </Text>
      <Card>
        <View style={styles.settingItem}>
          <View>
            <Text style={[styles.settingLabel, { color: colors.text }]}>
              {(language === 'zh' || language === 'zh-Hant') ? '法号/昵称' : 'Nickname'}
            </Text>
            <Text style={[styles.settingDesc, { color: colors.textLight }]}>
              {social.nickname || ((language === 'zh' || language === 'zh-Hant') ? '未设置' : 'Not set')}
            </Text>
          </View>
        </View>
        <Divider />
        <SettingItem
          label={(language === 'zh' || language === 'zh-Hant') ? '👥 同修好友' : '👥 Friends'}
          value={social.friends.length > 0 ? `${social.friends.length}` : undefined}
          onPress={() => navigation.navigate('Friends')}
        />
        <Divider />
        <View style={styles.settingItem}>
          <View>
            <Text style={[styles.settingLabel, { color: colors.text }]}>
              {(language === 'zh' || language === 'zh-Hant') ? '我的同修码' : 'Friend Code'}
            </Text>
            <Text style={[styles.settingDesc, { color: colors.textLight, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }]}>
              {social.userId}
            </Text>
          </View>
          <TouchableOpacity
            onPress={async () => {
              await Clipboard.setStringAsync(social.userId);
              Alert.alert((language === 'zh' || language === 'zh-Hant') ? '已复制' : 'Copied!');
            }}
          >
            <Text style={[styles.settingValue, { color: colors.primary }]}>
              {(language === 'zh' || language === 'zh-Hant') ? '复制' : 'Copy'}
            </Text>
          </TouchableOpacity>
        </View>
      </Card>

      {/* 通用设置 */}
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{t.generalSettings}</Text>
      <Card>
        <SettingItem
          label={t.language}
          value={LANGUAGE_LIST.find(l => l.code === settings.language)?.nativeName || settings.language}
          onPress={() => {
            setShowLanguagePicker(true);
          }}
        />
        <Divider />
        <SettingItem
          label={t.theme}
          value={
            settings.theme === 'light'
              ? t.themeLight
              : settings.theme === 'dark'
              ? t.themeDark
              : t.themeAuto
          }
          onPress={() => {
            setShowThemePicker(true);
          }}
        />
        <Divider />
        <SettingItem
          label={t.weightUnit}
          value={settings.weightUnit === 'kg' ? t.kg : t.lb}
          onPress={() => {
            setShowWeightUnitPicker(true);
          }}
        />
        <Divider />
        <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
          <Text style={[styles.settingLabel, { color: colors.text, marginBottom: 8 }]}>
            {isZh ? '🎨 东方美学皮肤' : isEs ? '🎨 Tema Oriental' : '🎨 Eastern Aesthetic Skin'}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {THEME_SKINS.map((skin) => {
              const locked = !isLiteUnlocked && isProSkin(skin.id);
              const active = !locked && (settings.themeSkin || 'bamboo') === skin.id;
              return (
                <TouchableOpacity
                  key={skin.id}
                  onPress={() => {
                    Haptics.selectionAsync();
                    if (locked) {
                      openProStore(
                        isZh
                          ? `「${skin.nameZh}」属于雅致版 Lite / 全享 Pro 东方美学皮肤`
                          : isEs
                          ? `El tema "${skin.nameEs}" requiere Guowu Lite o Pro.`
                          : `"${skin.nameEn}" is included in Guowu Lite & Pro.`,
                        'lite'
                      );
                      return;
                    }
                    void updateSettings({ themeSkin: skin.id });
                  }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    paddingHorizontal: 10,
                    paddingVertical: 7,
                    borderRadius: 12,
                    borderWidth: 1.5,
                    borderColor: active ? skin.swatchPrimary : colors.border,
                    backgroundColor: active ? skin.swatchPrimary + '1A' : colors.backgroundSecondary,
                  }}
                >
                  <View
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: 7,
                      backgroundColor: skin.swatchPrimary,
                      borderWidth: 2,
                      borderColor: skin.swatchBg,
                    }}
                  />
                  <Text style={{ fontSize: 12, fontWeight: '700', color: active ? colors.primary : colors.text }}>
                    {isZh ? skin.nameZh : isEs ? skin.nameEs : skin.nameEn}
                    {locked ? ' 🔒' : ''}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </Card>

      {Platform.OS === 'ios' && (
        <>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            {isZh ? 'Apple 生态联动' : isEs ? 'Ecosistema Apple' : 'Apple Ecosystem Sync'}
          </Text>
          <Card>
            <SettingItem
              label={isZh ? '❤️ Apple Health 健康同步' : isEs ? '❤️ Apple Health' : '❤️ Apple Health Sync'}
              value={
                healthMetrics?.authorized
                  ? isZh
                    ? `已连接 · 睡眠 ${healthMetrics.lastNightSleepHours?.toFixed(1) ?? '--'}h`
                    : `Connected · ${healthMetrics.lastNightSleepHours?.toFixed(1) ?? '--'}h`
                  : isZh
                  ? '点击授权读取'
                  : 'Tap to connect'
              }
              onPress={async () => {
                Haptics.selectionAsync();
                const res = await syncAppleHealth();
                Alert.alert(
                  isZh ? 'Apple Health' : 'Apple Health',
                  res.authorized
                    ? isZh
                      ? `已同步：昨夜睡眠 ${res.lastNightSleepHours?.toFixed(1) ?? '--'}h · 今日步数 ${res.todaySteps ?? '--'}`
                      : `Synced sleep: ${res.lastNightSleepHours?.toFixed(1) ?? '--'}h · steps: ${res.todaySteps ?? '--'}`
                    : isZh
                    ? '未能获取健康权限，可在 iPhone「健康」中开启授权。'
                    : 'Health access not granted. Enable in iPhone Health app.'
                );
              }}
            />
            <Divider />
            <View style={{ paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flex: 1, paddingRight: 10 }}>
                <Text style={[styles.settingLabel, { color: colors.text }]}>
                  {isZh ? '☁️ iCloud 私有自动备份' : isEs ? '☁️ Copia en iCloud' : '☁️ iCloud Auto Backup'}
                  {!isProUnlocked ? ' (Pro 🔒)' : ''}
                </Text>
                <Text style={[styles.settingDesc, { color: colors.textSecondary, marginTop: 2 }]}>
                  {!isProUnlocked
                    ? isZh
                      ? '全享 Pro 权益（本地 JSON 导出导入永久免费）'
                      : 'Included in Guowu Pro (local JSON export stays free)'
                    : cloudSyncStatus.lastSyncedAt
                    ? `${isZh ? '上次同步：' : 'Last synced: '}${new Date(cloudSyncStatus.lastSyncedAt).toLocaleString()}`
                    : isZh
                    ? '换机无感恢复所有打卡与记录'
                    : 'Private iCloud sync across your iPhones'}
                </Text>
              </View>
              <Switch
                value={isProUnlocked && Boolean(settings.iCloudAutoSync)}
                onValueChange={(val) => {
                  Haptics.selectionAsync();
                  if (!isProUnlocked) {
                    openProStore(
                      isZh
                        ? 'Apple iCloud 私有自动备份与云恢复属于全享 Pro 权益（可先 7 天免费试用）'
                        : isEs
                        ? 'La copia automática en iCloud requiere Guowu Pro.'
                        : 'Private iCloud Auto-Backup requires Guowu Pro (7-day free trial).',
                      'pro'
                    );
                    return;
                  }
                  void updateSettings({ iCloudAutoSync: val });
                  if (val) {
                    void syncToICloud();
                  }
                }}
                trackColor={{ false: colors.divider, true: colors.primary + '80' }}
                thumbColor={isProUnlocked && settings.iCloudAutoSync ? colors.primary : colors.textLight}
              />
            </View>
            <Divider />
            <SettingItem
              label={
                (isZh ? '⬆️ 立即同步至 iCloud' : isEs ? '⬆️ Sincronizar a iCloud' : '⬆️ Sync to iCloud Now') +
                (!isProUnlocked ? ' (Pro 🔒)' : '')
              }
              onPress={async () => {
                Haptics.selectionAsync();
                if (!isProUnlocked) {
                  openProStore(
                    isZh
                      ? 'iCloud 私有同步属于全享 Pro 权益（本地 JSON 备份永久免费）'
                      : 'iCloud sync requires Guowu Pro (local JSON backup stays free).',
                    'pro'
                  );
                  return;
                }
                const res = await syncToICloud();
                Alert.alert('iCloud', res.message);
              }}
            />
            <Divider />
            <SettingItem
              label={
                (isZh ? '⬇️ 从 iCloud 恢复备份' : isEs ? '⬇️ Restaurar de iCloud' : '⬇️ Restore from iCloud') +
                (!isProUnlocked ? ' (Pro 🔒)' : '')
              }
              onPress={async () => {
                Haptics.selectionAsync();
                if (!isProUnlocked) {
                  openProStore(
                    isZh
                      ? '从 iCloud 恢复备份属于全享 Pro 权益'
                      : 'iCloud restore requires Guowu Pro.',
                    'pro'
                  );
                  return;
                }
                const res = await restoreFromICloud();
                Alert.alert('iCloud', res.message);
              }}
            />
          </Card>
        </>
      )}

      {/* 已上线亮点 & 永久免费承诺 */}
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
        {isZh ? '清净修行体验' : isEs ? 'Experiencia Consciente' : 'Mindful Experience'}
      </Text>
      <Card>
        <Text style={[styles.settingLabel, { color: colors.primary, fontWeight: '700', marginBottom: 6 }]}>
          {isZh ? '零广告 · 本地隐私优先 · 核心永久免费' : isEs ? 'Cero Anuncios · Privacidad Local · Núcleo Gratis' : 'Zero Ads · Local Privacy First · Core Always Free'}
        </Text>
        <Text style={[styles.settingDesc, { color: colors.textSecondary, lineHeight: 19 }]}>
          {isZh
            ? '支持东方美学 4 套皮肤、双轨白噪音混音、闭眼触觉观息、节气日签、十二时辰欲念潮汐分析，以及 iOS 桌面小组件/灵动岛与 Apple Health / iCloud 同步。'
            : isEs
            ? 'Incluye 4 temas orientales, mezclador dual, respiración táctil, marea de antojos y sincronización con Apple Health, iCloud y Widgets.'
            : 'Includes 4 Eastern skins, dual ambient mixer, eyes-closed haptic breathwork, 12-Shichen Craving Tide, plus Apple Health, iCloud & Widgets.'}
        </Text>
      </Card>

      {/* 本地备份与迁移 */}
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
        {isZh ? '数据备份与恢复' : isEs ? 'Copia de Seguridad y Restauración' : 'Backup & Restore'}
      </Text>
      <Card>
        <SettingItem
          label={isZh ? '📤 导出并分享 JSON 备份' : '📤 Export & Share JSON Backup'}
          value={isBackupBusy ? (isZh ? '处理中…' : 'Working…') : (isZh ? '文件+剪贴板' : 'File + Clipboard')}
          onPress={async () => {
            if (isBackupBusy) return;
            setIsBackupBusy(true);
            try {
              const json = await exportBackupJson();
              await Clipboard.setStringAsync(json);
              const fileName = `guowubushi-backup-${getLocalDateString()}.json`;
              const backupFile = new File(Paths.cache, fileName);
              backupFile.create({ overwrite: true });
              backupFile.write(json);
              if (await isSharingAvailableAsync()) {
                await shareAsync(backupFile.uri, {
                  mimeType: 'application/json',
                  dialogTitle: isZh ? '保存或分享过午不食备份' : 'Save or Share Fasting Backup',
                });
              } else {
                await Share.share({ message: json, title: fileName });
              }
            } catch (e) {
              Alert.alert(isZh ? '导出失败' : 'Export Failed', e instanceof Error ? e.message : String(e));
            } finally {
              setIsBackupBusy(false);
            }
          }}
        />
        <Divider />
        <SettingItem
          label={isZh ? '📋 仅复制备份 JSON 到剪贴板' : '📋 Copy Backup JSON'}
          onPress={async () => {
            try {
              const json = await exportBackupJson();
              await Clipboard.setStringAsync(json);
              Alert.alert(
                isZh ? '已复制备份' : 'Backup Copied',
                isZh ? `共 ${json.length} 字符，可粘贴到备忘录或换机恢复。` : `Copied ${json.length} chars to clipboard.`
              );
            } catch (e) {
              Alert.alert(isZh ? '复制失败' : 'Copy Failed', e instanceof Error ? e.message : String(e));
            }
          }}
        />
        <Divider />
        <SettingItem
          label={isZh ? '📥 从 JSON 恢复数据' : '📥 Restore from JSON'}
          value={isZh ? '严格校验覆盖本地记录' : 'Validate & restore'}
          onPress={() => {
            setImportJsonText('');
            setShowImportModal(true);
          }}
        />
      </Card>

      {/* 关于 */}
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{t.about}</Text>
      <Card>
        <SettingItem
          label={(language === 'zh' || language === 'zh-Hant') ? '分享应用' : language === 'es' ? 'Compartir App' : 'Share App'}
          onPress={handleShareApp}
          rightElement={<Text style={{ fontSize: 20 }}>📤</Text>}
        />
        <SettingItem label={t.version} value={Constants.expoConfig?.version || '1.0.45'} />
        <SettingItem
          label={(language === 'zh' || language === 'zh-Hant') ? '隐私政策' : 'Privacy Policy'}
          onPress={() => {
            Linking.openURL('https://github.com/lijingmt/guowubushi-fasting/blob/main/PRIVACY_POLICY.md');
          }}
        />
        <Divider />
        <SettingItem
          label={(language === 'zh' || language === 'zh-Hant') ? '👋 重置欢迎页' : '👋 Reset Welcome'}
          value={(language === 'zh' || language === 'zh-Hant') ? '重新显示用户协议' : 'Show welcome screen again'}
          onPress={async () => {
            await AsyncStorage.removeItem('@guowu_terms_agreed');
            Alert.alert(
              (language === 'zh' || language === 'zh-Hant') ? '已重置' : 'Reset Complete',
              (language === 'zh' || language === 'zh-Hant') ? '下次启动将显示欢迎页面' : 'Welcome screen will show on next launch'
            );
          }}
        />
      </Card>

      {/* 开发者测试选项 - 仅开发模式显示 */}
      {IS_DEV && (
        <>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            🧪 开发者测试
          </Text>
          <Card>
            <SettingItem
              label="🧊 冰冻火苗"
              value="今天和昨天都没打卡"
              onPress={mockFrozenFlame}
            />
            <Divider />
            <SettingItem
              label="🛡️ 宽限期恢复"
              value="昨天没打卡，今天打卡"
              onPress={mockGracePeriod}
            />
            <Divider />
            <SettingItem
              label="💔 连胜中断"
              value="连续两天未打卡"
              onPress={mockStreakBroken}
            />
            <Divider />
            <SettingItem
              label="🗑️ 清除数据"
              value="删除所有打卡记录"
              onPress={clearMockData}
            />
            <Divider />
            <SettingItem
              label={(language === 'zh' || language === 'zh-Hant') ? '👋 重置欢迎页' : '👋 Reset Welcome'}
              value={(language === 'zh' || language === 'zh-Hant') ? '重新显示用户协议' : 'Show welcome screen again'}
              onPress={async () => {
                await AsyncStorage.removeItem('@guowu_terms_agreed');
                Alert.alert(
                  (language === 'zh' || language === 'zh-Hant') ? '已重置' : 'Reset Complete',
                  (language === 'zh' || language === 'zh-Hant') ? '下次启动将显示欢迎页面' : 'Welcome screen will show on next launch'
                );
              }}
            />
          </Card>
        </>
      )}

      {/* App 图标说明 */}
      <View style={styles.iconAttribution}>
        <Text style={[styles.iconAttributionText, { color: colors.textLight }]}>
          {(language === 'zh' || language === 'zh-Hant')
            ? 'App图标由AI原创设计 (2026年4月16日)'
            : language === 'es'
            ? 'Icono de la App diseñado originalmente por IA (16 de abril de 2026)'
            : 'App icon originally designed by AI (April 16, 2026)'}
        </Text>
      </View>

      {/* 时间选择器 */}
      <Modal
        visible={showTimePicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowTimePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{t.setReminderTime}</Text>

            <View style={styles.timeInputContainer}>
              <TextInput
                style={[styles.timeInput, { color: colors.text, borderColor: colors.primary }]}
                value={tempTime.split(':')[0]}
                onChangeText={(text) => {
                  const mins = tempTime.split(':')[1];
                  setTempTime(
                    `${Math.min(23, Math.max(0, parseInt(text) || 0))
                      .toString()
                      .padStart(2, '0')}:${mins}`
                  );
                }}
                keyboardType="numeric"
                maxLength={2}
              />
              <Text style={[styles.timeSeparator, { color: colors.textSecondary }]}>:</Text>
              <TextInput
                style={[styles.timeInput, { color: colors.text, borderColor: colors.primary }]}
                value={tempTime.split(':')[1]}
                onChangeText={(text) => {
                  const hrs = tempTime.split(':')[0];
                  setTempTime(
                    `${hrs}:${Math.min(59, Math.max(0, parseInt(text) || 0))
                      .toString()
                      .padStart(2, '0')}`
                  );
                }}
                keyboardType="numeric"
                maxLength={2}
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel, { backgroundColor: colors.divider }]}
                onPress={() => setShowTimePicker(false)}
              >
                <Text style={[styles.modalButtonText, { color: colors.text }]}>{t.cancel}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonConfirm, { backgroundColor: colors.primary }]}
                onPress={handleSaveTime}
              >
                <Text style={[styles.modalButtonText, { color: '#fff' }]}>{t.ok}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 语言选择器 */}
      <Modal
        visible={showLanguagePicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLanguagePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContentLarge, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{t.language}</Text>

            <ScrollView style={styles.languageList} showsVerticalScrollIndicator={false}>
              {LANGUAGE_LIST.map((lang) => (
                <TouchableOpacity
                  key={lang.code}
                  style={[styles.optionButton, { backgroundColor: colors.backgroundSecondary }]}
                  onPress={async () => {
                    await updateSettings({ language: lang.code as any, languageManuallySelected: true });
                    setShowLanguagePicker(false);
                  }}
                >
                  <Text style={[styles.optionText, { color: colors.text }]}>
                    {lang.nativeName}
                  </Text>
                  {settings.language === lang.code && (
                    <Text style={[styles.checkIcon, { color: colors.primary }]}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={[styles.modalButton, styles.modalButtonCancel, { backgroundColor: colors.divider }]}
              onPress={() => setShowLanguagePicker(false)}
            >
              <Text style={[styles.modalButtonText, { color: colors.text }]}>{t.cancel}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 主题选择器 */}
      <Modal
        visible={showThemePicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowThemePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{t.theme}</Text>

            <TouchableOpacity
              style={[styles.optionButton, { backgroundColor: colors.backgroundSecondary }]}
              onPress={async () => {
                await updateSettings({ theme: 'light' });
                setShowThemePicker(false);
              }}
            >
              <Text style={[styles.optionText, { color: colors.text }]}>🌞 {t.themeLightFull}</Text>
              {settings.theme === 'light' && <Text style={[styles.checkIcon, { color: colors.primary }]}>✓</Text>}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.optionButton, { backgroundColor: colors.backgroundSecondary }]}
              onPress={async () => {
                await updateSettings({ theme: 'dark' });
                setShowThemePicker(false);
              }}
            >
              <Text style={[styles.optionText, { color: colors.text }]}>🌙 {t.themeDarkFull}</Text>
              {settings.theme === 'dark' && <Text style={[styles.checkIcon, { color: colors.primary }]}>✓</Text>}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.optionButton, { backgroundColor: colors.backgroundSecondary }]}
              onPress={async () => {
                await updateSettings({ theme: 'auto' });
                setShowThemePicker(false);
              }}
            >
              <Text style={[styles.optionText, { color: colors.text }]}>🔄 {t.themeAutoFull}</Text>
              {settings.theme === 'auto' && <Text style={[styles.checkIcon, { color: colors.primary }]}>✓</Text>}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalButton, styles.modalButtonCancel, { backgroundColor: colors.divider }]}
              onPress={() => setShowThemePicker(false)}
            >
              <Text style={[styles.modalButtonText, { color: colors.text }]}>{t.cancel}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Weight Unit Picker Modal */}
      <Modal
        visible={showWeightUnitPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowWeightUnitPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{t.weightUnit}</Text>

            <TouchableOpacity
              style={[styles.optionButton, { backgroundColor: colors.backgroundSecondary }]}
              onPress={() => {
                updateSettings({ weightUnit: 'kg' });
                setShowWeightUnitPicker(false);
              }}
            >
              <Text style={[styles.optionText, { color: colors.text }]}>
                {t.kg}
              </Text>
              {settings.weightUnit === 'kg' && (
                <Text style={[styles.checkIcon, { color: colors.primary }]}>✓</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.optionButton, { backgroundColor: colors.backgroundSecondary }]}
              onPress={() => {
                updateSettings({ weightUnit: 'lb' });
                setShowWeightUnitPicker(false);
              }}
            >
              <Text style={[styles.optionText, { color: colors.text }]}>
                {t.lb}
              </Text>
              {settings.weightUnit === 'lb' && (
                <Text style={[styles.checkIcon, { color: colors.primary }]}>✓</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.cancelButton, { backgroundColor: colors.divider }]}
              onPress={() => setShowWeightUnitPicker(false)}
            >
              <Text style={[styles.cancelButtonText, { color: colors.text }]}>{t.cancel}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Fasting Tier Picker */}
      <Modal
        visible={showTierPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowTierPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContentLarge, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {isZh ? '选择过午阶梯' : 'Choose Fasting Tier'}
            </Text>
            {(['beginner', 'intermediate', 'classic'] as FastingTier[]).map((tierId) => {
              const tier = FASTING_TIERS[tierId];
              return (
                <TouchableOpacity
                  key={tierId}
                  style={[styles.optionButton, { backgroundColor: colors.backgroundSecondary }]}
                  onPress={async () => {
                    await updateSettings({ fastingTier: tierId });
                    setShowTierPicker(false);
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.optionText, { color: colors.text }]}>
                      {isZh ? `${tier.nameZh} · ${tier.windowZh}` : `${tier.nameEn} · ${tier.ratio}`}
                    </Text>
                    <Text style={[styles.settingDesc, { color: colors.textLight }]}>
                      {isZh ? tier.descZh : tier.descEn}
                    </Text>
                  </View>
                  {(settings.fastingTier || 'classic') === tierId && (
                    <Text style={[styles.checkIcon, { color: colors.primary }]}>✓</Text>
                  )}
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity
              style={[styles.cancelButton, { backgroundColor: colors.divider }]}
              onPress={() => setShowTierPicker(false)}
            >
              <Text style={[styles.cancelButtonText, { color: colors.text }]}>{t.cancel}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Fasting Goal Picker */}
      <Modal
        visible={showGoalPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowGoalPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContentLarge, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {isZh ? '选择当前目标' : 'Select Goal'}
            </Text>
            {FASTING_GOALS.map((goal) => (
              <TouchableOpacity
                key={goal.id}
                style={[styles.optionButton, { backgroundColor: colors.backgroundSecondary }]}
                onPress={async () => {
                  await updateSettings({
                    fastingGoal: goal.id as FastingGoal,
                    traditionalMode: goal.traditionalMode,
                  });
                  setShowGoalPicker(false);
                }}
              >
                <Text style={[styles.optionText, { color: colors.text }]}>
                  {goal.icon} {isZh ? goal.titleZh : goal.titleEn}
                </Text>
                {(settings.fastingGoal || 'mindful_discipline') === goal.id && (
                  <Text style={[styles.checkIcon, { color: colors.primary }]}>✓</Text>
                )}
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={[styles.cancelButton, { backgroundColor: colors.divider }]}
              onPress={() => setShowGoalPicker(false)}
            >
              <Text style={[styles.cancelButtonText, { color: colors.text }]}>{t.cancel}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Backup Import Modal */}
      <Modal
        visible={showImportModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowImportModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContentLarge, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {isZh ? '📥 从 JSON 恢复备份' : '📥 Restore from Backup JSON'}
            </Text>
            <TouchableOpacity
              style={[styles.optionButton, { backgroundColor: colors.backgroundSecondary }]}
              onPress={async () => {
                const clip = await Clipboard.getStringAsync();
                setImportJsonText(clip || '');
              }}
            >
              <Text style={[styles.optionText, { color: colors.primary, fontWeight: '600' }]}>
                {isZh ? '📋 从剪贴板粘贴 JSON' : '📋 Paste from Clipboard'}
              </Text>
            </TouchableOpacity>
            <TextInput
              style={{
                borderWidth: 1,
                borderColor: colors.divider,
                borderRadius: 10,
                padding: 10,
                minHeight: 110,
                maxHeight: 160,
                color: colors.text,
                backgroundColor: colors.background,
                textAlignVertical: 'top',
                fontSize: 12,
                marginBottom: 10,
              }}
              multiline
              placeholder={isZh ? '在此粘贴导出的 JSON 备份文本...' : 'Paste exported backup JSON here...'}
              placeholderTextColor={colors.textLight}
              value={importJsonText}
              onChangeText={setImportJsonText}
            />
            {(() => {
              if (!importJsonText.trim()) return null;
              const check = parseAndValidateBackupPayload(importJsonText);
              return (
                <Text
                  style={{
                    fontSize: 12,
                    marginBottom: 10,
                    color: check.ok ? colors.success : '#D9534F',
                  }}
                >
                  {check.ok
                    ? isZh
                      ? `✓ 校验通过：打卡 ${check.summary.checkIns} 天 · 断食 ${check.summary.fastingSessions} 次 · 饮食 ${check.summary.meals} · 体感 ${check.summary.wellnessRecords}`
                      : `✓ Valid: ${check.summary.checkIns} check-ins, ${check.summary.fastingSessions} fasts, ${check.summary.wellnessRecords} wellness`
                    : `✕ ${check.error}`}
                </Text>
              );
            })()}
            <TouchableOpacity
              style={[
                styles.optionButton,
                {
                  backgroundColor: colors.primary,
                  justifyContent: 'center',
                  opacity: isBackupBusy ? 0.6 : 1,
                },
              ]}
              disabled={isBackupBusy}
              onPress={async () => {
                const check = parseAndValidateBackupPayload(importJsonText);
                if (!check.ok) {
                  Alert.alert(isZh ? '备份格式无效' : 'Invalid Backup', check.error);
                  return;
                }
                setIsBackupBusy(true);
                try {
                  const res = await importBackupJson(importJsonText);
                  Alert.alert(
                    res.success ? (isZh ? '恢复成功' : 'Restored') : (isZh ? '恢复失败' : 'Failed'),
                    res.message
                  );
                  if (res.success) {
                    setShowImportModal(false);
                    setImportJsonText('');
                  }
                } finally {
                  setIsBackupBusy(false);
                }
              }}
            >
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>
                {isZh ? '确认校验并覆盖恢复' : 'Validate & Restore Now'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.cancelButton, { backgroundColor: colors.divider }]}
              onPress={() => setShowImportModal(false)}
            >
              <Text style={[styles.cancelButtonText, { color: colors.text }]}>{t.cancel}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F6F2E9',
  },
  content: {
    padding: 16,
    paddingTop: 20,
    paddingBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1F2A24',
    marginTop: 8,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
    marginLeft: 4,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 4,
  },
  settingLabel: {
    fontSize: 16,
    color: '#333',
  },
  settingValue: {
    fontSize: 14,
    color: '#999',
  },
  settingDesc: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginLeft: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '80%',
    maxWidth: 300,
  },
  modalContentLarge: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '85%',
    maxWidth: 360,
    maxHeight: '70%',
  },
  languageList: {
    maxHeight: 350,
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  timeInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  timeInput: {
    width: 80,
    height: 60,
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    borderWidth: 2,
    borderColor: '#265947',
    borderRadius: 12,
    color: '#1F2A24',
  },
  timeSeparator: {
    fontSize: 32,
    fontWeight: 'bold',
    marginHorizontal: 12,
    color: '#666',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: '#E0E0E0',
    marginRight: 8,
  },
  modalButtonConfirm: {
    backgroundColor: '#265947',
    marginLeft: 8,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  optionButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginBottom: 10,
  },
  optionText: {
    fontSize: 16,
  },
  checkIcon: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#265947',
  },
  cancelButton: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  iconAttribution: {
    marginTop: 20,
    marginBottom: 10,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  iconAttributionText: {
    fontSize: 12,
    textAlign: 'center',
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  profileSeal: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileSealText: {
    fontSize: 14,
    fontWeight: '800',
  },
  profileName: {
    fontSize: 17,
    fontWeight: '800',
  },
  profileMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  profileStatsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  profileMiniTile: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: 'center',
  },
  profileMiniVal: {
    fontSize: 16,
    fontWeight: '800',
  },
  profileMiniLbl: {
    fontSize: 11,
    marginTop: 2,
  },
  quickNavGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickNavBtn: {
    width: '48.5%',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  quickNavText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
