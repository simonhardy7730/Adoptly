import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
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
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff2}'],
      },
    }),
  ],
  server: {
    port: 5173,
  },
});
