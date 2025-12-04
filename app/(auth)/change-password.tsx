// app/(auth)/change-password.tsx
import { Ionicons } from '@expo/vector-icons';
import { confirmSignIn } from 'aws-amplify/auth';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
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

export default function ChangePasswordScreen() {
  const insets = useSafeAreaInsets();
  const { username } = useLocalSearchParams<{ username: string }>();

  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    setError('');

    if (!newPassword || !confirm) {
      setError('Please enter and confirm your new password.');
      return;
    }

    if (newPassword !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    try {
      setIsLoading(true);

      // For NEW_PASSWORD_REQUIRED / CONFIRM_SIGN_IN_WITH_NEW_PASSWORD flows
      const result = await confirmSignIn({
        challengeResponse: newPassword,
        // Depending on your Amplify version, you may need:
        // options: { username: username as string },
      });

      console.log('confirmSignIn result:', JSON.stringify(result, null, 2));

      setIsLoading(false);

      if (result.isSignedIn) {
        router.replace('/(main)/hub');
      } else {
        setError(
          'Password updated, but additional sign-in steps may be required.'
        );
      }
    } catch (err: any) {
      // Comprehensive error logging for debugging
      console.error('=== Confirm sign in error details ===');
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

      setIsLoading(false);
      setError(err?.message || 'Unable to update password. Please try again.');
    }
  };

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top, paddingBottom: insets.bottom + 16 },
      ]}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps='handled'
      >
        <Animated.View entering={FadeInDown.duration(500).delay(50)}>
          <Text style={styles.title}>Set a new password</Text>
          <Text style={styles.subtitle}>
            This is your first time signing in. Please choose a new password for
            your account.
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(500).delay(200)}>
          <View style={styles.card}>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder='New password'
                placeholderTextColor='#9CA3AF'
                secureTextEntry
                value={newPassword}
                onChangeText={setNewPassword}
              />
            </View>

            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder='Confirm new password'
                placeholderTextColor='#9CA3AF'
                secureTextEntry
                value={confirm}
                onChangeText={setConfirm}
              />
            </View>

            {error ? (
              <View style={styles.errorContainer}>
                <Ionicons name='alert-circle' size={20} color='#DC2626' />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              onPress={handleSubmit}
              disabled={isLoading}
              style={[styles.button, isLoading && styles.buttonDisabled]}
            >
              {isLoading ? (
                <ActivityIndicator color='#ffffff' />
              ) : (
                <Text style={styles.buttonText}>Update Password</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Text style={styles.backText}>Back to sign in</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(30, 58, 138, 0.1)',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
  },
  card: {
    marginTop: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    borderRadius: 16,
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#000',
    letterSpacing: -0.5,
    textTransform: 'uppercase',
  },
  subtitle: {
    marginTop: 8,
    color: '#4B5563',
    fontSize: 14,
    lineHeight: 20,
  },
  inputContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginTop: 12,
  },
  input: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
  },
  errorContainer: {
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#fecaca',
    marginTop: 12,
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
    marginTop: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  backButton: {
    alignItems: 'center',
    marginTop: 16,
  },
  backText: {
    color: autopackColors.apBlue,
    fontSize: 14,
    fontWeight: '600',
  },
});
