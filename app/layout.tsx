import type { Metadata, Viewport } from 'next';
import './globals.css';
import { ThemeProvider, themeBootScript } from '@/components/shell/theme';
import { AuthProvider } from '@/components/shell/auth';

export const metadata: Metadata = {
  title: {
    default: 'VYBE — Watch. Create. Connect.',
    template: '%s · VYBE',
  },
  description:
    'VYBE is where you watch, create and connect. Live streams, shorts, and the creators shaping what comes next.',
  applicationName: 'VYBE',
  openGraph: {
    title: 'VYBE — Watch. Create. Connect.',
    description: 'Live streams, shorts, and the creators shaping what comes next.',
    siteName: 'VYBE',
    type: 'website',
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#07070b' },
    { media: '(prefers-color-scheme: light)', color: '#f7f6f4' },
  ],
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body>
        <ThemeProvider>
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
