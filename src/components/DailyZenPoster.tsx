import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import type { UserStats } from '../types';
import { getSolarTermInfo } from '../utils/solarTerm';
import { getStampById } from '../utils/pilgrimage';
import { fs, rs, vs } from '../theme/responsive';

const ANDROID_APK_URL = 'https://guowubushi.net/download/app-release.apk';

interface DailyZenPosterProps {
  stats: UserStats;
  language: string;
  selectedStampId?: string;
}

/**
 * 宣纸朱砂印章风「节气日签」海报（可被 ViewShot 直接截取分享至朋友圈/小红书）
 */
export const DailyZenPoster: React.FC<DailyZenPosterProps> = ({
  stats,
  language,
  selectedStampId,
}) => {
  const now = new Date();
  const solarTerm = getSolarTermInfo(now);
  const stamp = getStampById(selectedStampId);
  const isZh = language === 'zh' || language === 'zh-Hant';
  const sealText = stamp
    ? isZh
      ? stamp.stampTextZh
      : stamp.stampTextEn
    : isZh
    ? solarTerm.sealText
    : 'MINDFUL';

  const dateStr = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}`;

  return (
    <View style={styles.paper}>
      <View style={styles.innerFrame}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.brandTitle}>{isZh ? '过午不食 · 日签' : 'Guowu Fasting · Zen Note'}</Text>
            <Text style={styles.dateText}>{dateStr}</Text>
          </View>
          <View style={[styles.termPill, { borderColor: solarTerm.seasonColor }]}>
            <Text style={[styles.termText, { color: solarTerm.seasonColor }]}>
              {isZh ? solarTerm.nameZh : solarTerm.nameEn}
            </Text>
          </View>
        </View>

        <View style={styles.heroRow}>
          <View style={styles.heroLeft}>
            <Text style={styles.heroLabel}>{isZh ? '连续节律打卡' : 'Current Streak'}</Text>
            <View style={styles.streakLine}>
              <Text style={styles.streakNum}>{stats.currentStreak}</Text>
              <Text style={styles.streakUnit}>{isZh ? '天' : 'days'}</Text>
            </View>
          </View>
          <View style={styles.sealBox}>
            <Text style={styles.sealText}>{sealText}</Text>
          </View>
        </View>

        <View style={styles.metricsRow}>
          <View style={styles.metricTile}>
            <Text style={styles.metricVal}>{stats.completedDays}</Text>
            <Text style={styles.metricLbl}>{isZh ? '累计完成' : 'Days'}</Text>
          </View>
          <View style={styles.metricTile}>
            <Text style={styles.metricVal}>{stats.totalMeditationMinutes}</Text>
            <Text style={styles.metricLbl}>{isZh ? '静坐分钟' : 'Zen Min'}</Text>
          </View>
          <View style={styles.metricTile}>
            <Text style={styles.metricVal}>{stats.totalCaloriesSaved}</Text>
            <Text style={styles.metricLbl}>{isZh ? '节省大卡' : 'kcal Saved'}</Text>
          </View>
        </View>

        <View style={styles.quoteBlock}>
          <Text style={styles.quoteText}>“{isZh ? solarTerm.quoteZh : solarTerm.quoteEn}”</Text>
          <Text style={styles.tipText}>{isZh ? solarTerm.tipZh : solarTerm.tipEn}</Text>
        </View>

        <View style={styles.footerRow}>
          <View style={styles.footerLeft}>
            <Text style={styles.footerHeading}>{isZh ? '少食知足 · 静坐观心' : 'Eat Light · Sit Still'}</Text>
            <Text style={styles.footerSub}>guowubushi.net</Text>
          </View>
          <View style={styles.qrFrame}>
            <QRCode value={ANDROID_APK_URL} size={46} color="#1F2A24" backgroundColor="#FFFDF8" />
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  paper: {
    width: rs(308),
    backgroundColor: '#F8F3E6',
    borderRadius: rs(18),
    padding: rs(12),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: vs(6) },
    shadowOpacity: 0.14,
    shadowRadius: rs(12),
    elevation: 6,
  },
  innerFrame: {
    borderWidth: 1,
    borderColor: '#D5CBB6',
    borderRadius: rs(12),
    padding: rs(16),
    backgroundColor: '#FBF8EF',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: vs(14),
  },
  brandTitle: {
    fontSize: fs(14),
    fontWeight: '800',
    color: '#265947',
  },
  dateText: {
    fontSize: fs(11),
    color: '#7B857D',
    marginTop: vs(2),
  },
  termPill: {
    borderWidth: 1,
    borderRadius: rs(12),
    paddingHorizontal: rs(10),
    paddingVertical: vs(4),
  },
  termText: {
    fontSize: fs(12),
    fontWeight: '700',
  },
  heroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: vs(14),
  },
  heroLeft: {
    flex: 1,
  },
  heroLabel: {
    fontSize: fs(12),
    color: '#5A675F',
    fontWeight: '600',
  },
  streakLine: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: vs(2),
  },
  streakNum: {
    fontSize: fs(42),
    fontWeight: '900',
    color: '#1F2A24',
  },
  streakUnit: {
    fontSize: fs(14),
    fontWeight: '700',
    color: '#265947',
    marginLeft: rs(4),
  },
  sealBox: {
    width: rs(54),
    height: rs(54),
    borderRadius: rs(8),
    borderWidth: 2,
    borderColor: '#B93A32',
    backgroundColor: '#B93A3214',
    alignItems: 'center',
    justifyContent: 'center',
    padding: rs(4),
  },
  sealText: {
    fontSize: fs(11),
    lineHeight: fs(14),
    fontWeight: '900',
    color: '#B93A32',
    textAlign: 'center',
  },
  metricsRow: {
    flexDirection: 'row',
    gap: rs(8),
    marginBottom: vs(14),
  },
  metricTile: {
    flex: 1,
    backgroundColor: '#EFE9DC',
    borderRadius: rs(10),
    paddingVertical: vs(8),
    alignItems: 'center',
  },
  metricVal: {
    fontSize: fs(15),
    fontWeight: '800',
    color: '#1F2A24',
  },
  metricLbl: {
    fontSize: fs(10),
    color: '#5A675F',
    marginTop: vs(2),
  },
  quoteBlock: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E4DDD0',
    paddingVertical: vs(10),
    marginBottom: vs(12),
  },
  quoteText: {
    fontSize: fs(13),
    fontWeight: '700',
    color: '#265947',
    textAlign: 'center',
    marginBottom: vs(4),
  },
  tipText: {
    fontSize: fs(11),
    color: '#5A675F',
    textAlign: 'center',
    lineHeight: fs(16),
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerLeft: {
    flex: 1,
  },
  footerHeading: {
    fontSize: fs(12),
    fontWeight: '700',
    color: '#1F2A24',
  },
  footerSub: {
    fontSize: fs(10),
    color: '#85918A',
    marginTop: vs(2),
  },
  qrFrame: {
    padding: rs(4),
    backgroundColor: '#FFFDF8',
    borderRadius: rs(6),
    borderWidth: 1,
    borderColor: '#E4DDD0',
  },
});
