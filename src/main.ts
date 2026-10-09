import gsap from 'gsap'
import { audioTracks, chartLevels } from '../data'
import socioRaw from '../Socio.txt?raw'
import { Cube } from './cube'
import {
  FILTERS,
  PATH,
  esc,
  filterLabel,
  diffMark,
  isHard,
  matches,
  pageFromPath,
  parseSocio,
  safeHref,
  type Filter,
  type Page,
} from './logic'

const TITLES: Record<'find' | 'charts' | 'music', string> = {
  find: 'Find Me',
  charts: 'Charts',
  music: 'Music',
}

const links = parseSocio(socioRaw)
const stage = document.querySelector('#stage') as HTMLElement
const showing = document.querySelector('#showing') as HTMLElement
const titleEl = document.querySelector('#page-title') as HTMLElement
const showingLabel = document.querySelector('#showing-label') as HTMLElement
const back = document.querySelector('#back') as HTMLButtonElement
const rotate = document.querySelector('#rotate') as HTMLElement
const route = document.querySelector('#route') as HTMLElement
const root = document.documentElement
const audio = new Audio()
audio.preload = 'none'

if (matchMedia('(prefers-reduced-motion: reduce)').matches) gsap.globalTimeline.timeScale(20)

// ─── audio analysis (drives the cube and the bars) ───────────────
let audioCtx: AudioContext | null = null
let analyser: AnalyserNode | null = null
let bins = new Uint8Array(0)
let level = 0
let seeking = false
let vizEl: HTMLCanvasElement | null = null
let seekEl: HTMLInputElement | null = null
let timeEl: HTMLElement | null = null

function listen() {
  if (audioCtx) {
    void audioCtx.resume()
    return
  }
  try {
    audioCtx = new AudioContext()
    const source = audioCtx.createMediaElementSource(audio)
    analyser = audioCtx.createAnalyser()
    analyser.fftSize = 128
    analyser.smoothingTimeConstant = 0.78
    bins = new Uint8Array(analyser.frequencyBinCount)
    source.connect(analyser)
    analyser.connect(audioCtx.destination)
    void audioCtx.resume()
  } catch (error) {
    console.error(error)
    analyser = null
  }
}

