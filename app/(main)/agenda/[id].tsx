import { useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';

export default function AgendaDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 22, fontWeight: '700' }}>Agenda Item {id}</Text>
      <Text style={{ marginTop: 8 }}>
        Later we’ll load real data for this session.
      </Text>
    </View>
  );
}
