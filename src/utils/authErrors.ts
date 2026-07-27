export function getAuthErrorMessage(err: unknown, fallback: string): string {
  const error = err as { name?: string; message?: string };
  switch (error?.name) {
    case 'NotAuthorizedException':
      return 'Incorrect email or password. Please try again.';
    case 'UserNotConfirmedException':
      return 'Your account has not been confirmed. Please check your email.';
    case 'UserNotFoundException':
      return 'No account found with this email address. This is an invite-only app. Please contact your administrator.';
    case 'TooManyRequestsException':
    case 'LimitExceededException':
      return 'Too many attempts. Please wait a few minutes and try again.';
    case 'CodeMismatchException':
      return 'That verification code is incorrect. Please try again.';
    case 'ExpiredCodeException':
      return 'That verification code has expired. Request a new code.';
    case 'InvalidPasswordException':
      return error?.message || 'Password does not meet the requirements.';
    case 'InvalidParameterException':
      return error?.message || 'Please check your entries and try again.';
    case 'NetworkError':
      return 'Network error. Please check your connection and try again.';
    default:
      return error?.message || error?.name || fallback;
  }
}

export function getForgotPasswordRequestMessage(err: unknown, fallback: string): string {
  const error = err as { name?: string; message?: string };
  switch (error?.name) {
    case 'TooManyRequestsException':
    case 'LimitExceededException':
      return 'Too many reset attempts. Please wait a few minutes and try again.';
    case 'InvalidParameterException':
      return error?.message || 'Please enter a valid email address.';
    case 'NetworkError':
      return 'Network error. Please check your connection and try again.';
    default:
      // Avoid confirming whether the account exists.
      if (error?.name === 'UserNotFoundException') {
        return 'If an account exists for this email, a verification code has been sent.';
      }
      return error?.message || error?.name || fallback;
  }
}
