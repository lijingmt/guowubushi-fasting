import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import type { PosterStyleId, UserStats } from '../types';
import { getSolarTermInfo } from '../utils/solarTerm';
import { getStampById } from '../utils/pilgrimage';
import { POSTER_STYLES, type PosterStyleMeta } from '../utils/posterStyles';
import { fs, rs, vs } from '../theme/responsive';

export { POSTER_STYLES, type PosterStyleMeta };

const ANDROID_APK_URL = 'https://guowubushi.net/download/app-release.apk';

interface DailyZenPosterProps {
  stats: UserStats;
  language: string;
  selectedStampId?: string;
  posterStyle?: PosterStyleId;
}

/**
 * 东方美学「节气日签」海报（4 套样式：素雅宣纸 / 宋瓷青釉 / 朱砂泥金 / 暗夜墨金）
 */
export const DailyZenPoster: React.FC<DailyZenPosterProps> = ({
  stats,
  language,
  selectedStampId,
  posterStyle = 'xuan_paper',
}) => {
  const palette = POSTER_STYLES.find((p) => p.id === posterStyle) || POSTER_STYLES[0];
  const now = new Date();
  const solarTerm = getSolarTermInfo(now);
  const stamp = getStampById(selectedStampId);
  const isZh = language === 'zh' || language === 'zh-Hant';
  const isEs = language === 'es';
  const sealText = stamp
    ? isZh
      ? stamp.stampTextZh
      : stamp.stampTextEn
    : isZh
    ? solarTerm.sealText
    : isEs
    ? 'SERENO'
    : 'MINDFUL';

  const dateStr = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}`;

  return (
    <View style={[styles.paper, { backgroundColor: palette.paperBg }]}>
      <View style={[styles.innerFrame, { borderColor: palette.border, backgroundColor: palette.innerBg }]}>
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.brandTitle, { color: palette.titleColor }]}>
              {isZh ? '过午不食 · 日签' : isEs ? 'Guowu · Nota Zen' : 'Guowu · Daily Zen Note'}
            </Text>
            <Text style={[styles.dateText, { color: palette.mutedColor }]}>{dateStr}</Text>
          </View>
          <View style={[styles.termPill, { borderColor: solarTerm.seasonColor }]}>
            <Text style={[styles.termText, { color: solarTerm.seasonColor }]}>
              {isZh ? solarTerm.nameZh : solarTerm.nameEn}
            </Text>
          </View>
        </View>

        <View style={styles.heroRow}>
          <View style={styles.heroLeft}>
            <Text style={[styles.heroLabel, { color: palette.bodyColor }]}>
              {isZh ? '连续节律打卡' : isEs ? 'Racha Actual' : 'Current Streak'}
            </Text>
            <View style={styles.streakLine}>
              <Text style={[styles.streakNum, { color: palette.numberColor }]}>{stats.currentStreak}</Text>
              <Text style={[styles.streakUnit, { color: palette.titleColor }]}>{isZh ? '天' : isEs ? 'días' : 'days'}</Text>
            </View>
          </View>
          <View style={[styles.sealBox, { borderColor: palette.sealBorder, backgroundColor: palette.sealBg }]}>
            <Text style={[styles.sealText, { color: palette.sealText }]}>{sealText}</Text>
          </View>
        </View>

        <View style={styles.metricsRow}>
          <View style={[styles.metricTile, { backgroundColor: palette.tileBg }]}>
            <Text style={[styles.metricVal, { color: palette.numberColor }]}>{stats.completedDays}</Text>
            <Text style={[styles.metricLbl, { color: palette.bodyColor }]}>{isZh ? '累计完成' : isEs ? 'Días' : 'Days'}</Text>
          </View>
          <View style={[styles.metricTile, { backgroundColor: palette.tileBg }]}>
            <Text style={[styles.metricVal, { color: palette.numberColor }]}>{stats.totalMeditationMinutes}</Text>
            <Text style={[styles.metricLbl, { color: palette.bodyColor }]}>{isZh ? '静坐分钟' : isEs ? 'Min Zen' : 'Zen Min'}</Text>
          </View>
          <View style={[styles.metricTile, { backgroundColor: palette.tileBg }]}>
            <Text style={[styles.metricVal, { color: palette.numberColor }]}>{stats.totalCaloriesSaved}</Text>
            <Text style={[styles.metricLbl, { color: palette.bodyColor }]}>{isZh ? '节省大卡' : isEs ? 'kcal Ahorr.' : 'kcal Saved'}</Text>
          </View>
        </View>

        <View style={[styles.quoteBlock, { borderColor: palette.border }]}>
          <Text style={[styles.quoteText, { color: palette.titleColor }]}>“{isZh ? solarTerm.quoteZh : solarTerm.quoteEn}”</Text>
          <Text style={[styles.tipText, { color: palette.bodyColor }]}>{isZh ? solarTerm.tipZh : solarTerm.tipEn}</Text>
        </View>

        <View style={styles.footerRow}>
          <View style={styles.footerLeft}>
            <Text style={[styles.footerHeading, { color: palette.numberColor }]}>
              {isZh ? '少食知足 · 静坐观心' : isEs ? 'Come Ligero · Quieta Mente' : 'Eat Light · Sit Still'}
            </Text>
            <Text style={[styles.footerSub, { color: palette.mutedColor }]}>guowubushi.net</Text>
          </View>
          <View style={[styles.qrFrame, { backgroundColor: palette.qrBg, borderColor: palette.border }]}>
            <QRCode value={ANDROID_APK_URL} size={46} color={palette.qrColor} backgroundColor={palette.qrBg} />
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
