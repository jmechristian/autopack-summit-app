import { Avatar, Button } from '@rneui/themed';
import { Text, View } from 'react-native';

export default function Profile() {
  return (
    <View style={{ flex: 1, padding: 16, alignItems: 'center' }}>
      <Avatar
        rounded
        size='large'
        title='JC'
        containerStyle={{ backgroundColor: '#0873B8', marginBottom: 16 }}
      />
      <Text style={{ fontSize: 20, fontWeight: '700', marginBottom: 4 }}>
        Jamie Christian
      </Text>
      <Text style={{ color: '#666', marginBottom: 20 }}>
        jamie@packagingschool.com
      </Text>

      <Button title='Log Out (dummy)' onPress={() => {}} />
    </View>
  );
}
