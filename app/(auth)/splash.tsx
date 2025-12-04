import { Button } from '@rneui/themed';
import { router } from 'expo-router';
import { Text, View } from 'react-native';

export default function SplashScreen() {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: '#005892', // apDarkBlue
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <Text
        style={{
          fontSize: 32,
          fontWeight: '700',
          color: 'white',
          marginBottom: 24,
          textAlign: 'center',
        }}
      >
        Autopack Summit
      </Text>

      <Button
        title='Get Started'
        onPress={() => router.push('/(auth)/login')}
      />
    </View>
  );
}
