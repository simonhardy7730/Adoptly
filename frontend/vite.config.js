import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'robots.txt', 'apple-touch-icon-180x180.png'],
      // Le manifest.json public est conservé tel quel — le plugin le surcharge si on le définit ici
      manifest: {
        name: 'Adoptly — Adoption animale responsable',
        short_name: 'Adoptly',
        description: "Trouvez l'animal compatible avec votre mode de vie parmi des refuges près de chez vous.",
        theme_color: '#1B4F8A',
        background_color: '#F4F7FF',
        display: 'standalone',
        orientation: 'portrait-primary',
        start_url: '/',
        scope: '/',
        lang: 'fr',
        categories: ['lifestyle', 'social'],
        icons: [
          { src: '/pwa-64x64.png',              sizes: '64x64',     type: 'image/png' },
          { src: '/pwa-192x192.png',            sizes: '192x192',   type: 'image/png' },
          { src: '/pwa-512x512.png',            sizes: '512x512',   type: 'image/png', purpose: 'any' },
          { src: '/maskable-icon-512x512.png',  sizes: '512x512',   type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Incrémente le cacheId pour forcer le remplacement de l'ancien cache SW
        cacheId: 'adoptly-v2',
        cleanupOutdatedCaches: true,
        // Précache tous les assets statiques de l'app
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff2}'],
        // Stratégies réseau pour les ressources dynamiques
        runtimeCaching: [
          {
            // API Adoptly — Network First (données fraîches si réseau disponible)
            urlPattern: /^https:\/\/.*\.onrender\.com\/api\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'adoptly-api',
              networkTimeoutSeconds: 10,
              expiration: {
                maxEntries: 150,
                maxAgeSeconds: 60 * 60 * 24, // 24 h
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Photos Supabase Storage — Cache First (images statiques)
            urlPattern: /^https:\/\/.*supabase\.co\/storage\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'adoptly-photos',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 jours
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Google Fonts — Cache First
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 an
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  server: {
    port: 5173,
  },
});
