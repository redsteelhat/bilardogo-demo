import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'),
  title: { default: 'BilardoGo', template: '%s · BilardoGo' },
  description: 'Bilardo oyuncularını, salonlarını ve bilardo ekosistemini tek platformda buluşturan uygulama.',
  applicationName: 'BilardoGo',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'BilardoGo' },
  icons: {
    icon: [{ url: '/icons/favicon-32.png', sizes: '32x32' }, { url: '/icons/icon.svg', type: 'image/svg+xml' }],
    apple: '/icons/apple-touch-icon.png',
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: '#0a0a0a',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body className="min-h-dvh">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
