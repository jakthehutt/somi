import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextDNSClient, type DenylistEntry } from '../src/lib/nextdns'

const PROFILE = 'test-profile-id'
const API_KEY = 'test-api-key'
const BASE    = `https://api.nextdns.io/profiles/${PROFILE}/denylist`

// ── fetch mock helpers ────────────────────────────────────────────────────────

type FetchMock = ReturnType<typeof vi.fn>
let fetchMock: FetchMock

beforeEach(() => {
  fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

function ok(body: unknown = {}): void {
  fetchMock.mockResolvedValue({
    ok: true,
    status: 200,
    statusText: 'OK',
    json: async () => body,
  })
}

function fail(status: number, statusText = 'Error'): void {
  fetchMock.mockResolvedValue({ ok: false, status, statusText })
}

// ── tests ─────────────────────────────────────────────────────────────────────

describe('NextDNSClient', () => {
  let client: NextDNSClient

  beforeEach(() => {
    client = new NextDNSClient(PROFILE, API_KEY)
  })

  // ── addDenylistDomain ──────────────────────────────────────────────────────

  describe('addDenylistDomain', () => {
    it('POSTs to the denylist endpoint with the correct body', async () => {
      ok()
      await client.addDenylistDomain('evil.com')

      expect(fetchMock).toHaveBeenCalledOnce()
      const [url, opts] = fetchMock.mock.calls[0] as [string, RequestInit]
      expect(url).toBe(BASE)
      expect(opts.method).toBe('POST')
      expect(JSON.parse(opts.body as string)).toEqual({ id: 'evil.com', active: true })
    })

    it('sends the X-Api-Key header', async () => {
      ok()
      await client.addDenylistDomain('evil.com')

      const [, opts] = fetchMock.mock.calls[0] as [string, RequestInit & { headers: Record<string, string> }]
      expect(opts.headers['X-Api-Key']).toBe(API_KEY)
    })

    it('resolves void on success', async () => {
      ok()
      await expect(client.addDenylistDomain('evil.com')).resolves.toBeUndefined()
    })

    it('throws a descriptive error on non-2xx response', async () => {
      fail(422, 'Unprocessable Entity')
      await expect(client.addDenylistDomain('evil.com')).rejects.toThrow('422')
    })
  })

  // ── removeDenylistDomain ───────────────────────────────────────────────────

  describe('removeDenylistDomain', () => {
    it('DELETEs to the domain-specific URL', async () => {
      ok()
      await client.removeDenylistDomain('evil.com')

      const [url, opts] = fetchMock.mock.calls[0] as [string, RequestInit]
      expect(url).toBe(`${BASE}/evil.com`)
      expect(opts.method).toBe('DELETE')
    })

    it('URL-encodes domains with special characters', async () => {
      ok()
      await client.removeDenylistDomain('sub.evil domain.com')

      const [url] = fetchMock.mock.calls[0] as [string]
      expect(url).toBe(`${BASE}/${encodeURIComponent('sub.evil domain.com')}`)
    })

    it('sends the X-Api-Key header', async () => {
      ok()
      await client.removeDenylistDomain('evil.com')

      const [, opts] = fetchMock.mock.calls[0] as [string, RequestInit & { headers: Record<string, string> }]
      expect(opts.headers['X-Api-Key']).toBe(API_KEY)
    })

    it('throws on non-2xx response', async () => {
      fail(404, 'Not Found')
      await expect(client.removeDenylistDomain('evil.com')).rejects.toThrow('404')
    })
  })

  // ── listDenylist ───────────────────────────────────────────────────────────

  describe('listDenylist', () => {
    it('GETs the denylist and returns entries', async () => {
      const entries: DenylistEntry[] = [
        { id: 'evil.com', active: true },
        { id: 'bad.com', active: false },
      ]
      ok({ data: entries })

      const result = await client.listDenylist()
      expect(result).toEqual(entries)
    })

    it('returns empty array when data field is absent', async () => {
      ok({})
      await expect(client.listDenylist()).resolves.toEqual([])
    })

    it('sends GET to the base denylist URL', async () => {
      ok({ data: [] })
      await client.listDenylist()

      const [url, opts] = fetchMock.mock.calls[0] as [string, RequestInit]
      expect(url).toBe(BASE)
      expect(opts.method).toBe('GET')
    })

    it('throws on non-2xx response', async () => {
      fail(401, 'Unauthorized')
      await expect(client.listDenylist()).rejects.toThrow('401')
    })
  })
})
