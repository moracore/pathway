import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import { VitePWA } from 'vite-plugin-pwa';

const isCapacitor = !!process.env.CAPACITOR;

export default defineConfig({
  base: isCapacitor ? '/' : '/pathway/',
  plugins: [
    react(),
    // Strip crossorigin attributes for Capacitor — older Android WebViews reject
    // crossorigin on capacitor:// scheme resources, causing a blank white screen
    ...(isCapacitor ? [{
      name: 'strip-crossorigin',
      transformIndexHtml(html: string) {
        return html.replace(/ crossorigin/g, '');
      },
    }] : []),
    ...(!isCapacitor ? [VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'Pathway',
        short_name: 'Pathway',
        description: 'Project progress tracker with weighted tasks and AI integration.',
        theme_color: '#0d1117',
        background_color: '#0d1117',
        display: 'standalone',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })] : []),
  ],
});
