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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import Svg, {
  Circle,
  ClipPath,
  Defs,
  G,
  LinearGradient as SvgLinearGradient,
  Path,
  RadialGradient,
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
import {
  MAP_HEIGHT,
  MAP_WIDTH,
  projectLonLat,
  WORLD_ANTARCTICA_PATHS,
  WORLD_EQUATOR_PATH,
  WORLD_GLOBE_PATH,
  WORLD_GRATICULE_LAT_PATHS,
  WORLD_GRATICULE_LON_PATHS,
  WORLD_LAKE_PATHS,
  WORLD_LAND_PATHS,
  WORLD_TROPIC_PATHS,
} from '../data/worldMapPaths';
import { getSacredSiteCheckIns, saveSacredSiteCheckIn } from '../services/storage';
import { useApp } from '../context/AppContext';
import { getLocalDateString } from '../utils/date';
import { PILGRIMAGE_ROUTES, computePilgrimageProgress } from '../utils/pilgrimage';
import { fs, layout, responsiveSize, rs, vs } from '../theme/responsive';
import { SacredRegion, SacredRite, SacredSite, SacredSiteCheckIn, SacredTradition } from '../types';

type FilterTradition = 'all' | SacredTradition;
type MapRegionFilter = 'all' | SacredRegion;

const MIN_MARKER_DISTANCE = 3.2;
const MIN_MAP_ZOOM = 1;
const DEFAULT_MAP_ZOOM = MIN_MAP_ZOOM;
const MAX_MAP_ZOOM = 20;
const SITE_LABEL_MIN_ZOOM = 5;
const PINCH_SENSITIVITY = 1.22;

const RITE_OPTIONS: SacredRite[] = ['visit', 'bow', 'lamp', 'meditation', 'chant'];

const getTodayString = () => getLocalDateString();

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

export const TempleMapScreen: React.FC<{ embedded?: boolean }> = ({ embedded = false }) => {
  const insets = useSafeAreaInsets();
  const { colors, language, recordShareAction, stats, settings, updateSettings } = useApp();
  const isZh = language === 'zh' || language === 'zh-Hant';
  const isEs = language === 'es';
  const isDarkTheme =
    colors.background.toLowerCase().startsWith('#0') ||
    colors.background.toLowerCase().startsWith('#1') ||
    colors.background.toLowerCase().startsWith('#2');
  const getSiteDisplayName = (site: SacredSite) => (isZh ? site.name : site.localName || site.name);
  const [region, setRegion] = useState<MapRegionFilter>('all');
  const [tradition, setTradition] = useState<FilterTradition>('all');
  const pilgrimage = useMemo(
    () => computePilgrimageProgress(stats, settings.selectedPilgrimageRouteId),
    [stats, settings.selectedPilgrimageRouteId]
  );
  const routePolylinePath = useMemo(() => {
    const coords = pilgrimage.stops
      .filter((s) => region === 'all' || s.site.region === region)
      .map((s) => clampPoint(projectWorld(s.site), 22));
    if (coords.length < 2) return '';
    return coords.map((p, idx) => `${idx === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  }, [pilgrimage.stops, region]);
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState(SACRED_SITES[0]?.id || '');
  const [selectedRite, setSelectedRite] = useState<SacredRite>('bow');
  const [checkIns, setCheckIns] = useState<SacredSiteCheckIn[]>([]);
  const [detailOpen, setDetailOpen] = useState(false);
  const [mapZoom, setMapZoom] = useState(DEFAULT_MAP_ZOOM);
  const [mapViewportWidth, setMapViewportWidth] = useState(0);
  const mapScale = useSharedValue(DEFAULT_MAP_ZOOM);
  const savedMapScale = useSharedValue(DEFAULT_MAP_ZOOM);
  const mapTranslateX = useSharedValue(0);
  const mapTranslateY = useSharedValue(0);
  const savedMapTranslateX = useSharedValue(0);
  const savedMapTranslateY = useSharedValue(0);
  const mapBoundsWidth = useSharedValue(360);
  const mapBoundsHeight = useSharedValue(200);

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
      const matchesRegion = region === 'all' || site.region === region;
      const matchesTradition = tradition === 'all' || site.tradition === tradition;
      const text = `${site.name} ${site.localName || ''} ${site.country} ${site.province || ''} ${site.city} ${site.address}`.toLowerCase();
      const matchesKeyword = !keyword || text.includes(keyword);
      return matchesRegion && matchesTradition && matchesKeyword;
    });
  }, [query, region, tradition]);

  const sitesForCurrentMap = useMemo(
    () =>
      filteredSites.length > 0
        ? filteredSites
        : region === 'all'
          ? SACRED_SITES
          : SACRED_SITES.filter((site) => site.region === region),
    [filteredSites, region]
  );

  const mapPointsById = useMemo(
    () => spreadMapPoints(sitesForCurrentMap),
    [sitesForCurrentMap]
  );

  useEffect(() => {
    mapScale.value = DEFAULT_MAP_ZOOM;
    savedMapScale.value = DEFAULT_MAP_ZOOM;
    mapTranslateX.value = 0;
    mapTranslateY.value = 0;
    savedMapTranslateX.value = 0;
    savedMapTranslateY.value = 0;
    setMapZoom(DEFAULT_MAP_ZOOM);
  }, [baseMapHeight, baseMapWidth, region]);

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
  const regionCount =
    region === 'all'
      ? SACRED_SITES.length
      : SACRED_SITES.filter((site) => site.region === region).length;

  const copy = {
    title: isZh ? '地图' : isEs ? 'Mapa' : 'Map',
    subtitle: isZh ? '世界寺观道场朝礼地图' : isEs ? 'Mapa mundial de lugares sagrados' : 'World temple pilgrimage map',
    search: isZh ? '搜索寺名、城市、国家' : isEs ? 'Buscar templo, ciudad, país' : 'Search temple, city, country',
    all: isZh ? '全部' : isEs ? 'Todos' : 'All',
    world: isZh ? '全球' : isEs ? 'Mundo' : 'World',
    china: isZh ? '中国' : 'China',
    global: isZh ? '海外' : isEs ? 'Exterior' : 'Overseas',
    checked: isZh ? '已打卡' : isEs ? 'Visitados' : 'Checked in',
    mapPoints: isZh ? '道场点位' : isEs ? 'Sitios sagrados' : 'Sacred sites',
    todayDone: isZh ? '今日已朝礼' : isEs ? 'Visitado hoy' : 'Done today',
    checkIn: isZh ? '打卡祭拜' : isEs ? 'Registrar visita' : 'Check in',
    share: isZh ? '分享记录' : isEs ? 'Compartir' : 'Share',
    details: isZh ? '详情' : isEs ? 'Detalles' : 'Details',
    source: isZh ? '资料来源' : isEs ? 'Fuente' : 'Source',
    contact: isZh ? '联系' : isEs ? 'Contacto' : 'Contact',
    steward: isZh ? '主持/管理' : isEs ? 'Abad / encargado' : 'Abbot / steward',
    focus: isZh ? '朝礼重点' : isEs ? 'Enfoque' : 'Pilgrimage focus',
    etiquette: isZh ? '礼仪' : isEs ? 'Etiqueta' : 'Etiquette',
    records: isZh ? '最近打卡' : isEs ? 'Visitas recientes' : 'Recent check-ins',
    noRecords: isZh ? '还没有寺观打卡' : isEs ? 'Aún no hay visitas registradas' : 'No temple check-ins yet',
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
    const zoomScale = Math.pow(Math.max(1, mapZoom), 0.85);
    const normalMarkerRadius = 3.5 / zoomScale;
    const checkedMarkerRadius = 4.6 / zoomScale;
    const selectedMarkerRadius = 6.2 / zoomScale;
    const markerInnerRadius = 1.15 / zoomScale;
    const selectedMarkerInnerRadius = 2.0 / zoomScale;
    const selectedHaloRadius = 15 / zoomScale;
    const selectedInnerHaloRadius = 9.5 / zoomScale;
    const markerStrokeWidth = 1.05 / zoomScale;
    const selectedMarkerStrokeWidth = 1.75 / zoomScale;
    const selectedPointerOffsetTop = 8.5 / zoomScale;
    const selectedPointerOffsetBottom = 16 / zoomScale;
    const selectedPointerHalfWidth = 3.8 / zoomScale;
    const labelBoundaryPadding = 6 / zoomScale;
    const mapContentStyle = {
      width: baseMapWidth,
      height: baseMapHeight,
    };

    const getLabelLayout = (name: string, index: number, isSelected: boolean) => {
      const fontSize = (isSelected ? 12 : 10.5) / zoomScale;
      const height = (isSelected ? 22 : 19) / zoomScale;
      const width = Math.min(
        (isSelected ? 148 : 132) / zoomScale,
        Math.max(
          (isSelected ? 54 : 46) / zoomScale,
          (name.length * (isSelected ? 10.5 : 9.2) + (isSelected ? 20 : 16)) / zoomScale
        )
      );
      const gap = (isSelected ? 10 : 7.5) / zoomScale;
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
        radius: 5.5 / zoomScale,
        borderWidth: (isSelected ? 1.5 : 1.1) / zoomScale,
        textStrokeWidth: (isSelected ? 2.6 : 2.2) / zoomScale,
      };
    };

    const applyZoom = (nextZoom: number, focusPoint?: { x: number; y: number } | null) => {
      const clampedZoom = Math.max(MIN_MAP_ZOOM, Math.min(MAX_MAP_ZOOM, Number(nextZoom.toFixed(1))));
      if (clampedZoom <= 1.01) {
        mapScale.value = 1;
        savedMapScale.value = 1;
        mapTranslateX.value = 0;
        mapTranslateY.value = 0;
        savedMapTranslateX.value = 0;
        savedMapTranslateY.value = 0;
        setMapZoom(1);
        return;
      }

      const target = focusPoint || selectedPoint;
      const targetX = target ? (target.x / MAP_WIDTH) * baseMapWidth : baseMapWidth / 2;
      const targetY = target ? (target.y / MAP_HEIGHT) * baseMapHeight : baseMapHeight / 2;
      const nextTranslateX = clampMapTranslationValue(-(targetX - baseMapWidth / 2) * clampedZoom, baseMapWidth, clampedZoom);
      const nextTranslateY = clampMapTranslationValue(-(targetY - baseMapHeight / 2) * clampedZoom, baseMapHeight, clampedZoom);

      mapScale.value = clampedZoom;
      savedMapScale.value = clampedZoom;
      mapTranslateX.value = nextTranslateX;
      mapTranslateY.value = nextTranslateY;
      savedMapTranslateX.value = nextTranslateX;
      savedMapTranslateY.value = nextTranslateY;
      setMapZoom(clampedZoom);
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
    const graticuleStroke = isDarkTheme ? '#7BA4B8' : '#5E869B';

    return (
      <Card style={styles.mapCard}>
        <View style={styles.mapHeader}>
          <View>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{copy.subtitle}</Text>
            <Text style={[styles.sectionHint, { color: colors.textSecondary }]}>
              {copy.mapPoints} · {regionCount} {isZh ? '处地点' : isEs ? 'lugares' : 'sites'}
            </Text>
          </View>
          <View style={[styles.pill, { backgroundColor: colors.primary + '18' }]}>
            <Text style={[styles.pillText, { color: colors.primary }]}>{visitedSiteIds.size} {copy.checked}</Text>
          </View>
        </View>

        <View
          style={[
            styles.mapViewport,
            {
              height: baseMapHeight,
              backgroundColor: isDarkTheme ? '#121A22' : '#F6F1E6',
            },
          ]}
          onLayout={(event) => setMapViewportWidth(event.nativeEvent.layout.width)}
        >
          <GestureDetector gesture={mapGesture}>
            <View style={styles.pinchLayer} collapsable={false}>
              <Animated.View style={[styles.mapTransformLayer, mapContentStyle, animatedMapStyle]}>
                <Svg width={mapContentStyle.width} height={mapContentStyle.height} viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}>
                  <Defs>
                    <SvgLinearGradient id="atlasBackdrop" x1="0" y1="0" x2="1" y2="1">
                      <Stop offset="0" stopColor={isDarkTheme ? '#121A22' : '#F6F1E6'} />
                      <Stop offset="1" stopColor={isDarkTheme ? '#18232E' : '#EFE7D8'} />
                    </SvgLinearGradient>
                    <RadialGradient id="oceanFill" cx="50%" cy="46%" rx="56%" ry="52%">
                      <Stop offset="0" stopColor={isDarkTheme ? '#21394A' : '#DFEFF6'} />
                      <Stop offset="0.62" stopColor={isDarkTheme ? '#182C3B' : '#C6DFEC'} />
                      <Stop offset="1" stopColor={isDarkTheme ? '#12212D' : '#B2D0E2'} />
                    </RadialGradient>
                    <SvgLinearGradient id="landFill" x1="0" y1="0" x2="0" y2="1">
                      <Stop offset="0" stopColor={isDarkTheme ? '#3C5646' : '#DFE9D2'} />
                      <Stop offset="1" stopColor={isDarkTheme ? '#2D4337' : '#C6D8B6'} />
                    </SvgLinearGradient>
                    <ClipPath id="globeClip">
                      <Path d={WORLD_GLOBE_PATH} />
                    </ClipPath>
                  </Defs>

                  <Rect x="0" y="0" width={MAP_WIDTH} height={MAP_HEIGHT} rx="24" fill="url(#atlasBackdrop)" />

                  <G clipPath="url(#globeClip)">
                    <Path d={WORLD_GLOBE_PATH} fill="url(#oceanFill)" />

                    <G opacity={isDarkTheme ? 0.2 : 0.22}>
                      {WORLD_GRATICULE_LAT_PATHS.map((d, idx) => (
                        <Path key={`lat-${idx}`} d={d} stroke={graticuleStroke} strokeWidth="0.7" fill="none" />
                      ))}
                      {WORLD_GRATICULE_LON_PATHS.map((d, idx) => (
                        <Path key={`lon-${idx}`} d={d} stroke={graticuleStroke} strokeWidth="0.7" fill="none" />
                      ))}
                    </G>

                    <G opacity="0.24">
                      {WORLD_TROPIC_PATHS.map((d, idx) => (
                        <Path key={`tropic-${idx}`} d={d} stroke={graticuleStroke} strokeWidth="0.7" strokeDasharray="3 4" fill="none" />
                      ))}
                    </G>

                    <Path d={WORLD_EQUATOR_PATH} stroke={graticuleStroke} strokeWidth="0.9" strokeDasharray="5 4" fill="none" opacity="0.32" />

                    <G opacity="0.35">
                      {WORLD_LAND_PATHS.map((d, idx) => (
                        <Path
                          key={`shelf-${idx}`}
                          d={d}
                          fill="none"
                          stroke={isDarkTheme ? '#4A7B8C' : '#96C3D6'}
                          strokeWidth="3.4"
                          strokeLinejoin="round"
                        />
                      ))}
                    </G>

                    <G>
                      {WORLD_ANTARCTICA_PATHS.map((d, idx) => (
                        <Path
                          key={`ant-${idx}`}
                          d={d}
                          fill={isDarkTheme ? '#2A3D49' : '#EAF1EF'}
                          stroke={isDarkTheme ? '#3E5563' : '#B9CCC8'}
                          strokeWidth="0.75"
                          strokeLinejoin="round"
                        />
                      ))}
                    </G>

                    <G>
                      {WORLD_LAND_PATHS.map((d, idx) => (
                        <Path
                          key={`land-${idx}`}
                          d={d}
                          fill="url(#landFill)"
                          stroke={isDarkTheme ? '#6F9378' : '#719169'}
                          strokeWidth="1.05"
                          strokeLinejoin="round"
                        />
                      ))}
                    </G>

                    <G>
                      {WORLD_LAKE_PATHS.map((d, idx) => (
                        <Path
                          key={`lake-${idx}`}
                          d={d}
                          fill={isDarkTheme ? '#1A2F3E' : '#C4DFEC'}
                          stroke={isDarkTheme ? '#4E7284' : '#85AEC2'}
                          strokeWidth="0.6"
                          strokeLinejoin="round"
                        />
                      ))}
                    </G>

                    {routePolylinePath ? (
                      <Path
                        d={routePolylinePath}
                        stroke="#C68B33"
                        strokeWidth={2 / zoomScale}
                        strokeDasharray="5 3.5"
                        fill="none"
                        opacity="0.9"
                      />
                    ) : null}
                  </G>

                  <Path
                    d={WORLD_GLOBE_PATH}
                    fill="none"
                    stroke={isDarkTheme ? '#49687A' : '#89A3B0'}
                    strokeWidth="1.4"
                  />

                  <G transform="translate(54, 344)" opacity="0.5">
                    <Circle cx="0" cy="0" r="14" stroke={graticuleStroke} strokeWidth="0.8" fill="none" />
                    <Path d="M0 -11 L2.6 -2.6 L11 0 L2.6 2.6 L0 11 L-2.6 2.6 L-11 0 L-2.6 -2.6 Z" fill={graticuleStroke} opacity="0.7" />
                    <Path d="M0 -11 L2.6 -2.6 L0 0 L-2.6 -2.6 Z" fill="#C68B33" opacity="0.9" />
                    <SvgText x="0" y="-16" textAnchor="middle" fontSize="6.5" fontWeight="800" fill={graticuleStroke}>
                      N
                    </SvgText>
                  </G>

                  {sitesForCurrentMap.map((site) => {
                    const point = mapPointsById[site.id] || clampPoint(projectWorld(site));
                    const isSelected = site.id === selectedSite?.id;
                    const checked = visitedSiteIds.has(site.id);
                    const traditionMeta = TRADITION_LABELS[site.tradition];
                    return (
                      <G key={site.id} onPress={() => handleSelectSite(site)}>
                        <Circle
                          cx={point.x}
                          cy={point.y}
                          r={Math.max(6 / zoomScale, normalMarkerRadius * 1.9)}
                          fill="transparent"
                        />
                        {isSelected && (
                          <>
                            <Circle cx={point.x} cy={point.y} r={selectedHaloRadius} fill={traditionMeta.color} opacity="0.14" />
                            <Circle cx={point.x} cy={point.y} r={selectedInnerHaloRadius} fill={traditionMeta.color} opacity="0.22" />
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
                          opacity={isSelected ? 0.95 : 0.78}
                        />
                      </G>
                    );
                  })}

                  {selectedPoint && selectedSite && (
                    <Path
                      d={`M${selectedPoint.x} ${selectedPoint.y + selectedPointerOffsetTop} L${selectedPoint.x - selectedPointerHalfWidth} ${selectedPoint.y + selectedPointerOffsetBottom} L${selectedPoint.x + selectedPointerHalfWidth} ${selectedPoint.y + selectedPointerOffsetBottom} Z`}
                      fill={TRADITION_LABELS[selectedSite.tradition].color}
                      opacity="0.92"
                    />
                  )}

                  {sitesForCurrentMap.map((site, index) => {
                    const point = mapPointsById[site.id] || clampPoint(projectWorld(site));
                    const isSelected = site.id === selectedSite?.id;
                    if (!isSelected && mapZoom < SITE_LABEL_MIN_ZOOM) {
                      return null;
                    }

                    const traditionMeta = TRADITION_LABELS[site.tradition];
                    const siteDisplayName = getSiteDisplayName(site);
                    const label = getLabelLayout(siteDisplayName, index, isSelected);
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
                          {siteDisplayName}
                        </SvgText>
                        <SvgText
                          x={textX}
                          y={textY}
                          textAnchor="middle"
                          fontSize={label.fontSize}
                          fontWeight="900"
                          fill="#101820"
                        >
                          {siteDisplayName}
                        </SvgText>
                      </G>
                    );
                  })}
                </Svg>
              </Animated.View>
            </View>
          </GestureDetector>

          <View
            style={[
              styles.zoomControlBar,
              {
                backgroundColor: isDarkTheme ? 'rgba(20, 30, 40, 0.9)' : 'rgba(255, 255, 255, 0.94)',
                borderColor: isDarkTheme ? 'rgba(130, 165, 185, 0.28)' : 'rgba(120, 133, 143, 0.2)',
              },
            ]}
          >
            <TouchableOpacity
              style={styles.zoomStepButton}
              onPress={() => applyZoom(mapZoom <= 2 ? 1 : mapZoom / 1.8)}
              accessibilityLabel={isZh ? '缩小地图' : 'Zoom out'}
            >
              <Text style={[styles.zoomStepText, { color: isDarkTheme ? '#E8F0F5' : '#24303A' }]}>−</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.zoomResetButton}
              onPress={() => applyZoom(1)}
              accessibilityLabel={isZh ? '重置为1x全局视图' : 'Reset to 1x world view'}
            >
              <Text style={[styles.zoomBadgeText, { color: isDarkTheme ? '#E8F0F5' : '#24303A' }]}>
                {mapZoom.toFixed(1)}x
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.zoomStepButton}
              onPress={() => applyZoom(mapZoom < 1.5 ? 2.5 : mapZoom * 1.8)}
              accessibilityLabel={isZh ? '放大地图' : 'Zoom in'}
            >
              <Text style={[styles.zoomStepText, { color: isDarkTheme ? '#E8F0F5' : '#24303A' }]}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.mapLegend}>
          {(['buddhist', 'taoist', 'mixed'] as SacredTradition[]).map((item) => {
            const meta = TRADITION_LABELS[item];
            return (
              <View key={item} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: meta.color }]} />
                <Text style={[styles.legendText, { color: colors.textSecondary }]}>
                  {meta[isZh ? 'zh' : 'en']}
                </Text>
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
        {(['all', 'china', 'global'] as MapRegionFilter[]).map((item) => (
          <TouchableOpacity
            key={item}
            style={[
              styles.filterChip,
              { borderColor: colors.border, backgroundColor: item === region ? colors.primary : colors.backgroundSecondary },
            ]}
            onPress={() => setRegion(item)}
          >
            <Text style={[styles.filterChipText, { color: item === region ? '#FFFFFF' : colors.text }]}>
              {item === 'all' ? copy.world : item === 'china' ? copy.china : copy.global}
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
              <Text style={[styles.selectedName, { color: colors.text }]} numberOfLines={1}>{getSiteDisplayName(selectedSite)}</Text>
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
            <Text style={[styles.siteCardTitle, { color: colors.text }]} numberOfLines={1}>{getSiteDisplayName(site)}</Text>
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
                  <Text style={[styles.recordTitle, { color: colors.text }]}>{getSiteDisplayName(site)}</Text>
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

  const renderPilgrimageCard = () => (
    <Card style={styles.pilgrimageCard} variant="compact">
      <View style={styles.pilgrimageTopRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {isZh ? '云行脚 · 圣地集印' : language === 'es' ? 'Peregrinaje · Rutas Sagradas' : 'Cloud Pilgrimage · Sacred Trails'}
          </Text>
          <Text style={[styles.sectionHint, { color: colors.textSecondary }]}>
            {isZh
              ? `已行脚 ${pilgrimage.totalKm} km · 当前：${pilgrimage.currentStop.site.name}`
              : isEs
                ? `${pilgrimage.totalKm} km recorridos · En ${getSiteDisplayName(pilgrimage.currentStop.site)}`
                : `${pilgrimage.totalKm} km walked · At ${getSiteDisplayName(pilgrimage.currentStop.site)}`}
          </Text>
        </View>
        <View style={[styles.pill, { backgroundColor: colors.warning + '22' }]}>
          <Text style={[styles.pillText, { color: colors.warning }]}>
            {pilgrimage.unlockedStamps.length} {isZh ? '印章' : isEs ? 'sellos' : 'stamps'}
          </Text>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        {PILGRIMAGE_ROUTES.map((route) => {
          const active = route.id === pilgrimage.route.id;
          return (
            <TouchableOpacity
              key={route.id}
              style={[
                styles.filterChip,
                {
                  backgroundColor: active ? route.accentColor : colors.backgroundSecondary,
                  borderColor: active ? route.accentColor : colors.border,
                },
              ]}
              onPress={() => {
                void updateSettings({ selectedPilgrimageRouteId: route.id });
                const firstSite = route.stops[0]?.siteId;
                if (firstSite) {
                  setSelectedId(firstSite);
                  const found = getSacredSiteById(firstSite);
                  if (found && region !== 'all' && region !== found.region) {
                    setRegion(found.region);
                  }
                }
              }}
            >
              <Text style={[styles.filterChipText, { color: active ? '#FFFFFF' : colors.text }]}>
                {isZh ? route.nameZh : route.nameEn}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={[styles.pilgrimageTrack, { backgroundColor: colors.divider }]}>
        <View
          style={[
            styles.pilgrimageFill,
            { backgroundColor: pilgrimage.route.accentColor, width: `${Math.round(pilgrimage.progress * 100)}%` },
          ]}
        />
      </View>

      <Text style={[styles.pilgrimageGoalText, { color: colors.textSecondary }]}>
        {pilgrimage.nextStop
          ? isZh
            ? `距下一站「${pilgrimage.nextStop.site.name}」还差 ${pilgrimage.kmToNextStop} km（再坚持约 ${pilgrimage.daysToNextStop} 天过午即可抵达盖印）`
            : `${pilgrimage.kmToNextStop} km (~${pilgrimage.daysToNextStop} days) to unlock ${getSiteDisplayName(pilgrimage.nextStop.site)}`
          : isZh
          ? `本线圆满！已集齐 ${pilgrimage.route.nameZh} 全部圣地印章`
          : `Trail complete! All seals collected on ${pilgrimage.route.nameEn}`}
      </Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        {pilgrimage.stops.map((stop) => {
          const isPinned = settings.selectedStampId === stop.stampId;
          return (
            <TouchableOpacity
              key={stop.stampId}
              style={[
                styles.stampPill,
                {
                  backgroundColor: stop.unlocked
                    ? isPinned
                      ? '#B93A3222'
                      : colors.backgroundSecondary
                    : colors.backgroundSecondary,
                  borderColor: stop.unlocked ? (isPinned ? '#B93A32' : colors.primary) : colors.border,
                  opacity: stop.unlocked ? 1 : 0.5,
                },
              ]}
              onPress={() => {
                setSelectedId(stop.site.id);
                if (region !== 'all' && region !== stop.site.region) {
                  setRegion(stop.site.region);
                }
                if (stop.unlocked) {
                  void updateSettings({ selectedStampId: isPinned ? undefined : stop.stampId });
                }
              }}
            >
              <Text style={[styles.stampPillText, { color: stop.unlocked ? (isPinned ? '#B93A32' : colors.text) : colors.textLight }]}>
                {stop.unlocked ? '🏮' : '🔒'} {isZh ? stop.stampTextZh : stop.stampTextEn} ({stop.distanceKm}km)
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </Card>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: embedded ? vs(10) : Math.max(insets.top + vs(8), vs(16)) },
        ]}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>{copy.title}</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {isZh
              ? '把清净的地点，变成每天可回看的修行足迹。'
              : isEs
                ? 'Convierte cada lugar sagrado en una huella tranquila de tu práctica.'
                : 'Turn sacred visits into a calm practice record.'}
          </Text>
        </View>

        {renderPilgrimageCard()}
        {renderFilters()}
        {renderMap()}
        {renderSelectedSite()}

        <View style={styles.listHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {filteredSites.length} {isZh ? '处地点' : isEs ? 'lugares' : 'sites'}
          </Text>
          <Text style={[styles.sectionHint, { color: colors.textSecondary }]}>
            {isZh ? '点选后可查看详情' : isEs ? 'Toca para ver detalles' : 'Tap for details'}
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
              <Text style={[styles.detailTitle, { color: colors.text }]}>
                {selectedSite ? getSiteDisplayName(selectedSite) : ''}
              </Text>
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
  zoomControlBar: {
    position: 'absolute',
    right: rs(10),
    top: vs(10),
    flexDirection: 'row',
    alignItems: 'center',
    height: rs(32),
    borderRadius: rs(16),
    borderWidth: 1,
    paddingHorizontal: rs(4),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  zoomStepButton: {
    width: rs(26),
    height: rs(28),
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomStepText: {
    fontSize: fs(15),
    fontWeight: '800',
    lineHeight: fs(17),
  },
  zoomResetButton: {
    minWidth: rs(40),
    height: rs(28),
    paddingHorizontal: rs(4),
    alignItems: 'center',
    justifyContent: 'center',
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
  pilgrimageCard: {
    gap: vs(10),
  },
  pilgrimageTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: rs(8),
  },
  pilgrimageTrack: {
    height: vs(7),
    borderRadius: rs(999),
    overflow: 'hidden',
  },
  pilgrimageFill: {
    height: '100%',
    borderRadius: rs(999),
  },
  pilgrimageGoalText: {
    fontSize: fs(12),
    lineHeight: fs(17),
  },
  stampPill: {
    borderWidth: 1,
    borderRadius: rs(12),
    paddingHorizontal: rs(10),
    paddingVertical: vs(6),
  },
  stampPillText: {
    fontSize: fs(11),
    fontWeight: '700',
  },
  closeText: {
    fontSize: fs(26),
    lineHeight: fs(28),
  },
});
