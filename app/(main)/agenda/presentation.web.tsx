import { useLocalSearchParams } from 'expo-router';
import { createElement, useMemo } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { parseVideoEmbed, videoEmbedSrc } from '../../../src/utils/videoEmbed';

function normalizeParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) return (value[0] || '').trim();
  return (value || '').trim();
}

function webOrigin() {
  return typeof window !== 'undefined' ? window.location.origin : undefined;
}

function webEmbedUrl(raw: string) {
  const video = parseVideoEmbed(raw);
  if (video) return videoEmbedSrc(video.embedUrl, webOrigin());

  try {
    const url = new URL(raw);
    const host = url.hostname.replace(/^www\./i, '').toLowerCase();

    if (host === 'docs.google.com') {
      const slideId = url.pathname.match(/\/presentation\/d\/([^/]+)/)?.[1];
      if (slideId && !url.pathname.includes('/embed')) {
        return `https://docs.google.com/presentation/d/${slideId}/embed?start=false&loop=false&delayms=3000`;
      }
    }

    if (host === 'drive.google.com') {
      const fileId = url.pathname.match(/\/file\/d\/([^/]+)/)?.[1] || url.searchParams.get('id');
      if (fileId) return `https://drive.google.com/file/d/${fileId}/preview`;
    }
  } catch {
    return raw;
  }

  return raw;
}

/** Web fallback — react-native-webview has no web implementation. */
export default function AgendaPresentationWeb() {
  const params = useLocalSearchParams<{ url?: string; title?: string }>();
  const title = normalizeParam(params.title) || 'Presentation';
  const url = useMemo(() => {
    const raw = normalizeParam(params.url);
    if (!raw) return '';
    return /^https?:\/\//i.test(raw) ? raw : '';
  }, [params.url]);
  const embedSrc = useMemo(() => (url ? webEmbedUrl(url) : ''), [url]);

  if (!url) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorTitle}>Presentation unavailable</Text>
        <Text style={styles.errorBody}>This session does not have a valid presentation URL.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.player}>
        {createElement('iframe', {
          src: embedSrc,
          title,
          allow:
            'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen',
          allowFullScreen: true,
          referrerPolicy: 'strict-origin-when-cross-origin',
          style: {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100%',
            height: '100%',
            border: 0,
          },
        })}
      </View>
      <Pressable style={styles.openRow} onPress={() => void Linking.openURL(url)}>
        <Text style={styles.openText}>Open in new tab</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  player: { flex: 1, position: 'relative', backgroundColor: '#F3F4F6' },
  openRow: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E7EB',
  },
  openText: { color: '#2563EB', fontWeight: '700' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  errorTitle: { fontSize: 18, fontWeight: '700', color: '#111827', textAlign: 'center' },
  errorBody: { marginTop: 8, fontSize: 14, color: '#6B7280', textAlign: 'center' },
});
