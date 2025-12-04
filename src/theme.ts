// src/theme.ts
import { createTheme } from '@rneui/themed';

export const autopackColors = {
  apYellow: '#E4A800',
  apDarkBlue: '#005892',
  apBlue: '#0873B8',
  apRed: '#E43A00',
};

export const theme = createTheme({
  lightColors: {
    primary: autopackColors.apBlue,
    secondary: autopackColors.apYellow,
    background: '#FFFFFF',
    black: '#111111',
    grey0: '#F5F5F5',
    error: autopackColors.apRed,
  },
  mode: 'light',
  components: {
    Button: {
      radius: 999,
      buttonStyle: {
        paddingVertical: 12,
        paddingHorizontal: 18,
      },
    },
  },
});
