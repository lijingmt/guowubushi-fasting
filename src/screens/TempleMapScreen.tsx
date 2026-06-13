import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Linking,
  Modal,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import Svg, {
  Circle,
  Defs,
  G,
  LinearGradient as SvgLinearGradient,
  Path,
  Rect,
  Stop,
  Text as SvgText,
} from 'react-native-svg';
import { Card } from '../components/Card';
import {
  getSacredSiteById,
  getSacredSiteRegionTitle,
  SACRED_RITE_LABELS,
  SACRED_SITES,
  TRADITION_LABELS,
} from '../data/sacredSites';
import { getSacredSiteCheckIns, saveSacredSiteCheckIn } from '../services/storage';
import { useApp } from '../context/AppContext';
import { fs, layout, responsiveSize, rs, vs } from '../theme/responsive';
import { SacredRegion, SacredRite, SacredSite, SacredSiteCheckIn, SacredTradition } from '../types';

type FilterTradition = 'all' | SacredTradition;

const MAP_WIDTH = 720;
const MAP_HEIGHT = 500;
const MIN_MARKER_DISTANCE = 10;
const MIN_MAP_ZOOM = 1;
const MAX_MAP_ZOOM = 20;
const DEFAULT_CHINA_MAP_ZOOM = 20;
const SITE_LABEL_MIN_ZOOM = 6;
const PINCH_SENSITIVITY = 1.22;

const RITE_OPTIONS: SacredRite[] = ['visit', 'bow', 'lamp', 'meditation', 'chant'];
type GeoPoint = [number, number];

const projectLonLat = (longitude: number, latitude: number) => ({
  x: ((longitude + 180) / 360) * MAP_WIDTH,
  y: ((90 - latitude) / 180) * MAP_HEIGHT,
});

const buildGeoPath = (points: GeoPoint[]) =>
  points
    .map(([longitude, latitude], index) => {
      const point = projectLonLat(longitude, latitude);
      return `${index === 0 ? 'M' : 'L'}${point.x.toFixed(1)} ${point.y.toFixed(1)}`;
    })
    .join(' ') + ' Z';

const WORLD_LANDMASS_POINTS: GeoPoint[][] = [
  [
    [-168, 71], [-150, 66], [-136, 70], [-118, 71], [-98, 68], [-82, 62], [-64, 56],
    [-56, 49], [-72, 43], [-88, 45], [-104, 49], [-121, 47], [-132, 55], [-154, 58],
  ],
  [
    [-124, 46], [-108, 44], [-96, 38], [-90, 30], [-100, 22], [-112, 24], [-118, 34],
  ],
  [
    [-96, 23], [-84, 21], [-77, 16], [-79, 9], [-88, 13],
  ],
  [
    [-81, 12], [-68, 10], [-55, 1], [-47, -10], [-39, -23], [-45, -38],
    [-54, -55], [-69, -54], [-75, -38], [-73, -20], [-80, -5],
  ],
  [
    [-52, 83], [-30, 80], [-18, 72], [-34, 62], [-52, 60], [-66, 70],
  ],
  [
    [-11, 72], [22, 72], [55, 70], [86, 72], [118, 67], [151, 63], [179, 61],
    [172, 50], [150, 45], [137, 37], [123, 33], [113, 23], [100, 14],
    [93, 21], [82, 26], [75, 33], [64, 31], [56, 25], [45, 30], [35, 42],
    [23, 39], [12, 44], [2, 43], [-8, 50], [-25, 57],
  ],
  [
    [-17, 36], [6, 37], [29, 32], [43, 12], [38, -7], [30, -31],
    [18, -35], [6, -19], [-7, -4], [-16, 13],
  ],
  [
    [36, 31], [52, 27], [59, 18], [52, 12], [43, 13], [37, 22],
  ],
  [
    [68, 24], [79, 26], [88, 21], [84, 8], [77, 6], [71, 16],
  ],
  [
    [96, 18], [110, 14], [120, 6], [118, -7], [104, -5], [99, 7],
  ],
  [
    [112, -11], [133, -10], [154, -22], [146, -39], [124, -37], [112, -25],
  ],
  [
    [130, 45], [146, 42], [143, 32], [132, 31],
  ],
  [
    [120, 24], [122, 22], [121, 20], [119, 22],
  ],
  [
    [102, 2], [116, 1], [126, -5], [118, -8], [106, -5],
  ],
  [
    [138, -35], [151, -36], [177, -44], [168, -47], [145, -42],
  ],
  [
    [47, -13], [51, -21], [49, -26], [43, -24], [43, -16],
  ],
  [
    [-8, 58], [2, 56], [1, 50], [-7, 51],
  ],
  [
    [-180, -68], [-120, -66], [-60, -69], [0, -66], [60, -69], [120, -66], [180, -68], [180, -82], [-180, -82],
  ],
];

const WORLD_LANDMASSES = WORLD_LANDMASS_POINTS.map((points) => buildGeoPath(points));

const getTodayString = () => new Date().toISOString().split('T')[0];

const projectWorld = (site: SacredSite) => ({
  ...projectLonLat(site.longitude, site.latitude),
});

const clampPoint = (point: { x: number; y: number }, padding = 18) => ({
  x: Math.max(padding, Math.min(MAP_WIDTH - padding, point.x)),
  y: Math.max(padding, Math.min(MAP_HEIGHT - padding, point.y)),
});

const clampMapTranslationValue = (value: number, size: number, scale: number) => {
  const maxOffset = Math.max(0, (size * (scale - 1)) / 2);
  return Math.max(-maxOffset, Math.min(maxOffset, value));
};

