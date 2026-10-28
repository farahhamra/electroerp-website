import type { z } from 'zod'
import type { Diagnostic } from './contracts'
export function diagnostic(
  code: string,
  path: (string | number)[],
  message: string,
  severity: Diagnostic['severity'] = 'error',
): Diagnostic {
  return {
    code,
    path,
    pointer: path.length
      ? '/' + path.map((v) => String(v).replace(/~/g, '~0').replace(/\//g, '~1')).join('/')
      : '',
    message,
    severity,
  }
}
export function zodDiagnostics(error: z.ZodError, prefix: (string | number)[] = []): Diagnostic[] {
  return error.issues.map((issue) =>
    diagnostic(
      `config.${issue.code}`,
      [...prefix, ...issue.path.map((p) => (typeof p === 'number' ? p : String(p)))],
      issue.message,
    ),
  )
}
export class ConfigurationError extends Error {
  constructor(public diagnostics: Diagnostic[]) {
    super('Storefront configuration is invalid')
    this.name = 'ConfigurationError'
  }
}

export function stableDiagnostics(diagnostics: Diagnostic[]): Diagnostic[] {
  const unique = new Map(
    diagnostics.map((value) => [
      JSON.stringify([value.code, value.pointer, value.severity, value.message]),
      value,
    ]),
  )
  return [...unique.values()].sort(
    (a, b) =>
      a.pointer.localeCompare(b.pointer, 'en') ||
      a.code.localeCompare(b.code, 'en') ||
      a.message.localeCompare(b.message, 'en'),
  )
}
