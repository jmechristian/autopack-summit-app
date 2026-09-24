import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Linking, Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { HUB_MODULE_CARD_MIN_HEIGHT } from '../hub/hubModuleCard';
import { getCertificateOfCompletion } from '../../services/certificateOfCompletion';
import { autopackColors } from '../../theme';

const LOCKED_COPY =
  'Attendees who meet the participation requirements receive a 2026 Certificate of Attendance for professional development, reimbursement, or continuing education.';
const OPEN_COPY =
  'Attendees who meet the participation requirements receive a 2026 Certificate of Attendance for professional development, reimbursement, or continuing education.';

export function CertificateOfCompletionCallout({ style }: { style?: StyleProp<ViewStyle> }) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState('');

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void (async () => {
        try {
          const gate = await getCertificateOfCompletion();
          if (cancelled) return;
          setOpen(gate.open);
          setUrl(gate.url);
        } catch {
          if (!cancelled) {
            setOpen(false);
            setUrl('');
          }
        }
      })();
      return () => {
        cancelled = true;
      };
    }, []),
  );

  const onPress = () => {
    if (!open) {
      Alert.alert('Not open yet', 'The certificate is not open yet.');
      return;
    }
    const destination = url.trim();
    if (!/^https?:\/\//i.test(destination)) {
      Alert.alert('Link not ready', 'An admin still needs to add the certificate page.');
      return;
    }
    void Linking.openURL(destination);
  };

  return (
    <Pressable
      style={[styles.card, style]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={
        open ? 'Open the Certificate of Completion' : 'Certificate of Completion, not open yet'
      }
    >
      <View style={styles.headerRow}>
        <View style={styles.iconWrap}>
          <Ionicons
            name={open ? 'school-outline' : 'lock-closed'}
            size={20}
            color={autopackColors.apYellow}
          />
        </View>
        <View style={styles.titleWrap}>
          <Text style={styles.eyebrow}>Automotive Packaging Summit</Text>
          <Text style={styles.title}>Certificate of Completion</Text>
        </View>
        <Ionicons name={open ? 'open-outline' : 'chevron-forward'} size={22} color="#fff" />
      </View>
      <Text style={styles.subtitle}>{open ? OPEN_COPY : LOCKED_COPY}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    backgroundColor: '#44556B',
    minHeight: HUB_MODULE_CARD_MIN_HEIGHT,
    paddingHorizontal: 16,
    paddingVertical: 18,
    gap: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleWrap: { flex: 1 },
  eyebrow: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '900',
    marginTop: 2,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.88)',
    fontWeight: '600',
    lineHeight: 20,
  },
});
