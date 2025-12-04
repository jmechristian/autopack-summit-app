// src/amplifyConfig.ts
import { Amplify } from 'aws-amplify';
// 👇 adjust this path/name if your file is e.g. amplify_outputs-dev.json
import outputs from '../amplify_outputs.json';

export const configureAmplify = () => {
  Amplify.configure(outputs);
};
