// app/manifest.ts
import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Sthamly Ayurveda',
    short_name: 'Sthamly',
    description: 'Personalised daily Ayurvedic dosha routine and tracking.',
    start_url: '/',
    display: 'standalone',
    background_color: '#FDFBF7',
    theme_color: '#2C3E2B',
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/icons/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
