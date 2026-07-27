import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { autopackColors } from '../../../src/theme';

function normalizeParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) return (value[0] || '').trim();
  return (value || '').trim();
}

export default function AgendaPresentation() {
  const params = useLocalSearchParams<{ url?: string; title?: string }>();
  const [webError, setWebError] = useState<string | null>(null);

  const url = useMemo(() => {
    const raw = normalizeParam(params.url);
    if (!raw) return '';
    return /^https?:\/\//i.test(raw) ? raw : '';
  }, [params.url]);

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
      {!!webError ? (
        <View style={styles.center}>
          <Text style={styles.errorTitle}>Unable to load presentation</Text>
          <Text style={styles.errorBody}>{webError}</Text>
        </View>
      ) : (
        <WebView
          source={{ uri: url }}
          style={styles.webview}
          startInLoadingState
          renderLoading={() => (
            <View style={styles.loaderWrap}>
              <ActivityIndicator size='large' color={autopackColors.apBlue} />
            </View>
          )}
          onError={(event) => {
            setWebError(event.nativeEvent.description || 'Please try again later.');
          }}
          setSupportMultipleWindows={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  webview: { flex: 1 },
  loaderWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  errorTitle: { fontSize: 18, fontWeight: '700', color: '#111827', textAlign: 'center' },
  errorBody: { marginTop: 8, fontSize: 14, color: '#6B7280', textAlign: 'center' },
});

