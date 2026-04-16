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
} from 'react-native';
import * as Notifications from 'expo-notifications';
import { useApp } from '../context/AppContext';
import { Card } from '../components/Card';

export const SettingsScreen: React.FC = () => {
  const {
    t,
    settings,
    updateSettings,
    healthSync,
    updateHealthSync,
  } = useApp();
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [tempTime, setTempTime] = useState(settings.reminderTime);

  const handleToggleNotifications = async (value: boolean) => {
    if (value) {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('权限需要', '需要通知权限来发送每日提醒');
        return;
      }
    }
    await updateSettings({ enableNotifications: value });
  };

  const handleSaveTime = () => {
    updateSettings({ reminderTime: tempTime });
    setShowTimePicker(false);
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
      <Text style={styles.settingLabel}>{label}</Text>
      {value && <Text style={styles.settingValue}>{value}</Text>}
      {rightElement}
    </TouchableOpacity>
  );

  const Divider = () => <View style={styles.divider} />;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{t.settings}</Text>

      {/* 打卡提醒设置 */}
      <Text style={styles.sectionTitle}>打卡提醒</Text>
      <Card>
        <View style={styles.settingItem}>
          <Text style={styles.settingLabel}>启用每日提醒</Text>
          <Switch
            value={settings.enableNotifications}
            onValueChange={handleToggleNotifications}
            trackColor={{ false: '#ccc', true: '#FF5722' }}
            thumbColor="#fff"
          />
        </View>
        {settings.enableNotifications && (
          <>
            <Divider />
            <SettingItem
              label="提醒时间"
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
      <Text style={styles.sectionTitle}>目标设置</Text>
      <Card>
        <SettingItem
          label="每日卡路里目标"
          value={`${settings.dailyCalorieGoal} kcal`}
          onPress={() => {
            Alert.alert(
              '卡路里目标',
              '建议每天摄入1500-2000卡路里',
              [{ text: '知道了' }]
            );
          }}
        />
      </Card>

      {/* 通用设置 */}
      <Text style={styles.sectionTitle}>{t.generalSettings}</Text>
      <Card>
        <SettingItem
          label={t.language}
          value={
            settings.language === 'zh'
              ? '中文'
              : settings.language === 'en'
              ? 'English'
              : 'Español'
          }
          onPress={() => {
            Alert.alert(
              t.language,
              '',
              [
                {
                  text: '中文',
                  onPress: () => updateSettings({ language: 'zh' }),
                },
                {
                  text: 'English',
                  onPress: () => updateSettings({ language: 'en' }),
                },
                {
                  text: 'Español',
                  onPress: () => updateSettings({ language: 'es' }),
                },
                {
                  text: t.cancel,
                  style: 'cancel',
                },
              ]
            );
          }}
        />
        <Divider />
        <SettingItem
          label={t.theme}
          value={
            settings.theme === 'light'
              ? '浅色'
              : settings.theme === 'dark'
              ? '深色'
              : '自动'
          }
          onPress={() => {
            Alert.alert(
              t.theme,
              '',
              [
                {
                  text: '浅色',
                  onPress: () => updateSettings({ theme: 'light' }),
                },
                {
                  text: '深色',
                  onPress: () => updateSettings({ theme: 'dark' }),
                },
                {
                  text: '自动',
                  onPress: () => updateSettings({ theme: 'auto' }),
                },
                {
                  text: t.cancel,
                  style: 'cancel',
                },
              ]
            );
          }}
        />
      </Card>

      {/* 健康同步 */}
      <Text style={styles.sectionTitle}>{t.dataSync}</Text>
      <Card>
        <View style={styles.settingItem}>
          <View>
            <Text style={styles.settingLabel}>Apple Health</Text>
            <Text style={styles.settingDesc}>
              {healthSync.healthKitEnabled ? '已启用' : '未启用'}
            </Text>
          </View>
          <Switch
            value={healthSync.healthKitEnabled}
            onValueChange={(value) =>
              updateHealthSync({ healthKitEnabled: value })
            }
            trackColor={{ false: '#ccc', true: '#4CAF50' }}
            thumbColor="#fff"
          />
        </View>
      </Card>

      {/* 关于 */}
      <Text style={styles.sectionTitle}>{t.about}</Text>
      <Card>
        <SettingItem label={t.version} value="1.0.0" />
      </Card>

      {/* 时间选择器 */}
      <Modal
        visible={showTimePicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowTimePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>设置提醒时间</Text>

            <View style={styles.timeInputContainer}>
              <TextInput
                style={styles.timeInput}
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
              <Text style={styles.timeSeparator}>:</Text>
              <TextInput
                style={styles.timeInput}
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
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setShowTimePicker(false)}
              >
                <Text style={styles.modalButtonText}>{t.cancel}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonConfirm]}
                onPress={handleSaveTime}
              >
                <Text style={styles.modalButtonText}>{t.ok}</Text>
              </TouchableOpacity>
            </View>
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
});
