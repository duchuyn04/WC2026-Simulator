/** Khớp breakpoint Tailwind `sm` */
export const MOBILE_BREAKPOINT = 640;

/** Không thu nhỏ bracket dưới mức này trên mobile — đủ đọc, kéo để xem tiếp */
export const MOBILE_MIN_EFFECTIVE_SCALE = 0.58;

export const MOBILE_MAX_ZOOM = 4;
export const DESKTOP_MAX_ZOOM = 2.5;
export const MOBILE_DEFAULT_ZOOM = 1.3;

export function getDisplayFitScale(fitScale: number, isMobile: boolean): number {
  if (!isMobile || fitScale <= 0) return fitScale;
  return Math.max(fitScale, MOBILE_MIN_EFFECTIVE_SCALE);
}

export function getMaxZoom(isMobile: boolean): number {
  return isMobile ? MOBILE_MAX_ZOOM : DESKTOP_MAX_ZOOM;
}

export function clampBracketZoom(zoom: number, isMobile: boolean): number {
  return Math.min(getMaxZoom(isMobile), Math.max(1, zoom));
}

/** Đảm bảo tỉ lệ hiển thị đủ lớn khi mở knockout trên mobile */
export function ensureMobileReadableZoom(
  userZoom: number,
  fitScale: number,
  isMobile: boolean
): number {
  if (!isMobile || fitScale <= 0) return userZoom;

  const displayFit = getDisplayFitScale(fitScale, true);
  const effective = displayFit * userZoom;
  if (effective >= MOBILE_MIN_EFFECTIVE_SCALE) return userZoom;

  return clampBracketZoom(MOBILE_MIN_EFFECTIVE_SCALE / displayFit, true);
}

export function resolveInitialBracketZoom(
  savedZoom: number,
  fitScale: number,
  isMobile: boolean
): number {
  let zoom = ensureMobileReadableZoom(savedZoom, fitScale, isMobile);
  if (
    isMobile &&
    savedZoom === 1 &&
    zoom === ensureMobileReadableZoom(1, fitScale, true)
  ) {
    zoom = clampBracketZoom(MOBILE_DEFAULT_ZOOM, true);
  }
  return zoom;
}