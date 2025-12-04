import { router } from 'expo-router';
import { Text, TouchableOpacity, View } from 'react-native';

const MOCK_AGENDA = [
  { id: '1', title: 'Opening Keynote' },
  { id: '2', title: 'Packaging Tech Panel' },
];

export default function AgendaList() {
  return (
    <View style={{ flex: 1, padding: 16 }}>
      {MOCK_AGENDA.map((item) => (
        <TouchableOpacity
          key={item.id}
          onPress={() =>
            router.push({
              pathname: '/(main)/agenda/[id]',
              params: { id: item.id },
            })
          }
          style={{ paddingVertical: 12 }}
        >
          <Text style={{ fontSize: 18 }}>{item.title}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}