function clock(seconds: number) {
  if (!Number.isFinite(seconds)) return '0:00'
  const whole = Math.floor(seconds)
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`
}

function drawViz() {
  if (!vizEl) return
  const dpr = Math.min(devicePixelRatio || 1, 2)
  const w = Math.round(vizEl.clientWidth * dpr)
  const h = Math.round(vizEl.clientHeight * dpr)
  if (vizEl.width !== w || vizEl.height !== h) {
    vizEl.width = w
    vizEl.height = h
  }
  const g = vizEl.getContext('2d')
  if (!g) return
  g.clearRect(0, 0, w, h)
  g.fillStyle = '#fff'
  const n = 12
  const gap = 3 * dpr
  const bw = (w - gap * (n - 1)) / n
  const live = analyser !== null && !audio.paused
  for (let i = 0; i < n; i++) {
    const v = live ? bins[i * 2] / 255 : 0
    const bh = Math.max(dpr, v * h)
    g.globalAlpha = 0.3 + 0.7 * v
    g.fillRect(i * (bw + gap), h - bh, bw, bh)
  }
}

// every frame: read the cube, hand its light to the page
function tick() {
  if (analyser && !audio.paused) {
    analyser.getByteFrequencyData(bins)
    let sum = 0
    for (let i = 0; i < 12; i++) sum += bins[i]
    level += (sum / (12 * 255) - level) * 0.35
  } else level *= 0.9
  cube?.setLevel(level)

  if (page === 'music') {
    drawViz()
    if (timeEl) timeEl.textContent = `${clock(audio.currentTime)} / ${clock(audio.duration)}`
    if (seekEl && !seeking) {
      const p = audio.duration > 0 ? (audio.currentTime / audio.duration) * 1000 : 0
      seekEl.value = String(p)
      seekEl.style.setProperty('--p', `${p / 10}%`)
    }
  }

  const w = window.innerWidth
  const h = window.innerHeight
  const lx = (cube ? cube.light.x : 0.73) * w
  const ly = (cube ? cube.light.y : 0.5) * h
  const li = cube ? cube.light.i : 0.6
  root.style.setProperty('--lx', `${lx.toFixed(1)}px`)
  root.style.setProperty('--ly', `${ly.toFixed(1)}px`)
  root.style.setProperty('--li', li.toFixed(3))
  const lit = document.querySelectorAll<HTMLElement>('.lit')
  const rects = Array.from(lit, (el) => el.getBoundingClientRect())
  lit.forEach((el, i) => {
    el.style.setProperty('--mx', `${(lx - rects[i].left).toFixed(1)}px`)
    el.style.setProperty('--my', `${(ly - rects[i].top).toFixed(1)}px`)
  })
}

let page: Page = pageFromPath(location.pathname)
let filter: Filter = 'ALL'
let selected: number | null = null
let track: number | null = null
let overRow: Element | null = null
let flight: { ghost: HTMLElement; el: HTMLElement } | null = null
let chromeGen = 0

const canvas = document.querySelector('#gl') as HTMLCanvasElement
let cube: Cube | null = null
try {
  cube = new Cube(canvas)
} catch (error) {
  console.error(error)
}

function shown(next: Page): next is 'find' | 'charts' | 'music' {
  return next === 'find' || next === 'charts' || next === 'music'
}

function clearFlight() {
  if (!flight) return
  gsap.killTweensOf(flight.ghost)
  flight.ghost.remove()
  gsap.set(flight.el, { opacity: 1 })
  flight = null
}

function glide(from: DOMRect, el: HTMLElement) {
  clearFlight()
  const to = el.getBoundingClientRect()
  if (to.width < 1 || from.width < 1) return
  const ghost = el.cloneNode(true) as HTMLElement
  const computed = getComputedStyle(el)
  ghost.style.font = computed.font
  ghost.style.letterSpacing = computed.letterSpacing
  ghost.style.color = computed.color
  ghost.style.position = 'fixed'
  ghost.style.left = '0'
  ghost.style.top = '0'
  ghost.style.margin = '0'
  ghost.style.transformOrigin = '0 0'
  ghost.style.zIndex = '6'
  ghost.style.pointerEvents = 'none'
  document.body.appendChild(ghost)
  gsap.set(el, { opacity: 0 })
  flight = { ghost, el }
  gsap.fromTo(
    ghost,
    { x: from.left, y: from.top, scale: from.width / to.width },
    {
      x: to.left,
      y: to.top,
      scale: 1,
      duration: 0.7,
      ease: 'power3.inOut',
      onComplete: () => {
        if (flight?.ghost !== ghost) return
        ghost.remove()
        gsap.set(el, { opacity: 1 })
        flight = null
      },
    },
  )
}

function fadeKids(view: HTMLElement, skip?: HTMLElement, slow = false) {
  const first = view.firstElementChild
  if (!first) return
  const nodes = first.classList.contains('hero') ? [...first.querySelectorAll('a, button')] : [first]
  let n = 0
  nodes.forEach((el) => {
    if (skip && (el === skip || el.contains(skip))) return
    gsap.from(el, {
      opacity: 0,
      y: slow ? 18 : 12,
      duration: slow ? 0.9 : 0.48,
      delay: slow ? 0.5 + n++ * 0.18 : 0,
      ease: 'power3.out',
    })
  })
}

function hero(items: { href: string; label: string }[]) {
  const anchors = items
    .map(
      (item, index) =>
        `<a href="${esc(item.href)}" target="_blank" rel="noopener noreferrer" data-n="${String(index + 1).padStart(2, '0')}" data-meta="↗"><span class="t lit">${esc(item.label)}</span></a>`,
    )
    .join('')
  return `<div class="hero"><nav>${anchors}</nav></div>`
}

function chartsHTML() {
  const tabs = FILTERS.map((item) => {
    const count = chartLevels.filter((chart) => matches(chart.game, item)).length
    return `<button type="button" data-filter="${item}" aria-selected="${filter === item}">${filterLabel(item)}<i>${count}</i></button>`
  }).join('')
  return `<div class="charts"><div class="filters" role="tablist">${tabs}</div><div class="chart-body"><div class="list" id="list"></div><div class="preview" id="preview"></div></div></div>`
}

function musicHTML() {
  const rows = audioTracks
    .map(
      (item, index) =>
        `<button type="button" class="track edge lit" data-i="${index}" aria-pressed="false"><span class="idx">${String(index + 1).padStart(2, '0')}</span><span><strong>${esc(item.title)}</strong><small>${esc(item.artist)}</small></span></button>`,
    )
    .join('')
  return `<div class="music"><div class="player edge lit" id="player"><button type="button" class="edge lit" id="toggle" disabled>Play</button><span id="now" class="idle">Select a track</span><span class="time" id="time">0:00 / 0:00</span><canvas id="viz" aria-hidden="true"></canvas><input type="range" id="seek" min="0" max="1000" step="1" value="0" aria-label="Seek" disabled></div><div class="list" id="tracks">${rows}</div></div>`
}

function viewHTML(next: Page) {
  if (next === 'main') {
    const item = (go: string, label: string, n: string, meta: string) =>
      `<button type="button" data-go="${go}" data-n="${n}" data-meta="${meta}"><span class="t lit">${label}</span></button>`
    return `<div class="hero"><nav>${item('find', 'Find Me', '01', `${links.stoy.length} links`)}${item('charts', 'Charts', '02', `${chartLevels.length} charts`)}${item('music', 'Music', '03', `${audioTracks.length} tracks`)}</nav></div>`
  }
  if (next === 'find') return hero(links.stoy)
  if (next === 'dyp') return hero(links.dyp)
  if (next === 'music') return musicHTML()
  return chartsHTML()
}

function jacket(id: string) {
  return id ? `<img src="https://i.ytimg.com/vi/${encodeURIComponent(id)}/mqdefault.jpg" alt="">` : '<span class="jacket"></span>'
}

function rowHTML(index: number) {
  const chart = chartLevels[index]
  const hard = isHard(chart.game, chart.diff)
  const mark = diffMark(chart.game, chart.diff)
  const chip = `${mark.name} ${mark.level}`.trim()
  return `<button type="button" class="row edge lit${chart.available ? '' : ' dim'}" data-i="${index}" data-hard="${hard ? '1' : '0'}" aria-pressed="${selected === index}">${jacket(chart.youtubeId)}<span><strong>${esc(chart.title)}</strong><small>${esc(chart.artist)}</small></span><span class="chip${hard ? ' hard' : ''}">${esc(chip)}</span></button>`
}

function previewHTML(index: number) {
  const chart = chartLevels[index]
  const hard = isHard(chart.game, chart.diff)
  const mark = diffMark(chart.game, chart.diff)
  const pool = chartLevels.flatMap((c, i) => (matches(c.game, filter) ? [i] : []))
  const place = `${String(pool.indexOf(index) + 1).padStart(2, '0')}/${String(pool.length).padStart(2, '0')}`
  const video = chart.youtubeId
    ? `<div class="frame edge lit"><iframe src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(chart.youtubeId)}?rel=0" title="${esc(chart.title)}" allow="fullscreen" allowfullscreen></iframe></div>`
    : ''
  const pulsus = chart.copyId
    ? `<button type="button" class="edge lit" data-act="copy" data-id="${esc(chart.copyId)}">Copy</button><a class="edge lit" href="https://pulsus.cc/play" target="_blank" rel="noopener noreferrer">Play</a>`
    : ''
  const chartLink =
    chart.available && chart.chartUrl
      ? `<a class="edge lit" href="${esc(safeHref(chart.chartUrl))}" ${chart.chartUrl.startsWith('/') ? 'download' : 'target="_blank" rel="noopener noreferrer"'}>Chart</a>`
      : ''
  const kind = `<span class="kind"><b>${esc(mark.name)}</b><span>${esc(chart.game)}</span></span>`
  return `${video}<p class="eyebrow">${esc(chart.game)} · ${place}</p><h2 data-hard="${hard ? '1' : '0'}">${esc(chart.title)}</h2><p>${esc(chart.artist)}</p><div class="mark"><span class="lvl">${esc(mark.level)}</span>${kind}</div><div class="actions">${pulsus}${chartLink}</div>`
}

