import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  sourcemap: false,
  splitting: false,
  treeshake: true,
  minify: true,
  banner: {
    js: '#!/usr/bin/env node',
  },
  // Inline `.md` imports (e.g. SKILL.md) as string literals into the
  // bundle via esbuild's text loader. This keeps SKILL.md authored as
  // real Markdown at the repo root (discoverable by agents, Context7,
  // GitHub's README-style rendering) while the shipped CLI has no
  // runtime file-system dependency on it.
  loader: {
    '.md': 'text',
  },
});
