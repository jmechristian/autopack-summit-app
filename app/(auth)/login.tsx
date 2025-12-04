// app/(auth)/login.tsx
import { Ionicons } from '@expo/vector-icons';
import { signIn } from 'aws-amplify/auth';

import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ImageBackground,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { autopackColors } from '../../src/theme';

export default function LoginScreen() {
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setLocalError('');
  }, []);

  const handleLogin = async () => {
    setLocalError('');

    if (!email || !password) {
      setLocalError('Please enter both email and password.');
      return;
    }

    try {
      setIsLoading(true);

      const result = await signIn({
        username: email,
        password,
      });

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

      console.error('Error details:', JSON.stringify(errorDetails, null, 2));

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
            errorMessage = 'No account found with this email address.';
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

  return (
    <ImageBackground
      source={require('../../assets/images/login-back.png')}
      style={styles.background}
      resizeMode='cover'
    >
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + 20 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.contentView}>
            {/* Hero text */}
            <View style={styles.titleContainer}>
              <Animated.View entering={FadeInDown.duration(600).delay(100)}>
                <Text style={styles.title}>Welcome to{'\n'}The Summit!</Text>
                <Text style={styles.subtitle}>
                  The premier open forum for Automotive Packaging Professionals
                </Text>
              </Animated.View>
            </View>

            {/* Card */}
            <Animated.View entering={FadeInDown.duration(600).delay(400)}>
              <View style={styles.card}>
                {/* Email */}
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    placeholder='Email'
                    placeholderTextColor='#9CA3AF'
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize='none'
                    keyboardType='email-address'
                    autoComplete='email'
                  />
                </View>

                {/* Password */}
                <View style={styles.inputContainer}>
                  <View style={styles.passwordContainer}>
                    <TextInput
                      style={styles.passwordInput}
                      placeholder='Password'
                      placeholderTextColor='#9CA3AF'
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                      autoCapitalize='none'
                      autoComplete='password'
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
                </View>

                {/* Error */}
                {localError ? (
                  <View style={styles.errorContainer}>
                    <Ionicons name='alert-circle' size={20} color='#DC2626' />
                    <Text style={styles.errorText}>{localError}</Text>
                  </View>
                ) : null}

                {/* Sign In */}
                <TouchableOpacity
                  onPress={handleLogin}
                  disabled={isLoading}
                  style={[styles.button, isLoading && styles.buttonDisabled]}
                >
                  {isLoading ? (
                    <ActivityIndicator color='#ffffff' />
                  ) : (
                    <Text style={styles.buttonText}>Sign In</Text>
                  )}
                </TouchableOpacity>

                {/* Forgot password – wired later */}
                <TouchableOpacity
                  style={styles.linkButton}
                  onPress={() => {
                    // later: router.push("/(auth)/forgot-password")
                    console.log('Forgot password pressed');
                  }}
                >
                  <Text style={styles.linkText}>Forgot Password?</Text>
                </TouchableOpacity>

                {/* Info box */}
                <View style={styles.infoBox}>
                  <Text style={styles.infoText}>
                    This is an invite-only app. If you don&apos;t have an
                    account, please contact your administrator.
                  </Text>
                </View>
              </View>
            </Animated.View>
          </View>
        </ScrollView>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: 'rgba(30, 58, 138, 0.25)',
  },
  scrollContent: {
    minHeight: '100%',
  },
  contentView: {
    padding: 32,
    paddingHorizontal: 24,
    flex: 1,
  },
  titleContainer: {
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#000',
    marginBottom: 12,
    letterSpacing: -0.5,
    textTransform: 'uppercase',
  },
  subtitle: {
    color: '#71717a',
    fontSize: 18,
    lineHeight: 26,
  },
  card: {
    marginTop: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 16,
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
