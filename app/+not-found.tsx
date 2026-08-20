import { Link, Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { autopackColors } from '../src/theme';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Not found', headerShown: false }} />
      <View style={styles.wrap}>
        <Text style={styles.title}>Page not found</Text>
        <Text style={styles.body}>That link doesn’t exist in the app.</Text>
        <Link href='/login' style={styles.link}>
          Go to login
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: autopackColors.apNavy,
    marginBottom: 8,
  },
  body: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  link: {
    fontSize: 16,
    fontWeight: '600',
    color: autopackColors.apBlue,
  },
});
