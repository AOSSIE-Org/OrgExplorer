import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { fetchContributors, fetchIssues, fetchPulls, fetchRepos } from './github'

// The service writes through to IndexedDB, which jsdom does not implement.
// Every cache helper already swallows its own errors, so a stub that always
// rejects exercises the real cache-miss path without touching storage.
const failingIndexedDB = {
  open: () => {
    const req = {}
    queueMicrotask(() => req.onerror?.())
    return req
  },
}

function jsonResponse(body, { status = 200, headers = {} } = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: k => headers[k] ?? null },
    text: async () => JSON.stringify(body),
  }
}

/** A body that is not JSON at all, e.g. a proxy error page or a truncated response. */
function textResponse(body, { status = 200 } = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => null },
    text: async () => body,
  }
}

/** GitHub answers 204 No Content for repos with no contributors; the body is empty. */
function noContentResponse() {
  return {
    ok: true,
    status: 204,
    headers: { get: () => null },
    text: async () => '',
  }
}

beforeEach(() => {
  vi.stubGlobal('indexedDB', failingIndexedDB)
  vi.stubGlobal('fetch', vi.fn())
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('paginated fetchers: response validation', () => {
  it('returns an empty list when GitHub answers 204 No Content', async () => {
    // A repo with no commits yet returns 204 from /contributors. Before the
    // guard, res.json() threw and the whole fetch rejected, so explore()'s
    // Promise.allSettled dropped the repo from the contributor map silently.
    fetch.mockResolvedValue(noContentResponse())

    await expect(fetchContributors('AOSSIE-Org', 'EmptyRepo', 'pat')).resolves.toEqual([])
  })

  it('returns an empty list when the payload is an object rather than an array', async () => {
    // Any non-array body used to reach `all.push(...data)` and throw
    // "TypeError: data is not iterable".
    fetch.mockResolvedValue(jsonResponse({ message: 'Moved Permanently' }))

    await expect(fetchIssues('AOSSIE-Org', 'Renamed', 'pat')).resolves.toEqual([])
  })

  it('returns an empty list when the payload is null', async () => {
    fetch.mockResolvedValue(jsonResponse(null))

    await expect(fetchPulls('AOSSIE-Org', 'Whatever', 'pat')).resolves.toEqual([])
  })

  it('returns an empty list when the body is not valid JSON', async () => {
    // A proxy error page or a truncated response reaches JSON.parse, which
    // threw before the try/catch and rejected the whole fetch.
    fetch.mockResolvedValue(textResponse('<html>502 Bad Gateway</html>'))

    await expect(fetchIssues('AOSSIE-Org', 'Proxied', 'pat')).resolves.toEqual([])
  })

  it('keeps the pages collected before an unparseable page appears', async () => {
    // Same guarantee as the malformed-object case, but for a body that cannot
    // be parsed at all rather than one that parses to a non-array.
    const fullPage = Array.from({ length: 100 }, (_, i) => ({ id: i }))

    fetch
      .mockResolvedValueOnce(jsonResponse(fullPage))
      .mockResolvedValueOnce(textResponse('{ truncated'))

    await expect(fetchContributors('AOSSIE-Org', 'Cut', 'pat')).resolves.toHaveLength(100)
    // Without this the test would also pass if pagination stopped after page 1
    // and the unparseable page was never requested at all.
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('keeps the pages collected before a malformed page appears', async () => {
    // A full first page must still count even if page 2 comes back malformed.
    const fullPage = Array.from({ length: 100 }, (_, i) => ({ id: i }))

    fetch
      .mockResolvedValueOnce(jsonResponse(fullPage))
      .mockResolvedValueOnce(jsonResponse({ message: 'Server Error' }))

    await expect(fetchContributors('AOSSIE-Org', 'Big', 'pat')).resolves.toHaveLength(100)
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('stops paginating as soon as a malformed page is returned', async () => {
    fetch.mockResolvedValue(jsonResponse({ message: 'Server Error' }))

    await fetchIssues('AOSSIE-Org', 'Broken', 'pat')

    // maxPages is 10 for PAT users; without the break it would burn all ten.
    expect(fetch).toHaveBeenCalledTimes(1)
  })
})

describe('paginated fetchers: happy path', () => {
  it('stops at the first partial page', async () => {
    fetch.mockResolvedValueOnce(jsonResponse([{ id: 1 }, { id: 2 }]))

    await expect(fetchContributors('AOSSIE-Org', 'Small', 'pat')).resolves.toHaveLength(2)
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('follows pagination while pages come back full', async () => {
    const fullPage = Array.from({ length: 100 }, (_, i) => ({ id: i }))

    fetch
      .mockResolvedValueOnce(jsonResponse(fullPage))
      .mockResolvedValueOnce(jsonResponse([{ id: 100 }]))

    await expect(fetchRepos('AOSSIE-Org', 150, 'pat')).resolves.toHaveLength(101)
    expect(fetch).toHaveBeenCalledTimes(2)
  })
})
