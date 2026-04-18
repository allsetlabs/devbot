/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(() => {
  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@allsetlabs/reusable': path.resolve(__dirname, '../reusables/src'),
        '@devbot/app': path.resolve(__dirname, 'src'),
        '@devbot/plugin-baby-logs/frontend': path.resolve(
          __dirname,
          '../plugins/baby-logs/frontend/index.ts'
        ),
        '@devbot/plugin-baby-logs': path.resolve(
          __dirname,
          '../plugins/baby-logs/backend/index.ts'
        ),
        '@devbot/plugin-lawn-care/frontend': path.resolve(
          __dirname,
          '../plugins/lawn-care/frontend/index.ts'
        ),
        '@devbot/plugin-lawn-care': path.resolve(
          __dirname,
          '../plugins/lawn-care/backend/index.ts'
        ),
      },
      dedupe: ['react', 'react-dom'],
    },
    optimizeDeps: {
      include: ['react', 'react-dom'],
    },
    envDir: '../',
    server: {
      host: true, // Allow network access
    },
    test: {
      environment: 'node',
      globals: true,
    },
  };
});
