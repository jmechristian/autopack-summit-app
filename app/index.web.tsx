import { Redirect } from 'expo-router';

/** Web `/` — HTML bootstrap also redirects; this covers client navigations to `/`. */
export default function WebIndex() {
  return <Redirect href='/login' />;
}
