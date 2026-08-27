import { Ionicons } from '@expo/vector-icons';
import { Linking, Pressable, StyleSheet } from 'react-native';

export function normalizeLinkedInUrl(value?: string | null): string | null {
  const raw = String(value || '').trim();
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) return raw;
  if (/^(www\.)?linkedin\.com/i.test(raw)) return `https://${raw}`;
  if (raw.startsWith('/')) return `https://www.linkedin.com${raw}`;
  return `https://www.linkedin.com/in/${raw.replace(/^in\//i, '')}`;
}

export function LinkedInNameButton({
  url,
  size = 20,
}: {
  url?: string | null;
  size?: number;
}) {
  const href = normalizeLinkedInUrl(url);
  if (!href) return null;

  return (
    <Pressable
      onPress={() => {
        void Linking.openURL(href);
      }}
      hitSlop={8}
      accessibilityRole="link"
      accessibilityLabel="Open LinkedIn profile"
      style={styles.btn}
    >
      <Ionicons name="logo-linkedin" size={size} color="#0A66C2" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    paddingHorizontal: 2,
    paddingVertical: 2,
  },
});
