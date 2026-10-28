import { writeFile } from 'node:fs/promises'
import { createServer } from 'vite'
import { format, resolveConfig } from 'prettier'

// Load the same TypeScript/Zod contract used by the storefront; no second schema to maintain.
const server = await createServer({
  server: { middlewareMode: true, watch: null, hmr: false },
  appType: 'custom',
})
try {
  const { configSchema } = await server.ssrLoadModule('/src/core/schema.ts')
  const schema = configSchema.toJSONSchema({ io: 'input' })
  schema.title = 'ElectroERP storefront configuration'
  schema.description =
    'Runtime store configuration. See docs/customization.md for layout options and examples.'
  const path = 'public/store-config.schema.json'
  const output = await format(JSON.stringify(schema), {
    ...(await resolveConfig(path)),
    parser: 'json',
  })
  await writeFile(path, output)
  const { exportV2Schema } = await server.ssrLoadModule('/src/core/config/export.ts')
  const { installedEngine } = await server.ssrLoadModule('/src/engine/installed.ts')
  for (const [target, document] of [
    ['public/store-config.v2.schema.json', exportV2Schema(installedEngine)],
    ['public/engine-capabilities.json', installedEngine.capabilities()],
  ])
    await writeFile(target, await format(JSON.stringify(document), { parser: 'json' }))
} finally {
  await server.close()
}
