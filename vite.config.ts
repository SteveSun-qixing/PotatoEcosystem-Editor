import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import electron from 'vite-plugin-electron';
import renderer from 'vite-plugin-electron-renderer';
import { existsSync, statSync } from 'fs';
import { resolve, sep } from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ command }) => {
  const isServe = command === 'serve';
  const isBuild = command === 'build';
  const editorSrc = resolve(__dirname, 'src');
  const componentLibSrc = resolve(__dirname, '../Chips-ComponentLibrary/src');
  const componentLibSegment = `${sep}Chips-ComponentLibrary${sep}src${sep}`;
  const isComponentLibImporter = (importer?: string) => {
    if (!importer) return false;
    return (
      importer.includes(componentLibSegment) ||
      importer.includes('/Chips-ComponentLibrary/src/') ||
      importer.includes('\\Chips-ComponentLibrary\\src\\')
    );
  };
  const resolveFromBase = (baseDir: string, source: string) => {
    const relativePath = source.slice(2);
    const basePath = resolve(baseDir, relativePath);
    if (existsSync(basePath)) {
      const stats = statSync(basePath);
      if (stats.isDirectory()) {
        const indexCandidates = [
          'index.ts',
          'index.tsx',
          'index.js',
          'index.mjs',
          'index.cjs',
          'index.vue',
          'index.json',
        ];
        for (const candidate of indexCandidates) {
          const resolved = resolve(basePath, candidate);
          if (existsSync(resolved)) {
            return resolved;
          }
        }
      } else {
        return basePath;
      }
    }
    const extCandidates = ['.ts', '.tsx', '.js', '.mjs', '.cjs', '.vue', '.json'];
    for (const ext of extCandidates) {
      const resolved = `${basePath}${ext}`;
      if (existsSync(resolved)) {
        return resolved;
      }
    }
    return basePath;
  };
  const resolveAtAlias = (source: string, importer?: string) => {
    const targetBase = isComponentLibImporter(importer) ? componentLibSrc : editorSrc;
    return resolveFromBase(targetBase, source);
  };
  
  return {
    plugins: [
      vue(),
      {
        name: 'chips-component-alias',
        enforce: 'pre',
        resolveId(source, importer) {
          if (!importer || !source.startsWith('@/')) return null;
          return resolveAtAlias(source, importer);
        },
      },
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
        '@chips/components': resolve(__dirname, '../Chips-ComponentLibrary/src'),
      },
    },
    server: {
      port: 3000,
      host: true,
      fs: {
        allow: [resolve(__dirname, '..')],
      },
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
      esbuildOptions: {
        plugins: [
          {
            name: 'chips-component-esbuild-alias',
            setup(build) {
              build.onResolve({ filter: /^@\// }, (args) => {
                return { path: resolveAtAlias(args.path, args.importer) };
              });
            },
          },
        ],
      },
    },
    clearScreen: false,
  };
});
