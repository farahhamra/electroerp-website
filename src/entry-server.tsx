import React, { Suspense } from 'react'
import { renderToPipeableStream } from 'react-dom/server'
import { StaticRouter } from 'react-router-dom'
import { PassThrough } from 'node:stream'
import { ApplicationContent } from './app/EngineApp'
import { snapshotData, type Snapshot } from './core/seo/snapshot'
import { buildHead, headTags } from './core/seo/head'
import { themeVariables } from './core/theme/apply'
export async function renderRoute(snapshot: Snapshot, path: string) {
  const { data, provider } = snapshotData(snapshot)
  const html = await new Promise<string>((resolve, reject) => {
    const stream = new PassThrough()
    let result = '',
      failed = false
    stream.on('data', (chunk) => (result += String(chunk)))
    stream.on('end', () => (failed ? undefined : resolve(result)))
    stream.on('error', reject)
    const { pipe, abort } = renderToPipeableStream(
      <React.StrictMode>
        <Suspense
          fallback={
            <div className="startup-state" role="status">
              Loading…
            </div>
          }
        >
          <StaticRouter location={path}>
            <ApplicationContent data={data} provider={provider} />
          </StaticRouter>
        </Suspense>
      </React.StrictMode>,
      {
        onAllReady() {
          pipe(stream)
        },
        onError(error) {
          failed = true
          reject(error)
        },
      },
    )
    const timeout = setTimeout(() => {
      abort()
      reject(new Error('Static render timed out'))
    }, 30000)
    stream.on('end', () => clearTimeout(timeout))
  })
  const head = buildHead(data, path)
  return {
    html,
    head: headTags(head),
    metadata: head,
    lang: data.config.locale,
    dir: data.config.engine!.i18n.locales.find((l) => l.code === data.config.locale)!.direction,
    theme: themeVariables(data.config),
  }
}