const getMapFocusPoint = (sites: SacredSite[]) => {
  if (sites.length === 0) {
    return { x: MAP_WIDTH / 2, y: MAP_HEIGHT / 2 };
  }

  const points = sites.map((site) => projectWorld(site));
  const minX = Math.min(...points.map((point) => point.x));
  const maxX = Math.max(...points.map((point) => point.x));
  const minY = Math.min(...points.map((point) => point.y));
  const maxY = Math.max(...points.map((point) => point.y));

  return {
    x: (minX + maxX) / 2,
    y: (minY + maxY) / 2,
  };
};

const spreadMapPoints = (sites: SacredSite[]): Record<string, { x: number; y: number }> => {
  const points = sites.map((site, index) => ({
    id: site.id,
    index,
    ...clampPoint(projectWorld(site), 22),
  }));

  for (let iteration = 0; iteration < 8; iteration += 1) {
    for (let i = 0; i < points.length; i += 1) {
      for (let j = i + 1; j < points.length; j += 1) {
        const first = points[i];
        const second = points[j];
        let dx = second.x - first.x;
        let dy = second.y - first.y;
        let distance = Math.sqrt(dx * dx + dy * dy);

        if (distance >= MIN_MARKER_DISTANCE) {
          continue;
        }

        if (distance < 0.01) {
          const angle = ((first.index * 47 + second.index * 23) % 360) * (Math.PI / 180);
          dx = Math.cos(angle);
          dy = Math.sin(angle);
          distance = 1;
        }

        const push = (MIN_MARKER_DISTANCE - distance) / 2;
        const offsetX = (dx / distance) * push;
        const offsetY = (dy / distance) * push;
        const nextFirst = clampPoint({ x: first.x - offsetX, y: first.y - offsetY }, 22);
        const nextSecond = clampPoint({ x: second.x + offsetX, y: second.y + offsetY }, 22);
        first.x = nextFirst.x;
        first.y = nextFirst.y;
        second.x = nextSecond.x;
        second.y = nextSecond.y;
      }
    }
  }

  return points.reduce<Record<string, { x: number; y: number }>>((acc, point) => {
    acc[point.id] = { x: point.x, y: point.y };
    return acc;
  }, {});
};

