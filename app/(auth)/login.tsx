// app/(auth)/login.tsx
import { Ionicons } from '@expo/vector-icons';
import {
  signOut as amplifySignOut,
  getCurrentUser,
  signIn,
} from 'aws-amplify/auth';

import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { FadeInDown } from 'react-native-reanimated';
import {
  AuthBrandLockup,
  AuthScreenShell,
} from '../../src/components/auth/AuthScreenShell';
import { SafeEnteringView } from '../../src/components/SafeEnteringView';
import { autopackColors } from '../../src/theme';

export default function LoginScreen() {
  const emailInputRef = React.useRef<TextInput>(null);
  const passwordInputRef = React.useRef<TextInput>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setLocalError('');
  }, []);

  // Session restore (esp. web entry Redirect → /login).
  useEffect(() => {
    let mounted = true;
    getCurrentUser()
      .then(() => {
        if (mounted) router.replace('/(main)/hub');
      })
      .catch(() => {
        // Stay on login
      });
    return () => {
      mounted = false;
    };
  }, []);

  const handleLogin = async () => {
    setLocalError('');

    if (!email || !password) {
      setLocalError('Please enter both email and password.');
      return;
    }

    // Clear any existing session to avoid "user already signed in" errors
    try {
      await getCurrentUser();
      await amplifySignOut();
      console.log('Existing session detected and signed out before login');
    } catch {
      // no existing session, ignore
    }

    try {
      setIsLoading(true);

      let result;
      let attemptedRetry = false;
      let attemptedPasswordAuthFallback = false;

      const attemptSignInDefault = async () =>
        signIn({
          username: email,
          password,
        });

      const attemptSignInUserPasswordAuth = async () =>
        signIn({
          username: email,
          password,
          // JS-only fallback (Expo Go / missing native SRP module) — requires Cognito app client support.
          options: { authFlowType: 'USER_PASSWORD_AUTH' } as any,
        });

      try {
        // Prefer default (SRP) — works in properly built native apps.
        result = await attemptSignInDefault();
      } catch (firstErr: any) {
        const combined =
          `${firstErr?.name || ''} ${firstErr?.message || ''} ${firstErr?.underlyingError?.message || ''}`.toLowerCase();

        // If SRP fails due to missing native module (common when running in Expo Go),
        // retry with USER_PASSWORD_AUTH if enabled on the Cognito app client.
        if (
          combined.includes('@aws-amplify/react-native') ||
          combined.includes("doesn't seem to be linked") ||
          combined.includes('computemodpow') ||
          combined.includes('native module')
        ) {
          attemptedPasswordAuthFallback = true;
          result = await attemptSignInUserPasswordAuth();
        } else {
          throw firstErr;
        }

        // If already signed in, sign out then retry once
        if (
          firstErr?.name === 'UserAlreadySignedInException' ||
          firstErr?.name === 'UserAlreadyAuthenticatedException'
        ) {
          console.warn('User already signed in, signing out and retrying...');
          await amplifySignOut();
          attemptedRetry = true;
          // Retry using the same flow we used most recently.
          result = attemptedPasswordAuthFallback
            ? await attemptSignInUserPasswordAuth()
            : await attemptSignInDefault();
        } else {
          // (If we got here, we already handled/rewrapped above.)
        }
      }

      console.log('signIn result:', JSON.stringify(result, null, 2));

      if (result.isSignedIn) {
        // Normal login success
        setIsLoading(false);
        router.replace('/(main)/hub');
        return;
      }

      const step = result.nextStep?.signInStep;
      console.log('nextStep.signInStep:', step);

      // Temp password / must change password
      if (step === 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED') {
        setIsLoading(false);
        router.push({
          pathname: '/(auth)/change-password',
          params: { username: email },
        });
        return;
      }

      setIsLoading(false);
      setLocalError(
        'Additional sign-in steps are required. Please contact support.'
      );
    } catch (err: any) {
      // Comprehensive error logging for debugging
      console.error('=== Sign in error details ===');
      console.error('Error object:', err);
      console.error('Error name:', err?.name);
      console.error('Error message:', err?.message);
      console.error('Error cause:', err?.cause);
      console.error('Error underlyingError:', err?.underlyingError);
      console.error('Error recoverySuggestion:', err?.recoverySuggestion);

      // Safely extract and log error details
      const errorDetails: Record<string, any> = {};
      try {
        if (err) {
          // Get all enumerable properties
          for (const key in err) {
            try {
              const value = err[key];
              // Only include serializable values
              if (
                typeof value === 'string' ||
                typeof value === 'number' ||
                typeof value === 'boolean' ||
                value === null
              ) {
                errorDetails[key] = value;
              } else if (typeof value === 'object') {
                errorDetails[key] = '[Object]';
              } else {
                errorDetails[key] = String(value);
              }
            } catch {
              errorDetails[key] = '[Unable to access]';
            }
          }

          // Get own property names
          try {
            const ownProps = Object.getOwnPropertyNames(err);
            errorDetails._ownPropertyNames = ownProps;
            ownProps.forEach((prop) => {
              if (!(prop in errorDetails)) {
                try {
                  const value = (err as any)[prop];
                  if (
                    typeof value === 'string' ||
                    typeof value === 'number' ||
                    typeof value === 'boolean' ||
                    value === null
                  ) {
                    errorDetails[`_${prop}`] = value;
                  }
                } catch {
                  // Skip
                }
              }
            });
          } catch {
            // Skip
          }

          // Try toString
          try {
            errorDetails._toString = String(err);
          } catch {
            errorDetails._toString = '[Unable to stringify]';
          }
        }
      } catch (extractErr) {
        errorDetails._extractionError = String(extractErr);
      }

      try {
        console.error('Error details:', JSON.stringify(errorDetails, null, 2));
      } catch (stringifyErr) {
        // If logging fails, don't crash the login flow.
      }

      // Try to extract a user-friendly error message
      let errorMessage = 'Failed to sign in. Please check your credentials.';

      if (err?.name) {
        switch (err.name) {
          case 'NotAuthorizedException':
            errorMessage = 'Incorrect email or password. Please try again.';
            break;
          case 'UserNotConfirmedException':
            errorMessage =
              'Your account has not been confirmed. Please check your email.';
            break;
          case 'UserNotFoundException':
            errorMessage =
              'No account found with this email address. This is an invite-only app. Please contact your administrator.';
            break;
          case 'TooManyRequestsException':
            errorMessage = 'Too many sign-in attempts. Please try again later.';
            break;
          case 'NetworkError':
            errorMessage =
              'Network error. Please check your connection and try again.';
            break;
          default:
            errorMessage = err?.message || err?.name || errorMessage;
        }
      } else if (err?.message) {
        errorMessage = err.message;
      } else {
        // Fallback: try to get string representation
        try {
          const errStr = String(err);
          if (errStr && errStr !== '[object Object]' && errStr !== 'Error') {
            errorMessage = errStr;
          }
        } catch {
          // Keep default message
        }
      }

      setIsLoading(false);
      setLocalError(errorMessage);
    }
  };

  const handleForgotPassword = () => {
    router.push({
      pathname: '/(auth)/forgot-password',
      params: email.trim() ? { email: email.trim() } : undefined,
    });
  };

  return (
    <AuthScreenShell>
      <LoginFields
        email={email}
        password={password}
        localError={localError}
        showPassword={showPassword}
        isLoading={isLoading}
        emailInputRef={emailInputRef}
        passwordInputRef={passwordInputRef}
        setEmail={setEmail}
        setPassword={setPassword}
        setShowPassword={setShowPassword}
        onLogin={handleLogin}
        onForgotPassword={handleForgotPassword}
      />
    </AuthScreenShell>
  );
}

