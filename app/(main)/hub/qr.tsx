import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';
import { useCurrentUserRegistrant } from '../../../src/hooks/useApsStore';
import { ui } from '../../../src/ui/tokens';

export default function MyQrCodeScreen() {
  const registrant = useCurrentUserRegistrant();
  const qrCodeUrl = registrant?.qrCode || null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Your QR Code</Text>
      {qrCodeUrl ? (
        <Image source={{ uri: qrCodeUrl }} style={styles.qrImage} contentFit="contain" />
      ) : (
        <Text style={styles.muted}>QR code not available yet.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: ui.space.lg, backgroundColor: ui.colors.bg },
  title: { fontSize: 18, fontWeight: '700', color: ui.colors.text, marginBottom: ui.space.md },
  muted: { color: ui.colors.muted },
  qrImage: { width: 240, height: 240, alignSelf: 'center' },
});