function paintCharts() {
  const list = document.querySelector('#list')
  const preview = document.querySelector('#preview')
  if (!list || !preview) return
  if (selected == null || !matches(chartLevels[selected].game, filter)) {
    const next = chartLevels.findIndex((chart) => matches(chart.game, filter))
    selected = next < 0 ? null : next
  }
  const top = list.scrollTop
  list.innerHTML = chartLevels.map((_, index) => (matches(chartLevels[index].game, filter) ? rowHTML(index) : '')).join('')
  list.scrollTop = top
  preview.innerHTML = selected == null ? '' : previewHTML(selected)
  document.querySelectorAll<HTMLElement>('[data-filter]').forEach((button) => {
    button.setAttribute('aria-selected', button.dataset.filter === filter ? 'true' : 'false')
  })
}

function syncTracks() {
  document.querySelectorAll<HTMLElement>('.track').forEach((button) => {
    const on = track != null && button.dataset.i === String(track) && !audio.paused
    button.setAttribute('aria-pressed', on ? 'true' : 'false')
  })
  const now = document.querySelector('#now')
  const toggle = document.querySelector('#toggle') as HTMLButtonElement | null
  if (!now || !toggle || track == null) return
  now.classList.remove('idle')
  now.textContent = audioTracks[track].title
  toggle.disabled = false
  seekEl?.removeAttribute('disabled')
  toggle.textContent = audio.paused ? 'Play' : 'Pause'
}

