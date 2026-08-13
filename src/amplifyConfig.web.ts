// src/amplifyConfig.web.ts — no @aws-amplify/react-native (native-only)
import { Amplify } from 'aws-amplify';

let awsconfig: any;

try {
  const awsExports = require('./aws-exports.js');
  awsconfig = awsExports.default || awsExports;
} catch (error) {
  console.warn('aws-exports.js not found, using environment variables or prebuild-generated config');
  awsconfig = {
    aws_project_region: process.env.EXPO_PUBLIC_AWS_REGION || 'us-east-1',
    aws_appsync_graphqlEndpoint: process.env.EXPO_PUBLIC_APPSYNC_ENDPOINT || '',
    aws_appsync_region: process.env.EXPO_PUBLIC_AWS_REGION || 'us-east-1',
    aws_appsync_authenticationType: process.env.EXPO_PUBLIC_APPSYNC_AUTH_TYPE || 'API_KEY',
    aws_appsync_apiKey: process.env.EXPO_PUBLIC_APPSYNC_API_KEY || '',
    aws_cognito_identity_pool_id: process.env.EXPO_PUBLIC_COGNITO_IDENTITY_POOL_ID || '',
    aws_cognito_region: process.env.EXPO_PUBLIC_AWS_REGION || 'us-east-1',
    aws_user_pools_id: process.env.EXPO_PUBLIC_COGNITO_USER_POOL_ID || '',
    aws_user_pools_web_client_id: process.env.EXPO_PUBLIC_COGNITO_USER_POOL_CLIENT_ID || '',
    aws_cognito_username_attributes: ['EMAIL'],
    aws_cognito_signup_attributes: ['EMAIL'],
    aws_cognito_mfa_configuration: 'OFF',
    aws_cognito_mfa_types: ['SMS'],
    aws_cognito_password_protection_settings: {
      passwordPolicyMinLength: 8,
      passwordPolicyCharacters: [],
    },
    aws_cognito_verification_mechanisms: ['EMAIL'],
    aws_user_files_s3_bucket: process.env.EXPO_PUBLIC_S3_BUCKET || '',
    aws_user_files_s3_bucket_region: process.env.EXPO_PUBLIC_AWS_REGION || 'us-east-1',
  };
}

export const configureAmplify = () => {
  Amplify.configure(awsconfig, { ssr: false });
};
