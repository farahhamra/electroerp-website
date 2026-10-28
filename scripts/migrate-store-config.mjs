import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { createServer } from 'vite'
const [input, output, ...args] = process.argv.slice(2)
if (!input || !output)
  throw new Error(
    'Usage: npm run config:migrate -- input.json output.json [--asset-base https://store.example.com/]',
  )
if (resolve(input) === resolve(output))
  throw new Error('Migration never overwrites its input. Choose another output file.')
const raw = JSON.parse(await readFile(input, 'utf8'))
const server = await createServer({
  server: { middlewareMode: true, watch: null, hmr: false },
  appType: 'custom',
})
try {
  const { migrateV1, validateStoreConfig } = await server.ssrLoadModule(
    '/src/core/config/normalize.ts',
  )
  const { resolveMedia } = await server.ssrLoadModule('/src/core/config/media.ts')
  const at = args.indexOf('--asset-base')
  const source = at < 0 ? raw : resolveMedia(raw, args[at + 1])
  const migrated = JSON.parse(JSON.stringify(migrateV1(source)))
  const result = validateStoreConfig(migrated)
  if (!result.ok) throw new Error(JSON.stringify(result.diagnostics, null, 2))
  await writeFile(output, JSON.stringify(migrated, null, 2) + '\n', { flag: 'wx' })
  await writeFile(
    output + '.diagnostics.json',
    JSON.stringify(result.diagnostics, null, 2) + '\n',
    { flag: 'wx' },
  )
  console.log(
    `Migrated to ${output}. ${result.diagnostics.length} diagnostic(s). ${at < 0 ? 'Relative media paths must be adjusted for v2 configuration-relative resolution; use --asset-base to preserve existing absolute destinations.' : ''}`,
  )
} finally {
  await server.close()
}
