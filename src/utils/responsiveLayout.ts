export type LayoutFormFactor = 'compact' | 'duo_cover' | 'duo_unfolded' | 'tablet';

export interface ResponsiveLayoutMetrics {
  width: number;
  height: number;
  formFactor: LayoutFormFactor;
  isDuoCover: boolean;
  isDuoUnfolded: boolean;
  isFoldableExpanded: boolean;
  isDualColumn: boolean;
  isCompactHeight: boolean;
  isLandscape: boolean;
  hingeGutter: number;
  horizontalPadding: number;
  contentMaxWidth: number;
  singleColumnMaxWidth: number;
  effectiveContentWidth: number;
  columnWidth: number;
  chartWidth: number;
  verticalScale: number;
}

/**
 * Computes live responsive metrics tailored for iPhone Duo cover/unfolded displays,
 * standard iPhones, iPads, and landscape/split-view foldable postures.
 */
export function computeResponsiveLayout(width: number, height: number): ResponsiveLayoutMetrics {
  const safeWidth = Number.isFinite(width) && width > 0 ? width : 390;
  const safeHeight = Number.isFinite(height) && height > 0 ? height : 844;
  const isLandscape = safeWidth > safeHeight;

  const isDuoUnfolded = safeWidth >= 680 && isLandscape && safeHeight < 760;
  const isDuoCover = !isDuoUnfolded && safeWidth >= 430 && safeWidth < 680 && safeHeight < 760;
  const formFactor: LayoutFormFactor = isDuoUnfolded
    ? 'duo_unfolded'
    : safeWidth >= 680
    ? 'tablet'
    : isDuoCover
    ? 'duo_cover'
    : 'compact';

  const isDualColumn = safeWidth >= 680;
  const isFoldableExpanded = formFactor === 'duo_unfolded' || formFactor === 'tablet';
  const isCompactHeight = safeHeight < 720;

  const hingeGutter = formFactor === 'duo_unfolded' ? 28 : formFactor === 'tablet' ? 20 : 0;
  const horizontalPadding = isDualColumn ? 20 : isDuoCover ? 18 : 16;
  const contentMaxWidth = isDualColumn ? Math.min(safeWidth, 960) : Math.min(safeWidth, 540);
  const singleColumnMaxWidth = Math.min(safeWidth, 720);
  const effectiveContentWidth = Math.max(
    280,
    Math.min(safeWidth, contentMaxWidth) - horizontalPadding * 2
  );
  const columnWidth = isDualColumn
    ? Math.floor((effectiveContentWidth - hingeGutter) / 2)
    : effectiveContentWidth;
  const chartWidth = Math.max(
    240,
    Math.min(singleColumnMaxWidth - horizontalPadding * 2 - 32, safeWidth - 64)
  );
  const verticalScale = Number(Math.max(0.78, Math.min(safeHeight / 844, 1.12)).toFixed(3));

  return {
    width: safeWidth,
    height: safeHeight,
    formFactor,
    isDuoCover,
    isDuoUnfolded,
    isFoldableExpanded,
    isDualColumn,
    isCompactHeight,
    isLandscape,
    hingeGutter,
    horizontalPadding,
    contentMaxWidth,
    singleColumnMaxWidth,
    effectiveContentWidth,
    columnWidth,
    chartWidth,
    verticalScale,
  };
}
