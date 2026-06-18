/**
 * Detects iOS/iPadOS devices, including iPadOS 13+ in desktop mode.
 * iPadOS 13+ reports navigator.platform as 'MacIntel' but has maxTouchPoints > 1.
 */
export function detectIos(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  if (/iPhone|iPod/.test(ua)) return true;
  if (/iPad/.test(ua)) return true;
  if (
    /Macintosh/.test(ua) &&
    typeof navigator.maxTouchPoints === 'number' &&
    navigator.maxTouchPoints > 1
  ) return true;
  return false;
}
