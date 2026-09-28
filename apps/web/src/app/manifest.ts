import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'BilardoGo',
    short_name: 'BilardoGo',
    description: 'Şehrindeki bilardo salonları, masa durumu, maç eşleşme ve istatistikler.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#0a0a0a',
    theme_color: '#0a0a0a',
    lang: 'tr',
    categories: ['sports', 'social'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'Masa QR okut', url: '/qr', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
      { name: 'Maçlarım', url: '/maclarim', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
    ],
  };
}
