export const APP_VERSION = '1.3.0';
export const APP_VERSION_CODE = 5;
export const MIN_SUPPORTED_APK_VERSION = '1.3.0';
export const APK_DOWNLOAD_URL = '/downloads/ojt-sys.apk';
export const LANDING_PAGE_APK_SECTION = '/#android-download';
export const APK_UPDATE_STORAGE_KEY = 'ojt_apk_update_v1_3_0_dismissed';

/**
 * Compare two semver strings like "1.2.0" and "1.3.0"
 * Returns:
 *   negative if v1 < v2
 *   zero if v1 === v2
 *   positive if v1 > v2
 */
export function compareSemver(v1: string, v2: string): number {
  const clean = (v: string) =>
    (v || '0')
      .replace(/^v/, '')
      .split('.')
      .map((n) => parseInt(n, 10) || 0);

  const [maj1 = 0, min1 = 0, pat1 = 0] = clean(v1);
  const [maj2 = 0, min2 = 0, pat2 = 0] = clean(v2);

  if (maj1 !== maj2) return maj1 - maj2;
  if (min1 !== min2) return min1 - min2;
  return pat1 - pat2;
}