function stopAudio() {
  audio.pause()
  track = null
  cube?.setPlaying(false)
}

function playTrack(index: number) {
  const item = audioTracks[index]
  if (!item) return
  listen()
  if (track === index) {
    if (audio.paused) void audio.play().catch(() => syncTracks())
    else audio.pause()
    return
  }
  track = index
  audio.src = item.src
  const now = document.querySelector('#now')
  const toggle = document.querySelector('#toggle') as HTMLButtonElement | null
  if (now && toggle) {
    now.classList.remove('idle')
    now.textContent = item.title
    toggle.disabled = false
    toggle.textContent = 'Pause'
    seekEl?.removeAttribute('disabled')
  }
  document.querySelectorAll<HTMLElement>('.track').forEach((button) => {
    button.setAttribute('aria-pressed', button.dataset.i === String(index) ? 'true' : 'false')
  })
  cube?.setPlaying(true)
  void audio.play().catch(() => {
    cube?.setPlaying(false)
    syncTracks()
  })
}

function mount(next: Page) {
  const old = stage.querySelector('.view')
  if (old) {
    old.classList.add('out')
    gsap.to(old, { opacity: 0, duration: 0.32, ease: 'power2.in', onComplete: () => old.remove() })
  }
  const view = document.createElement('div')
  view.className = 'view'
  view.innerHTML = viewHTML(next)
  stage.appendChild(view)
  if (next === 'charts') paintCharts()
  vizEl = view.querySelector('#viz')
  seekEl = view.querySelector('#seek')
  timeEl = view.querySelector('#time')
  return view
}

function updateChrome(next: Page, source?: DOMRect, backFrom?: Page, backRect?: DOMRect) {
  const gen = ++chromeGen
  gsap.killTweensOf([showing, titleEl, showingLabel])
  document.querySelector('#who-stoy')!.setAttribute('aria-pressed', next === 'dyp' ? 'false' : 'true')
  document.querySelector('#who-dyp')!.setAttribute('aria-pressed', next === 'dyp' ? 'true' : 'false')
  back.hidden = next === 'main'
  document.title = next === 'dyp' ? 'dyp' : next === 'main' ? 'stoy' : `stoy — ${TITLES[next]}`
  document.body.dataset.who = next === 'dyp' ? 'dyp' : 'stoy'
  route.textContent = PATH[next]
  if (shown(next)) {
    showing.hidden = false
    gsap.set(showing, { opacity: 1 })
    titleEl.textContent = TITLES[next]
    if (source) glide(source, titleEl)
    else gsap.fromTo(titleEl, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.45 })
    gsap.fromTo(showingLabel, { opacity: 0 }, { opacity: 1, duration: 0.45 })
  } else if (!showing.hidden) {
    gsap.to(showing, {
      opacity: 0,
      duration: 0.25,
      onComplete: () => {
        if (gen !== chromeGen) return
        showing.hidden = true
        gsap.set(showing, { opacity: 1 })
      },
    })
  }
  if (backRect && backFrom && next === 'main') {
    const item = stage.querySelector(`[data-go="${backFrom}"]`) as HTMLElement | null
    if (item) glide(backRect, item)
  }
}

function go(next: Page, source?: HTMLElement, push = true) {
  if (next === page) return
  const prev = page
  clearFlight()
  const sourceRect = source?.dataset.go ? source.getBoundingClientRect() : undefined
  const backRect = !showing.hidden ? titleEl.getBoundingClientRect() : undefined
  if (prev === 'music') stopAudio()
  page = next
  if (next === 'charts' && prev !== 'charts') {
    filter = 'ALL'
    selected = null
  }
  if (push) history.pushState({ page: next }, '', PATH[next])
  const view = mount(next)
  const skip = next === 'main' ? (view.querySelector(`[data-go="${prev}"]`) as HTMLElement | null) : null
  fadeKids(view, skip ?? undefined)
  updateChrome(next, sourceRect, prev, next === 'main' ? backRect : undefined)
  cube?.go(next)
}

