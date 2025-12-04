import { ThemeProvider } from '@rneui/themed';
import { Slot } from 'expo-router';
import 'react-native-get-random-values'; // must be first
import { configureAmplify } from '../src/amplifyConfig';
import { theme } from '../src/theme';

configureAmplify();

export default function RootLayout() {
  return (
    <ThemeProvider theme={theme}>
      <Slot />
    </ThemeProvider>
  );
}
