// app/_layout.tsx
import { ThemeProvider } from '@rneui/themed';
import { Slot } from 'expo-router';
import { theme } from '../src/theme';

export default function RootLayout() {
  return (
    <ThemeProvider theme={theme}>
      <Slot />
    </ThemeProvider>
  );
}
