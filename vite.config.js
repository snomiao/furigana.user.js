import { defineConfig } from 'vite';
import monkey from 'vite-plugin-monkey';


// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    monkey({
      entry: 'src/main.js',
      userscript: {
        icon: 'https://vitejs.dev/logo.svg',
        namespace: 'npm/vite-plugin-monkey',
        match: ['*://*/*'],
      },
    }),
  ],
  server: {
    port: 3000,
    allowedHosts: ['vscode'],
    host: '0.0.0.0',
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      credentials: true,
    },
    origin: 'http://vscode-3000.snomiao.dev',
  },
});
