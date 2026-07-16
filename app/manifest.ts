import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Leadflow',
    short_name: 'Leadflow',
    description: 'Captura e distribuição de leads',
    start_url: '/',
    display: 'standalone',
    background_color: '#0a1622',
    theme_color: '#004a8f',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  };
}
