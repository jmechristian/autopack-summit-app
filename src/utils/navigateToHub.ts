import { router } from 'expo-router';
import { InteractionManager, Keyboard } from 'react-native';

/** Replace to Hub after the keyboard and current interactions settle. */
export function navigateToHub() {
  Keyboard.dismiss();
  InteractionManager.runAfterInteractions(() => {
    router.replace('/(main)/hub');
  });
}
