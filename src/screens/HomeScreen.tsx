import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Share, Alert, Clipboard, Modal, TextInput, Platform } from 'react-native';
import { useApp } from '../context/AppContext';
import { Card } from '../components/Card';
import { StatCard } from '../components/StatCard';
import { CheckInCard } from '../components/CheckInCard';
import * as Haptics from 'expo-haptics';
import { responsiveSize, fs, rs, vs, layout, responsive } from '../theme/responsive';
import { LinearGradient } from 'expo-linear-gradient';
import { captureRef } from 'react-native-view-shot';
import * as FileSystem from 'expo-file-system/legacy';
import { shareAsync } from 'expo-sharing';

export const HomeScreen: React.FC = () => {
  const {
    t,
    stats,
    todayWater,
    todayCalories,
    settings,
    updateSettings,
    addWater,
    hasCheckedToday,
    todayCheckIn,
    colors,
    language,
  } = useApp();

  const [flameAnimation] = useState(false);
  const shareCardRef = useRef<View>(null);
  const [showSharePreview, setShowSharePreview] = useState(false);
  const [showShareCardModal, setShowShareCardModal] = useState(false);
  const [showCalorieModal, setShowCalorieModal] = useState(false);
  const [calorieInput, setCalorieInput] = useState(settings.dailyCalorieGoal.toString());
  const [showWaterModal, setShowWaterModal] = useState(false);
  const [waterInput, setWaterInput] = useState('2000');

  const handleAddWater = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    addWater(250);
  };

  const handleSaveCalorieGoal = async () => {
    const newGoal = parseInt(calorieInput, 10);
    if (newGoal && newGoal >= 500 && newGoal <= 10000) {
      await updateSettings({ dailyCalorieGoal: newGoal });
      setShowCalorieModal(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Alert.alert(
        language === 'zh' ? '无效的数值' : 'Invalid Value',
        language === 'zh' ? '请输入500-10000之间的数值' : 'Please enter a value between 500 and 10000'
      );
    }
  };

  const openCalorieModal = () => {
    setCalorieInput(settings.dailyCalorieGoal.toString());
    setShowCalorieModal(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleSaveWaterGoal = async () => {
    const newGoal = parseInt(waterInput, 10);
    if (newGoal && newGoal >= 500 && newGoal <= 3000) {
      await updateSettings({ dailyWaterGoal: newGoal });
      setShowWaterModal(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Alert.alert(
        language === 'zh' ? '无效的数值' : 'Invalid Value',
        language === 'zh' ? '请输入500-3000之间的数值' : 'Please enter a value between 500 and 3000'
      );
    }
  };

  const openWaterModal = () => {
    setWaterInput((settings as any).dailyWaterGoal?.toString() || '2000');
    setShowWaterModal(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  // Get current water goal
  const getWaterGoal = () => (settings as any).dailyWaterGoal || 2000;

  const handleShare = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Web platform: show preview modal
    if (Platform.OS === 'web') {
      setShowSharePreview(true);
      return;
    }

    // Native platforms: show share card modal
    setShowShareCardModal(true);
  };

  const handleNativeShare = async () => {
    try {
      console.log('Starting share capture...');
      console.log('shareCardRef current:', shareCardRef.current);

      // Small delay to ensure card is fully rendered
      await new Promise(resolve => setTimeout(resolve, 300));

      // Capture the card with result: 'tmpfile' for iOS
      const uri = await captureRef(shareCardRef, {
        format: 'png',
        quality: 1,
        result: 'tmpfile',
      });

      console.log('captureRef returned uri:', uri);

      if (!uri) {
        throw new Error('captureRef returned null URI');
      }

      await shareAsync(uri, {
        mimeType: 'image/png',
        dialogTitle: language === 'zh' ? '分享成就' : language === 'es' ? 'Compartir logro' : 'Share Achievement',
      });

      console.log('Share successful!');
      setShowShareCardModal(false);
    } catch (error) {
      console.error('Share error:', error);
      console.error('Error details:', JSON.stringify(error));
      // Fallback to text sharing if image capture fails
      const getMessage = () => {
        let message = '';
        if (hasCheckedToday && todayCheckIn?.completed) {
          message = t.shareMessage1
            .replace('{{streak}}', stats.currentStreak.toString())
            .replace('{{days}}', stats.completedDays.toString())
            .replace('{{calories}}', stats.totalCaloriesSaved.toString());
        } else {
          message = t.shareMessage2.replace('{{days}}', stats.completedDays.toString());
        }
        // 添加禁食统计
        if (stats.totalSingleFastingSessions > 0) {
          const fastingText = language === 'zh'
            ? `\n\n⏰ 单次禁食：${stats.totalSingleFastingSessions}次，${stats.totalSingleFastingMinutes}分钟`
            : language === 'es'
            ? `\n\n⏰ Ayuno único: ${stats.totalSingleFastingSessions} sesiones, ${stats.totalSingleFastingMinutes} minutos`
            : `\n\n⏰ Single Fasting: ${stats.totalSingleFastingSessions} sessions, ${stats.totalSingleFastingMinutes} minutes`;
          message += fastingText;
        }
        return message;
      };
      const shareMessage = `🔥 ${getMessage()}`;
      await Share.share({ message: shareMessage });
    }
  };

  const handleDownloadImage = async () => {
    // For web: use html2canvas to capture and share/download
    const element = document.getElementById('share-card-preview');
    if (element) {
      try {
        const { default: html2canvas } = await import('html2canvas');
        const canvas = await html2canvas(element, {
          backgroundColor: null,
          scale: 2,
          useCORS: true,
        });

        // Convert canvas to blob
        canvas.toBlob(async (blob) => {
          if (blob) {
            // Try Web Share API first (mobile devices)
            if (navigator.share && navigator.canShare) {
              const file = new File([blob], '过午不食-成就.png', { type: 'image/png' });
              const shareData = {
                title: language === 'zh' ? '过午不食' : 'Fasting',
                text: language === 'zh'
                  ? `我已经坚持过午不食${stats.currentStreak}天，节省做饭和用餐时间各${stats.completedDays}小时！`
                  : `I've been fasting for ${stats.currentStreak} days, saved ${stats.completedDays}h cooking and eating time!`,
                files: [file],
              };

              try {
                if (navigator.canShare(shareData)) {
                  await navigator.share(shareData);
                  setShowSharePreview(false);
                  return;
                }
              } catch (err) {
                // Share was cancelled or failed, fall through to download
                if (err.name !== 'AbortError') {
                  console.log('Share failed:', err);
                }
              }
            }

            // Fallback: download the image
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.download = '过午不食-成就.png';
            link.href = url;
            link.click();
            URL.revokeObjectURL(url);
            setShowSharePreview(false);
          }
        }, 'image/png');
      } catch (err) {
        console.error('Failed to generate image:', err);
        alert(language === 'zh' ? '请截图保存' : 'Please take a screenshot to save');
      }
    }
  };

  // 获取火焰emoji，根据连胜天数和宽限期状态变化
  const getFlameEmoji = () => {
    // 如果处于宽限期，显示冰冻火苗
    if (stats.streakInGracePeriod) {
      if (stats.currentStreak >= 30) return '🧊🔥🔥';
      if (stats.currentStreak >= 14) return '🧊🔥';
      if (stats.currentStreak >= 7) return '🧊';
      return '🥶';
    }
    // 正常状态
    if (stats.currentStreak >= 30) return '🔥🔥🔥';
    if (stats.currentStreak >= 14) return '🔥🔥';
    if (stats.currentStreak >= 7) return '🔥';
    if (stats.currentStreak >= 3) return '✨';
    return '💪';
  };

  // 响应式样式
  const styles = createResponsiveStyles();

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={styles.content}
      >
      <View style={styles.header}>
        <Text style={[styles.greeting, { color: colors.text }]}>{t.welcome}</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{t.appName}</Text>
      </View>

      <CheckInCard />

      {/* Share button */}
      {hasCheckedToday && todayCheckIn?.completed && (
        <TouchableOpacity
          style={[styles.shareButton, { backgroundColor: colors.primary }]}
          onPress={handleShare}
        >
          <Text style={styles.shareButtonText}>📱 {t.shareToMoments}</Text>
        </TouchableOpacity>
      )}

      {/* Streak card */}
      <View style={[styles.streakCard, { backgroundColor: colors.card }]}>
        <Text style={styles.streakEmoji}>{getFlameEmoji()}</Text>
        <Text style={[styles.streakTitle, { color: colors.textSecondary }]}>{t.currentStreak}</Text>
        <Text style={[styles.streakCount, { color: colors.primary }]}>{stats.currentStreak}</Text>
        <Text style={[styles.streakLabel, { color: colors.textSecondary }]}>{t.dayUnit}</Text>
        <Text style={[styles.gracePeriodHint, { color: colors.textTertiary }]}>{t.gracePeriodHint}</Text>
      </View>

      <View style={styles.statsRow}>
        <StatCard
          title={t.totalCompletedDays}
          value={stats.completedDays}
          unit={t.days}
          icon="📅"
          colors={['#FF9800', '#F44336']}
        />
        <StatCard
          title={t.longestStreakLabel}
          value={stats.longestStreak}
          unit={t.days}
          icon="🏆"
          colors={['#FFD700', '#FFA500']}
        />
      </View>

      <View style={styles.statsRow}>
        <StatCard
          title={t.totalCaloriesSaved}
          value={stats.totalCaloriesSaved}
          unit={t.kcal}
          icon="💪"
          colors={['#4CAF50', '#8BC34A']}
        />
        <StatCard
          title={t.totalMealsSkipped}
          value={stats.totalMealsSkipped}
          unit={t.mealsUnit}
          icon="🍽️"
          colors={['#2196F3', '#03A9F4']}
        />
      </View>

      <View style={styles.statsRow}>
        <StatCard
          title={t.longestAbstinenceStreak}
          value={stats.longestAbstinenceStreak}
          unit={t.dayUnit}
          icon="🙏"
          colors={['#9C27B0', '#7B1FA2']}
        />
        <StatCard
          title={t.totalHoursSaved}
          value={stats.totalHoursSaved}
          unit={t.hoursUnit}
          icon="⏰"
          colors={['#FF9800', '#F57C00']}
        />
      </View>

      <Card style={styles.waterCard}>
        <View style={styles.waterHeader}>
          <Text style={[styles.waterTitle, { color: colors.info }]}>{t.waterIntake}</Text>
          <View style={styles.waterAmountRow}>
            <Text style={[styles.waterAmount, { color: colors.info }]}>
              {todayWater} <Text style={styles.waterUnit}>ml</Text>
            </Text>
            <Text style={[styles.waterGoalText, { color: colors.textLight }]}> / </Text>
            <TouchableOpacity onPress={openWaterModal}>
              <Text style={[styles.waterGoalText, { color: colors.textLight }]}>
                {getWaterGoal()}ml ✏️
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={[styles.progressBar, { backgroundColor: colors.divider }]}>
          <View
            style={[
              styles.progressFill,
              { backgroundColor: colors.info, width: `${Math.min((todayWater / getWaterGoal()) * 100, 100)}%` },
            ]}
          />
        </View>
        <TouchableOpacity
          style={[styles.waterButton, { backgroundColor: colors.info }]}
          onPress={handleAddWater}
        >
          <Text style={styles.waterButtonText}>+ 250ml</Text>
        </TouchableOpacity>
      </Card>

      <Card style={styles.calorieCard}>
        <Text style={[styles.calorieTitle, { color: colors.warning }]}>{t.totalCalories}</Text>
        <Text style={[styles.calorieAmount, { color: colors.warning }]}>
          {todayCalories}{' '}
          <TouchableOpacity onPress={openCalorieModal}>
            <Text style={[styles.calorieGoal, { color: colors.warning }]}>
              / {settings.dailyCalorieGoal} kcal ✏️
            </Text>
          </TouchableOpacity>
        </Text>
        <View style={[styles.progressBar, { backgroundColor: colors.divider }]}>
          <View
            style={[
              styles.progressFill,
              { backgroundColor: colors.warning, width: `${Math.min((todayCalories / settings.dailyCalorieGoal) * 100, 100)}%` },
            ]}
          />
        </View>
      </Card>

      {/* Calorie Goal Edit Modal */}
      <Modal
        visible={showCalorieModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCalorieModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {language === 'zh' ? '设置每日卡路里目标' : 'Set Daily Calorie Goal'}
            </Text>
            <Text style={[styles.modalHint, { color: colors.textSecondary }]}>
              {language === 'zh' ? '请输入500-10000之间的数值' : 'Enter a value between 500 and 10000'}
            </Text>
            <TextInput
              style={[styles.calorieInput, { color: colors.text, backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}
              value={calorieInput}
              onChangeText={setCalorieInput}
              keyboardType="number-pad"
              placeholder="2000"
              placeholderTextColor={colors.textLight}
              autoFocus
            />
            <View style={styles.modalButtonRow}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelModalButton, { backgroundColor: colors.divider }]}
                onPress={() => setShowCalorieModal(false)}
              >
                <Text style={[styles.modalButtonText, { color: colors.text }]}>
                  {t.cancel}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveModalButton, { backgroundColor: colors.success }]}
                onPress={handleSaveCalorieGoal}
              >
                <Text style={styles.saveButtonText}>
                  {language === 'zh' ? '保存' : 'Save'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Water Goal Edit Modal */}
      <Modal
        visible={showWaterModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowWaterModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {language === 'zh' ? '设置每日饮水目标' : 'Set Daily Water Goal'}
            </Text>
            <Text style={[styles.modalHint, { color: colors.textSecondary }]}>
              {language === 'zh' ? '请输入500-3000之间的数值' : 'Enter a value between 500 and 3000'}
            </Text>
            <TextInput
              style={[styles.calorieInput, { color: colors.text, backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}
              value={waterInput}
              onChangeText={setWaterInput}
              keyboardType="number-pad"
              placeholder="2000"
              placeholderTextColor={colors.textLight}
              autoFocus
            />
            <View style={styles.modalButtonRow}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelModalButton, { backgroundColor: colors.divider }]}
                onPress={() => setShowWaterModal(false)}
              >
                <Text style={[styles.modalButtonText, { color: colors.text }]}>
                  {t.cancel}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveModalButton, { backgroundColor: colors.info }]}
                onPress={handleSaveWaterGoal}
              >
                <Text style={styles.saveButtonText}>
                  {language === 'zh' ? '保存' : 'Save'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Share Preview Modal (Web) */}
      <Modal
        visible={showSharePreview}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowSharePreview(false)}
      >
        <View style={styles.sharePreviewOverlay}>
          <View style={styles.sharePreviewContent}>
            <Text style={[styles.sharePreviewTitle, { color: colors.text }]}>
              {language === 'zh' ? '分享成就' : 'Share Achievement'}
            </Text>

            {/* Share Card Preview */}
            <View id="share-card-preview" style={styles.sharePreviewCard}>
              <LinearGradient
                colors={['#FF6B6B', '#FF8E53', '#FFA726']}
                style={styles.shareCardBackground}
              >
                {/* Decorative circles */}
                <View style={[styles.shareCircle, styles.shareCircle1]} />
                <View style={[styles.shareCircle, styles.shareCircle2]} />
                <View style={[styles.shareCircle, styles.shareCircle3]} />

                <View style={styles.shareCardContent}>
                  {/* Header */}
                  <Text style={styles.shareGreeting}>
                    {language === 'en' ? 'My Fasting Journey' : language === 'es' ? 'Mi Viaje de Ayuno' : '过午不食之路'}
                  </Text>
                  <Text style={styles.shareSubtitle}>
                    {language === 'en' ? 'Building healthy habits, one day at a time' : language === 'es' ? 'Construyendo hábitos saludables, día a día' : '培养健康习惯，一天天坚持'}
                  </Text>

                  {/* Main Stats */}
                  <View style={styles.shareMainStats}>
                    <View style={styles.shareMainStatItem}>
                      <Text style={styles.shareMainStatValue}>{stats.currentStreak}</Text>
                      <Text style={styles.shareMainStatLabel}>
                        {language === 'en' ? 'Day Streak' : language === 'es' ? 'Días Racha' : '连续天数'}
                      </Text>
                    </View>
                    <View style={styles.shareStatDivider} />
                    <View style={styles.shareMainStatItem}>
                      <Text style={styles.shareMainStatValue}>{stats.completedDays}h</Text>
                      <Text style={styles.shareMainStatLabel}>
                        {language === 'en' ? 'Cooking Saved' : language === 'es' ? 'Cocina Ahorrada' : '节省做饭'}
                      </Text>
                    </View>
                    <View style={styles.shareStatDivider} />
                    <View style={styles.shareMainStatItem}>
                      <Text style={styles.shareMainStatValue}>{stats.completedDays}h</Text>
                      <Text style={styles.shareMainStatLabel}>
                        {language === 'en' ? 'Eating Saved' : language === 'es' ? 'Comida Ahorrada' : '节省用餐'}
                      </Text>
                    </View>
                  </View>

                  {/* Footer */}
                  <View style={styles.shareFooter}>
                    <View style={styles.shareFooterLine} />
                    <Text style={styles.shareFooterText}>
                      {language === 'zh' ? '下载app：' : language === 'es' ? 'Descarga la app:' : 'Download the app:'}
                    </Text>
                    <Text style={styles.shareFooterLink}>apps.apple.com/app/id6762360504</Text>
                    <Text style={styles.shareFooterBrand}>"过午不食" Fasting App</Text>
                  </View>
                </View>
              </LinearGradient>
            </View>

            {/* Action buttons */}
            <View style={styles.sharePreviewActions}>
              <TouchableOpacity
                style={[styles.sharePreviewButton, styles.sharePreviewButtonCancel, { backgroundColor: colors.divider }]}
                onPress={() => setShowSharePreview(false)}
              >
                <Text style={[styles.sharePreviewButtonText, { color: colors.text }]}>
                  {language === 'zh' ? '关闭' : 'Close'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sharePreviewButton, styles.sharePreviewButtonDownload, { backgroundColor: colors.primary }]}
                onPress={handleDownloadImage}
              >
                <Text style={styles.sharePreviewButtonTextDownload}>
                  📤 {language === 'zh' ? '分享' : 'Share'}
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.sharePreviewHint, { color: colors.textSecondary }]}>
              {language === 'zh' ? '提示：也可以直接截图分享' : 'Tip: You can also take a screenshot'}
            </Text>
          </View>
        </View>
      </Modal>

      {/* Share Card Modal (Native) */}
      <Modal
        visible={showShareCardModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowShareCardModal(false)}
      >
        <View style={styles.shareCardModalOverlay}>
          <View style={styles.shareCardModalContent}>
            <Text style={[styles.shareCardModalTitle, { color: colors.text }]}>
              {language === 'zh' ? '分享成就' : 'Share Achievement'}
            </Text>

            {/* Share Card - visible preview only (not used for capture) */}
            <View
              style={styles.shareCardModalCard}
            >
              {/* Decorative circles */}
              <View style={[styles.shareCircle, styles.shareCircle1]} />
              <View style={[styles.shareCircle, styles.shareCircle2]} />
              <View style={[styles.shareCircle, styles.shareCircle3]} />

              <View style={styles.shareCardContent}>
                {/* Header */}
                <Text style={styles.shareGreeting}>
                  {language === 'en' ? 'My Fasting Journey' : language === 'es' ? 'Mi Viaje de Ayuno' : '过午不食之路'}
                </Text>
                <Text style={styles.shareSubtitle}>
                  {language === 'en' ? 'Building healthy habits, one day at a time' : language === 'es' ? 'Construyendo hábitos saludables, día a día' : '培养健康习惯，一天天坚持'}
                </Text>

                {/* Main Stats */}
                <View style={styles.shareMainStats}>
                  <View style={styles.shareMainStatItem}>
                    <Text style={styles.shareMainStatValue}>{stats.currentStreak}</Text>
                    <Text style={styles.shareMainStatLabel}>
                      {language === 'en' ? 'Day Streak' : language === 'es' ? 'Días Racha' : '连续天数'}
                    </Text>
                  </View>
                  <View style={styles.shareStatDivider} />
                  <View style={styles.shareMainStatItem}>
                    <Text style={styles.shareMainStatValue}>{stats.completedDays}h</Text>
                    <Text style={styles.shareMainStatLabel}>
                      {language === 'en' ? 'Cooking Saved' : language === 'es' ? 'Cocina Ahorrada' : '节省做饭'}
                    </Text>
                  </View>
                  <View style={styles.shareStatDivider} />
                  <View style={styles.shareMainStatItem}>
                    <Text style={styles.shareMainStatValue}>{stats.completedDays}h</Text>
                    <Text style={styles.shareMainStatLabel}>
                      {language === 'en' ? 'Eating Saved' : language === 'es' ? 'Comida Ahorrada' : '节省用餐'}
                    </Text>
                  </View>
                </View>

                {/* Footer */}
                <View style={styles.shareFooter}>
                  <View style={styles.shareFooterLine} />
                  <Text style={styles.shareFooterText}>
                    {language === 'zh' ? '下载app：' : language === 'es' ? 'Descarga la app:' : 'Download the app:'}
                  </Text>
                  <Text style={styles.shareFooterLink}>apps.apple.com/app/id6762360504</Text>
                  <Text style={styles.shareFooterBrand}>"过午不食" Fasting App</Text>
                </View>
              </View>
            </View>

            {/* Action buttons */}
            <View style={styles.shareCardModalActions}>
              <TouchableOpacity
                style={[styles.shareCardModalButton, styles.shareCardModalButtonCancel, { backgroundColor: colors.divider }]}
                onPress={() => setShowShareCardModal(false)}
              >
                <Text style={[styles.shareCardModalButtonText, { color: colors.text }]}>
                  {language === 'zh' ? '取消' : 'Cancel'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.shareCardModalButton, styles.shareCardModalButtonShare, { backgroundColor: colors.primary }]}
                onPress={handleNativeShare}
              >
                <Text style={styles.shareCardModalButtonTextShare}>
                  📤 {language === 'zh' ? '分享' : 'Share'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </ScrollView>

    {/* Hidden Share Card for capture - rendered outside ScrollView */}
    <View
      ref={shareCardRef}
      collapsable={false}
      style={styles.hiddenShareCard}
    >
      <LinearGradient
        colors={['#FF6B6B', '#FF8E53', '#FFA726']}
        style={{ width: '100%', height: '100%' }}
      >
        {/* Decorative circles */}
        <View style={[styles.shareCircle, styles.shareCircle1]} />
        <View style={[styles.shareCircle, styles.shareCircle2]} />
        <View style={[styles.shareCircle, styles.shareCircle3]} />

        <View style={styles.shareCardContent}>
        {/* Header */}
        <Text style={styles.shareGreeting}>
          {language === 'en' ? 'My Fasting Journey' : language === 'es' ? 'Mi Viaje de Ayuno' : '过午不食之路'}
        </Text>
        <Text style={styles.shareSubtitle}>
          {language === 'en' ? 'Building healthy habits, one day at a time' : language === 'es' ? 'Construyendo hábitos saludables, día a día' : '培养健康习惯，一天天坚持'}
        </Text>

        {/* Main Stats */}
        <View style={styles.shareMainStats}>
          <View style={styles.shareMainStatItem}>
            <Text style={styles.shareMainStatValue}>{stats.currentStreak}</Text>
            <Text style={styles.shareMainStatLabel}>
              {language === 'en' ? 'Day Streak' : language === 'es' ? 'Días Racha' : '连续天数'}
            </Text>
          </View>
          <View style={styles.shareStatDivider} />
          <View style={styles.shareMainStatItem}>
            <Text style={styles.shareMainStatValue}>{stats.completedDays}h</Text>
            <Text style={styles.shareMainStatLabel}>
              {language === 'en' ? 'Cooking Saved' : language === 'es' ? 'Cocina Ahorrada' : '节省做饭'}
            </Text>
          </View>
          <View style={styles.shareStatDivider} />
          <View style={styles.shareMainStatItem}>
            <Text style={styles.shareMainStatValue}>{stats.completedDays}h</Text>
            <Text style={styles.shareMainStatLabel}>
              {language === 'en' ? 'Eating Saved' : language === 'es' ? 'Comida Ahorrada' : '节省用餐'}
            </Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.shareFooter}>
          <View style={styles.shareFooterLine} />
          <Text style={styles.shareFooterText}>
            {language === 'zh' ? '下载app：' : language === 'es' ? 'Descarga la app:' : 'Download the app:'}
          </Text>
          <Text style={styles.shareFooterLink}>apps.apple.com/app/id6762360504</Text>
          <Text style={styles.shareFooterBrand}>"过午不食" Fasting App</Text>
        </View>
        </View>
      </LinearGradient>
    </View>
    </View>
  );
};

