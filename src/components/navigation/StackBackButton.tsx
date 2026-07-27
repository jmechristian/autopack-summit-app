import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable } from 'react-native';
import { autopackColors } from '../../theme';

type StackBackButtonProps = {
  fallbackHref?: string;
};

function normalizeParam(value?: string | string[]) {
  if (Array.isArray(value)) return (value[0] || '').trim();
  return (value || '').trim();
}

export function StackBackButton({ fallbackHref = '/(main)/agenda' }: StackBackButtonProps) {
  const params = useLocalSearchParams<{ returnTo?: string | string[] }>();
  const returnTo = normalizeParam(params.returnTo);

  return (
    <Pressable
      onPress={() => {
        if (router.canGoBack()) {
          router.back();
          return;
        }
        router.replace((returnTo || fallbackHref) as never);
      }}
      hitSlop={10}
      style={{ marginLeft: 4, padding: 4 }}
    >
      <Ionicons name='chevron-back' size={24} color={autopackColors.apBlue} />
    </Pressable>
  );
}
