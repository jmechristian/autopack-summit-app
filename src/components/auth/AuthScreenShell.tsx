import React from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AUTH_FORM_MAX_WIDTH } from '../../utils/layout';
import { isWeb } from '../../utils/platform';

type AuthScreenShellProps = {
  children: React.ReactNode;
};

export function AuthScreenShell({ children }: AuthScreenShellProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.root}>
      <Image
        source={require('../../../assets/images/mobile-bg.png')}
        style={[styles.bgImage, isWeb ? ({ objectFit: 'cover' } as object) : null]}
        resizeMode='cover'
      />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingTop: insets.top + 28,
              paddingBottom: insets.bottom + 120,
            },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps='always'
          keyboardDismissMode='on-drag'
        >
          <View style={styles.frame}>{children}</View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

type AuthBrandLockupProps = {
  title?: string;
  subtitle?: string;
};

export function AuthBrandLockup({ title, subtitle }: AuthBrandLockupProps) {
  return (
    <View style={styles.lockup}>
      <Image
        source={require('../../../assets/images/icon.png')}
        style={styles.logo}
        accessibilityLabel='Automotive Packaging Summit'
      />
      <Text style={styles.brand}>Automotive Packaging Summit</Text>
      {title ? <Text style={styles.title}>{title}</Text> : null}
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    width: '100%',
    backgroundColor: '#005892',
    ...(isWeb
      ? {
          height: '100%',
          minHeight: '100vh' as unknown as number,
          overflow: 'hidden' as const,
        }
      : null),
  },
  bgImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  frame: {
    width: '100%',
    maxWidth: AUTH_FORM_MAX_WIDTH,
  },
  lockup: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logo: {
    width: 88,
    height: 88,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.35)',
  },
  brand: {
    marginTop: 16,
    color: 'rgba(255, 255, 255, 0.82)',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  title: {
    marginTop: 10,
    fontSize: 28,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.4,
    textTransform: 'uppercase',
    textAlign: 'center',
    lineHeight: 34,
  },
  subtitle: {
    marginTop: 12,
    color: '#ffffff',
    fontSize: 30,
    fontWeight: '700',
    lineHeight: 38,
    textAlign: 'center',
  },
});