type LoginFieldsProps = {
  email: string;
  password: string;
  localError: string;
  showPassword: boolean;
  isLoading: boolean;
  emailInputRef: React.RefObject<TextInput | null>;
  passwordInputRef: React.RefObject<TextInput | null>;
  setEmail: (v: string) => void;
  setPassword: (v: string) => void;
  setShowPassword: (v: boolean) => void;
  onLogin: () => void;
  onForgotPassword: () => void;
};

function LoginFields({
  email,
  password,
  localError,
  showPassword,
  isLoading,
  emailInputRef,
  passwordInputRef,
  setEmail,
  setPassword,
  setShowPassword,
  onLogin,
  onForgotPassword,
}: LoginFieldsProps) {
  return (
    <>
      <SafeEnteringView entering={FadeInDown.duration(600).delay(100)}>
        <AuthBrandLockup subtitle='The premier open forum for Automotive Packaging Professionals' />
      </SafeEnteringView>

      <SafeEnteringView entering={FadeInDown.duration(600).delay(400)}>
        <View style={styles.card}>
          <Pressable
            style={styles.inputContainer}
            onPress={() => emailInputRef.current?.focus()}
          >
            <TextInput
              ref={emailInputRef}
              style={styles.input}
              placeholder='Email'
              placeholderTextColor='#9CA3AF'
              value={email}
              onChangeText={setEmail}
              autoCapitalize='none'
              keyboardType='email-address'
              autoComplete='email'
              contextMenuHidden={false}
              returnKeyType='next'
              onSubmitEditing={() => passwordInputRef.current?.focus()}
            />
          </Pressable>

          <Pressable
            style={styles.inputContainer}
            onPress={() => passwordInputRef.current?.focus()}
          >
            <View style={styles.passwordContainer}>
              <TextInput
                ref={passwordInputRef}
                style={styles.passwordInput}
                placeholder='Password'
                placeholderTextColor='#9CA3AF'
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize='none'
                autoComplete='password'
                contextMenuHidden={false}
                returnKeyType='done'
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeButton}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={22}
                  color='#6B7280'
                />
              </TouchableOpacity>
            </View>
          </Pressable>

          {localError ? (
            <View style={styles.errorContainer}>
              <Ionicons name='alert-circle' size={20} color='#DC2626' />
              <Text style={styles.errorText}>{localError}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            onPress={onLogin}
            disabled={isLoading}
            accessibilityRole='button'
            style={[styles.button, isLoading && styles.buttonDisabled]}
          >
            {isLoading ? (
              <ActivityIndicator color='#ffffff' />
            ) : (
              <Text style={styles.buttonText}>Sign In</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkButton}
            accessibilityRole='button'
            onPress={onForgotPassword}
          >
            <Text style={styles.linkText}>Forgot Password?</Text>
          </TouchableOpacity>

          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              This is an invite-only app. If you don&apos;t have an account,
              please contact your administrator.
            </Text>
          </View>
        </View>
      </SafeEnteringView>
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    borderRadius: 20,
    padding: 20,
  },
  inputContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 12,
  },
  input: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
  },
  eyeButton: {
    marginLeft: 8,
    padding: 8,
  },
  errorContainer: {
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#fecaca',
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 12,
    color: '#dc2626',
    marginLeft: 8,
    flex: 1,
  },
  button: {
    backgroundColor: autopackColors.apBlue,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  linkButton: {
    alignItems: 'center',
    marginTop: 16,
  },
  linkText: {
    color: autopackColors.apBlue,
    fontSize: 14,
    fontWeight: '600',
  },
  infoBox: {
    marginTop: 24,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 12,
    padding: 16,
  },
  infoText: {
    color: '#1e3a8a',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 20,
  },
});
