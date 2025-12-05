// src/amplifyConfig.ts
import { Amplify } from 'aws-amplify';
import awsconfig from './aws-exports';

export const configureAmplify = () => {
  Amplify.configure(awsconfig);
};