document.querySelector('#who-stoy')!.addEventListener('click', () => {
  if (page === 'dyp') go('main')
})
document.querySelector('#who-dyp')!.addEventListener('click', () => {
  if (page !== 'dyp') go('dyp')
})
back.addEventListener('click', () => go('main'))

stage.addEventListener('click', (event) => {
  const target = event.target as HTMLElement
  const dest = target.closest('[data-go]') as HTMLElement | null
  if (dest?.dataset.go) {
    go(dest.dataset.go as Page, dest)
    return
  }
  const tab = target.closest('[data-filter]') as HTMLElement | null
  if (tab?.dataset.filter) {
    filter = tab.dataset.filter as Filter
    paintCharts()
    return
  }
  const row = target.closest('.row') as HTMLElement | null
  if (row?.dataset.i) {
    const index = Number(row.dataset.i)
    if (selected === index) return
    selected = index
    paintCharts()
    return
  }
  const copy = target.closest('[data-act="copy"]') as HTMLElement | null
  if (copy?.dataset.id) {
    const id = copy.dataset.id
    navigator.clipboard.writeText(id).then(
      () => {
        copy.textContent = 'Copied'
        window.setTimeout(() => {
          copy.textContent = 'Copy'
        }, 1200)
      },
      () => {
        copy.textContent = id
      },
    )
    return
  }
  const song = target.closest('.track') as HTMLElement | null
  if (song?.dataset.i) playTrack(Number(song.dataset.i))
  if (target.closest('#toggle')) {
    listen()
    if (audio.paused) void audio.play().catch(() => syncTracks())
    else audio.pause()
  }
})

stage.addEventListener('input', (event) => {
  const target = event.target as HTMLInputElement
  if (target.id !== 'seek' || !(audio.duration > 0)) return
  audio.currentTime = (Number(target.value) / 1000) * audio.duration
  target.style.setProperty('--p', `${Number(target.value) / 10}%`)
})
stage.addEventListener('pointerdown', (event) => {
  if ((event.target as HTMLElement).id === 'seek') seeking = true
})
window.addEventListener('pointerup', () => {
  seeking = false
})

// the cube looks at whatever you point at: chart rows and home / link items
const POINTABLE = '.row, .hero nav > *'

stage.addEventListener('pointerover', (event) => {
  const el = (event.target as HTMLElement).closest(POINTABLE) as HTMLElement | null
  if (!el || el === overRow) return
  overRow = el
  cube?.notice(el, el.dataset.hard === '1')
})

stage.addEventListener('pointerout', (event) => {
  const el = (event.target as HTMLElement).closest(POINTABLE)
  const next = (event.relatedTarget as HTMLElement | null)?.closest?.(POINTABLE)
  if (el && el !== next) {
    overRow = null
    cube?.relax()
  }
})

audio.addEventListener('play', () => {
  cube?.setPlaying(true)
  syncTracks()
})
audio.addEventListener('pause', () => {
  cube?.setPlaying(false)
  syncTracks()
})
audio.addEventListener('error', () => {
  const now = document.querySelector('#now')
  if (now) now.textContent = "This file won't play"
})

window.addEventListener('pointerdown', (event) => {
  if (!cube?.pointer(event, 'down')) return
  event.preventDefault()
  event.stopPropagation()
}, { capture: true, passive: false })
window.addEventListener('pointermove', (event) => cube?.pointer(event, 'move'))
window.addEventListener('pointerup', (event) => cube?.pointer(event, 'up'))
window.addEventListener('pointercancel', (event) => cube?.pointer(event, 'up'))

window.addEventListener('popstate', () => {
  const next = pageFromPath(location.pathname)
  if (next !== page) go(next, undefined, false)
})

const portrait = matchMedia('(orientation: portrait)')
function syncPortrait() {
  const on = portrait.matches
  document.body.toggleAttribute('data-portrait', on)
  rotate.hidden = !on
  cube?.setGate(on)
}
portrait.addEventListener('change', syncPortrait)

function boot() {
  const view = mount(page)
  fadeKids(view, undefined, true)
  updateChrome(page)
  cube?.go(page)
  cube?.intro()
  gsap.ticker.add(tick)
  history.replaceState({ page }, '', PATH[page])
  syncPortrait()
}

boot()
