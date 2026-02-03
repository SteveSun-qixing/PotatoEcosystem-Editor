import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import electron from 'vite-plugin-electron';
import renderer from 'vite-plugin-electron-renderer';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ command }) => {
  const isServe = command === 'serve';
  const isBuild = command === 'build';
  
  return {
    plugins: [
      vue(),
      electron([
        {
          // 主进程入口
          entry: 'electron/main.ts',
          onstart(options) {
            options.startup();
          },
          vite: {
            build: {
              sourcemap: isServe,
              minify: isBuild,
              outDir: 'dist-electron',
              rollupOptions: {
                external: ['electron'],
              },
            },
          },
        },
        {
          // 预加载脚本
          entry: 'electron/preload.ts',
          onstart(options) {
            options.reload();
          },
          vite: {
            build: {
              sourcemap: isServe ? 'inline' : undefined,
              minify: isBuild,
              outDir: 'dist-electron',
              rollupOptions: {
                external: ['electron'],
              },
            },
          },
        },
      ]),
      renderer(),
    ],
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
      },
    },
    server: {
      port: 3000,
      host: true,
    },
    build: {
      outDir: 'dist',
      sourcemap: true,
      minify: 'terser',
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'index.html'),
        },
      },
    },
    optimizeDeps: {
      include: ['vue', 'vue-router', 'pinia'],
    },
    clearScreen: false,
  };
});
