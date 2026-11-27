import React, { useEffect, useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Svg, { Circle, G, Line, Text as SvgText } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { useApp } from '../context/AppContext';
import { Card } from '../components/Card';
import { isChineseLanguage } from '../utils/date';
import {
  MERIDIAN_SLOTS,
  getQiZheng24HourSchedule,
  type QiZhengCycleOrigin,
} from '../utils/qizheng';
import { fs, rs, useResponsiveLayout, vs } from '../theme/responsive';

export const QiZhengScreen: React.FC = () => {
  const { colors, language } = useApp();
  const rl = useResponsiveLayout();
  const isZh = isChineseLanguage(language);

  const [now, setNow] = useState(() => new Date());
  const [origin, setOrigin] = useState<QiZhengCycleOrigin>('sunrise_6');
  const [selectedHour, setSelectedHour] = useState<number>(() => new Date().getHours());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  const currentHour = now.getHours();
  const schedule = useMemo(() => getQiZheng24HourSchedule(now, origin), [now, origin]);
  const selected = schedule[selectedHour] || schedule[0];

  const dialSize = Math.min(rl.isDualColumn ? rl.columnWidth - 20 : rl.effectiveContentWidth - 20, 320);
  const cx = dialSize / 2;
  const cy = dialSize / 2;
  const outerR = dialSize * 0.41;
  const innerR = dialSize * 0.27;
  const centerR = dialSize * 0.165;

  const angleForHour = (h: number) => ((h / 24) * 2 * Math.PI) - Math.PI / 2;
  const selectedAngle = angleForHour(selected.hour);
  const handX = cx + Math.cos(selectedAngle) * (outerR - 14);
  const handY = cy + Math.sin(selectedAngle) * (outerR - 14);

  const dialColumn = (
    <Card style={styles.dialCard}>
      {/* 起算制式切换 */}
      <View style={[styles.originToggle, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.originBtn, origin === 'sunrise_6' && { backgroundColor: colors.primary }]}
          onPress={() => {
            Haptics.selectionAsync();
            setOrigin('sunrise_6');
          }}
        >
          <Text style={[styles.originBtnText, { color: origin === 'sunrise_6' ? '#FFF' : colors.textSecondary }]}>
            {isZh ? '卯正日出 06:00 起算' : 'Sunrise 06:00'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.originBtn, origin === 'midnight_0' && { backgroundColor: colors.primary }]}
          onPress={() => {
            Haptics.selectionAsync();
            setOrigin('midnight_0');
          }}
        >
          <Text style={[styles.originBtnText, { color: origin === 'midnight_0' ? '#FFF' : colors.textSecondary }]}>
            {isZh ? '子正零点 00:00 起算' : 'Midnight 00:00'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* 季节与当日主曜 */}
      <View style={styles.metaRow}>
        <View style={[styles.metaChip, { backgroundColor: colors.primary + '16' }]}>
          <Text style={[styles.metaChipText, { color: colors.primary }]}>
            {isZh ? `${selected.seasonLabelZh} · 今日主曜：${selected.dayRuler.shortZh}` : `${selected.seasonLabelEn} · Day Ruler: ${selected.dayRuler.shortEn}`}
          </Text>
        </View>
        {selectedHour !== currentHour && (
          <TouchableOpacity
            style={[styles.nowBtn, { borderColor: colors.primary }]}
            onPress={() => {
              Haptics.selectionAsync();
              setSelectedHour(currentHour);
            }}
          >
            <Text style={[styles.nowBtnText, { color: colors.primary }]}>
              {isZh ? '回此刻' : 'Now'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* 24h 双环 SVG 盘 + 24 个可点时刻 */}
      <View style={{ width: dialSize, height: dialSize, alignSelf: 'center', marginVertical: vs(6) }}>
        <Svg width={dialSize} height={dialSize}>
          <Circle cx={cx} cy={cy} r={outerR + 14} stroke={colors.border} strokeWidth={1} fill="none" />
          <Circle cx={cx} cy={cy} r={innerR + 10} stroke={colors.divider} strokeWidth={1} fill="none" strokeDasharray="3 3" />
          <Line
            x1={cx}
            y1={cy}
            x2={handX}
            y2={handY}
            stroke={selected.luminary.color}
            strokeWidth={2}
            strokeOpacity={0.55}
          />
          {/* 12 时辰内环标签 */}
          {MERIDIAN_SLOTS.map((slot, idx) => {
            const centerHour = idx * 2;
            const ang = angleForHour(centerHour);
            const x = cx + Math.cos(ang) * innerR;
            const y = cy + Math.sin(ang) * innerR;
            const isSlotActive = slot.shichenZh === selected.meridian.shichenZh;
            return (
              <G key={slot.branchZh}>
                {isSlotActive && (
                  <Circle cx={x} cy={y} r={10} fill={colors.primary + '26'} />
                )}
                <SvgText
                  x={x}
                  y={y + 3.5}
                  fontSize={isSlotActive ? 11 : 9.5}
                  fontWeight={isSlotActive ? '700' : '500'}
                  fill={isSlotActive ? colors.primary : colors.textLight}
                  textAnchor="middle"
                >
                  {slot.branchZh}
                </SvgText>
              </G>
            );
          })}
          {/* 24 小时外环节点 */}
          {schedule.map((slot) => {
            const ang = angleForHour(slot.hour);
            const x = cx + Math.cos(ang) * outerR;
            const y = cy + Math.sin(ang) * outerR;
            const isSel = slot.hour === selected.hour;
            const isCur = slot.hour === currentHour;
            return (
              <G key={slot.hour}>
                <Circle
                  cx={x}
                  cy={y}
                  r={isSel ? 12.5 : isCur ? 10.5 : 8.5}
                  fill={isSel ? slot.luminary.color : colors.card}
                  stroke={isSel || isCur ? slot.luminary.color : colors.border}
                  strokeWidth={isSel ? 2 : isCur ? 1.5 : 0.8}
                />
                <SvgText
                  x={x}
                  y={y + 3.5}
                  fontSize={isSel ? 10.5 : 9}
                  fontWeight="700"
                  fill={isSel ? '#FFFFFF' : slot.luminary.color}
                  textAnchor="middle"
                >
                  {slot.luminary.glyph}
                </SvgText>
              </G>
            );
          })}
          {/* 盘心徽章 */}
          <Circle
            cx={cx}
            cy={cy}
            r={centerR}
            fill={colors.backgroundSecondary}
            stroke={selected.luminary.color}
            strokeWidth={1.8}
          />
          <SvgText x={cx} y={cy - 10} fontSize={10} fontWeight="700" fill={colors.textSecondary} textAnchor="middle">
            {selected.hourLabel}
          </SvgText>
          <SvgText x={cx} y={cy + 6} fontSize={14} fontWeight="800" fill={selected.luminary.color} textAnchor="middle">
            {selected.luminary.glyph}·{selected.wangXiang.labelZh}
          </SvgText>
          <SvgText x={cx} y={cy + 21} fontSize={9.5} fontWeight="600" fill={colors.textLight} textAnchor="middle">
            {selected.meridian.organShortZh}
          </SvgText>
        </Svg>

        {/* 24 个透明触控区方便直接点击盘面时刻 */}
        {schedule.map((slot) => {
          const ang = angleForHour(slot.hour);
          const x = cx + Math.cos(ang) * outerR;
          const y = cy + Math.sin(ang) * outerR;
          return (
            <TouchableOpacity
              key={`hit-${slot.hour}`}
              onPress={() => {
                Haptics.selectionAsync();
                setSelectedHour(slot.hour);
              }}
              style={{
                position: 'absolute',
                left: x - 13,
                top: y - 13,
                width: 26,
                height: 26,
                borderRadius: 13,
              }}
            />
          );
        })}
      </View>

      <Text style={[styles.dialHint, { color: colors.textLight }]}>
        {isZh ? '点击外环任一星曜（日/月/木/火/土/金/水）查看该小时值班与内脏真气' : 'Tap any outer planetary hour node to preview Qi & meridian flow'}
      </Text>
    </Card>
  );

  const guidanceColumn = (
    <>
      <Card style={styles.detailCard}>
        <View style={styles.detailHeader}>
          <View style={styles.detailTitleRow}>
            <View style={[styles.glyphBadge, { backgroundColor: selected.luminary.color }]}>
              <Text style={styles.glyphBadgeText}>{selected.luminary.glyph}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.detailTitle, { color: colors.text }]}>
                {selected.hourLabel} · {isZh ? selected.luminary.nameZh : selected.luminary.nameEn}
              </Text>
              <Text style={[styles.detailSub, { color: colors.textSecondary }]}>
                {isZh ? `${selected.meridian.shichenZh}（${selected.meridian.hourRangeZh}）· ${selected.meridian.organZh}` : `${selected.meridian.shichenEn} · ${selected.meridian.organEn}`}
              </Text>
            </View>
          </View>
          <View style={[styles.wangBadge, { backgroundColor: selected.wangXiang.color + '1D', borderColor: selected.wangXiang.color }]}>
            <Text style={[styles.wangBadgeText, { color: selected.wangXiang.color }]}>
              {isZh ? `${selected.wangXiang.labelZh}相` : selected.wangXiang.labelEn}
            </Text>
          </View>
        </View>

        <View style={[styles.box, { backgroundColor: colors.backgroundSecondary }]}>
          <Text style={[styles.boxTitle, { color: selected.wangXiang.color }]}>
            {isZh ? `🔥 四季旺相（${selected.seasonLabelZh}）` : '🔥 Seasonal State'}
          </Text>
          <Text style={[styles.boxBody, { color: colors.textSecondary }]}>
            {isZh ? selected.wangXiang.guidanceZh : selected.wangXiang.guidanceEn}
          </Text>
        </View>

        <View style={[styles.box, { backgroundColor: colors.backgroundSecondary }]}>
          <Text style={[styles.boxTitle, { color: colors.primary }]}>
            {isZh ? `🫀 通内脏真气：${selected.luminary.organZh} × ${selected.meridian.organShortZh}` : '🫀 Qi & Organ Resonance'}
          </Text>
          <Text style={[styles.boxBody, { color: colors.text }]}>
            {isZh ? selected.resonanceZh : selected.resonanceEn}
          </Text>
          <Text style={[styles.boxBody, { color: colors.textSecondary, marginTop: vs(4) }]}>
            {isZh ? `经络当令：${selected.meridian.qiFlowZh}` : selected.meridian.qiFlowEn}
          </Text>
        </View>

        <View style={[styles.box, { backgroundColor: colors.primary + '12', borderColor: colors.primary + '30', borderWidth: 1 }]}>
          <Text style={[styles.boxTitle, { color: colors.primary }]}>
            {isZh ? '🪷 此时顺时吐纳与过午调养' : '🪷 Breath & Fasting Guidance'}
          </Text>
          <Text style={[styles.boxBody, { color: colors.text }]}>
            • {isZh ? selected.luminary.breathCueZh : selected.luminary.breathCueEn}
          </Text>
          <Text style={[styles.boxBody, { color: colors.textSecondary, marginTop: vs(4) }]}>
            • {isZh ? selected.meridian.fastingActionZh : selected.meridian.fastingActionEn}
          </Text>
        </View>
      </Card>

      <Card style={styles.timelineCard}>
        <Text style={[styles.timelineTitle, { color: colors.text }]}>
          {isZh ? '⏳ 今日 24 小时值班与脏腑循环表' : '⏳ 24-Hour Seven Luminaries & Meridians'}
        </Text>
        {schedule.map((slot) => {
          const isSel = slot.hour === selectedHour;
          const isCur = slot.hour === currentHour;
          return (
            <TouchableOpacity
              key={`row-${slot.hour}`}
              style={[
                styles.timelineRow,
                {
                  backgroundColor: isSel ? colors.primary + '16' : 'transparent',
                  borderColor: isSel ? colors.primary : colors.divider,
                },
              ]}
              onPress={() => {
                Haptics.selectionAsync();
                setSelectedHour(slot.hour);
              }}
            >
              <View style={styles.timelineLeft}>
                <Text style={[styles.timelineHour, { color: isCur ? colors.primary : colors.text }]}>
                  {slot.hourLabel}
                </Text>
                {isCur && (
                  <Text style={[styles.nowDot, { color: colors.primary }]}>
                    {isZh ? '此刻' : 'NOW'}
                  </Text>
                )}
              </View>
              <View style={[styles.miniGlyph, { backgroundColor: slot.luminary.color + '20' }]}>
                <Text style={[styles.miniGlyphText, { color: slot.luminary.color }]}>{slot.luminary.glyph}</Text>
              </View>
              <View style={styles.timelineCenter}>
                <Text style={[styles.timelineLuminary, { color: colors.text }]}>
                  {isZh ? `${slot.luminary.shortZh}（${slot.wangXiang.labelZh}）· ${slot.meridian.shichenZh}${slot.meridian.organShortZh}` : `${slot.luminary.shortEn} (${slot.wangXiang.labelZh}) · ${slot.meridian.organEn}`}
                </Text>
                <Text style={[styles.timelineTip, { color: colors.textLight }]} numberOfLines={1}>
                  {isZh ? slot.meridian.fastingActionZh : slot.meridian.fastingActionEn}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </Card>

      <Text style={[styles.disclaimer, { color: colors.textLight }]}>
        {isZh
          ? '说明：本页面融合传统七政值时天文周期与中医子午流注经络节律，仅作起居、饮水与呼吸引导参考，非占卜或医疗诊疗建议。'
          : 'Note: Combines classical 7-Luminary planetary cycles and meridian clock theory for daily rhythm & breath guidance only; not medical or fortune advice.'}
      </Text>
    </>
  );

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[
        styles.content,
        {
          maxWidth: rl.contentMaxWidth,
          width: '100%',
          alignSelf: 'center',
          paddingHorizontal: rl.horizontalPadding,
        },
      ]}
    >
      {rl.isDualColumn ? (
        <View style={{ flexDirection: 'row', gap: rl.hingeGutter, alignItems: 'flex-start' }}>
          <View style={{ flex: 1, minWidth: 0 }}>{dialColumn}</View>
          <View style={{ flex: 1.05, minWidth: 0 }}>{guidanceColumn}</View>
        </View>
      ) : (
        <>
          {dialColumn}
          {guidanceColumn}
        </>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  content: {
    paddingTop: vs(12),
    paddingBottom: vs(36),
  },
  dialCard: {
    padding: rs(14),
    marginBottom: vs(12),
  },
  originToggle: {
    flexDirection: 'row',
    borderRadius: rs(10),
    borderWidth: 1,
    padding: rs(3),
    marginBottom: vs(10),
  },
  originBtn: {
    flex: 1,
    paddingVertical: vs(7),
    borderRadius: rs(8),
    alignItems: 'center',
  },
  originBtnText: {
    fontSize: fs(12),
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: rs(8),
    marginBottom: vs(4),
  },
  metaChip: {
    paddingHorizontal: rs(10),
    paddingVertical: vs(4),
    borderRadius: rs(8),
  },
  metaChipText: {
    fontSize: fs(11.5),
    fontWeight: '700',
  },
  nowBtn: {
    borderWidth: 1,
    paddingHorizontal: rs(10),
    paddingVertical: vs(3),
    borderRadius: rs(8),
  },
  nowBtnText: {
    fontSize: fs(11.5),
    fontWeight: '700',
  },
  dialHint: {
    fontSize: fs(11),
    textAlign: 'center',
    marginTop: vs(4),
  },
  detailCard: {
    padding: rs(16),
    marginBottom: vs(12),
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: rs(8),
    marginBottom: vs(12),
  },
  detailTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(10),
    flex: 1,
  },
  glyphBadge: {
    width: rs(40),
    height: rs(40),
    borderRadius: rs(20),
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyphBadgeText: {
    color: '#FFF',
    fontSize: fs(18),
    fontWeight: '800',
  },
  detailTitle: {
    fontSize: fs(15),
    fontWeight: '800',
  },
  detailSub: {
    fontSize: fs(12),
    marginTop: vs(2),
  },
  wangBadge: {
    borderWidth: 1,
    borderRadius: rs(8),
    paddingHorizontal: rs(9),
    paddingVertical: vs(4),
  },
  wangBadgeText: {
    fontSize: fs(12),
    fontWeight: '800',
  },
  box: {
    borderRadius: rs(12),
    padding: rs(12),
    marginTop: vs(8),
  },
  boxTitle: {
    fontSize: fs(12.5),
    fontWeight: '800',
    marginBottom: vs(4),
  },
  boxBody: {
    fontSize: fs(12.5),
    lineHeight: fs(18),
  },
  timelineCard: {
    padding: rs(14),
    marginBottom: vs(12),
  },
  timelineTitle: {
    fontSize: fs(14.5),
    fontWeight: '800',
    marginBottom: vs(10),
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(10),
    paddingVertical: vs(9),
    paddingHorizontal: rs(8),
    borderRadius: rs(10),
    borderBottomWidth: 1,
  },
  timelineLeft: {
    width: rs(46),
    alignItems: 'flex-start',
  },
  timelineHour: {
    fontSize: fs(12.5),
    fontWeight: '700',
  },
  nowDot: {
    fontSize: fs(9.5),
    fontWeight: '800',
    marginTop: vs(1),
  },
  miniGlyph: {
    width: rs(28),
    height: rs(28),
    borderRadius: rs(14),
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniGlyphText: {
    fontSize: fs(13),
    fontWeight: '800',
  },
  timelineCenter: {
    flex: 1,
  },
  timelineLuminary: {
    fontSize: fs(12.5),
    fontWeight: '700',
  },
  timelineTip: {
    fontSize: fs(11),
    marginTop: vs(2),
  },
  disclaimer: {
    fontSize: fs(11),
    lineHeight: fs(16),
    textAlign: 'center',
    paddingHorizontal: rs(8),
  },
});
