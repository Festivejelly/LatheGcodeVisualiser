// vite.config.ts
import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig({
    define: {
        global: "window",
    },
    plugins: [viteSingleFile()],
    build: {
        outDir: 'docs'
    },
    server: {
        headers: {
            'Cross-Origin-Opener-Policy': 'same-origin',
            'Cross-Origin-Resource-Policy': 'same-origin',
            'Content-Security-Policy': "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: data: https://www.gstatic.com;"
        },
    },
    // ... any other configurations ...
});