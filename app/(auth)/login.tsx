import { Button, Input } from '@rneui/themed';
import { router } from 'expo-router';
import { Text, View } from 'react-native';

export default function Login() {
  return (
    <View
      style={{
        flex: 1,
        padding: 24,
        justifyContent: 'center',
      }}
    >
      <Text style={{ fontSize: 26, fontWeight: '700', marginBottom: 20 }}>
        Log In
      </Text>

      <Input placeholder='Email' autoCapitalize='none' />
      <Input placeholder='Password' secureTextEntry />

      <Button
        title='Continue to Summit'
        onPress={() => router.replace('/(main)/hub')}
        containerStyle={{ marginTop: 16 }}
      />

      {/* Later we'll swap the onPress for real Amplify signIn */}
    </View>
  );
}
