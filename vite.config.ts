// vite.config.ts
import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig({
    define: {
        global: "window"
    },
    plugins: [viteSingleFile()],
    build: {
        outDir: 'docs'
    },
    server: {
        https: {
            key: './key.pem',
            cert: './cert.pem'
        },
        host: true, // Allows access from other devices on the network
        allowedHosts: true,
        proxy: {
            '/api': 'http://localhost:3001'  // Proxy API calls to your HTTP backend
        }
    }
    // ... any other configurations ...
});