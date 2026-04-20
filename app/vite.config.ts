/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';
import path from 'path';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      basicSsl({
        name: 'devbot',
        certDir: path.resolve(__dirname, '../certs'),
      }),
    ],
    resolve: {
      alias: {
        '@allsetlabs/reusable': path.resolve(__dirname, '../reusables/src'),
        '@devbot/app': path.resolve(__dirname, 'src'),
        '@devbot/plugin-baby-logs/frontend': path.resolve(
          __dirname,
          '../plugins/baby-logs/frontend'
        ),
        '@devbot/plugin-baby-logs/backend': path.resolve(
          __dirname,
          '../plugins/baby-logs/backend'
        ),
        '@devbot/plugin-lawn-care/frontend': path.resolve(
          __dirname,
          '../plugins/lawn-care/frontend'
        ),
        '@devbot/plugin-lawn-care/backend': path.resolve(
          __dirname,
          '../plugins/lawn-care/backend'
        ),
      },
      dedupe: ['react', 'react-dom'],
    },
    optimizeDeps: {
      include: ['react', 'react-dom'],
    },
    envDir: '../',
    server: {
      host: true,
    },
    test: {
      environment: 'node',
      globals: true,
    },
  };
});
