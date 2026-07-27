import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { NOTIFICATION_THEMES, type NotificationKind } from './notificationThemes';
import { AppCard } from '../../ui/AppCard';
import { ui } from '../../ui/tokens';
import { formatLocalDateTime } from '../../utils/formatLocalDateTime';

export type NotificationCardProps = {
  kind: NotificationKind;
  body: string;
  subtitle?: string;
  timestamp: string;
  badgeCount?: number;
  onPress?: () => void;
};

export function NotificationCard({
  kind,
  body,
  subtitle,
  timestamp,
  badgeCount,
  onPress,
}: NotificationCardProps) {
  const theme = NOTIFICATION_THEMES[kind];
  const canOpen = !!onPress;

  return (
    <Pressable
      disabled={!canOpen}
      onPress={onPress}
      style={({ pressed }) => [pressed && canOpen && styles.cardPressed]}
    >
      <AppCard style={styles.notificationCard}>
        <View
          style={[
            styles.headerBar,
            {
              backgroundColor: theme.headerBg,
              borderBottomColor: theme.headerBorder,
            },
          ]}
        >
          <View style={styles.headerLeft}>
            <View style={[styles.iconWrap, { backgroundColor: theme.iconBg }]}>
              <Ionicons name={theme.icon} size={14} color={theme.iconColor} />
            </View>
            <Text style={[styles.headerLabel, { color: theme.iconColor }]}>{theme.label}</Text>
          </View>
          <View style={styles.headerRight}>
            {!!badgeCount && (
              <View style={[styles.badge, { backgroundColor: theme.iconColor }]}>
                <Text style={styles.badgeText}>{badgeCount}</Text>
              </View>
            )}
            {canOpen ? <Ionicons name='chevron-forward' size={16} color={theme.iconColor} /> : null}
          </View>
        </View>

        <View style={styles.content}>
          <Text style={styles.body}>{body}</Text>
          {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
          <Text style={styles.meta}>{formatLocalDateTime(timestamp)}</Text>
        </View>
      </AppCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cardPressed: { opacity: 0.92 },
  notificationCard: {
    marginBottom: ui.space.sm,
    padding: 0,
    overflow: 'hidden',
  },
  headerBar: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerLabel: {
    fontSize: 14,
    fontWeight: '800',
  },
  content: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  body: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  subtitle: {
    marginTop: 5,
    color: '#374151',
    fontSize: 13,
    lineHeight: 18,
  },
  meta: {
    marginTop: ui.space.sm,
    color: ui.colors.muted,
    fontSize: 11,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
});
