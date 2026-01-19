import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: false,  // Disable DTS to avoid build issues
  splitting: false,
  sourcemap: false,
  clean: true,
  treeshake: true,
  outDir: 'dist',
});
