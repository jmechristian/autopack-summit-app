import { ThemeProvider } from '@rneui/themed';
import { useFonts } from 'expo-font';
import { Slot } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-get-random-values'; // must be first
import { configureAmplify } from '../src/amplifyConfig';
import { theme } from '../src/theme';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

configureAmplify();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    'Oswald-Regular': require('../assets/fonts/Oswald-Regular.ttf'),
    'Oswald-Bold': require('../assets/fonts/Oswald-Bold.ttf'),
    'Oswald-Light': require('../assets/fonts/Oswald-Light.ttf'),
    'Oswald-Medium': require('../assets/fonts/Oswald-Medium.ttf'),
    'Oswald-SemiBold': require('../assets/fonts/Oswald-SemiBold.ttf'),
  });

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync();
    }
  }, [loaded, error]);

  if (!loaded && !error) {
    return null;
  }

  return (
    <ThemeProvider theme={theme}>
      <Slot />
    </ThemeProvider>
  );
}
