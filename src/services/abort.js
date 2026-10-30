/**
 * Cancellation helpers shared by the GitHub service and the analysis pipelines.
 *
 * Native fetch rejects with a DOMException named "AbortError", but some
 * environments (older jsdom versions, custom fetch wrappers) do not. Creating
 * our own error keeps cancellation detection consistent everywhere.
 */
export function createAbortError() {
  const err = new Error('The operation was aborted.')
  err.name = 'AbortError'
  return err
}

export function isAbortError(err) {
  return err?.name === 'AbortError'
}

export function throwIfAborted(signal) {
  if (signal?.aborted) throw createAbortError()
}
