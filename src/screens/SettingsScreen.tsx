import React, { useState } from 'react';
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
  Clipboard,
} from 'react-native';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useApp } from '../context/AppContext';
import { Card } from '../components/Card';

// 开发者模式
const IS_DEV = __DEV__;

export const SettingsScreen: React.FC = () => {
  const {
    t,
    settings,
    updateSettings,
    healthSync,
    updateHealthSync,
    colors,
    isDarkMode,
    language,
  } = useApp();
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [tempTime, setTempTime] = useState(settings.reminderTime);
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [showWeightUnitPicker, setShowWeightUnitPicker] = useState(false);

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
    const shareMessage = language === 'zh'
      ? `我正在使用"过午不食"app来追踪禁食习惯，推荐你也试试！\n${appUrl}`
      : language === 'es'
      ? `Estoy usando la app "Ayuno Intermitente" para seguir mis hábitos de ayuno. ¡Te la recomiendo!\n${appUrl}`
      : `I'm using the "Intermittent Fasting" app to track my fasting habits. Highly recommend!\n${appUrl}`;

    const copyAndAlert = async () => {
      await Clipboard.setStringAsync(appUrl);
      const copyMsg = language === 'zh' ? '链接已复制到剪贴板' : language === 'es' ? 'Enlace copiado' : 'Link copied to clipboard';
      const openWeChatMsg = language === 'zh'
        ? '\n\n请打开微信，粘贴链接发送给朋友'
        : language === 'es'
        ? '\n\nAbre WeChat y pega el enlace'
        : '\n\nOpen WeChat and paste the link';
      Alert.alert(copyMsg, openWeChatMsg);
    };

    // Show options
    Alert.alert(
      language === 'zh' ? '分享应用' : language === 'es' ? 'Compartir App' : 'Share App',
      language === 'zh'
        ? '选择分享方式'
        : language === 'es'
        ? 'Elige cómo compartir'
        : 'Choose how to share',
      [
        {
          text: language === 'zh' ? '复制链接' : language === 'es' ? 'Copiar enlace' : 'Copy Link',
          onPress: copyAndAlert,
        },
        {
          text: language === 'zh' ? '系统分享' : language === 'es' ? 'Compartir' : 'Share',
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
          text: language === 'zh' ? '取消' : language === 'es' ? 'Cancelar' : 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  // 开发者测试功能
  const getDateDaysAgo = (days: number) => {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date.toISOString().split('T')[0];
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
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={styles.content}>
      <Text style={[styles.title, { color: colors.text }]}>{t.settings}</Text>

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

      {/* 目标设置 */}
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{t.goalSettings}</Text>
      <Card>
        <SettingItem
          label={t.dailyCalorieGoal}
          value={`${settings.dailyCalorieGoal} kcal`}
          onPress={() => {
            Alert.alert(
              t.calorieGoalTitle,
              t.calorieGoalHint,
              [{ text: t.know }]
            );
          }}
        />
      </Card>

      {/* 通用设置 */}
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{t.generalSettings}</Text>
      <Card>
        <SettingItem
          label={t.language}
          value={settings.language === 'zh' ? t.langZh : settings.language === 'en' ? t.langEn : t.langEs}
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
      </Card>

      {/* 健康同步 */}
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{t.dataSync}</Text>
      <Card>
        <View style={styles.settingItem}>
          <View>
            <Text style={[styles.settingLabel, { color: colors.text }]}>{t.appleHealth}</Text>
            <Text style={[styles.settingDesc, { color: colors.textLight }]}>
              {healthSync.healthKitEnabled ? t.enabled : t.notEnabled}
            </Text>
          </View>
          <Switch
            value={healthSync.healthKitEnabled}
            onValueChange={(value) =>
              updateHealthSync({ healthKitEnabled: value })
            }
            trackColor={{ false: '#ccc', true: colors.success }}
            thumbColor="#fff"
          />
        </View>
      </Card>

      {/* 关于 */}
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{t.about}</Text>
      <Card>
        <SettingItem
          label={language === 'zh' ? '分享应用' : language === 'es' ? 'Compartir App' : 'Share App'}
          onPress={handleShareApp}
          rightElement={<Text style={{ fontSize: 20 }}>📤</Text>}
        />
        <SettingItem label={t.version} value="1.0.0" />
        <SettingItem
          label={language === 'zh' ? '隐私政策' : 'Privacy Policy'}
          onPress={() => {
            Linking.openURL('https://github.com/lijingmt/guowubushi-fasting/blob/main/PRIVACY.md');
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
          </Card>
        </>
      )}

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
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{t.language}</Text>

            <TouchableOpacity
              style={[styles.optionButton, { backgroundColor: colors.backgroundSecondary }]}
              onPress={async () => {
                await updateSettings({ language: 'zh' });
                setShowLanguagePicker(false);
              }}
            >
              <Text style={[styles.optionText, { color: colors.text }]}>{t.langZh}</Text>
              {settings.language === 'zh' && <Text style={[styles.checkIcon, { color: colors.primary }]}>✓</Text>}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.optionButton, { backgroundColor: colors.backgroundSecondary }]}
              onPress={async () => {
                await updateSettings({ language: 'en' });
                setShowLanguagePicker(false);
              }}
            >
              <Text style={[styles.optionText, { color: colors.text }]}>{t.langEn}</Text>
              {settings.language === 'en' && <Text style={[styles.checkIcon, { color: colors.primary }]}>✓</Text>}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.optionButton, { backgroundColor: colors.backgroundSecondary }]}
              onPress={async () => {
                await updateSettings({ language: 'es' });
                setShowLanguagePicker(false);
              }}
            >
              <Text style={[styles.optionText, { color: colors.text }]}>{t.langEs}</Text>
              {settings.language === 'es' && <Text style={[styles.checkIcon, { color: colors.primary }]}>✓</Text>}
            </TouchableOpacity>

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
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 24,
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
    borderColor: '#FF5722',
    borderRadius: 12,
    color: '#333',
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
    backgroundColor: '#FF5722',
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
    color: '#FF5722',
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
});
