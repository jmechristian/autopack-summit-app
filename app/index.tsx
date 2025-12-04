import { Redirect } from 'expo-router';

export default function Index() {
  // On launch, go straight to splash screen in the auth stack
  return <Redirect href='/(auth)/splash' />;
}
