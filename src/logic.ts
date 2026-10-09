export type Page = 'main' | 'find' | 'charts' | 'music' | 'dyp'

export const PATH: Record<Page, string> = {
  main: '/',
  find: '/find-me',
  charts: '/charts',
  music: '/music',
  dyp: '/dyp',
}

export const FILTERS = ['ALL', 'ARCAEA', 'PHIGROS', 'PULSUS'] as const
export type Filter = (typeof FILTERS)[number]

export type Link = { href: string; label: string }

const TITLES: Record<string, string> = {
  'github.com': 'GitHub',
  'steamcommunity.com': 'Steam',
  'roblox.com': 'Roblox',
  'youtube.com': 'YouTube',
  'tiktok.com': 'TikTok',
  'instagram.com': 'Instagram',
}

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg)
}

export function pageFromPath(path: string): Page {
  const bare = path.length > 1 ? path.replace(/\/$/, '') : path
  const hit = (Object.entries(PATH) as [Page, string][]).find(([, href]) => href === bare)
  return hit ? hit[0] : 'main'
}

export function filterLabel(filter: Filter): string {
  if (filter === 'ALL') return 'All'
  if (filter === 'ARCAEA') return 'Arcaea'
  if (filter === 'PHIGROS') return 'Phigros'
  return 'Pulsus'
}

export function matches(game: string, filter: Filter): boolean {
  return filter === 'ALL' || game === filter
}

const PHIGROS_TONE: Record<string, string> = { EZ: '#4ec8ea', HD: '#8ed45a', IN: '#f25a78', AT: '#d0d0d0' }
const ARCAEA_TONE: Record<string, string> = { Past: '#4aa3ff', Present: '#6dce6a', Future: '#b07cff', Beyond: '#ff5a7a' }

export function diffMark(game: string, diff: string): { name: string; level: string; tone: string } {
  if (game === 'PHIGROS') {
    const name = diff.match(/\b(EZ|HD|IN|AT)\b/)?.[1] ?? ''
    const level = diff.match(/\d+(?:\.\d+)?/g)?.at(-1) ?? ''
    return { name, level, tone: PHIGROS_TONE[name] ?? '#fff' }
  }
  if (game === 'ARCAEA') {
    const name = diff.match(/\b(Past|Present|Future|Beyond)\b/)?.[1] ?? ''
    const level = diff.match(/\d+\+?/)?.[0] ?? ''
    return { name, level, tone: ARCAEA_TONE[name] ?? '#fff' }
  }
  return { name: '★', level: diff.match(/\d+(?:\.\d+)?/)?.[0] ?? '', tone: '#fff' }
}

export function isHard(game: string, diff: string): boolean {
  if (game === 'ARCAEA') return false
  const nums = diff.match(/\d+(?:\.\d+)?/g)
  const n = nums ? parseFloat(nums[nums.length - 1]) : Number.NaN
  if (Number.isNaN(n)) return false
  if (game === 'PULSUS') return n >= 10
  if (game === 'PHIGROS') return n >= 15
  return false
}

export function safeHref(url: string): string {
  if (url.startsWith('/') && !url.startsWith('//')) return url
  const parsed = new URL(url)
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') throw new Error('blocked url')
  return parsed.href
}

export function esc(value: string): string {
  return value.replace(/[&<>"']/g, (ch) => {
    const map: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }
    return map[ch]
  })
}

function labelFor(url: string): string {
  const host = new URL(url).hostname.replace(/^www\./, '')
  return TITLES[host] ?? host
}

export function parseSocio(raw: string): { stoy: Link[]; dyp: Link[] } {
  const out = { stoy: [] as Link[], dyp: [] as Link[] }
  let who: 'stoy' | 'dyp' | null = null
  for (const line of raw.split('\n')) {
    const text = line.trim()
    if (!text) continue
    if (text === 'stoy:') {
      who = 'stoy'
      continue
    }
    if (text === 'dyp:') {
      who = 'dyp'
      continue
    }
    if (!who) continue
    out[who].push({ href: safeHref(text), label: labelFor(text) })
  }
  return out
}

export function selfCheck() {
  assert(isHard('PULSUS', '★ 11.08'), 'pulsus 11')
  assert(isHard('PULSUS', '★ 15.67'), 'pulsus 15')
  assert(!isHard('PULSUS', '★ 9.52'), 'pulsus 9')
  assert(isHard('PHIGROS', 'IN Lv.15'), 'phigros 15')
  assert(isHard('PHIGROS', 'IN Lv.16'), 'phigros 16')
  assert(!isHard('PHIGROS', 'IN Lv.13'), 'phigros 13')
  assert(!isHard('ARCAEA', 'Future 10'), 'arcaea 10')
  assert(!isHard('ARCAEA', 'Future 9+'), 'arcaea 9')
  assert(diffMark('PHIGROS', 'IN Lv.15').name === 'IN' && diffMark('PHIGROS', 'IN Lv.15').level === '15', 'phigros in')
  assert(diffMark('PHIGROS', 'AT Lv.15').name === 'AT', 'phigros at')
  assert(diffMark('ARCAEA', 'Future 9+').name === 'Future' && diffMark('ARCAEA', 'Future 9+').level === '9+', 'arcaea mark')
  assert(diffMark('PULSUS', '★ 11.08').name === '★' && diffMark('PULSUS', '★ 11.08').level === '11.08', 'pulsus mark')
  assert(pageFromPath('/dyp') === 'dyp', 'dyp')
  assert(pageFromPath('/find-me/') === 'find', 'slash')
  assert(pageFromPath('/nope') === 'main', 'fallback')
  assert(matches('ARCAEA', 'ALL') && !matches('ARCAEA', 'PULSUS'), 'filter')
  assert(safeHref('/charts/goldenhourxplosn.arcpkg').startsWith('/charts/'), 'file')
  const links = parseSocio(`stoy:
https://github.com/stoy109
https://steamcommunity.com/id/stoy109
https://www.roblox.com/users/465013391/
https://youtube.com/@yots1094

dyp:
https://tiktok.com/@dypu119
https://www.instagram.com/dyp11.9
`)
  assert(links.stoy.map((link) => link.label).join() === 'GitHub,Steam,Roblox,YouTube', 'stoy labels')
  assert(links.dyp.map((link) => link.label).join() === 'TikTok,Instagram', 'dyp labels')
  let blocked = false
  try {
    safeHref('javascript:alert(1)')
  } catch {
    blocked = true
  }
  assert(blocked, 'protocol')
}

selfCheck()
