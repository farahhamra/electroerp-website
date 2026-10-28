import { defineConfig } from 'vite'
export default defineConfig({
  build: {
    outDir: 'dist-contracts',
    lib: { entry: 'src/core/index.ts', formats: ['es'], fileName: 'engine-contracts' },
    rolldownOptions: { external: ['zod'] },
  },
})
