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
    // ... any other configurations ...
});