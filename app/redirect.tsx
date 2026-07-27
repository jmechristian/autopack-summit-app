// app/redirect.tsx
// This route handles OAuth redirects (like LinkedIn) via deep links
import { useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { handleLinkedInRedirect } from '../src/utils/linkedInAuth';
import { RiveLoader } from '../src/components/RiveLoader';

export default function RedirectHandler() {
  const params = useLocalSearchParams();
  const router = useRouter();

  useEffect(() => {
    const processRedirect = async () => {
      // Get the full URL from params or construct it
      const code = params.code as string | undefined;
      const error = params.error as string | undefined;
      
      let url: string | null = null;
      
      if (code || error) {
        // Construct the full deep link URL
        const baseUrl = 'autopacksummitapp://redirect';
        url = error 
          ? `${baseUrl}?error=${encodeURIComponent(error)}`
          : `${baseUrl}?code=${encodeURIComponent(code!)}`;
      } else {
        // No params, try to get from Linking
        url = await Linking.getInitialURL();
      }
      
      if (url && url.startsWith('autopacksummitapp://redirect')) {
        console.log('Processing redirect URL:', url);
        
        // Handle the redirect (this will store the code in AsyncStorage)
        const handled = await handleLinkedInRedirect(url);
        console.log('Redirect handled:', handled);
        
        // Always navigate back to profile after a short delay
        // The OAuth flow will continue via AsyncStorage polling
        setTimeout(() => {
          router.replace('/(main)/profile');
        }, 1500);
      } else {
        // No valid redirect, go back
        router.replace('/(main)/profile');
      }
    };

    processRedirect();
  }, [params, router]);

  return <RiveLoader />;
}

