import { Ionicons } from '@expo/vector-icons';

export type NotificationKind = 'contact-request' | 'announcement' | 'message';

export type NotificationTheme = {
  headerBg: string;
  headerBorder: string;
  iconBg: string;
  iconColor: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
};

export const NOTIFICATION_THEMES: Record<NotificationKind, NotificationTheme> = {
  'contact-request': {
    headerBg: '#ede9fe',
    headerBorder: '#c4b5fd',
    iconBg: '#ddd6fe',
    iconColor: '#6d28d9',
    icon: 'person-add-outline',
    label: 'Contact Request',
  },
  announcement: {
    headerBg: '#ffedd5',
    headerBorder: '#fdba74',
    iconBg: '#fed7aa',
    iconColor: '#c2410c',
    icon: 'megaphone-outline',
    label: 'Announcement',
  },
  message: {
    headerBg: '#eff6ff',
    headerBorder: '#bfdbfe',
    iconBg: '#dbeafe',
    iconColor: '#1d4ed8',
    icon: 'chatbubbles-outline',
    label: 'Messages',
  },
};
