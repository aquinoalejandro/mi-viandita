export const CONTENT_MAX_WIDTH = 760;

export const getSpacing = (width: number) => {
  if (width < 360) return 12;
  if (width >= 420) return 20;
  return 16;
};

export const getBottomBarHeight = (width: number) => {
  if (width < 360) return 64;
  return 72;
};

export const getFabBottomOffset = () => 2;

export const getMiViandaFabBottomOffset = () => 12;

export const getFontSize = (width: number, base: number) => {
  if (width < 360) return Math.max(12, base - 2);
  if (width >= 420) return base + 2;
  return base;
};

export const getLineHeight = (fontSize: number) => Math.round(fontSize * 1.35);
