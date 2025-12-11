#!/usr/bin/env node

/**
 * Test script for LinkedIn OAuth token exchange
 * 
 * Usage:
 *   node test-linkedin-token.js <authorization_code> <code_verifier>
 * 
 * Or set environment variables:
 *   LINKEDIN_CLIENT_ID=777zbuyll96931
 *   LINKEDIN_CLIENT_SECRET=your_secret
 *   CODE=authorization_code
 *   CODE_VERIFIER=code_verifier
 */

const LINKEDIN_CLIENT_ID = process.env.LINKEDIN_CLIENT_ID || '777zbuyll96931';
const LINKEDIN_CLIENT_SECRET = process.env.LINKEDIN_CLIENT_SECRET;
const REDIRECT_URI = 'https://aps-app-admin.vercel.app/api/linkedin/callback';

// Get code and code_verifier from command line args or env
const code = process.argv[2] || process.env.CODE;
const codeVerifier = process.argv[3] || process.env.CODE_VERIFIER;

if (!code || !codeVerifier) {
  console.error('❌ Missing required parameters');
  console.error('\nUsage:');
  console.error('  node test-linkedin-token.js <authorization_code> <code_verifier>');
  console.error('\nOr set environment variables:');
  console.error('  LINKEDIN_CLIENT_ID=777zbuyll96931');
  console.error('  LINKEDIN_CLIENT_SECRET=your_secret');
  console.error('  CODE=authorization_code');
  console.error('  CODE_VERIFIER=code_verifier');
  process.exit(1);
}

if (!LINKEDIN_CLIENT_SECRET) {
  console.error('❌ LINKEDIN_CLIENT_SECRET environment variable is required');
  process.exit(1);
}

async function testTokenExchange() {
  console.log('=== LinkedIn Token Exchange Test ===\n');
  console.log('Configuration:');
  console.log('  Client ID:', LINKEDIN_CLIENT_ID);
  console.log('  Client Secret:', LINKEDIN_CLIENT_SECRET.substring(0, 5) + '...' + LINKEDIN_CLIENT_SECRET.substring(LINKEDIN_CLIENT_SECRET.length - 5));
  console.log('  Client Secret length:', LINKEDIN_CLIENT_SECRET.length);
  console.log('  Redirect URI:', REDIRECT_URI);
  console.log('  Code length:', code.length);
  console.log('  Code Verifier length:', codeVerifier.length);
  console.log('');

  // Test 1: Using URLSearchParams (current approach)
  console.log('=== Test 1: URLSearchParams (current approach) ===');
  try {
    const params1 = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
      client_id: LINKEDIN_CLIENT_ID,
      client_secret: LINKEDIN_CLIENT_SECRET,
      code_verifier: codeVerifier,
    });

    const body1 = params1.toString();
    console.log('Body (secret hidden):', body1.replace(/client_secret=[^&]+/, 'client_secret=***'));
    console.log('Full body:', body1);

    const response1 = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body1,
    });

    const responseText1 = await response1.text();
    console.log('Status:', response1.status);
    console.log('Response:', responseText1);

    if (response1.ok) {
      const data = JSON.parse(responseText1);
      console.log('✅ SUCCESS! Access token received');
      console.log('Token type:', data.token_type);
      console.log('Expires in:', data.expires_in);
      return;
    } else {
      console.log('❌ Failed');
    }
  } catch (error) {
    console.error('Error:', error.message);
  }

  console.log('\n');

  // Test 2: Manual construction without encoding client_id/secret
  console.log('=== Test 2: Manual construction (no encoding on client_id/secret) ===');
  try {
    const bodyParts = [
      `grant_type=authorization_code`,
      `code=${encodeURIComponent(code)}`,
      `redirect_uri=${encodeURIComponent(REDIRECT_URI)}`,
      `client_id=${LINKEDIN_CLIENT_ID}`, // No encoding
      `client_secret=${LINKEDIN_CLIENT_SECRET}`, // No encoding
      `code_verifier=${encodeURIComponent(codeVerifier)}`,
    ];

    const body2 = bodyParts.join('&');
    console.log('Body (secret hidden):', body2.replace(/client_secret=[^&]+/, 'client_secret=***'));
    console.log('Full body:', body2);

    const response2 = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body2,
    });

    const responseText2 = await response2.text();
    console.log('Status:', response2.status);
    console.log('Response:', responseText2);

    if (response2.ok) {
      const data = JSON.parse(responseText2);
      console.log('✅ SUCCESS! Access token received');
      console.log('Token type:', data.token_type);
      console.log('Expires in:', data.expires_in);
      return;
    } else {
      console.log('❌ Failed');
    }
  } catch (error) {
    console.error('Error:', error.message);
  }

  console.log('\n');

  // Test 3: Manual construction with explicit encoding
  console.log('=== Test 3: Manual construction (explicit encoding) ===');
  try {
    const bodyParts = [
      `grant_type=authorization_code`,
      `code=${encodeURIComponent(code)}`,
      `redirect_uri=${encodeURIComponent(REDIRECT_URI)}`,
      `client_id=${encodeURIComponent(LINKEDIN_CLIENT_ID)}`,
      `client_secret=${encodeURIComponent(LINKEDIN_CLIENT_SECRET)}`, // Explicit encoding
      `code_verifier=${encodeURIComponent(codeVerifier)}`,
    ];

    const body3 = bodyParts.join('&');
    console.log('Body (secret hidden):', body3.replace(/client_secret=[^&]+/, 'client_secret=***'));
    console.log('Full body:', body3);

    const response3 = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body3,
    });

    const responseText3 = await response3.text();
    console.log('Status:', response3.status);
    console.log('Response:', responseText3);

    if (response3.ok) {
      const data = JSON.parse(responseText3);
      console.log('✅ SUCCESS! Access token received');
      console.log('Token type:', data.token_type);
      console.log('Expires in:', data.expires_in);
      return;
    } else {
      console.log('❌ Failed');
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testTokenExchange().catch(console.error);