export const TempleMapScreen: React.FC = () => {
  const { colors, language, recordShareAction } = useApp();
  const isZh = language === 'zh' || language === 'zh-Hant';
  const [region, setRegion] = useState<SacredRegion>('china');
  const [tradition, setTradition] = useState<FilterTradition>('all');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState(SACRED_SITES[0]?.id || '');
  const [selectedRite, setSelectedRite] = useState<SacredRite>('bow');
  const [checkIns, setCheckIns] = useState<SacredSiteCheckIn[]>([]);
  const [detailOpen, setDetailOpen] = useState(false);
  const [mapZoom, setMapZoom] = useState(DEFAULT_CHINA_MAP_ZOOM);
  const [mapViewportWidth, setMapViewportWidth] = useState(0);
  const mapScale = useSharedValue(DEFAULT_CHINA_MAP_ZOOM);
  const savedMapScale = useSharedValue(DEFAULT_CHINA_MAP_ZOOM);
  const mapTranslateX = useSharedValue(0);
  const mapTranslateY = useSharedValue(0);
  const savedMapTranslateX = useSharedValue(0);
  const savedMapTranslateY = useSharedValue(0);
  const mapBoundsWidth = useSharedValue(360);
  const mapBoundsHeight = useSharedValue(210);

  const baseMapWidth = Math.max(320, mapViewportWidth || 360);
  const baseMapHeight = (baseMapWidth * MAP_HEIGHT) / MAP_WIDTH;
  const animatedMapStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: mapScale.value },
      { translateX: mapTranslateX.value },
      { translateY: mapTranslateY.value },
    ],
  }));

  useEffect(() => {
    loadCheckIns();
  }, []);

  useEffect(() => {
    mapBoundsWidth.value = baseMapWidth;
    mapBoundsHeight.value = baseMapHeight;
  }, [baseMapHeight, baseMapWidth]);

  const loadCheckIns = async () => {
    const records = await getSacredSiteCheckIns();
    setCheckIns(records);
  };

  const filteredSites = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return SACRED_SITES.filter((site) => {
      const matchesRegion = site.region === region;
      const matchesTradition = tradition === 'all' || site.tradition === tradition;
      const text = `${site.name} ${site.localName || ''} ${site.country} ${site.province || ''} ${site.city} ${site.address}`.toLowerCase();
      const matchesKeyword = !keyword || text.includes(keyword);
      return matchesRegion && matchesTradition && matchesKeyword;
    });
  }, [query, region, tradition]);

  const sitesForCurrentMap = useMemo(
    () => filteredSites.length > 0 ? filteredSites : SACRED_SITES.filter((site) => site.region === region),
    [filteredSites, region]
  );

  const mapPointsById = useMemo(
    () => spreadMapPoints(sitesForCurrentMap),
    [sitesForCurrentMap]
  );

  const mapFocusPoint = useMemo(
    () => getMapFocusPoint(sitesForCurrentMap),
    [sitesForCurrentMap]
  );

  useEffect(() => {
    const defaultZoom = region === 'china' ? DEFAULT_CHINA_MAP_ZOOM : MIN_MAP_ZOOM;
    const focusX = (mapFocusPoint.x / MAP_WIDTH) * baseMapWidth;
    const focusY = (mapFocusPoint.y / MAP_HEIGHT) * baseMapHeight;
    const nextTranslateX = defaultZoom <= 1.01
      ? 0
      : clampMapTranslationValue(-(focusX - baseMapWidth / 2) * defaultZoom, baseMapWidth, defaultZoom);
    const nextTranslateY = defaultZoom <= 1.01
      ? 0
      : clampMapTranslationValue(-(focusY - baseMapHeight / 2) * defaultZoom, baseMapHeight, defaultZoom);

    mapScale.value = defaultZoom;
    savedMapScale.value = defaultZoom;
    mapTranslateX.value = nextTranslateX;
    mapTranslateY.value = nextTranslateY;
    savedMapTranslateX.value = nextTranslateX;
    savedMapTranslateY.value = nextTranslateY;
    setMapZoom(defaultZoom);
  }, [baseMapHeight, baseMapWidth, mapFocusPoint.x, mapFocusPoint.y, region]);

  useEffect(() => {
    if (!filteredSites.some((site) => site.id === selectedId)) {
      setSelectedId(filteredSites[0]?.id || SACRED_SITES[0]?.id || '');
    }
  }, [filteredSites, selectedId]);

  const selectedSite = getSacredSiteById(selectedId) || filteredSites[0] || SACRED_SITES[0];
  const today = getTodayString();
  const todaySiteCheckIn = selectedSite
    ? checkIns.find((item) => item.siteId === selectedSite.id && item.date === today)
    : undefined;
  const visitedSiteIds = new Set(checkIns.map((item) => item.siteId));
  const regionCount = SACRED_SITES.filter((site) => site.region === region).length;

  const copy = {
    title: isZh ? '地图' : 'Map',
    subtitle: isZh ? '寺观道场朝礼地图' : 'Temple pilgrimage map',
    search: isZh ? '搜索寺名、城市、国家' : 'Search temple, city, country',
    all: isZh ? '全部' : 'All',
    china: isZh ? '全国' : 'China',
    global: isZh ? '全球' : 'Global',
    checked: isZh ? '已打卡' : 'Checked in',
    mapPoints: isZh ? '道场点位' : 'Sacred sites',
    todayDone: isZh ? '今日已朝礼' : 'Done today',
    checkIn: isZh ? '打卡祭拜' : 'Check in',
    share: isZh ? '分享记录' : 'Share',
    details: isZh ? '详情' : 'Details',
    source: isZh ? '资料来源' : 'Source',
    contact: isZh ? '联系' : 'Contact',
    steward: isZh ? '主持/管理' : 'Abbot / steward',
    focus: isZh ? '朝礼重点' : 'Pilgrimage focus',
    etiquette: isZh ? '礼仪' : 'Etiquette',
    records: isZh ? '最近打卡' : 'Recent check-ins',
    noRecords: isZh ? '还没有寺观打卡' : 'No temple check-ins yet',
  };

  const handleSelectSite = (site: SacredSite) => {
    setSelectedId(site.id);
    setDetailOpen(true);
  };

  const handleCheckIn = async () => {
    if (!selectedSite) return;
    const label = SACRED_RITE_LABELS[selectedRite][isZh ? 'zh' : 'en'];
    const record: SacredSiteCheckIn = {
      id: `${selectedSite.id}-${today}`,
      siteId: selectedSite.id,
      date: today,
      timestamp: Date.now(),
      rite: selectedRite,
      note: `${selectedSite.name} · ${label}`,
    };
    const nextRecords = await saveSacredSiteCheckIn(record);
    setCheckIns(nextRecords);
    Alert.alert(
      isZh ? '已完成朝礼打卡' : 'Check-in saved',
      isZh
        ? `今天在「${selectedSite.name}」记录了「${label}」。`
        : `Saved ${label} at ${selectedSite.localName || selectedSite.name}.`
    );
  };

  const handleShare = async () => {
    if (!selectedSite) return;
    const label = todaySiteCheckIn
      ? SACRED_RITE_LABELS[todaySiteCheckIn.rite][isZh ? 'zh' : 'en']
      : SACRED_RITE_LABELS[selectedRite][isZh ? 'zh' : 'en'];
    const traditionLabel = TRADITION_LABELS[selectedSite.tradition][isZh ? 'zh' : 'en'];
    const message = isZh
      ? `我在「过午不食」地图打卡了${traditionLabel}道场「${selectedSite.name}」：${label}。\n${selectedSite.city} · ${selectedSite.address}\n愿今日清净、节制、向善。`
      : `I checked in at ${selectedSite.localName || selectedSite.name} on Guowu Fasting: ${label}.\n${selectedSite.city} · ${selectedSite.address}\nA quiet moment for discipline and kindness.`;
    await Share.share({ message });
    await recordShareAction('daily');
  };

  const openUrl = async (url?: string) => {
    if (!url) return;
    try {
      await Linking.openURL(url);
    } catch (error) {
      Alert.alert(isZh ? '无法打开链接' : 'Cannot open link', url);
    }
  };

  const renderMap = () => {
    const selectedPoint = selectedSite
      ? mapPointsById[selectedSite.id] || clampPoint(projectWorld(selectedSite))
      : null;
    const markerZoom = Math.max(1, mapZoom);
    const normalMarkerRadius = 8.5 / markerZoom;
    const checkedMarkerRadius = 10 / markerZoom;
    const selectedMarkerRadius = 13 / markerZoom;
    const markerInnerRadius = 3 / markerZoom;
    const selectedMarkerInnerRadius = 4.2 / markerZoom;
    const selectedHaloRadius = 30 / markerZoom;
    const selectedInnerHaloRadius = 20 / markerZoom;
    const markerStrokeWidth = 3 / markerZoom;
    const selectedMarkerStrokeWidth = 4 / markerZoom;
    const selectedPointerOffsetTop = 18 / markerZoom;
    const selectedPointerOffsetBottom = 35 / markerZoom;
    const selectedPointerHalfWidth = 8 / markerZoom;
    const labelZoom = Math.max(0.58, markerZoom * (baseMapWidth / MAP_WIDTH));
    const labelBoundaryPadding = 8 / labelZoom;
    const mapContentStyle = {
      width: baseMapWidth,
      height: baseMapHeight,
    };

    const getLabelLayout = (name: string, index: number, isSelected: boolean) => {
      const fontSize = (isSelected ? 18 : 16) / labelZoom;
      const height = (isSelected ? 32 : 28) / labelZoom;
      const width = Math.min(
        (isSelected ? 190 : 172) / labelZoom,
        Math.max(
          (isSelected ? 86 : 70) / labelZoom,
          (name.length * (isSelected ? 17 : 15) + (isSelected ? 32 : 28)) / labelZoom
        )
      );
      const gap = (isSelected ? 18 : 13) / labelZoom;
      const direction = index % 4;
      const offsetX = isSelected
        ? gap
        : direction === 1 || direction === 3
          ? -(width + gap)
          : gap;
      const offsetY = isSelected
        ? -(height + gap)
        : direction === 2 || direction === 3
          ? -(height + gap)
          : gap;

      return {
        width,
        height,
        offsetX,
        offsetY,
        fontSize,
        radius: 8 / labelZoom,
        borderWidth: (isSelected ? 2.2 : 1.6) / labelZoom,
        textStrokeWidth: (isSelected ? 4.2 : 3.4) / labelZoom,
      };
    };

    const clampMapTranslation = (value: number, size: number, scale: number) => {
      'worklet';
      const maxOffset = Math.max(0, (size * (scale - 1)) / 2);
      return Math.max(-maxOffset, Math.min(maxOffset, value));
    };

    const syncZoomBadge = (value: number) => {
      setMapZoom(Number(value.toFixed(1)));
    };

    const pinchGesture = Gesture.Pinch()
      .shouldCancelWhenOutside(false)
      .onBegin(() => {
        savedMapScale.value = mapScale.value;
        savedMapTranslateX.value = mapTranslateX.value;
        savedMapTranslateY.value = mapTranslateY.value;
      })
      .onUpdate((event) => {
        const responsiveScale = Math.pow(event.scale, PINCH_SENSITIVITY);
        const nextScale = Math.max(MIN_MAP_ZOOM, Math.min(MAX_MAP_ZOOM, savedMapScale.value * responsiveScale));
        mapScale.value = nextScale;
        mapTranslateX.value = nextScale <= 1.01 ? 0 : clampMapTranslation(savedMapTranslateX.value, mapBoundsWidth.value, nextScale);
        mapTranslateY.value = nextScale <= 1.01 ? 0 : clampMapTranslation(savedMapTranslateY.value, mapBoundsHeight.value, nextScale);
      })
      .onEnd(() => {
        savedMapScale.value = mapScale.value;
        savedMapTranslateX.value = mapTranslateX.value;
        savedMapTranslateY.value = mapTranslateY.value;
        runOnJS(syncZoomBadge)(mapScale.value);
      });

    const panGesture = Gesture.Pan()
      .enabled(mapZoom > 1.01)
      .minDistance(4)
      .onBegin(() => {
        savedMapTranslateX.value = mapTranslateX.value;
        savedMapTranslateY.value = mapTranslateY.value;
      })
      .onUpdate((event) => {
        if (mapScale.value <= 1.01) {
          mapTranslateX.value = 0;
          mapTranslateY.value = 0;
          return;
        }
        mapTranslateX.value = clampMapTranslation(savedMapTranslateX.value + event.translationX, mapBoundsWidth.value, mapScale.value);
        mapTranslateY.value = clampMapTranslation(savedMapTranslateY.value + event.translationY, mapBoundsHeight.value, mapScale.value);
      })
      .onEnd(() => {
        savedMapTranslateX.value = mapTranslateX.value;
        savedMapTranslateY.value = mapTranslateY.value;
      });

    const mapGesture = Gesture.Simultaneous(pinchGesture, panGesture);

    return (
      <Card style={styles.mapCard}>
        <View style={styles.mapHeader}>
          <View>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{copy.subtitle}</Text>
            <Text style={[styles.sectionHint, { color: colors.textSecondary }]}>
              {copy.mapPoints} · {regionCount} {isZh ? '处地点' : 'sites'}
            </Text>
          </View>
          <View style={[styles.pill, { backgroundColor: colors.primary + '18' }]}>
            <Text style={[styles.pillText, { color: colors.primary }]}>{visitedSiteIds.size} {copy.checked}</Text>
          </View>
        </View>

        <View
          style={[styles.mapViewport, { height: baseMapHeight }]}
          onLayout={(event) => setMapViewportWidth(event.nativeEvent.layout.width)}
        >
          <GestureDetector gesture={mapGesture}>
            <View style={styles.pinchLayer} collapsable={false}>
              <Animated.View style={[styles.mapTransformLayer, mapContentStyle, animatedMapStyle]}>
                <Svg width={mapContentStyle.width} height={mapContentStyle.height} viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}>
                      <Defs>
                        <SvgLinearGradient id="mapSky" x1="0" y1="0" x2="1" y2="1">
                          <Stop offset="0" stopColor={region === 'china' ? '#ECF6F2' : '#ECF3FF'} />
                          <Stop offset="0.52" stopColor="#FFF7E8" />
                          <Stop offset="1" stopColor={region === 'china' ? '#F8E8DE' : '#F0E9F7'} />
                        </SvgLinearGradient>
                      </Defs>
                      <Rect x="0" y="0" width={MAP_WIDTH} height={MAP_HEIGHT} rx="32" fill="url(#mapSky)" />
                      <G opacity="0.24">
                        {[100, 200, 300, 400].map((y) => (
                          <Path key={`h-${y}`} d={`M32 ${y} H688`} stroke="#8FA0AA" strokeWidth="1.2" />
                        ))}
                        {[120, 240, 360, 480, 600].map((x) => (
                          <Path key={`v-${x}`} d={`M${x} 32 V388`} stroke="#8FA0AA" strokeWidth="1.2" />
                        ))}
                      </G>
                      <G>
                        {WORLD_LANDMASSES.map((path) => (
                          <Path key={path} d={path} fill="#D6E2CC" stroke="#8DA883" strokeWidth="2.2" />
                        ))}
                        <Path d="M0 254 C92 282 184 266 276 288 C386 312 495 285 720 322" stroke="#87A8C7" strokeWidth="4" fill="none" opacity="0.16" />
                      </G>
                      {sitesForCurrentMap.map((site) => {
                        const point = mapPointsById[site.id] || clampPoint(projectWorld(site));
                        const isSelected = site.id === selectedSite?.id;
                        const checked = visitedSiteIds.has(site.id);
                        const traditionMeta = TRADITION_LABELS[site.tradition];
                        return (
                          <G key={site.id} onPress={() => handleSelectSite(site)}>
                            {isSelected && (
                              <>
                                <Circle cx={point.x} cy={point.y} r={selectedHaloRadius} fill={traditionMeta.color} opacity="0.12" />
                                <Circle cx={point.x} cy={point.y} r={selectedInnerHaloRadius} fill={traditionMeta.color} opacity="0.18" />
                              </>
                            )}
                            <Circle
                              cx={point.x}
                              cy={point.y}
                              r={isSelected ? selectedMarkerRadius : checked ? checkedMarkerRadius : normalMarkerRadius}
                              fill={checked ? '#D0473C' : traditionMeta.color}
                              stroke="#FFFFFF"
                              strokeWidth={isSelected ? selectedMarkerStrokeWidth : markerStrokeWidth}
                            />
                            <Circle
                              cx={point.x}
                              cy={point.y}
                              r={isSelected ? selectedMarkerInnerRadius : markerInnerRadius}
                              fill="#FFFFFF"
                              opacity={isSelected ? 0.95 : 0.75}
                            />
                          </G>
                        );
                      })}
                      {selectedPoint && (
                        <Path
                          d={`M${selectedPoint.x} ${selectedPoint.y + selectedPointerOffsetTop} L${selectedPoint.x - selectedPointerHalfWidth} ${selectedPoint.y + selectedPointerOffsetBottom} L${selectedPoint.x + selectedPointerHalfWidth} ${selectedPoint.y + selectedPointerOffsetBottom} Z`}
                          fill={TRADITION_LABELS[selectedSite.tradition].color}
                          opacity="0.9"
                        />
                      )}
                      {sitesForCurrentMap.map((site, index) => {
                        const point = mapPointsById[site.id] || clampPoint(projectWorld(site));
                        const isSelected = site.id === selectedSite?.id;
                        if (!isSelected && mapZoom < SITE_LABEL_MIN_ZOOM) {
                          return null;
                        }

                        const traditionMeta = TRADITION_LABELS[site.tradition];
                        const label = getLabelLayout(site.name, index, isSelected);
                        const x = Math.max(
                          labelBoundaryPadding,
                          Math.min(MAP_WIDTH - label.width - labelBoundaryPadding, point.x + label.offsetX)
                        );
                        const y = Math.max(
                          labelBoundaryPadding,
                          Math.min(MAP_HEIGHT - label.height - labelBoundaryPadding, point.y + label.offsetY)
                        );
                        const textX = x + label.width / 2;
                        const textY = y + label.height / 2 + label.fontSize * 0.34;

                        return (
                          <G key={`label-${site.id}`} onPress={() => handleSelectSite(site)} opacity={isSelected ? 1 : 0.96}>
                            <Rect
                              x={x}
                              y={y}
                              width={label.width}
                              height={label.height}
                              rx={label.radius}
                              fill={isSelected ? '#FFF1C8' : '#FFFDF8'}
                              stroke={traditionMeta.color}
                              strokeWidth={label.borderWidth}
                            />
                            <SvgText
                              x={textX}
                              y={textY}
                              textAnchor="middle"
                              fontSize={label.fontSize}
                              fontWeight="900"
                              fill="#FFFFFF"
                              stroke="#FFFFFF"
                              strokeWidth={label.textStrokeWidth}
                            >
                              {site.name}
                            </SvgText>
                            <SvgText
                              x={textX}
                              y={textY}
                              textAnchor="middle"
                              fontSize={label.fontSize}
                              fontWeight="900"
                              fill="#101820"
                            >
                              {site.name}
                            </SvgText>
                          </G>
                        );
                      })}
                </Svg>
              </Animated.View>
            </View>
          </GestureDetector>

          <View style={styles.zoomBadge} pointerEvents="none">
            <Text style={styles.zoomBadgeText}>{mapZoom.toFixed(1)}x</Text>
          </View>
        </View>

        <View style={styles.mapLegend}>
          {(['buddhist', 'taoist', 'mixed'] as SacredTradition[]).map((item) => {
            const meta = TRADITION_LABELS[item];
            return (
              <View key={item} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: meta.color }]} />
                <Text style={[styles.legendText, { color: colors.textSecondary }]}>{meta[isZh ? 'zh' : 'en']}</Text>
              </View>
            );
          })}
        </View>
      </Card>
    );
  };

  const renderFilters = () => (
    <Card style={styles.filterCard} variant="compact">
      <View style={[styles.searchBox, { borderColor: colors.border, backgroundColor: colors.backgroundSecondary }]}>
        <Text style={styles.searchIcon}>⌕</Text>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={copy.search}
          placeholderTextColor={colors.textLight}
          style={[styles.searchInput, { color: colors.text }]}
        />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        {(['china', 'global'] as SacredRegion[]).map((item) => (
          <TouchableOpacity
            key={item}
            style={[
              styles.filterChip,
              { borderColor: colors.border, backgroundColor: item === region ? colors.primary : colors.backgroundSecondary },
            ]}
            onPress={() => setRegion(item)}
          >
            <Text style={[styles.filterChipText, { color: item === region ? '#FFFFFF' : colors.text }]}>
              {item === 'china' ? copy.china : copy.global}
            </Text>
          </TouchableOpacity>
        ))}
        {(['all', 'buddhist', 'taoist', 'mixed'] as FilterTradition[]).map((item) => {
          const active = item === tradition;
          const label = item === 'all' ? copy.all : TRADITION_LABELS[item][isZh ? 'zh' : 'en'];
          return (
            <TouchableOpacity
              key={item}
              style={[
                styles.filterChip,
                { borderColor: colors.border, backgroundColor: active ? '#2F4858' : colors.backgroundSecondary },
              ]}
              onPress={() => setTradition(item)}
            >
              <Text style={[styles.filterChipText, { color: active ? '#FFFFFF' : colors.text }]}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </Card>
  );

  const renderSelectedSite = () => {
    if (!selectedSite) return null;
    const traditionMeta = TRADITION_LABELS[selectedSite.tradition];
    const leadership = selectedSite.abbot || selectedSite.steward || (isZh ? '以寺观公告为准' : 'See official notice');
    return (
      <Card style={[styles.selectedCard, { borderColor: traditionMeta.color + '55' }]}>
        <View style={styles.selectedTop}>
          <View style={[styles.siteSeal, { backgroundColor: traditionMeta.color }]}>
            <Text style={styles.siteSealText}>{traditionMeta.icon}</Text>
          </View>
          <View style={styles.selectedTitleBlock}>
            <View style={styles.titleRow}>
              <Text style={[styles.selectedName, { color: colors.text }]} numberOfLines={1}>{selectedSite.name}</Text>
              {todaySiteCheckIn && (
                <View style={[styles.todayBadge, { backgroundColor: colors.success + '18' }]}>
                  <Text style={[styles.todayBadgeText, { color: colors.success }]}>{copy.todayDone}</Text>
                </View>
              )}
            </View>
            <Text style={[styles.selectedMeta, { color: colors.textSecondary }]} numberOfLines={1}>
              {traditionMeta[isZh ? 'zh' : 'en']} · {getSacredSiteRegionTitle(selectedSite.region, language)} · {selectedSite.city}
            </Text>
          </View>
        </View>

        <Text style={[styles.description, { color: colors.text }]}>{selectedSite.description}</Text>

        <View style={styles.infoGrid}>
          <InfoTile label={isZh ? '地址' : 'Address'} value={selectedSite.address} colors={colors} />
          <InfoTile label={copy.steward} value={leadership} colors={colors} />
          <InfoTile label={isZh ? '始建' : 'Founded'} value={selectedSite.founded || (isZh ? '待补充' : 'TBD')} colors={colors} />
          <InfoTile label={copy.focus} value={selectedSite.pilgrimageFocus} colors={colors} />
        </View>

        <Text style={[styles.etiquette, { color: colors.textSecondary }]}>{selectedSite.etiquette}</Text>

        <View style={styles.riteRow}>
          {RITE_OPTIONS.map((rite) => {
            const active = selectedRite === rite;
            return (
              <TouchableOpacity
                key={rite}
                style={[
                  styles.riteChip,
                  {
                    backgroundColor: active ? traditionMeta.color : colors.backgroundSecondary,
                    borderColor: active ? traditionMeta.color : colors.border,
                  },
                ]}
                onPress={() => setSelectedRite(rite)}
              >
                <Text style={[styles.riteText, { color: active ? '#FFFFFF' : colors.text }]}>
                  {SACRED_RITE_LABELS[rite][isZh ? 'zh' : 'en']}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity style={[styles.primaryButton, { backgroundColor: traditionMeta.color }]} onPress={handleCheckIn}>
            <Text style={styles.primaryButtonText}>{todaySiteCheckIn ? copy.todayDone : copy.checkIn}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.secondaryButton, { borderColor: colors.border }]} onPress={handleShare}>
            <Text style={[styles.secondaryButtonText, { color: colors.text }]}>{copy.share}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.linkRow}>
          {selectedSite.contact?.phone && (
            <TouchableOpacity style={styles.inlineLink} onPress={() => openUrl(`tel:${selectedSite.contact?.phone}`)}>
              <Text style={[styles.inlineLinkText, { color: colors.primary }]}>{copy.contact}</Text>
            </TouchableOpacity>
          )}
          {selectedSite.contact?.website && (
            <TouchableOpacity style={styles.inlineLink} onPress={() => openUrl(selectedSite.contact?.website)}>
              <Text style={[styles.inlineLinkText, { color: colors.primary }]}>{isZh ? '官网' : 'Website'}</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.inlineLink} onPress={() => openUrl(selectedSite.sourceUrl)}>
            <Text style={[styles.inlineLinkText, { color: colors.primary }]}>{copy.source}</Text>
          </TouchableOpacity>
        </View>
      </Card>
    );
  };

  const renderSiteCard = (site: SacredSite) => {
    const traditionMeta = TRADITION_LABELS[site.tradition];
    const checked = visitedSiteIds.has(site.id);
    return (
      <TouchableOpacity
        key={site.id}
        style={[
          styles.siteCard,
          {
            backgroundColor: colors.card,
            borderColor: site.id === selectedSite?.id ? traditionMeta.color : colors.border,
          },
        ]}
        onPress={() => handleSelectSite(site)}
      >
        <View style={[styles.siteDot, { backgroundColor: checked ? '#D0473C' : traditionMeta.color }]} />
        <View style={styles.siteCardBody}>
          <View style={styles.siteCardTitleRow}>
            <Text style={[styles.siteCardTitle, { color: colors.text }]} numberOfLines={1}>{site.name}</Text>
            <Text style={[styles.siteCardType, { color: traditionMeta.color }]}>
              {traditionMeta[isZh ? 'zh' : 'en']}
            </Text>
          </View>
          <Text style={[styles.siteCardSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
            {site.country} · {site.province ? `${site.province} · ` : ''}{site.city}
          </Text>
          <Text style={[styles.siteCardDesc, { color: colors.textSecondary }]} numberOfLines={2}>
            {site.pilgrimageFocus}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderHistory = () => {
    const recent = checkIns.slice(0, 6);
    return (
      <Card style={styles.historyCard}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>{copy.records}</Text>
        {recent.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{copy.noRecords}</Text>
        ) : (
          recent.map((record) => {
            const site = getSacredSiteById(record.siteId);
            if (!site) return null;
            return (
              <View key={record.id} style={[styles.recordRow, { borderBottomColor: colors.divider }]}>
                <Text style={[styles.recordDate, { color: colors.textSecondary }]}>{record.date}</Text>
                <View style={styles.recordBody}>
                  <Text style={[styles.recordTitle, { color: colors.text }]}>{site.name}</Text>
                  <Text style={[styles.recordMeta, { color: colors.textSecondary }]}>
                    {SACRED_RITE_LABELS[record.rite][isZh ? 'zh' : 'en']} · {site.city}
                  </Text>
                </View>
              </View>
            );
          })
        )}
      </Card>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>{copy.title}</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {isZh ? '把清净的地点，变成每天可回看的修行足迹。' : 'Turn sacred visits into a calm practice record.'}
          </Text>
        </View>

        {renderFilters()}
        {renderMap()}
        {renderSelectedSite()}

        <View style={styles.listHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {filteredSites.length} {isZh ? '处地点' : 'sites'}
          </Text>
          <Text style={[styles.sectionHint, { color: colors.textSecondary }]}>
            {isZh ? '点选后可查看详情' : 'Tap for details'}
          </Text>
        </View>

        <View style={styles.siteList}>
          {filteredSites.map(renderSiteCard)}
        </View>

        {renderHistory()}
      </ScrollView>

      <Modal visible={detailOpen} transparent animationType="fade" onRequestClose={() => setDetailOpen(false)}>
        <View style={styles.detailOverlay}>
          <View style={[styles.detailSheet, { backgroundColor: colors.card }]}>
            <View style={styles.detailHeader}>
              <Text style={[styles.detailTitle, { color: colors.text }]}>{selectedSite?.name}</Text>
              <TouchableOpacity onPress={() => setDetailOpen(false)} style={styles.closeButton}>
                <Text style={[styles.closeText, { color: colors.text }]}>×</Text>
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {renderSelectedSite()}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const InfoTile = ({
  label,
  value,
  colors,
}: {
  label: string;
  value: string;
  colors: { text: string; textSecondary: string; backgroundSecondary: string };
}) => (
  <View style={[styles.infoTile, { backgroundColor: colors.backgroundSecondary }]}>
    <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{label}</Text>
    <Text style={[styles.infoValue, { color: colors.text }]}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: layout.contentPadding,
    paddingBottom: vs(128),
    gap: vs(14),
    maxWidth: layout.maxWidth,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    paddingTop: vs(8),
  },
  title: {
    fontSize: fs(28),
    fontWeight: '800',
  },
  subtitle: {
    marginTop: vs(4),
    fontSize: fs(13),
    lineHeight: fs(19),
  },
  filterCard: {
    gap: vs(10),
  },
  searchBox: {
    height: vs(44),
    borderWidth: 1,
    borderRadius: rs(12),
    paddingHorizontal: rs(12),
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchIcon: {
    fontSize: fs(18),
    color: '#6E7A84',
    marginRight: rs(8),
  },
  searchInput: {
    flex: 1,
    fontSize: fs(14),
    paddingVertical: 0,
  },
  filterRow: {
    gap: rs(8),
    paddingRight: rs(4),
  },
  filterChip: {
    height: vs(34),
    minWidth: rs(64),
    borderRadius: rs(17),
    borderWidth: 1,
    paddingHorizontal: rs(12),
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterChipText: {
    fontSize: fs(12),
    fontWeight: '700',
  },
  mapCard: {
    gap: vs(12),
  },
  mapHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: rs(10),
  },
  sectionTitle: {
    fontSize: fs(17),
    fontWeight: '800',
  },
  sectionHint: {
    marginTop: vs(3),
    fontSize: fs(12),
  },
  pill: {
    borderRadius: rs(14),
    paddingHorizontal: rs(10),
    paddingVertical: vs(6),
  },
  pillText: {
    fontSize: fs(11),
    fontWeight: '800',
  },
  mapViewport: {
    borderRadius: rs(18),
    overflow: 'hidden',
    backgroundColor: '#ECF3FF',
    borderWidth: 1,
    borderColor: 'rgba(120, 133, 143, 0.18)',
  },
  pinchLayer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapTransformLayer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomBadge: {
    position: 'absolute',
    right: rs(10),
    top: vs(10),
    minWidth: rs(52),
    height: rs(34),
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: rs(18),
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  zoomBadgeText: {
    color: '#24303A',
    fontSize: fs(11),
    fontWeight: '900',
  },
  mapLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: rs(12),
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(5),
  },
  legendDot: {
    width: rs(8),
    height: rs(8),
    borderRadius: rs(4),
  },
  legendText: {
    fontSize: fs(11),
    fontWeight: '700',
  },
  selectedCard: {
    borderWidth: 1,
    gap: vs(12),
  },
  selectedTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(12),
  },
  siteSeal: {
    width: rs(48),
    height: rs(48),
    borderRadius: rs(16),
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 5,
  },
  siteSealText: {
    color: '#FFFFFF',
    fontSize: fs(18),
    fontWeight: '900',
  },
  selectedTitleBlock: {
    flex: 1,
    minWidth: 0,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(8),
  },
  selectedName: {
    flex: 1,
    fontSize: fs(20),
    fontWeight: '900',
  },
  todayBadge: {
    borderRadius: rs(10),
    paddingHorizontal: rs(8),
    paddingVertical: vs(4),
  },
  todayBadgeText: {
    fontSize: fs(10),
    fontWeight: '800',
  },
  selectedMeta: {
    marginTop: vs(3),
    fontSize: fs(12),
  },
  description: {
    fontSize: fs(14),
    lineHeight: fs(21),
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: rs(8),
  },
  infoTile: {
    width: '48%',
    minHeight: vs(76),
    borderRadius: rs(12),
    padding: rs(10),
  },
  infoLabel: {
    fontSize: fs(11),
    fontWeight: '700',
    marginBottom: vs(5),
  },
  infoValue: {
    fontSize: fs(12),
    lineHeight: fs(17),
    fontWeight: '600',
  },
  etiquette: {
    fontSize: fs(12),
    lineHeight: fs(18),
  },
  riteRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: rs(8),
  },
  riteChip: {
    minHeight: vs(34),
    borderRadius: rs(17),
    borderWidth: 1,
    paddingHorizontal: rs(11),
    alignItems: 'center',
    justifyContent: 'center',
  },
  riteText: {
    fontSize: fs(12),
    fontWeight: '800',
  },
  actionRow: {
    flexDirection: 'row',
    gap: rs(10),
  },
  primaryButton: {
    flex: 1,
    height: vs(44),
    borderRadius: rs(14),
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: fs(14),
    fontWeight: '900',
  },
  secondaryButton: {
    width: rs(104),
    height: vs(44),
    borderRadius: rs(14),
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    fontSize: fs(14),
    fontWeight: '800',
  },
  linkRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: rs(14),
  },
  inlineLink: {
    paddingVertical: vs(2),
  },
  inlineLinkText: {
    fontSize: fs(12),
    fontWeight: '800',
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: vs(2),
  },
  siteList: {
    gap: vs(10),
  },
  siteCard: {
    borderWidth: 1,
    borderRadius: rs(16),
    padding: rs(12),
    flexDirection: 'row',
    gap: rs(10),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  siteDot: {
    width: rs(10),
    height: rs(10),
    borderRadius: rs(5),
    marginTop: vs(5),
  },
  siteCardBody: {
    flex: 1,
    minWidth: 0,
  },
  siteCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(8),
  },
  siteCardTitle: {
    flex: 1,
    fontSize: fs(15),
    fontWeight: '800',
  },
  siteCardType: {
    fontSize: fs(11),
    fontWeight: '900',
  },
  siteCardSubtitle: {
    marginTop: vs(3),
    fontSize: fs(12),
  },
  siteCardDesc: {
    marginTop: vs(6),
    fontSize: fs(12),
    lineHeight: fs(17),
  },
  historyCard: {
    gap: vs(10),
  },
  emptyText: {
    fontSize: fs(13),
    lineHeight: fs(19),
  },
  recordRow: {
    flexDirection: 'row',
    gap: rs(12),
    borderBottomWidth: 1,
    paddingBottom: vs(9),
  },
  recordDate: {
    width: rs(86),
    fontSize: fs(12),
    fontWeight: '700',
  },
  recordBody: {
    flex: 1,
  },
  recordTitle: {
    fontSize: fs(13),
    fontWeight: '800',
  },
  recordMeta: {
    marginTop: vs(2),
    fontSize: fs(12),
  },
  detailOverlay: {
    flex: 1,
    backgroundColor: 'rgba(20, 24, 28, 0.55)',
    justifyContent: 'flex-end',
  },
  detailSheet: {
    maxHeight: '88%',
    borderTopLeftRadius: rs(24),
    borderTopRightRadius: rs(24),
    padding: rs(16),
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: vs(10),
  },
  detailTitle: {
    fontSize: fs(18),
    fontWeight: '900',
  },
  closeButton: {
    width: rs(36),
    height: rs(36),
    borderRadius: rs(18),
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    fontSize: fs(26),
    lineHeight: fs(28),
  },
});
