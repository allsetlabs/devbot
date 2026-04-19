/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';

const certDir = path.resolve(__dirname, '../certs');
const certPath = path.join(certDir, 'cert.pem');
const keyPath = path.join(certDir, 'key.pem');
const hasCerts = fs.existsSync(certPath) && fs.existsSync(keyPath);

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
      host: true,
      ...(hasCerts && {
        https: {
          cert: fs.readFileSync(certPath),
          key: fs.readFileSync(keyPath),
        },
      }),
    },
    test: {
      environment: 'node',
      globals: true,
    },
  };
});
