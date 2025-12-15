// src/amplifyConfig.ts
import '@aws-amplify/react-native';
import { Amplify } from 'aws-amplify';
import awsconfig from './aws-exports';

export const configureAmplify = () => {
  // ssr: false is important for React Native / Expo environments
  Amplify.configure(awsconfig, { ssr: false });
};

