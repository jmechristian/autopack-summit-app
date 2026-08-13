import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { autopackColors } from '../theme';
import { platformUnavailableMessage } from '../utils/platform';

type Props = {
  title?: string;
  feature?: string;
  /** Where Back should go; defaults to Hub. */
  backHref?: string;
};

/**
 * Shared empty state for camera / scan flows that are not supported on web.
 */
export function WebFeatureUnavailable({
  title = 'Unavailable on desktop',
  feature = 'This feature',
  backHref = '/(main)/hub',
}: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>
        <Ionicons name='desktop-outline' size={36} color={autopackColors.apBlue} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{platformUnavailableMessage(feature)}</Text>
      <Pressable
        style={styles.btn}
        onPress={() => router.replace(backHref as any)}
        accessibilityRole='button'
        accessibilityLabel='Go back'
      >
        <Text style={styles.btnText}>Back to Hub</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    gap: 12,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    color: '#6b7280',
    textAlign: 'center',
    maxWidth: 360,
  },
  btn: {
    marginTop: 12,
    backgroundColor: autopackColors.apBlue,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 999,
  },
  btnText: { color: '#fff', fontWeight: '700' },
});
