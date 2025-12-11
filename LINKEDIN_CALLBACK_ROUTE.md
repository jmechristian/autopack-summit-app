# LinkedIn OAuth Callback Route

You need to create a callback route in your Next.js admin app to handle the OAuth redirect from LinkedIn.

## Route Location

Create this file in your Next.js project:

**For App Router:** `app/api/linkedin/callback/route.ts`  
**For Pages Router:** `pages/api/linkedin/callback.ts`

## Implementation

```typescript
import { NextRequest, NextResponse } from 'next/server';
// OR for Pages Router:
// import type { NextApiRequest, NextApiResponse } from 'next';

// App Router version:
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  if (error) {
    // Redirect to app with error
    return NextResponse.redirect(
      `autopacksummitapp://redirect?error=${encodeURIComponent(error)}`
    );
  }

  if (!code) {
    return NextResponse.redirect('autopacksummitapp://redirect?error=no_code');
  }

  // Redirect to deep link with code and state
  return NextResponse.redirect(
    `autopacksummitapp://redirect?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state || '')}`
  );
}

// Pages Router version (if using Pages Router):
/*
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const { code, state, error } = req.query;

  if (error) {
    return res.redirect(`autopacksummitapp://redirect?error=${encodeURIComponent(error as string)}`);
  }

  if (!code) {
    return res.redirect('autopacksummitapp://redirect?error=no_code');
  }

  return res.redirect(
    `autopacksummitapp://redirect?code=${encodeURIComponent(code as string)}&state=${encodeURIComponent((state as string) || '')}`
  );
}
*/
```

## LinkedIn App Configuration

Make sure in your LinkedIn Developer Portal:

1. **Authorized Redirect URLs** includes: `https://aps-app-admin.vercel.app/api/linkedin/callback`
2. The redirect URI matches exactly (including https://)

## How It Works

1. User taps "Import from LinkedIn" in the app
2. App opens LinkedIn OAuth page with redirect URI: `https://aps-app-admin.vercel.app/api/linkedin/callback`
3. User authorizes on LinkedIn
4. LinkedIn redirects to your callback route with `code` and `state`
5. Callback route redirects to deep link: `autopacksummitapp://redirect?code=...&state=...`
6. App intercepts deep link and extracts the code
7. App sends code to `/api/linkedin/token` to exchange for access token
8. App fetches profile data from LinkedIn APIs
