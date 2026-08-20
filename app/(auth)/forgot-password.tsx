import { Ionicons } from '@expo/vector-icons';
import { confirmResetPassword, resetPassword } from 'aws-amplify/auth';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
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
import { getAuthErrorMessage, getForgotPasswordRequestMessage } from '../../src/utils/authErrors';

type Step = 'request' | 'confirm';

export default function ForgotPasswordScreen() {
  const params = useLocalSearchParams<{ email?: string | string[] }>();
  const initialEmail = Array.isArray(params.email) ? params.email[0] : params.email;

  const emailRef = useRef<TextInput>(null);
  const codeRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  const [step, setStep] = useState<Step>('request');
  const [email, setEmail] = useState(initialEmail || '');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [deliveryHint, setDeliveryHint] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    if (initialEmail) setEmail(initialEmail);
  }, [initialEmail]);

  const handleSendCode = async () => {
    setError('');
    setInfo('');
    const username = email.trim();
    if (!username) {
      setError('Please enter your email address.');
      return;
    }

    try {
      setIsLoading(true);
      const result = await resetPassword({ username });
      const delivery = result.nextStep?.codeDeliveryDetails?.destination;
      if (delivery) {
        setDeliveryHint(delivery);
      } else {
        setDeliveryHint(username);
      }

      if (result.nextStep?.resetPasswordStep === 'DONE') {
        setInfo('Your password has been reset. You can sign in with your new password.');
        setTimeout(() => router.replace('/(auth)/login'), 1200);
        return;
      }

      setStep('confirm');
      setInfo('If an account exists for this email, a verification code has been sent.');
    } catch (err) {
      setError(getForgotPasswordRequestMessage(err, 'Unable to send reset code. Please try again.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    setCode('');
    await handleSendCode();
  };

  const handleConfirmReset = async () => {
    setError('');
    setInfo('');
    const username = email.trim();

    if (!code.trim() || !newPassword || !confirmPassword) {
      setError('Please enter the verification code and your new password.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      setIsLoading(true);
      await confirmResetPassword({
        username,
        confirmationCode: code.trim(),
        newPassword,
      });
      router.replace('/(auth)/login');
    } catch (err) {
      setError(getAuthErrorMessage(err, 'Unable to reset password. Please try again.'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthScreenShell>
      <SafeEnteringView entering={FadeInDown.duration(600).delay(100)}>
        <AuthBrandLockup
          title={step === 'request' ? 'Forgot\nPassword' : 'Reset\nPassword'}
          subtitle={
            step === 'request'
              ? 'Enter your email and we will send a verification code.'
              : `Enter the code sent to ${deliveryHint || email.trim()} and choose a new password.`
          }
        />
      </SafeEnteringView>

      <SafeEnteringView entering={FadeInDown.duration(600).delay(250)}>
        <View style={styles.card}>
                {step === 'request' ? (
                  <>
                    <Pressable
                      style={styles.inputContainer}
                      onPress={() => emailRef.current?.focus()}
                    >
                      <TextInput
                        ref={emailRef}
                        style={styles.input}
                        placeholder='Email'
                        placeholderTextColor='#9CA3AF'
                        value={email}
                        onChangeText={setEmail}
                        autoCapitalize='none'
                        keyboardType='email-address'
                        autoComplete='email'
                        returnKeyType='done'
                        onSubmitEditing={() => void handleSendCode()}
                      />
                    </Pressable>

                    <TouchableOpacity
                      onPress={() => void handleSendCode()}
                      disabled={isLoading}
                      style={[styles.button, isLoading && styles.buttonDisabled]}
                    >
                      {isLoading ? (
                        <ActivityIndicator color='#ffffff' />
                      ) : (
                        <Text style={styles.buttonText}>Send Verification Code</Text>
                      )}
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <Pressable
                      style={styles.inputContainer}
                      onPress={() => codeRef.current?.focus()}
                    >
                      <TextInput
                        ref={codeRef}
                        style={styles.input}
                        placeholder='Verification code'
                        placeholderTextColor='#9CA3AF'
                        value={code}
                        onChangeText={setCode}
                        autoCapitalize='none'
                        keyboardType='number-pad'
                        autoComplete='one-time-code'
                        textContentType='oneTimeCode'
                        returnKeyType='next'
                        onSubmitEditing={() => passwordRef.current?.focus()}
                      />
                    </Pressable>

                    <Pressable
                      style={styles.inputContainer}
                      onPress={() => passwordRef.current?.focus()}
                    >
                      <View style={styles.passwordContainer}>
                        <TextInput
                          ref={passwordRef}
                          style={styles.passwordInput}
                          placeholder='New password'
                          placeholderTextColor='#9CA3AF'
                          value={newPassword}
                          onChangeText={setNewPassword}
                          secureTextEntry={!showNewPassword}
                          autoCapitalize='none'
                          autoComplete='new-password'
                          returnKeyType='done'
                          onSubmitEditing={() => void handleConfirmReset()}
                        />
                        <TouchableOpacity
                          onPress={() => setShowNewPassword((value) => !value)}
                          style={styles.eyeButton}
                        >
                          <Ionicons
                            name={showNewPassword ? 'eye-off-outline' : 'eye-outline'}
                            size={22}
                            color='#6B7280'
                          />
                        </TouchableOpacity>
                      </View>
                    </Pressable>

                    <View style={styles.inputContainer}>
                      <View style={styles.passwordContainer}>
                        <TextInput
                          style={styles.passwordInput}
                          placeholder='Confirm new password'
                          placeholderTextColor='#9CA3AF'
                          value={confirmPassword}
                          onChangeText={setConfirmPassword}
                          secureTextEntry={!showConfirmPassword}
                          autoCapitalize='none'
                          autoComplete='new-password'
                          returnKeyType='done'
                          onSubmitEditing={() => void handleConfirmReset()}
                        />
                        <TouchableOpacity
                          onPress={() => setShowConfirmPassword((value) => !value)}
                          style={styles.eyeButton}
                        >
                          <Ionicons
                            name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                            size={22}
                            color='#6B7280'
                          />
                        </TouchableOpacity>
                      </View>
                    </View>

                    <TouchableOpacity
                      onPress={() => void handleConfirmReset()}
                      disabled={isLoading}
                      style={[styles.button, isLoading && styles.buttonDisabled]}
                    >
                      {isLoading ? (
                        <ActivityIndicator color='#ffffff' />
                      ) : (
                        <Text style={styles.buttonText}>Reset Password</Text>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.linkButton}
                      disabled={isLoading}
                      onPress={() => void handleResendCode()}
                    >
                      <Text style={styles.linkText}>Resend code</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.linkButton}
                      onPress={() => {
                        setStep('request');
                        setCode('');
                        setNewPassword('');
                        setConfirmPassword('');
                        setError('');
                        setInfo('');
                      }}
                    >
                      <Text style={styles.linkText}>Use a different email</Text>
                    </TouchableOpacity>
                  </>
                )}

                {info ? (
                  <View style={styles.infoContainer}>
                    <Ionicons name='information-circle' size={20} color='#1d4ed8' />
                    <Text style={styles.infoText}>{info}</Text>
                  </View>
                ) : null}

                {error ? (
                  <View style={styles.errorContainer}>
                    <Ionicons name='alert-circle' size={20} color='#DC2626' />
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                ) : null}

                <TouchableOpacity
                  style={styles.linkButton}
                  onPress={() => router.replace('/(auth)/login')}
                >
                  <Text style={styles.linkText}>Back to sign in</Text>
                </TouchableOpacity>
        </View>
      </SafeEnteringView>
    </AuthScreenShell>
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
  button: {
    backgroundColor: autopackColors.apBlue,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.6 },
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
  infoContainer: {
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoText: {
    fontSize: 12,
    color: '#1e3a8a',
    marginLeft: 8,
    flex: 1,
    lineHeight: 18,
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
});
