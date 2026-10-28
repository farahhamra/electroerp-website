import { readFile, writeFile, mkdir, mkdtemp, rm, rename, stat } from 'node:fs/promises'
import { resolve, dirname, join, relative } from 'node:path'
import { tmpdir } from 'node:os'
import { createHash } from 'node:crypto'
import { createServer, build } from 'vite'
const args = process.argv.slice(2),
  argument = (key, fallback) => {
    const at = args.indexOf(key)
    return at < 0 ? fallback : args[at + 1]
  }
const bootstrapFile = resolve(argument('--bootstrap', 'public/examples/engine-v2.json'))
const output = resolve(argument('--out', 'dist-static')),
  base = argument('--base', '/').replace(/\/?$/, '/'),
  origin = argument('--origin', '')
if (!/^\/(?!\/)/.test(base) && base !== '/')
  throw new Error('--base must be an absolute deployment path')
if ([resolve('.'), resolve('public'), resolve('src'), resolve('/')].includes(output))
  throw new Error('Refusing to replace a source/system directory')
try {
  await stat(output)
  await readFile(join(output, 'route-coverage.json'))
} catch (error) {
  if (error.code !== 'ENOENT') throw error
  if (await stat(output).catch(() => null))
    throw new Error('Existing output is not a generated storefront. Choose an empty destination.')
}
const bootstrap = JSON.parse(await readFile(bootstrapFile, 'utf8'))
const read = async (url) =>
  /^https?:/.test(url)
    ? await fetch(url).then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}: ${url}`)
        return r.json()
      })
    : JSON.parse(await readFile(resolve(dirname(bootstrapFile), url), 'utf8'))
const config = await read(bootstrap.configUrl),
  initialCatalog = await read(bootstrap.catalogUrl)
if (config.version !== 2)
  throw new Error('Static generation requires a v2 configuration. Run config:migrate first.')
if (config.routing?.mode && config.routing.mode !== 'history' && !args.includes('--history'))
  throw new Error(
    'Static generation requires history routing. Pass --history to generate a separate history-mode artifact.',
  )
config.routing = { ...config.routing, mode: 'history', basePath: base }
if (origin) config.seo = { ...config.seo, siteUrl: origin }
if (!config.seo?.siteUrl)
  throw new Error('A public HTTPS origin is required in seo.siteUrl or --origin')
const publicRoot = resolve('public')
const configPath = /^https?:/.test(bootstrap.configUrl)
  ? bootstrap.configUrl
  : relative(publicRoot, resolve(dirname(bootstrapFile), bootstrap.configUrl)).replaceAll('\\', '/')
if (configPath.startsWith('..')) throw new Error('Local store config must be under public/')
const stage = await mkdtemp(join(dirname(output), '.store-static-'))
const server = await createServer({
  server: { middlewareMode: true, watch: null, hmr: false },
  appType: 'custom',
})
try {
  const { resolveMedia } = await server.ssrLoadModule('/src/core/config/media.ts')
  const { normalizeStoreConfig } = await server.ssrLoadModule('/src/core/config/normalize.ts')
  const { installedEngine } = await server.ssrLoadModule('/src/engine/installed.ts')
  const { renderRoute } = await server.ssrLoadModule('/src/entry-server.tsx')
  const { pagePath, localePath } = await server.ssrLoadModule('/src/core/routing/links.ts')
  const { safeJson, escapeHtml, publicUrl } = await server.ssrLoadModule('/src/core/seo/head.ts')
  const assetOrigin = config.seo.siteUrl
  const prepared = resolveMedia(
    config,
    new URL(base.replace(/\/$/, '') + '/' + configPath, assetOrigin).href,
    true,
  )
  let catalog = resolveMedia(initialCatalog, new URL(base, assetOrigin).href, true)
  if (bootstrap.mode === 'api' && bootstrap.catalogCoverage !== 'complete') {
    if (!bootstrap.routesUrl)
      throw new Error(
        'Partial API catalogs require routesUrl enumeration; cannot claim complete SEO coverage.',
      )
    const products = new Map(),
      categories = new Map()
    let revision
    for (const locale of prepared.i18n.locales) {
      let cursor
      const cursors = new Set()
      do {
        const url = /^https?:/.test(bootstrap.routesUrl)
          ? new URL(bootstrap.routesUrl)
          : new URL(bootstrap.routesUrl, new URL(bootstrap.configUrl))
        url.searchParams.set('locale', locale.code)
        if (cursor) url.searchParams.set('cursor', cursor)
        const page = await read(url.href)
        if (revision && page.revision && revision !== page.revision)
          throw new Error('Catalog revision changed during route enumeration')
        revision ??= page.revision
        for (const p of page.products ?? []) {
          const existing = products.get(p.id)
          products.set(
            p.id,
            existing
              ? { ...existing, translations: { ...existing.translations, ...p.translations } }
              : p,
          )
        }
        for (const c of page.categories ?? []) {
          const existing = categories.get(c.id)
          categories.set(
            c.id,
            existing
              ? { ...existing, translations: { ...existing.translations, ...c.translations } }
              : c,
          )
        }
        cursor = page.nextCursor
        if (cursor && cursors.has(cursor)) throw new Error('Enumeration cursor loop')
        if (cursor) cursors.add(cursor)
        if (cursors.size > 10000) throw new Error('Enumeration exceeded the supported page limit')
      } while (cursor)
    }
    catalog = resolveMedia(
      { products: [...products.values()], categories: [...categories.values()] },
      new URL(base, assetOrigin).href,
      true,
    )
  }
  const normalized = normalizeStoreConfig(prepared, { ...catalog, registry: installedEngine })
  const revision = createHash('sha256')
    .update(JSON.stringify({ config: prepared, catalog }))
    .digest('hex')
    .slice(0, 16)
  await build({ base, build: { outDir: stage, emptyOutDir: false } })
  const template = await readFile(join(stage, 'index.html'), 'utf8')
  const routes = new Map()
  for (const locale of normalized.engine.i18n.locales) {
    const e = normalized.engine
    const add = (path) => {
      if (routes.has(path)) throw new Error(`Duplicate generated route: ${path}`)
      routes.set(path, locale.code)
    }
    for (const page of e.pages) if (page.enabled) add(pagePath(page, e, locale.code))
    add(localePath('/catalog', e, locale.code))
    for (const product of catalog.products) {
      if (locale.code !== e.i18n.defaultLocale && !product.translations?.[locale.code]) continue
      add(
        localePath(
          `/products/${encodeURIComponent(product.translations?.[locale.code]?.slug ?? product.slug)}`,
          e,
          locale.code,
        ),
      )
    }
    for (const category of catalog.categories) {
      if (locale.code !== e.i18n.defaultLocale && !category.translations?.[locale.code]) continue
      add(
        localePath(
          `/categories/${encodeURIComponent(category.translations?.[locale.code]?.slug ?? category.slug ?? category.id)}`,
          e,
          locale.code,
        ),
      )
    }
  }
  const coverage = []
  for (const [path, locale] of routes) {
    const snapshot = {
      version: 1,
      config: prepared,
      ...catalog,
      locale,
      mode: bootstrap.mode,
      revision,
    }
    const rendered = await renderRoute(snapshot, path)
    const theme = Object.entries(rendered.theme)
      .map(([k, v]) => `--${k}:${v}`)
      .join(';')
    const html = template
      .replace(
        /<html[^>]*>/,
        `<html lang="${escapeHtml(locale)}" dir="${rendered.dir}" style="${escapeHtml(theme)}" data-motion="${normalized.theme.motion}">`,
      )
      .replace(/<title>.*?<\/title>/s, '')
      .replace(/<meta name="description"[^>]*>/, '')
      .replace('</head>', rendered.head + '</head>')
      .replace(
        '<div id="root"></div>',
        `<div id="root">${rendered.html}</div><script id="store-snapshot" type="application/json">${safeJson({ version: 1, configUrl: base + `snapshots/${revision}/store.json`, catalogUrl: base + `snapshots/${revision}/catalog.json`, locale, mode: bootstrap.mode, revision })}</script>`,
      )
    const decoded = decodeURIComponent(path).replace(/^\//, '').replace(/\/$/, '')
    if (decoded.split('/').some((p) => p === '..' || p === '.') || decoded.includes('\\'))
      throw new Error('Unsafe output path')
    const destination = join(stage, decoded, 'index.html')
    await mkdir(dirname(destination), { recursive: true })
    await writeFile(destination, html)
    coverage.push({
      path,
      locale,
      index: !rendered.metadata.robots.startsWith('noindex'),
      canonical: rendered.metadata.canonical,
      alternates: rendered.metadata.alternates,
    })
  }
  const urls = coverage.filter((r) => r.index && r.canonical)
  const sitemapFiles = []
  const sitemapHeader =
    '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">'
  let sitemapEntries = [],
    sitemapBytes = Buffer.byteLength(sitemapHeader) + 9
  async function flushSitemap() {
    if (!sitemapEntries.length) return
    const name = `sitemap-${sitemapFiles.length + 1}.xml`
    sitemapFiles.push(name)
    await writeFile(join(stage, name), sitemapHeader + sitemapEntries.join('') + '</urlset>')
    sitemapEntries = []
    sitemapBytes = Buffer.byteLength(sitemapHeader) + 9
  }
  for (const route of urls) {
    const entry = `<url><loc>${escapeHtml(route.canonical)}</loc>${route.alternates.map((alternate) => `<xhtml:link rel="alternate" hreflang="${escapeHtml(alternate.locale)}" href="${escapeHtml(alternate.href)}"/>`).join('')}</url>`
    const bytes = Buffer.byteLength(entry)
    if (sitemapEntries.length >= 10000 || sitemapBytes + bytes > 49 * 1024 * 1024)
      await flushSitemap()
    sitemapEntries.push(entry)
    sitemapBytes += bytes
  }
  await flushSitemap()
  await writeFile(
    join(stage, 'sitemap.xml'),
    '<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' +
      sitemapFiles
        .map(
          (name) =>
            `<sitemap><loc>${escapeHtml(publicUrl(name, assetOrigin, base))}</loc></sitemap>`,
        )
        .join('') +
      '</sitemapindex>',
  )
  await writeFile(
    join(stage, 'robots.txt'),
    `User-agent: *\nAllow: /\nSitemap: ${publicUrl('sitemap.xml', assetOrigin, base)}\n`,
  )
  const notFoundSnapshot = {
    version: 1,
    config: prepared,
    ...catalog,
    locale: normalized.engine.i18n.defaultLocale,
    mode: bootstrap.mode,
    revision,
  }
  const notFound = await renderRoute(notFoundSnapshot, '/__not-found')
  await writeFile(
    join(stage, '404.html'),
    template
      .replace(/<title>.*?<\/title>/s, '')
      .replace(/<meta name="description"[^>]*>/, '')
      .replace('</head>', notFound.head + '</head>')
      .replace(
        '<div id="root"></div>',
        `<div id="root">${notFound.html}</div><script id="store-snapshot" type="application/json">${safeJson({ version: 1, configUrl: base + `snapshots/${revision}/store.json`, catalogUrl: base + `snapshots/${revision}/catalog.json`, locale: normalized.engine.i18n.defaultLocale, mode: bootstrap.mode, revision })}</script>`,
      ),
  )
  await writeFile(
    join(stage, 'app.html'),
    template.replace('</head>', '<meta name="robots" content="noindex,follow"></head>'),
  )
  await writeFile(
    join(stage, 'route-coverage.json'),
    JSON.stringify({ revision, complete: true, routes: coverage }, null, 2) + '\n',
  )
  await writeFile(
    join(stage, 'storefront.json'),
    JSON.stringify(
      {
        ...bootstrap,
        revision,
        configUrl: 'generated-store.json',
        catalogUrl: 'generated-catalog.json',
      },
      null,
      2,
    ) + '\n',
  )
  await mkdir(join(stage, 'snapshots', revision), { recursive: true })
  await writeFile(join(stage, 'snapshots', revision, 'store.json'), JSON.stringify(prepared) + '\n')
  await writeFile(
    join(stage, 'snapshots', revision, 'catalog.json'),
    JSON.stringify(catalog) + '\n',
  )
  await writeFile(join(stage, 'generated-store.json'), JSON.stringify(prepared, null, 2) + '\n')
  await writeFile(join(stage, 'generated-catalog.json'), JSON.stringify(catalog, null, 2) + '\n')
  const backup = output + '.previous'
  if (await stat(backup).catch(() => null))
    throw new Error('Previous backup exists; inspect it before replacing output')
  const exists = await stat(output).catch(() => null)
  if (exists) await rename(output, backup)
  try {
    await rename(stage, output)
  } catch (error) {
    if (exists) await rename(backup, output)
    throw error
  }
  if (exists) await rm(backup, { recursive: true, force: true })
  console.log(
    `Generated ${routes.size} routes (${urls.length} indexable), revision ${revision}, at ${output}`,
  )
} finally {
  await server.close()
  await rm(stage, { recursive: true, force: true })
}
