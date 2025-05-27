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
        },
    },
    // ... any other configurations ...
});