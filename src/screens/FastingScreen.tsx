import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, Platform, Linking } from 'react-native';
import { useApp } from '../context/AppContext';
import { FastingTimerCard } from '../components/FastingTimerCard';
import { Card } from '../components/Card';
import { StatCard } from '../components/StatCard';
import { responsiveSize, fs, rs, vs } from '../theme/responsive';
import { LinearGradient } from 'expo-linear-gradient';
import { captureRef } from 'react-native-view-shot';
import QRCode from 'react-native-qrcode-svg';
import * as FileSystem from 'expo-file-system';
import { shareAsync } from 'expo-sharing';
import * as Haptics from 'expo-haptics';

export const FastingScreen: React.FC = () => {
  const { colors, language, stats } = useApp();
  const shareCardRef = useRef<View>(null);
  const [showSharePreview, setShowSharePreview] = useState(false);
  const [showShareCardModal, setShowShareCardModal] = useState(false);

  const getScreenTitle = () => {
    if (language === 'en') return 'Single Fasting';
    if (language === 'es') return 'Ayuno Único';
    return '单次禁食';
  };

  const getTimesLabel = () => {
    if (language === 'en') return 'times';
    if (language === 'es') return 'veces';
    return '次';
  };

  const getStatsTitle = () => {
    if (language === 'en') return 'Your Stats';
    if (language === 'es') return 'Tus Estadísticas';
    return '你的统计';
  };

  const getTotalSessionsLabel = () => {
    if (language === 'en') return 'Total Sessions';
    if (language === 'es') return 'Sesiones Totales';
    return '总次数';
  };

  const getTotalTimeLabel = () => {
    if (language === 'en') return 'Total Time';
    if (language === 'es') return 'Tiempo Total';
    return '总时长';
  };

  const getStreakLabel = () => {
    if (language === 'en') return 'Day Streak';
    if (language === 'es') return 'Racha de Días';
    return '连续天数';
  };

  const getMinutesLabel = () => {
    if (language === 'en') return 'minutes';
    if (language === 'es') return 'minutos';
    return '分钟';
  };

  const getDaysLabel = () => {
    if (language === 'en') return 'days';
    if (language === 'es') return 'días';
    return '天';
  };

  const getCaloriesSavedLabel = () => {
    if (language === 'en') return 'Calories Saved';
    if (language === 'es') return 'Calorías Ahorradas';
    return '节省卡路里';
  };

  const getWeightLossLabel = () => {
    if (language === 'en') return 'Est. Weight Loss';
    if (language === 'es') return 'Pérdida Peso Est.';
    return '预计减重';
  };

  const getKgLabel = () => {
    if (language === 'en') return 'kg';
    if (language === 'es') return 'kg';
    return '公斤';
  };

  const formatMinutes = (minutes: number): string => {
    // 对于小于1分钟的，显示0分钟
    const mins = Math.floor(minutes);
    if (mins >= 60) {
      const hours = Math.floor(mins / 60);
      const remainingMins = mins % 60;
      return language === 'zh'
        ? `${hours}小时${remainingMins > 0 ? remainingMins + '分钟' : ''}`
        : language === 'es'
        ? `${hours}h${remainingMins > 0 ? ' ' + remainingMins + 'min' : ''}`
        : `${hours}h${remainingMins > 0 ? ' ' + remainingMins + 'min' : ''}`;
    }
    return `${mins}`;
  };

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

  const openAppStore = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const appStoreUrl = 'https://apps.apple.com/app/id6762360504';
    try {
      await Linking.openURL(appStoreUrl);
    } catch (error) {
      console.error('Failed to open App Store:', error);
    }
  };

  const handleNativeShare = async () => {
    try {
      console.log('Starting fasting share capture...');
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
        dialogTitle: language === 'zh' ? '分享禁食成就' : language === 'es' ? 'Compartir logro de ayuno' : 'Share Fasting Achievement',
      });

      console.log('Share successful!');
      setShowShareCardModal(false);
    } catch (error) {
      console.error('Share error:', error);
      setShowShareCardModal(false);
    }
  };

  const handleDownloadImage = async () => {
    // For web: use html2canvas to capture and share/download
    const element = document.getElementById('fasting-share-card-preview');
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
              const file = new File([blob], '过午不食-禁食成就.png', { type: 'image/png' });
              const shareData = {
                title: language === 'zh' ? '过午不食 - 禁食成就' : 'Fasting Achievement',
                text: language === 'zh'
                  ? `我已经完成${stats.totalSingleFastingSessions}次禁食，累计${stats.totalSingleFastingMinutes}分钟！`
                  : `I've completed ${stats.totalSingleFastingSessions} fasting sessions, ${stats.totalSingleFastingMinutes} minutes total!`,
                files: [file],
              };

              try {
                if (navigator.canShare(shareData)) {
                  await navigator.share(shareData);
                  setShowSharePreview(false);
                  return;
                }
              } catch (err: unknown) {
                // Share was cancelled or failed, fall through to download
                if (err instanceof Error && err.name !== 'AbortError') {
                  console.log('Share failed:', err);
                }
              }
            }

            // Fallback: download the image
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.download = '过午不食-禁食成就.png';
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

  const styles = createStyles();

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={styles.content}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>{getScreenTitle()}</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            ⏰ {language === 'zh' ? '开始你的禁食之旅' : language === 'es' ? 'Comienza tu viaje de ayuno' : 'Start your fasting journey'}
          </Text>
        </View>

        {/* Fasting Timer Card */}
        <FastingTimerCard colors={colors} language={language} />

        {/* Share button - only show if user has fasting data */}
        {stats.totalSingleFastingSessions > 0 && (
          <TouchableOpacity
            style={[styles.shareButton, { backgroundColor: colors.primary }]}
            onPress={handleShare}
          >
            <Text style={styles.shareButtonText}>
              📱 {language === 'zh' ? '分享禁食成就' : language === 'es' ? 'Compartir Logro' : 'Share Achievement'}
            </Text>
          </TouchableOpacity>
        )}

        {/* Stats Section */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>{getStatsTitle()}</Text>

        <View style={styles.statsRow}>
          <StatCard
            title={getTotalSessionsLabel()}
            value={stats.totalSingleFastingSessions}
            unit={getTimesLabel()}
            icon="⏳"
            colors={['#FF6B6B', '#FF8E53']}
          />
          <StatCard
            title={getTotalTimeLabel()}
            value={formatMinutes(stats.totalSingleFastingMinutes)}
            unit={getMinutesLabel()}
            icon="⏰"
            colors={['#4CAF50', '#8BC34A']}
          />
        </View>

        <View style={styles.statsRow}>
          <StatCard
            title={getStreakLabel()}
            value={stats.currentSingleFastingStreak}
            unit={getDaysLabel()}
            icon="🔥"
            colors={['#FFA726', '#FB8C00']}
          />
          <StatCard
            title={language === 'zh' ? '最长连续' : language === 'es' ? 'Racha Más Larga' : 'Longest Streak'}
            value={stats.longestSingleFastingStreak}
            unit={getDaysLabel()}
            icon="🏆"
            colors={['#AB47BC', '#9C27B0']}
          />
        </View>

        <View style={styles.statsRow}>
          <StatCard
            title={getCaloriesSavedLabel()}
            value={stats.fastingCaloriesSaved}
            unit="kcal"
            icon="🔥"
            colors={['#FF5722', '#FF9800']}
          />
          <StatCard
            title={getWeightLossLabel()}
            value={stats.fastingEstimatedWeightLoss}
            unit={getKgLabel()}
            icon="⚖️"
            colors={['#4CAF50', '#8BC34A']}
          />
        </View>

        {/* Health Tips */}
        <Card style={styles.tipsCard}>
          <Text style={[styles.tipsTitle, { color: colors.warning }]}>
            ⚠️ {language === 'zh' ? '健康提示' : language === 'es' ? 'Consejos de Salud' : 'Health Tips'}
          </Text>
          <Text style={[styles.tipsText, { color: colors.textSecondary }]}>
            {language === 'zh'
              ? '• 禁食期间多喝水\n• 感到不适请立即停止\n• 建议从短时间开始\n• 禁食前后避免暴饮暴食'
              : language === 'es'
              ? '• Bebe mucha agua durante el ayuno\n• Detente inmediatamente si te sientes mal\n• Comienza con periodos cortos\n• Evita comer en exceso antes y después'
              : '• Drink plenty of water during fasting\n• Stop immediately if you feel unwell\n• Start with shorter periods\n• Avoid overeating before and after'}
          </Text>
        </Card>
      </ScrollView>

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
              {language === 'zh' ? '分享禁食成就' : language === 'es' ? 'Compartir Logro de Ayuno' : 'Share Fasting Achievement'}
            </Text>

            {/* Share Card Preview */}
            <View id="fasting-share-card-preview" style={styles.sharePreviewCard}>
              <LinearGradient
                colors={['#9C27B0', '#AB47BC', '#BA68C8']}
                style={styles.shareCardBackground}
              >
                {/* Decorative circles */}
                <View style={[styles.shareCircle, styles.shareCircle1]} />
                <View style={[styles.shareCircle, styles.shareCircle2]} />
                <View style={[styles.shareCircle, styles.shareCircle3]} />

                <View style={styles.shareCardContent}>
                  {/* Header */}
                  <Text style={styles.shareGreeting}>
                    {language === 'en' ? 'My Fasting Journey' : language === 'es' ? 'Mi Viaje de Ayuno' : '禁食之路'}
                  </Text>
                  <Text style={styles.shareSubtitle}>
                    {language === 'en' ? 'Building self-discipline through fasting' : language === 'es' ? 'Construyendo autodisciplina mediante el ayuno' : '通过禁食培养自律'}
                  </Text>

                  {/* Main Stats */}
                  <View style={styles.shareMainStats}>
                    <View style={styles.shareMainStatItem}>
                      <Text style={styles.shareMainStatValue}>{stats.totalSingleFastingSessions}</Text>
                      <Text style={styles.shareMainStatLabel}>
                        {language === 'en' ? 'Sessions' : language === 'es' ? 'Sesiones' : '禁食次数'}
                      </Text>
                    </View>
                    <View style={styles.shareStatDivider} />
                    <View style={styles.shareMainStatItem}>
                      <Text style={styles.shareMainStatValue}>{stats.currentSingleFastingStreak}</Text>
                      <Text style={styles.shareMainStatLabel}>
                        {language === 'en' ? 'Streak' : language === 'es' ? 'Racha' : '连续'}
                      </Text>
                    </View>
                    <View style={styles.shareStatDivider} />
                    <View style={styles.shareMainStatItem}>
                      <Text style={styles.shareMainStatValue}>{stats.fastingCaloriesSaved}</Text>
                      <Text style={styles.shareMainStatLabel}>
                        {language === 'en' ? 'kcal Saved' : language === 'es' ? 'kcal Ahorr' : '节省热量'}
                      </Text>
                    </View>
                    <View style={styles.shareStatDivider} />
                    <View style={styles.shareMainStatItem}>
                      <Text style={styles.shareMainStatValue}>{stats.fastingEstimatedWeightLoss}</Text>
                      <Text style={styles.shareMainStatLabel}>
                        {language === 'en' ? 'kg Loss' : language === 'es' ? 'kg Pérdida' : '减重公斤'}
                      </Text>
                    </View>
                  </View>

                  {/* QR Code */}
                  <View style={styles.qrCodeContainer}>
                    <View style={styles.qrCodeWrapper}>
                      <QRCode
                        value="https://apps.apple.com/app/id6762360504"
                        size={50}
                        color="#000"
                        backgroundColor="#fff"
                      />
                    </View>
                    <Text style={styles.qrCodeText}>
                      {language === 'zh' ? '扫码下载' : language === 'es' ? 'Escanea' : 'Scan to Download'}
                    </Text>
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
              {language === 'zh' ? '分享禁食成就' : language === 'es' ? 'Compartir Logro de Ayuno' : 'Share Fasting Achievement'}
            </Text>

            {/* Share Card Preview */}
            <View style={styles.shareCardModalCard}>
              {/* Decorative circles */}
              <View style={[styles.shareCircle, styles.shareCircle1]} />
              <View style={[styles.shareCircle, styles.shareCircle2]} />
              <View style={[styles.shareCircle, styles.shareCircle3]} />

              <View style={styles.shareCardContent}>
                {/* Header */}
                <Text style={styles.shareGreeting}>
                  {language === 'en' ? 'My Fasting Journey' : language === 'es' ? 'Mi Viaje de Ayuno' : '禁食之路'}
                </Text>
                <Text style={styles.shareSubtitle}>
                  {language === 'en' ? 'Building self-discipline through fasting' : language === 'es' ? 'Construyendo autodisciplina mediante el ayuno' : '通过禁食培养自律'}
                </Text>

                {/* Main Stats */}
                <View style={styles.shareMainStats}>
                  <View style={styles.shareMainStatItem}>
                    <Text style={styles.shareMainStatValue}>{stats.totalSingleFastingSessions}</Text>
                    <Text style={styles.shareMainStatLabel}>
                      {language === 'en' ? 'Sessions' : language === 'es' ? 'Sesiones' : '禁食次数'}
                    </Text>
                  </View>
                  <View style={styles.shareStatDivider} />
                  <View style={styles.shareMainStatItem}>
                    <Text style={styles.shareMainStatValue}>{stats.currentSingleFastingStreak}</Text>
                    <Text style={styles.shareMainStatLabel}>
                      {language === 'en' ? 'Streak' : language === 'es' ? 'Racha' : '连续'}
                    </Text>
                  </View>
                  <View style={styles.shareStatDivider} />
                  <View style={styles.shareMainStatItem}>
                    <Text style={styles.shareMainStatValue}>{stats.fastingCaloriesSaved}</Text>
                    <Text style={styles.shareMainStatLabel}>
                      {language === 'en' ? 'kcal Saved' : language === 'es' ? 'kcal Ahorr' : '节省热量'}
                    </Text>
                  </View>
                  <View style={styles.shareStatDivider} />
                  <View style={styles.shareMainStatItem}>
                    <Text style={styles.shareMainStatValue}>{stats.fastingEstimatedWeightLoss}</Text>
                    <Text style={styles.shareMainStatLabel}>
                      {language === 'en' ? 'kg Loss' : language === 'es' ? 'kg Pérdida' : '减重公斤'}
                    </Text>
                  </View>
                </View>

                {/* QR Code */}
                <View style={styles.qrCodeContainer}>
                  <View style={styles.qrCodeWrapper}>
                    <QRCode
                      value="https://apps.apple.com/app/id6762360504"
                      size={70}
                      color="#000"
                      backgroundColor="#fff"
                    />
                  </View>
                  <Text style={styles.qrCodeText}>
                    {language === 'zh' ? '扫码下载' : language === 'es' ? 'Escanea' : 'Scan to Download'}
                  </Text>
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

      {/* Hidden Share Card for capture - rendered outside ScrollView */}
      <View
        ref={shareCardRef}
        collapsable={false}
        style={styles.hiddenShareCard}
      >
        <LinearGradient
          colors={['#9C27B0', '#AB47BC', '#BA68C8']}
          style={{ width: '100%', height: '100%' }}
        >
          {/* Decorative circles */}
          <View style={[styles.shareCircle, styles.shareCircle1]} />
          <View style={[styles.shareCircle, styles.shareCircle2]} />
          <View style={[styles.shareCircle, styles.shareCircle3]} />

          <View style={styles.shareCardContent}>
            {/* Header */}
            <Text style={styles.shareGreeting}>
              {language === 'en' ? 'My Fasting Journey' : language === 'es' ? 'Mi Viaje de Ayuno' : '禁食之路'}
            </Text>
            <Text style={styles.shareSubtitle}>
              {language === 'en' ? 'Building self-discipline through fasting' : language === 'es' ? 'Construyendo autodisciplina mediante el ayuno' : '通过禁食培养自律'}
            </Text>

            {/* Main Stats */}
            <View style={styles.shareMainStats}>
              <View style={styles.shareMainStatItem}>
                <Text style={styles.shareMainStatValue}>{stats.totalSingleFastingSessions}</Text>
                <Text style={styles.shareMainStatLabel}>
                  {language === 'en' ? 'Sessions' : language === 'es' ? 'Sesiones' : '禁食次数'}
                </Text>
              </View>
              <View style={styles.shareStatDivider} />
              <View style={styles.shareMainStatItem}>
                <Text style={styles.shareMainStatValue}>{stats.currentSingleFastingStreak}</Text>
                <Text style={styles.shareMainStatLabel}>
                  {language === 'en' ? 'Streak' : language === 'es' ? 'Racha' : '连续'}
                </Text>
              </View>
              <View style={styles.shareStatDivider} />
              <View style={styles.shareMainStatItem}>
                <Text style={styles.shareMainStatValue}>{stats.fastingCaloriesSaved}</Text>
                <Text style={styles.shareMainStatLabel}>
                  {language === 'en' ? 'kcal Saved' : language === 'es' ? 'kcal Ahorr' : '节省热量'}
                </Text>
              </View>
              <View style={styles.shareStatDivider} />
              <View style={styles.shareMainStatItem}>
                <Text style={styles.shareMainStatValue}>{stats.fastingEstimatedWeightLoss}</Text>
                <Text style={styles.shareMainStatLabel}>
                  {language === 'en' ? 'kg Loss' : language === 'es' ? 'kg Pérdida' : '减重公斤'}
                </Text>
              </View>
            </View>

            {/* QR Code */}
            <View style={styles.qrCodeContainer}>
              <View style={styles.qrCodeWrapper}>
                <QRCode
                  value="https://apps.apple.com/app/id6762360504"
                  size={70}
                  color="#000"
                  backgroundColor="#fff"
                />
              </View>
              <Text style={styles.qrCodeText}>
                {language === 'zh' ? '扫码下载' : language === 'es' ? 'Escanea' : 'Scan to Download'}
              </Text>
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

const createStyles = () => {
  return StyleSheet.create({
    content: {
      padding: 20,
      paddingTop: 60,
      paddingBottom: 40,
    },
    header: {
      marginTop: 20,
      marginBottom: 20,
    },
    title: {
      fontSize: 28,
      fontWeight: 'bold',
    },
    subtitle: {
      fontSize: 16,
      marginTop: 8,
    },
    shareButton: {
      paddingVertical: 14,
      borderRadius: 14,
      alignItems: 'center',
      marginTop: 16,
      marginBottom: 16,
      shadowColor: '#9C27B0',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 4,
    },
    shareButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      marginTop: 24,
      marginBottom: 12,
    },
    statsRow: {
      flexDirection: 'row',
      marginTop: 12,
      gap: 8,
    },
    tipsCard: {
      marginTop: 20,
      padding: 16,
    },
    tipsTitle: {
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 12,
    },
    tipsText: {
      fontSize: 14,
      lineHeight: 24,
    },
    // Share card styles
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
      marginTop: 60,
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
      bottom: 8,
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
    qrCodeContainer: {
      position: 'absolute',
      top: -2,
      left: 0,
      right: 0,
      alignItems: 'center',
    },
    qrCodeWrapper: {
      backgroundColor: '#fff',
      padding: 5,
      borderRadius: 8,
      marginBottom: 5,
    },
    qrCodeText: {
      fontSize: 9,
      color: 'rgba(255, 255, 255, 0.8)',
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
    sharePreviewButtonAppStore: {
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
      backgroundColor: '#9C27B0',
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
    shareCardModalButtonAppStore: {},
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
    // Hidden share card for capture
    hiddenShareCard: {
      position: 'absolute',
      width: 320,
      height: 550,
      bottom: -2000,
      right: 10,
      backgroundColor: '#9C27B0',
      borderRadius: 20,
      overflow: 'hidden',
    },
  });
};
