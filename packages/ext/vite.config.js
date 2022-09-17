import { resolve } from 'node:path';

import { svelte } from '@sveltejs/vite-plugin-svelte';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';

import pkg from './package.json'

const ctxdir = dirname(fileURLToPath(import.meta.url));
const minify = process.env.DEBUG !== '1' && process.env.APP_ENV !== 'dev';
const mv = process.env.MV || '3';

// https://vitejs.dev/config/
export default defineConfig({
  define: {
    __APP_ENV__: JSON.stringify(process.env.APP_ENV || ''),
  },
  plugins: [
    svelte(),
    manifest(),
    viteStaticCopy({
      targets: [
        { src: 'images', dest: './' },
        { src: 'src/lib/cnt/retrieveMeta.js', dest: './' },
      ],
    }),
  ],
  resolve: {
    alias: { $lib: resolve(ctxdir, 'src/lib') },
  },
  build: {
    minify,
    target: 'esnext',
    assetsInlineLimit: 100000000,
    chunkSizeWarningLimit: 100000000,
    cssCodeSplit: false,

    polyfillModulePreload: false,
    modulePreload: {
      polyfill: false,
    },

    rollupOptions: {
      input: {
        options: resolve(ctxdir, 'options.html'),
        popup: resolve(ctxdir, 'popup.html'),
        background: resolve(ctxdir, 'background.html'),
        ...(process.env.APP_ENV === 'dev' ? { index: resolve(ctxdir, 'index.html') } : undefined),
      },
      output: {
        assetFileNames: '[name].[ext]',
        entryFileNames: '[name].js',
        manualChunks: {},
        // manualChunks: (id) => {
        //   if (id.endsWith('src/content.ts') || /\/lib\/cnt\//.test(id)) {
        //     return 'content';
        //   } else if (id.endsWith('background.ts')) {
        //     return 'xxbackground';
        //     // } else {
        //     //   return "ui-chunk.js";
        //   }
        // },
      },
    },
  },
});

function manifest() {
  const icons = {
    16: '/images/cherry-16.png',
    32: '/images/cherry-32.png',
    48: '/images/cherry-48.png',
    128: '/images/cherry-128.png',
  };
  const action = {
    default_popup: 'popup.html',
    default_icon: icons,
  };
  const base = {
    name: 'Cherry Browser extension',
    description: 'Browser extension for Cherry the open source self-hostable bookmark service',
    version: pkg.version,
    options_ui: { page: 'options.html', browser_style: false, open_in_tab: true },
    icons,
  };
  const mv3 = {
    ...base,
    manifest_version: 3,
    permissions: ['storage', 'activeTab', 'scripting'],
    host_permissions: ['http://*/*', 'https://*/*'],

    // action is mv3+
    action,

    background: {
      service_worker: 'background.js',
      type: 'module',
    },
  };
  const mv2 = {
    ...base,
    manifest_version: 2,
    browser_action: action,
    browser_specific_settings: {
      gecko: {
        id: 'ext@cherry.haishan.me',
        strict_min_version: '101.0',
      },
    },

    permissions: [
      'storage',
      'activeTab',
      'scripting',

      // without these we will be block by The Same Origin Policy
      //
      // we have to ask these host permissions since we have no idea
      // which domain will people for their self-hosted cherry instance
      'https://*/*',
      'http://*/*',
    ],
    background: {
      page: 'background.html',
      persistent: false,
    },
  };

  return {
    name: 'manifest',
    async generateBundle(__output, __bundle) {
      const file = {
        type: 'asset',
        source: JSON.stringify(mv === '2' ? mv2 : mv3, null, 2),
        name: 'Browser extension manifest',
        fileName: 'manifest.json',
      };
      this.emitFile(file);
    },
  };
}
