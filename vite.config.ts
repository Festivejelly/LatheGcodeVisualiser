// vite.config.ts
import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig({
    define: {
        global: "window"
    },
    plugins: [viteSingleFile()],
    build: {
        outDir: 'dist'
    },
    server: {
        https: {
            key: './key.pem',
            cert: './cert.pem'
        },
        host: '0.0.0.0', // Allow access from other devices on network
    }
    // ... any other configurations ...
});