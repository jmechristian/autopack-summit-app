import { Ionicons } from '@expo/vector-icons';
import { useHeaderHeight } from '@react-navigation/elements';
import { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppScreen } from '../../../ui/AppScreen';
import { ui } from '../../../ui/tokens';

type AdminAnnouncementFormLayoutProps = {
  error?: string | null;
  onClearError?: () => void;
  children: ReactNode;
};

export function AdminAnnouncementFormLayout({
  error,
  onClearError,
  children,
}: AdminAnnouncementFormLayoutProps) {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();

  return (
    <AppScreen style={styles.screen}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={headerHeight}
      >
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingBottom: Math.max(insets.bottom, 16) + 120 },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps='handled'
          keyboardDismissMode='on-drag'
          automaticallyAdjustKeyboardInsets
        >
          {error ? (
            <View style={styles.errorBanner}>
              <Ionicons name='alert-circle' size={18} color={ui.colors.danger} />
              <Text style={styles.errorText}>{error}</Text>
              {onClearError ? (
                <Pressable
                  onPress={onClearError}
                  hitSlop={8}
                  accessibilityRole='button'
                  accessibilityLabel='Clear error'
                >
                  <Ionicons name='close' size={18} color={ui.colors.danger} />
                </Pressable>
              ) : null}
            </View>
          ) : null}
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: '#E6F1F8' },
  flex: { flex: 1 },
  content: { paddingTop: 6 },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: ui.space.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
  },
  errorText: {
    flex: 1,
    color: ui.colors.danger,
    lineHeight: 20,
    fontSize: 14,
  },
});
