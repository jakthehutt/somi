const NEXTDNS_BASE = 'https://api.nextdns.io'

export interface DenylistEntry {
  id: string      // domain name, e.g. "evil.com"
  active: boolean
}

export class NextDNSClient {
  private readonly base: string
  private readonly headers: Record<string, string>

  constructor(profileId: string, apiKey: string) {
    this.base = `${NEXTDNS_BASE}/profiles/${profileId}/denylist`
    this.headers = {
      'X-Api-Key': apiKey,
      'Content-Type': 'application/json',
    }
  }

  private async request(path: string, init?: RequestInit): Promise<Response> {
    const res = await fetch(`${this.base}${path}`, {
      ...init,
      headers: { ...this.headers, ...(init?.headers ?? {}) },
    })
    if (!res.ok) {
      throw new Error(
        `NextDNS ${init?.method ?? 'GET'} ${this.base}${path} → ${res.status} ${res.statusText}`
      )
    }
    return res
  }

  async addDenylistDomain(domain: string): Promise<void> {
    await this.request('', {
      method: 'POST',
      body: JSON.stringify({ id: domain, active: true }),
    })
  }

  async removeDenylistDomain(domain: string): Promise<void> {
    await this.request(`/${encodeURIComponent(domain)}`, { method: 'DELETE' })
  }

  async listDenylist(): Promise<DenylistEntry[]> {
    const res = await this.request('', { method: 'GET' })
    const json = (await res.json()) as { data?: DenylistEntry[] }
    return json.data ?? []
  }
}
