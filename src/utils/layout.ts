import { useWindowDimensions } from 'react-native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';

/**
 * Width breakpoints — same idea as CSS media queries, driven by
 * useWindowDimensions() instead of the browser viewport.
 */
export const breakpoints = {
  /** ~large phone / small tablet */
  sm: 600,
  /** iPad portrait / small landscape */
  md: 900,
  /** iPad landscape / desktop */
  lg: 1200,
} as const;

/** Max width for main tab / interior content columns (desktop web). */
export const MAX_CONTENT_WIDTH = 1000;

/** Two-column Hub shell (wireframe) from tablet width up. */
export function isHubWideLayout(width: number) {
  return width >= breakpoints.sm;
}

/**
 * Comfortable horizontal padding inside a content frame.
 * Does not center the frame — use {@link contentFrameStyle} for that.
 */
export function contentInsetHorizontal(width: number, phone = 20) {
  const w = Math.min(width, MAX_CONTENT_WIDTH);
  if (w >= breakpoints.lg) return Math.max(phone, 72);
  if (w >= breakpoints.md) return Math.max(phone, 48);
  if (w >= breakpoints.sm) return Math.max(phone, 32);
  return phone;
}

/** Side margin that centers a {@link MAX_CONTENT_WIDTH} frame in the viewport. */
export function contentFrameMargin(width: number) {
  return Math.max(0, (width - MAX_CONTENT_WIDTH) / 2);
}

/**
 * Style for a centered content column (nav + pages).
 * Apply on the outer content wrapper; keep children at width 100% inside it.
 */
export function contentFrameStyle(width: number) {
  const frameWidth = Math.min(width, MAX_CONTENT_WIDTH);
  return {
    width: frameWidth,
    maxWidth: MAX_CONTENT_WIDTH,
    alignSelf: 'center' as const,
  };
}

export function useContentInset(phone = 20) {
  const { width } = useWindowDimensions();
  // Comfortable padding only — centering / max-width comes from ContentWidthShell
  // (or contentFrameStyle) so we don't double-gutter on wide screens.
  return contentInsetHorizontal(width, phone);
}

export function useContentFrame(phone = 20) {
  const { width } = useWindowDimensions();
  const frame = contentFrameStyle(width);
  const inset = contentInsetHorizontal(width, phone);
  return { width, frame, inset, frameWidth: frame.width };
}

/** Useful width for grids / cards after applying content inset. */
export function useContentWidth(phone = 20) {
  const { frameWidth, inset } = useContentFrame(phone);
  return Math.max(1, frameWidth - inset * 2);
}

/** Extra scroll padding so content clears the bottom tab bar. */
export const TAB_BAR_CONTENT_GAP = 28;

/** Fallback when custom tab bars report 0 height (common on web). */
const TAB_BAR_HEIGHT_FALLBACK = 56;

/** Bottom padding for scroll views inside the main tab navigator. */
export function useMainTabScrollPadding(extra = TAB_BAR_CONTENT_GAP) {
  const tabBarHeight = useBottomTabBarHeight();
  return Math.max(tabBarHeight, TAB_BAR_HEIGHT_FALLBACK) + extra;
}

/** Column count for Hub / Engage-style tool grids (phone / stacked layouts). */
export function toolGridColumns(width: number) {
  if (width >= breakpoints.md) return 4;
  if (width >= breakpoints.sm) return 3;
  return 2;
}

export function toolGridCellWidth(params: {
  containerWidth: number;
  columns: number;
  gap?: number;
}) {
  const gap = params.gap ?? 12;
  return (params.containerWidth - gap * (params.columns - 1)) / params.columns;
}

/** Left QR hero + right stacked content column widths. */
export function hubWideColumnWidths(params: {
  screenWidth: number;
  contentInset: number;
  gap?: number;
}) {
  const gap = params.gap ?? 16;
  const frame = Math.min(params.screenWidth, MAX_CONTENT_WIDTH);
  const inner = frame - params.contentInset * 2;
  const hero = Math.round((inner - gap) * 0.42);
  const stack = inner - gap - hero;
  return { inner, hero, stack, gap, frame };
}