// 创建响应式样式
const createResponsiveStyles = () => {
  const isTablet = layout.maxWidth >= 600;

  return StyleSheet.create({
    container: {
      flex: 1,
    },
    content: {
      padding: layout.contentPadding,
      paddingTop: vs(60),
      paddingBottom: vs(40),
    },
    header: {
      marginTop: vs(50),
      marginBottom: vs(20),
    },
    greeting: {
      fontSize: responsive({
        small: fs(24),
        medium: fs(26),
        large: fs(28),
        tablet: fs(36),
        default: fs(28),
      }),
      fontWeight: 'bold',
    },
    subtitle: {
      fontSize: responsiveSize.fontSize.lg,
      marginTop: vs(4),
    },
    shareButton: {
      paddingVertical: vs(14),
      borderRadius: responsiveSize.borderRadius.md,
      alignItems: 'center',
      marginTop: vs(16),
      marginBottom: vs(16),
      shadowColor: '#FF5722',
      shadowOffset: { width: 0, height: vs(2) },
      shadowOpacity: 0.3,
      shadowRadius: rs(4),
      elevation: 4,
    },
    shareButtonText: {
      color: '#fff',
      fontSize: responsive({
        small: fs(14),
        tablet: fs(18),
        default: fs(16),
      }),
      fontWeight: '600',
    },
    streakCard: {
      borderRadius: responsive({
        small: rs(16),
        tablet: rs(24),
        default: rs(20),
      }),
      padding: responsive({
        small: rs(16),
        tablet: rs(32),
        default: rs(24),
      }),
      alignItems: 'center',
      marginBottom: vs(20),
      shadowColor: '#000',
      shadowOffset: { width: 0, height: vs(4) },
      shadowOpacity: 0.3,
      shadowRadius: rs(8),
      elevation: 8,
    },
    streakEmoji: {
      fontSize: responsive({
        small: fs(40),
        tablet: fs(64),
        default: fs(48),
      }),
      marginBottom: rs(8),
    },
    streakTitle: {
      fontSize: responsiveSize.fontSize.lg,
      marginBottom: rs(8),
    },
    streakCount: {
      fontSize: responsive({
        small: fs(44),
        medium: fs(52),
        tablet: fs(72),
        default: fs(56),
      }),
      fontWeight: 'bold',
    },
    streakLabel: {
      fontSize: responsiveSize.fontSize.xl,
    },
    gracePeriodHint: {
      fontSize: responsive({
        small: fs(10),
        tablet: fs(12),
        default: fs(11),
      }),
      marginTop: rs(4),
      textAlign: 'center',
    },
    statsRow: {
      flexDirection: 'row',
      marginTop: vs(16),
      gap: rs(8),
    },
    waterCard: {
      marginTop: vs(16),
    },
    waterHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: vs(12),
    },
    waterTitle: {
      fontSize: responsiveSize.fontSize.xl,
      fontWeight: '600',
    },
    waterAmountRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    waterAmount: {
      fontSize: responsive({
        small: fs(20),
        tablet: fs(28),
        default: fs(24),
      }),
      fontWeight: 'bold',
    },
    waterUnit: {
      fontSize: responsiveSize.fontSize.lg,
      fontWeight: 'normal',
    },
    waterGoalText: {
      fontSize: responsiveSize.fontSize.base,
      textDecorationLine: 'underline',
      textDecorationStyle: 'dotted',
    },
    progressBar: {
      height: vs(8),
      borderRadius: rs(4),
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      borderRadius: rs(4),
    },
    waterButton: {
      marginTop: vs(12),
      paddingVertical: vs(12),
      borderRadius: responsiveSize.borderRadius.md,
      alignItems: 'center',
    },
    waterButtonText: {
      color: '#fff',
      fontSize: responsive({
        small: fs(14),
        tablet: fs(18),
        default: fs(16),
      }),
      fontWeight: '600',
    },
    calorieCard: {
      marginTop: vs(16),
    },
    calorieTitle: {
      fontSize: responsiveSize.fontSize.xl,
      fontWeight: '600',
      marginBottom: vs(8),
    },
    calorieAmount: {
      fontSize: responsive({
        small: fs(20),
        tablet: fs(28),
        default: fs(24),
      }),
      fontWeight: 'bold',
    },
    calorieUnit: {
      fontSize: responsiveSize.fontSize.lg,
      fontWeight: 'normal',
    },
    calorieGoal: {
      fontSize: responsiveSize.fontSize.lg,
      fontWeight: 'normal',
      textDecorationLine: 'underline',
      textDecorationStyle: 'dotted',
    },
    calorieProgress: {
      backgroundColor: '#FF9800',
    },
    // Calorie edit modal styles
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContent: {
      borderRadius: responsiveSize.borderRadius.xl,
      padding: responsive({
        small: rs(20),
        tablet: rs(32),
        default: rs(24),
      }),
      width: '80%',
      maxWidth: rs(320),
      alignItems: 'center',
    },
    modalTitle: {
      fontSize: responsive({
        small: fs(18),
        tablet: fs(22),
        default: fs(20),
      }),
      fontWeight: 'bold',
      marginBottom: rs(8),
      textAlign: 'center',
    },
    modalHint: {
      fontSize: responsiveSize.fontSize.sm,
      marginBottom: vs(20),
      textAlign: 'center',
    },
    calorieInput: {
      width: '100%',
      borderWidth: 1,
      borderRadius: responsiveSize.borderRadius.md,
      padding: rs(14),
      fontSize: responsive({
        small: fs(20),
        tablet: fs(26),
        default: fs(24),
      }),
      fontWeight: 'bold',
      textAlign: 'center',
      marginBottom: vs(20),
    },
    modalButtonRow: {
      flexDirection: 'row',
      width: '100%',
      gap: rs(12),
    },
    modalButton: {
      flex: 1,
      paddingVertical: vs(14),
      borderRadius: responsiveSize.borderRadius.md,
      alignItems: 'center',
    },
    cancelModalButton: {},
    saveModalButton: {},
    modalButtonText: {
      fontSize: responsive({
        small: fs(14),
        tablet: fs(18),
        default: fs(16),
      }),
      fontWeight: '600',
    },
    saveButtonText: {
      color: '#fff',
      fontSize: responsive({
        small: fs(14),
        tablet: fs(18),
        default: fs(16),
      }),
      fontWeight: '600',
    },
    shareCardBackground: {
      width: '100%',
      height: '100%',
    },
    shareCircle: {
      position: 'absolute',
      borderRadius: 1000,
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
    shareCircle1: {
      width: 200,
      height: 200,
      top: -50,
      right: -50,
    },
    shareCircle2: {
      width: 150,
      height: 150,
      bottom: 100,
      left: -30,
    },
    shareCircle3: {
      width: 100,
      height: 100,
      bottom: -30,
      right: 50,
    },
    shareCardContent: {
      flex: 1,
      padding: 30,
      alignItems: 'center',
    },
    shareGreeting: {
      fontSize: 32,
      fontWeight: 'bold',
      color: '#fff',
      marginTop: 40,
      marginBottom: 8,
      textAlign: 'center',
    },
    shareSubtitle: {
      fontSize: 14,
      color: 'rgba(255, 255, 255, 0.9)',
      marginBottom: 30,
      textAlign: 'center',
    },
    shareMainStats: {
      flexDirection: 'row',
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      borderRadius: 20,
      padding: 20,
      width: '100%',
      justifyContent: 'space-around',
    },
    shareMainStatItem: {
      alignItems: 'center',
    },
    shareMainStatValue: {
      fontSize: 28,
      fontWeight: 'bold',
      color: '#fff',
    },
    shareMainStatLabel: {
      fontSize: 11,
      color: 'rgba(255, 255, 255, 0.9)',
      marginTop: 4,
      textAlign: 'center',
    },
    shareStatDivider: {
      width: 1,
      backgroundColor: 'rgba(255, 255, 255, 0.3)',
    },
    shareFooter: {
      position: 'absolute',
      bottom: 30,
      left: 30,
      right: 30,
      alignItems: 'center',
    },
    shareFooterLine: {
      height: 1,
      backgroundColor: 'rgba(255, 255, 255, 0.3)',
      width: '100%',
      marginBottom: 12,
    },
    shareFooterText: {
      fontSize: 11,
      color: 'rgba(255, 255, 255, 0.8)',
      marginBottom: 4,
    },
    shareFooterLink: {
      fontSize: 12,
      color: '#fff',
      fontWeight: 'bold',
      marginBottom: 4,
    },
    shareFooterBrand: {
      fontSize: 10,
      color: 'rgba(255, 255, 255, 0.7)',
    },
    // Share Preview Modal styles
    sharePreviewOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    sharePreviewContent: {
      width: '100%',
      maxWidth: 400,
      alignItems: 'center',
    },
    sharePreviewTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      marginBottom: 20,
    },
    sharePreviewCard: {
      width: 320,
      height: 450,
      borderRadius: 20,
      overflow: 'hidden',
      marginBottom: 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    },
    sharePreviewActions: {
      flexDirection: 'row',
      gap: 12,
      width: '100%',
      maxWidth: 320,
    },
    sharePreviewButton: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 12,
      alignItems: 'center',
    },
    sharePreviewButtonCancel: {
      flex: 1,
    },
    sharePreviewButtonDownload: {
      flex: 2,
    },
    sharePreviewButtonText: {
      fontSize: 16,
      fontWeight: '600',
    },
    sharePreviewButtonTextDownload: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
    },
    sharePreviewHint: {
      fontSize: 12,
      marginTop: 16,
      textAlign: 'center',
    },
    // Native share card modal styles
    shareCardModalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    shareCardModalContent: {
      alignItems: 'center',
    },
    shareCardModalTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      marginBottom: 20,
    },
    shareCardModalCard: {
      width: 320,
      height: 480,
      borderRadius: 20,
      padding: 24,
      marginBottom: 20,
      backgroundColor: '#FF6B6B',
    },
    shareCardModalActions: {
      flexDirection: 'row',
      gap: 12,
    },
    shareCardModalButton: {
      paddingVertical: 14,
      paddingHorizontal: 24,
      borderRadius: 12,
      alignItems: 'center',
      minWidth: 100,
    },
    shareCardModalButtonCancel: {},
    shareCardModalButtonShare: {},
    shareCardModalButtonText: {
      fontSize: 16,
      fontWeight: '600',
    },
    shareCardModalButtonTextShare: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
    },
    // Hidden share card for capture - rendered off-screen for proper screenshot
    hiddenShareCard: {
      position: 'absolute',
      width: 320,
      height: 480,
      bottom: -500, // Render off-screen to avoid visible interference
      right: 10,
      backgroundColor: '#FF6B6B',
      borderRadius: 20,
      overflow: 'hidden',
    },
  });
};
