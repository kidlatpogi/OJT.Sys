export interface ChangelogItem {
  id: string;
  title: string;
  badge: string;
  iconName:
    | 'Smartphone'
    | 'RefreshCw'
    | 'CloudLightning'
    | 'SlidersHorizontal'
    | 'Clock'
    | 'Layers'
    | 'ShieldCheck'
    | 'Download';
  description: string;
}

export const WHATS_NEW_STORAGE_KEY = 'ojt_whats_new_v1_5_0_dismissed';

export const CHANGELOG_ITEMS: ChangelogItem[] = [
  {
    id: 'railway-navigation',
    title: 'Desktop Side Railway Navigation',
    badge: 'Navigation',
    iconName: 'Layers',
    description:
      'Seamlessly switch between top navigation bar and a fixed left-side vertical railway from Profile Preferences, featuring integrated internship switching and dedicated sign out.',
  },
  {
    id: 'mobile-scrolling',
    title: 'Full-Height Mobile Scrolling Fix',
    badge: 'UI/UX',
    iconName: 'Smartphone',
    description:
      'Ample bottom clearance across all 6 dashboard tabs (Clock, Calendar, Logs, Reports, Checklist, Profile) ensures fixed bottom navigation never cuts off action buttons like "Save Today\'s Log" and Profile settings.',
  },
  {
    id: 'clock-calendar-sync',
    title: 'Real-Time Clock-to-Calendar Task Sync',
    badge: 'Sync',
    iconName: 'RefreshCw',
    description:
      'Checked tasks under "What did you work on?" immediately reflect in today\'s Day Activity Inspector on the Calendar in real time while actively clocked in before completing your shift.',
  },
  {
    id: 'offline-attendance',
    title: 'Offline Attendance & Cloud Auto-Sync',
    badge: 'Offline',
    iconName: 'CloudLightning',
    description:
      'Shift Preferences toggle in Trainee Profile enables zero-lag local punch storage with an active visual badge and automatic background cloud sync when connectivity returns.',
  },
  {
    id: 'collapsible-logs',
    title: 'Collapsible Mobile Logs Search & Sort',
    badge: 'Logs',
    iconName: 'SlidersHorizontal',
    description:
      'Mobile-optimized attendance logs toolbar featuring inline search, collapsible filter drawers for status and date range, and fast ascending/descending date sorting.',
  },
  {
    id: 'matte-buttons',
    title: 'Matte Time-In & Time-Out Buttons',
    badge: 'Design',
    iconName: 'Clock',
    description:
      'Redesigned primary punch clock buttons with sleek, distraction-free matte styling, removing heavy glowing box-shadows for a cleaner and battery-friendly interface.',
  },
  {
    id: 'standalone-cards',
    title: 'Dedicated Checklist & Shift Report Cards',
    badge: 'Layout',
    iconName: 'Layers',
    description:
      'Separated punch clock into two dedicated standalone cards: "Daily Task Checklist" (What did you work on?) and "Shift Accomplishments & Reports" (Notes, Summary & Photos).',
  },
  {
    id: 'supabase-recovery',
    title: 'Supabase 401 Recovery & Local Fallback',
    badge: 'Auth',
    iconName: 'ShieldCheck',
    description:
      'Proactive session validation, automatic token refresh, and durable local storage fallback protect your calendar entries and punch logs against auth timeouts.',
  },
  {
    id: 'apk-update-detection',
    title: 'Outdated APK Auto-Detection & Update Prompt',
    badge: 'Mobile APK',
    iconName: 'Download',
    description:
      'Automatic version comparison for Android Capacitor APK users alerts trainees when a newer release is available and redirects to download the latest APK from the landing page.',
  },
];
