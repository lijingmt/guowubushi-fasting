import React, { useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { captureRef } from 'react-native-view-shot';
import { Paths, File } from 'expo-file-system';
import { shareAsync } from 'expo-sharing';
import { responsiveSize, fs, rs, vs } from '../theme/responsive';

interface MeditationShareCardProps {
  totalMinutes: number;
  sessionCount: number;
  longestSession: number;
  language: string;
  colors: any;
  onClose: () => void;
}

export const MeditationShareCard: React.FC<MeditationShareCardProps> = ({
  totalMinutes,
  sessionCount,
  longestSession,
  language,
  colors,
  onClose,
}) => {
  const viewRef = useRef<View>(null);

  const getGreeting = () => {
    if (language === 'en') return 'My Meditation Journey';
    if (language === 'es') return 'Mi Viaje de Meditación';
    return '我的打坐之旅';
  };

  const getSubtitle = () => {
    if (language === 'en') return 'Finding inner peace, one breath at a time';
    if (language === 'es') return 'Encontrando paz interior, respiración a respiración';
    return '寻找内心平静，一呼一吸间';
  };

  const getDownloadText = () => {
    if (language === 'en') return 'Download the app:';
    if (language === 'es') return 'Descarga la app:';
    return '下载app：';
  };

  const getTotalTimeLabel = () => {
    if (language === 'en') return 'Total Meditation';
    if (language === 'es') return 'Meditación Total';
    return '累计打坐';
  };

  const getSessionsLabel = () => {
    if (language === 'en') return 'Sessions';
    if (language === 'es') return 'Sesiones';
    return '打坐次数';
  };

  const getLongestLabel = () => {
    if (language === 'en') return 'Longest Session';
    if (language === 'es') return 'Sesión Más Larga';
    return '最长时间';
  };

  const getMinutesLabel = () => {
    if (language === 'en') return 'minutes';
    if (language === 'es') return 'minutos';
    return '分钟';
  };

  const getShareButtonText = () => {
    if (language === 'zh') return '📤 分享我的打坐';
    if (language === 'es') return '📤 Compartir';
    return '📤 Share My Meditation';
  };

  const getCloseText = () => {
    if (language === 'zh') return '✕';
    if (language === 'es') return '✕';
    return '✕';
  };

  const shareAchievement = async () => {
    try {
      const uri = await captureRef(viewRef, {
        format: 'png',
        quality: 1,
      });

      const sourceFile = new File(uri);
      const destFile = new File(Paths.cache, 'meditation_share.png');
      await sourceFile.copy(destFile);

      await shareAsync(destFile.uri, {
        mimeType: 'image/png',
        dialogTitle: language === 'zh' ? '分享打坐成就' : language === 'es' ? 'Compartir' : 'Share Meditation',
      });
    } catch (error) {
      console.error('Error sharing meditation:', error);
    }
  };

  const formatTime = (minutes: number): string => {
    if (minutes < 60) return `${minutes}`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  // Render the card content
  const renderCardContent = () => (
    <View style={styles.cardContainer}>
      {/* Background gradient - zen colors */}
      <LinearGradient
        colors={['#667eea', '#764ba2', '#f093fb']}
        style={styles.backgroundGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Decorative circles */}
      <View style={[styles.circle, styles.circle1]} />
      <View style={[styles.circle, styles.circle2]} />
      <View style={[styles.circle, styles.circle3]} />

      {/* Content */}
      <View style={styles.content}>
        {/* Header */}
        <Text style={styles.greeting}>{getGreeting()}</Text>
        <Text style={styles.subtitle}>{getSubtitle()}</Text>

        {/* Main Stats */}
        <View style={styles.mainStatsContainer}>
          <View style={styles.mainStatItem}>
            <Text style={styles.mainStatValue}>{formatTime(totalMinutes)}</Text>
            <Text style={styles.mainStatLabel}>
              {getMinutesLabel()}
            </Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.mainStatItem}>
            <Text style={styles.mainStatValue}>{sessionCount}</Text>
            <Text style={styles.mainStatLabel}>
              {getSessionsLabel()}
            </Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.mainStatItem}>
            <Text style={styles.mainStatValue}>{formatTime(longestSession)}</Text>
            <Text style={styles.mainStatLabel}>
              {getLongestLabel()}
            </Text>
          </View>
        </View>

        {/* Zen Quote */}
        <View style={styles.quoteContainer}>
          <Text style={styles.quoteIcon}>🧘</Text>
          <Text style={styles.quoteText}>
            {language === 'zh' ? '"静能生慧，定能生智"' :
             language === 'es' ? '"El silencio es el lenguaje de Dios"' :
             '"Stillness reveals the truth"'}
          </Text>
        </View>

        {/* App Link */}
        <View style={styles.footer}>
          <View style={styles.footerLine} />
          <Text style={styles.footerText}>{getDownloadText()}</Text>
          <Text style={styles.footerLink}>apps.apple.com/app/id6762360504</Text>
          <Text style={styles.footerBrand}>"过午不食" Fasting App</Text>
        </View>
      </View>
    </View>
  );

  return (
    <Modal visible={true} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Header with close button */}
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {language === 'zh' ? '分享打坐成就' : language === 'es' ? 'Compartir Logro' : 'Share Meditation'}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={[styles.closeButtonText, { color: colors.text }]}>{getCloseText()}</Text>
            </TouchableOpacity>
          </View>

          {/* Share Preview */}
          <View style={styles.previewContainer}>
            {renderCardContent()}
          </View>

          {/* Share Button */}
          <TouchableOpacity style={styles.shareButton} onPress={shareAchievement}>
            <Text style={styles.shareButtonText}>{getShareButtonText()}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Hidden view for capture */}
      <View ref={viewRef} collapsable={false} style={styles.hiddenCard}>
        {renderCardContent()}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: rs(20),
  },
  modalContainer: {
    width: '100%',
    maxWidth: rs(400),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: vs(16),
  },
  modalTitle: {
    fontSize: fs(18),
    fontWeight: 'bold',
  },
  closeButton: {
    padding: rs(8),
  },
  closeButtonText: {
    fontSize: fs(24),
    fontWeight: '300',
  },
  previewContainer: {
    width: '100%',
    aspectRatio: 375 / 600,
    borderRadius: rs(20),
    overflow: 'hidden',
    marginBottom: vs(16),
  },
  shareButton: {
    backgroundColor: '#667eea',
    paddingVertical: vs(16),
    borderRadius: rs(16),
    alignItems: 'center',
  },
  shareButtonText: {
    color: '#fff',
    fontSize: fs(18),
    fontWeight: 'bold',
  },
  // Hidden card for capture
  hiddenCard: {
    position: 'absolute',
    left: -1000,
    width: 375,
    height: 600,
  },
  cardContainer: {
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  },
  backgroundGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  circle: {
    position: 'absolute',
    borderRadius: 1000,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  circle1: {
    width: 200,
    height: 200,
    top: -50,
    right: -50,
  },
  circle2: {
    width: 150,
    height: 150,
    bottom: 100,
    left: -30,
  },
  circle3: {
    width: 100,
    height: 100,
    bottom: -30,
    right: 50,
  },
  content: {
    flex: 1,
    padding: 30,
    alignItems: 'center',
  },
  greeting: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 40,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 30,
    textAlign: 'center',
  },
  mainStatsContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    width: '100%',
    justifyContent: 'space-around',
  },
  mainStatItem: {
    alignItems: 'center',
  },
  mainStatValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  mainStatLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 4,
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  quoteContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    padding: 16,
    marginTop: 10,
    alignItems: 'center',
  },
  quoteIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  quoteText: {
    fontSize: 14,
    color: '#fff',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    alignItems: 'center',
  },
  footerLine: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    width: '100%',
    marginBottom: 12,
  },
  footerText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 4,
  },
  footerLink: {
    fontSize: 12,
    color: '#fff',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  footerBrand: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.7)',
  },
});
