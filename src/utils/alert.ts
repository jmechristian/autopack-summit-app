import { Alert, Platform } from 'react-native';

/** Native `Alert.alert` is a no-op on web (no buttons, no dialog). */

export function showAlert(title: string, message?: string) {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.alert(message ? `${title}\n\n${message}` : title);
    return;
  }
  Alert.alert(title, message);
}

export function confirmAction(params: {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
  onConfirm: () => void | Promise<void>;
}) {
  const {
    title,
    message,
    confirmText = 'Continue',
    cancelText = 'Cancel',
    destructive,
    onConfirm,
  } = params;

  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    if (window.confirm(message ? `${title}\n\n${message}` : title)) {
      void onConfirm();
    }
    return;
  }

  Alert.alert(title, message, [
    { text: cancelText, style: 'cancel' },
    {
      text: confirmText,
      style: destructive ? 'destructive' : 'default',
      onPress: () => {
        void onConfirm();
      },
    },
  ]);
}
