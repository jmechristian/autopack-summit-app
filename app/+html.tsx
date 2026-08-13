import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

/**
 * Root HTML for static web. Includes a bootstrap redirect so `/` never sticks on
 * an empty SSR suspense shell before the client router hydrates.
 */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang='en'>
      <head>
        <meta charSet='utf-8' />
        <meta httpEquiv='X-UA-Compatible' content='IE=edge' />
        <meta
          name='viewport'
          content='width=device-width, initial-scale=1, shrink-to-fit=no'
        />
        <ScrollViewStyleReset />
        <script
          dangerouslySetInnerHTML={{
            __html: `
(function () {
  try {
    var p = location.pathname || '/';
    if (p === '/' || p === '') {
      location.replace('/login');
    }
  } catch (e) {}
})();
`,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
