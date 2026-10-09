import gsap from 'gsap'
import {
  AmbientLight,
  BoxGeometry,
  CapsuleGeometry,
  CircleGeometry,
  Timer,
  ConeGeometry,
  CylinderGeometry,
  DirectionalLight,
  Group,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  SphereGeometry,
  Raycaster,
  Scene,
  SRGBColorSpace,
  TorusGeometry,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three'
import type { Page } from './logic'

type Anchor = { x: number; y: number; s: number; roam: number }

const ANCHOR: Record<Page, Anchor> = {
  main: { x: 0.73, y: 0.5, s: 1, roam: 0.09 },
  find: { x: 0.73, y: 0.5, s: 1, roam: 0.09 },
  charts: { x: 0.82, y: 0.8, s: 0.52, roam: 0.04 },
  music: { x: 0.82, y: 0.78, s: 0.52, roam: 0.04 },
  dyp: { x: 0.52, y: 0.52, s: 1.05, roam: 0.07 },
}

const MOOD: Record<Page, { rot: number; sx: number; sy: number; slow: boolean }> = {
  main: { rot: 0, sx: 1, sy: 1, slow: true },
  find: { rot: 0.32, sx: 1, sy: 1, slow: false },
  charts: { rot: 0.62, sx: 1.05, sy: 0.78, slow: false },
  music: { rot: 0.12, sx: 1, sy: 0.92, slow: true },
  dyp: { rot: 0.95, sx: 1, sy: 0.86, slow: false },
}

function smooth(u: number) {
  const t = Math.min(1, Math.max(0, u))
  return t * t * (3 - 2 * t)
}

export class Cube {
  private readonly renderer: WebGLRenderer
  private readonly scene = new Scene()
  private readonly camera = new PerspectiveCamera(32, 1, 0.1, 50)
  private readonly ray = new Raycaster()
  private readonly ndc = new Vector2()
  private readonly look = new Vector2()
  private readonly gaze = new Vector2()
  private readonly spot = new Vector3()
  private readonly timer = new Timer()
  private readonly root = new Group()
  private readonly mover = new Group()
  private readonly body = new Group()
  private readonly mesh: Mesh
  private readonly eyeL: Group
  private readonly eyeR: Group
  private readonly pills: Mesh[]
  private readonly rounds: Mesh[]
  private readonly squeezes: Group[]
  private readonly stars: Group[]
  private readonly ears = new Group()
  private readonly headset = new Group()
  readonly pose = { x: ANCHOR.main.x, y: ANCHOR.main.y, s: 0.001 }
  /** Where the cube sits on screen (0..1) and how brightly it lights the page. */
  readonly light = { x: ANCHOR.main.x, y: ANCHOR.main.y, i: 0 }
  private readonly gain = { v: 0 }
  private glow = 0.5
  private level = 0
  private readonly acc = { ear: 0, headset: 0 }
  private page: Page = 'main'
  private fun = false
  private readonly reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
  private funAmp = 0
  private funT = 0
  private time = 0
  private funTimer = 0
  private hovering = false
  private dragging = false
  private down: { x: number; y: number } | null = null
  private dragNx = 0
  private dragNy = 0
  private gate = false
  private playing = false
  private gazing = false
  private holdExcite = false
  private excite = 0
  private rot = 0
  private sx = 1
  private sy = 1
  private slow = true
  private blink = 1
  private blinkT = 1
  private nextBlink = 1.8
  private squash = 0
  private hopY = 0
  private hopV = 0
  private squeezeUntil = 0
  private readonly face = { oo: 0, squeeze: 0, star: 0 }
  private readonly grab = { x: 0, y: 0, z: 0 }
  private lastDragX = 0
  private lastDragY = 0

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' })
    this.renderer.setClearColor(0x000000, 0)
    this.renderer.outputColorSpace = SRGBColorSpace
    this.camera.position.set(0, 0, 7)

    const white = new MeshStandardMaterial({ color: 0xffffff, roughness: 0.62 })
    const black = new MeshStandardMaterial({ color: 0x111111, roughness: 0.4 })
    this.mesh = new Mesh(new BoxGeometry(1.2, 1.2, 1.2), white)
    const builtL = makeFace(black, true)
    const builtR = makeFace(black, false)
    this.eyeL = builtL.root
    this.eyeR = builtR.root
    this.pills = [builtL.pill, builtR.pill]
    this.rounds = [builtL.round, builtR.round]
    this.squeezes = [builtL.squeeze, builtR.squeeze]
    this.stars = [builtL.star, builtR.star]
    this.eyeL.position.set(-0.22, 0.06, 0.62)
    this.eyeR.position.set(0.22, 0.06, 0.62)

    const cone = new ConeGeometry(0.15, 0.36, 4)
    cone.translate(0, 0.18, 0)
    cone.rotateY(Math.PI / 4)
    const earL = new Mesh(cone, white)
    const earR = new Mesh(cone, white)
    earL.position.set(-0.34, 0.6, 0)
    earR.position.set(0.34, 0.6, 0)
    earL.rotation.z = 0.22
    earR.rotation.z = -0.22
    this.ears.add(earL, earR)
    this.ears.scale.setScalar(0.001)

    const band = new Mesh(new TorusGeometry(0.9, 0.05, 10, 28, Math.PI), white)
    band.position.y = 0.2
    const cupGeo = new CylinderGeometry(0.16, 0.16, 0.1, 16)
    cupGeo.rotateZ(Math.PI / 2)
    const cupL = new Mesh(cupGeo, white)
    const cupR = new Mesh(cupGeo, white)
    cupL.position.set(-0.9, 0.2, 0)
    cupR.position.set(0.9, 0.2, 0)
    const hole = new CircleGeometry(0.09, 16)
    const holeL = new Mesh(hole, black)
    const holeR = new Mesh(hole, black)
    holeL.position.set(-0.96, 0.2, 0)
    holeR.position.set(0.96, 0.2, 0)
    holeL.rotation.y = -Math.PI / 2
    holeR.rotation.y = Math.PI / 2
    this.headset.add(band, cupL, cupR, holeL, holeR)
    this.headset.scale.setScalar(0.001)

    this.body.add(this.mesh, this.eyeL, this.eyeR, this.ears, this.headset)
    this.mover.add(this.body)
    this.root.add(this.mover)
    this.scene.add(this.root)
    this.scene.add(new AmbientLight(0xffffff, 0.62))
    const key = new DirectionalLight(0xffffff, 2.1)
    key.position.set(2.4, 3.4, 5)
    const fill = new DirectionalLight(0xffffff, 0.4)
    fill.position.set(-3.2, -1.2, 2)
    this.scene.add(key, fill)

    this.timer.connect(document)
    this.resize()
    window.addEventListener('resize', () => this.resize())
    this.renderer.setAnimationLoop((time) => this.frame(time))
  }

  go(page: Page) {
    this.page = page
    this.stopFun()
    const anchor = ANCHOR[page]
    gsap.killTweensOf(this.pose)
    gsap.killTweensOf(this.acc)
    const land = { s: anchor.s, ease: 'power3.inOut', duration: 0.7 }
    if (this.dragging) gsap.to(this.pose, land)
    else gsap.to(this.pose, { ...land, x: anchor.x, y: anchor.y, onComplete: () => this.armFun() })
    gsap.to(this.acc, {
      ear: page === 'dyp' ? 1 : 0,
      headset: page === 'music' ? 1 : 0,
      duration: 0.7,
      ease: 'power3.inOut',
    })
  }

  setGate(on: boolean) {
    this.gate = on
    this.dragging = false
    this.down = null
    this.stopFun()
    gsap.killTweensOf(this.pose)
    gsap.killTweensOf(this.grab)
    gsap.to(this.grab, { x: 0, y: 0, z: 0, duration: 0.45, ease: 'power3.out' })
    document.body.style.cursor = ''
    if (on) {
      gsap.to(this.pose, { x: 0.5, y: 0.42, s: 1, duration: 0.6, ease: 'power3.inOut' })
      return
    }
    const anchor = ANCHOR[this.page]
    gsap.to(this.pose, {
      x: anchor.x,
      y: anchor.y,
      s: anchor.s,
      duration: 0.6,
      ease: 'power3.inOut',
      onComplete: () => this.armFun(),
    })
  }

  setPlaying(on: boolean) {
    this.playing = on
  }

  setLevel(level: number) {
    this.level = level
  }

  intro() {
    gsap.killTweensOf(this.gain)
    gsap.to(this.gain, { v: 1, duration: this.reduce ? 0 : 1.8, delay: this.reduce ? 0 : 0.25, ease: 'power2.out' })
  }

  notice(el: HTMLElement, hard: boolean) {
    const rect = el.getBoundingClientRect()
    this.gaze.set(
      ((rect.left + rect.width / 2) / window.innerWidth) * 2 - 1,
      -((rect.top + rect.height / 2) / window.innerHeight) * 2 + 1,
    )
    this.gazing = true
    this.holdExcite = hard
    this.stopFun()
    if (hard) this.hop()
  }

  relax() {
    this.gazing = false
    this.holdExcite = false
    this.armFun()
  }

  pointer(event: PointerEvent, phase: 'down' | 'move' | 'up'): boolean {
    this.ndc.set((event.clientX / window.innerWidth) * 2 - 1, -(event.clientY / window.innerHeight) * 2 + 1)
    if (this.gate) return false
    if (phase === 'move') {
      this.hoverProbe()
      if (this.down && (this.dragging || this.moved(event))) this.dragTo(event)
      return false
    }
    if (phase === 'down') {
      if (!this.hits()) return false
      this.down = { x: event.clientX, y: event.clientY }
      this.lastDragX = event.clientX / window.innerWidth
      this.lastDragY = event.clientY / window.innerHeight
      this.stopFun()
      return true
    }
    if (!this.down && !this.dragging) return false
    const dragged = this.dragging || (this.down !== null && this.moved(event))
    this.down = null
    if (dragged) {
      this.dragging = false
      this.spring()
    } else {
      this.squash = 0.32
      this.squeezeUntil = this.time + 0.7
      this.hop()
    }
    document.body.style.cursor = this.hovering ? 'grab' : ''
    this.armFun()
    return false
  }

  private hop() {
    if (this.hopY < 0.02) this.hopV = 3.1
  }

  private spring() {
    const anchor = ANCHOR[this.page]
    gsap.killTweensOf(this.pose)
    gsap.killTweensOf(this.grab)
    gsap.to(this.pose, { x: anchor.x, y: anchor.y, s: anchor.s, duration: 0.7, ease: 'back.out(1.5)' })
    gsap.to(this.grab, { x: 0, y: 0, z: 0, duration: 0.7, ease: 'back.out(1.6)' })
  }

  private dragTo(event: PointerEvent) {
    this.dragging = true
    document.body.style.cursor = 'grabbing'
    gsap.killTweensOf(this.pose)
    gsap.killTweensOf(this.grab)
    const nx = Math.min(0.88, Math.max(0.12, event.clientX / window.innerWidth))
    const ny = Math.min(0.84, Math.max(0.16, event.clientY / window.innerHeight))
    this.grab.y += (nx - this.lastDragX) * 16
    this.grab.x += (ny - this.lastDragY) * 12
    this.grab.z += (nx - this.lastDragX) * 8
    this.lastDragX = nx
    this.lastDragY = ny
    this.dragNx = nx
    this.dragNy = ny
  }

  private moved(event: PointerEvent) {
    if (!this.down) return false
    const dx = event.clientX - this.down.x
    const dy = event.clientY - this.down.y
    return dx * dx + dy * dy > 64
  }

  private hits() {
    this.ray.setFromCamera(this.ndc, this.camera)
    this.root.updateWorldMatrix(true, true)
    return this.ray.intersectObject(this.mesh, false).length > 0
  }

  private hoverProbe() {
    if (this.dragging) return
    const hit = this.hits()
    if (hit && !this.hovering) {
      this.hovering = true
      this.stopFun()
      document.body.style.cursor = 'grab'
    } else if (!hit && this.hovering) {
      this.hovering = false
      document.body.style.cursor = ''
      this.armFun()
    }
  }

  private stopFun() {
    this.fun = false
    window.clearTimeout(this.funTimer)
  }

  private armFun() {
    window.clearTimeout(this.funTimer)
    if (this.reduce || this.gate || this.dragging || this.hovering || this.gazing) return
    this.funTimer = window.setTimeout(() => {
      this.fun = true
    }, 2000)
  }

  private resize() {
    const width = window.innerWidth
    const height = window.innerHeight
    this.camera.aspect = width / Math.max(height, 1)
    this.camera.updateProjectionMatrix()
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    this.renderer.setSize(width, height)
  }

  private place(nx: number, ny: number) {
    this.spot.set(nx * 2 - 1, -(ny * 2 - 1), 0.5).unproject(this.camera)
    this.spot.sub(this.camera.position)
    const distance = -this.camera.position.z / this.spot.z
    this.root.position.set(
      this.camera.position.x + this.spot.x * distance,
      this.camera.position.y + this.spot.y * distance + this.hopY,
      0,
    )
  }

  private frame(time?: number) {
    this.timer.update(time)
    const dt = Math.min(this.timer.getDelta(), 0.05)
    this.time += dt
    this.funT += dt * 0.85
    const ease = 1 - Math.exp(-6 * dt)
    this.funAmp += ((this.fun && !this.dragging && !this.gate ? 1 : 0) - this.funAmp) * (1 - Math.exp(-2.4 * dt))
    this.excite += ((this.holdExcite ? 1 : 0) - this.excite) * ease
    if (this.dragging) {
      const follow = 1 - Math.exp(-14 * dt)
      this.pose.x += (this.dragNx - this.pose.x) * follow
      this.pose.y += (this.dragNy - this.pose.y) * follow
    }

    const mood = MOOD[this.page]
    this.slow = mood.slow
    const dragMixTarget = this.dragging ? 1 : 0
    this.rot += (mood.rot + this.excite * 0.28 - this.rot) * ease
    this.sx += (mood.sx - this.sx) * ease
    this.sy += (mood.sy - this.sy) * ease

    if (!this.dragging && this.time > this.nextBlink) {
      this.blinkT = 0
      this.nextBlink = this.time + (this.slow ? 3.2 : 1.8) + Math.random() * (this.slow ? 2.8 : 1.6)
    }
    if (this.blinkT < 0.16) {
      const u = this.blinkT / 0.16
      const close = u < 0.5 ? u * 2 : 2 - u * 2
      this.blink = 1 - close * 0.92
      this.blinkT += dt
    } else this.blink = 1

    const wantX = this.gazing ? this.gaze.x : this.ndc.x
    const wantY = this.gazing ? this.gaze.y : this.ndc.y
    this.look.x += (wantX - this.look.x) * ease
    this.look.y += (wantY - this.look.y) * ease
    let wantOo = 0
    let wantSqueeze = 0
    let wantStar = 0
    if (this.dragging) wantOo = 1
    else if (this.time < this.squeezeUntil) wantSqueeze = 1
    else if (this.funAmp > 0.45 || this.playing) wantStar = 1
    else if (this.page === 'charts' || this.holdExcite) wantSqueeze = 1
    else if (this.page === 'find') wantOo = 1
    this.face.oo += (wantOo - this.face.oo) * ease
    this.face.squeeze += (wantSqueeze - this.face.squeeze) * ease
    this.face.star += (wantStar - this.face.star) * ease
    const special = Math.min(1, this.face.oo + this.face.squeeze + this.face.star)
    const drag = dragMixTarget
    const rot = this.rot * (1 - drag) * (1 - special)
    const blink = this.dragging ? 1 : this.blink
    const lookX = this.look.x * 0.045
    const lookY = this.look.y * 0.04
    this.eyeL.position.set(-0.24 + lookX, 0.06 + lookY, 0.62)
    this.eyeR.position.set(0.24 + lookX, 0.06 + lookY, 0.62)
    this.eyeL.scale.set(1, blink, 1)
    this.eyeR.scale.set(1, blink, 1)
    this.pills[0].rotation.z = -rot
    this.pills[1].rotation.z = rot
    this.pills[0].scale.set(this.sx, this.sy, 1)
    this.pills[1].scale.set(this.sx, this.sy, 1)
    const pillW = Math.max(1 - special, 0.001)
    for (const pill of this.pills) {
      pill.visible = pillW > 0.05
      pill.scale.multiplyScalar(pillW)
    }
    this.rounds.forEach((mesh) => {
      mesh.visible = this.face.oo > 0.05
      mesh.scale.setScalar(Math.max(this.face.oo, 0.001))
    })
    this.squeezes.forEach((group) => {
      group.visible = this.face.squeeze > 0.05
      group.scale.setScalar(Math.max(this.face.squeeze, 0.001))
    })
    this.stars.forEach((group) => {
      group.visible = this.face.star > 0.05
      group.scale.setScalar(Math.max(this.face.star, 0.001))
    })
    this.body.rotation.y = this.dragging ? 0 : this.look.x * 0.22
    this.body.rotation.x = this.dragging ? 0 : -this.look.y * 0.16

    const roam = ANCHOR[this.page].roam
    let ox = Math.sin(this.funT) * roam * this.funAmp
    let oy = Math.sin(this.funT * 0.72 + 1) * roam * 0.85 * this.funAmp
    let sc = 1 + Math.sin(this.funT * 1.45) * 0.1 * this.funAmp
    let spin = Math.sin(this.funT * 0.62) * 0.85 * this.funAmp
    let roll = Math.sin(this.funT) * Math.PI * this.funAmp
    if (this.playing && !this.gate) {
      oy += Math.sin(this.time * 1.5) * 0.012
      roll += Math.sin(this.time * 1.25) * 0.1
      sc *= 1 + Math.sin(this.time * 2.5) * 0.035
    }
    if (this.gate) {
      const u = (this.time % 1.8) / 1.8
      roll = u < 0.18 ? 0 : u < 0.62 ? smooth((u - 0.18) / 0.44) * -Math.PI / 2 : -Math.PI / 2
      spin = 0
      ox = 0
      oy = 0
    }
    const grabbed = this.dragging || Math.abs(this.grab.x) + Math.abs(this.grab.y) + Math.abs(this.grab.z) > 0.02
    this.mover.rotation.x = grabbed ? this.grab.x : 0
    this.mover.rotation.z = grabbed ? this.grab.z : roll
    this.mover.rotation.y = grabbed ? this.grab.y : spin

    this.squash *= Math.exp(-8 * dt)
    this.hopY += this.hopV * dt
    this.hopV -= 20 * dt
    if (this.hopY < 0) {
      this.hopY = 0
      this.hopV = 0
    }

    const scale = this.pose.s * sc
    this.root.scale.set(scale * (1 + this.squash * 0.4), scale * (1 - this.squash), scale * (1 + this.squash * 0.4))
    this.place(this.pose.x + ox, this.pose.y + oy)
    const beat = this.playing ? 0.2 + this.level * 0.55 : 0
    const want = 0.5 + this.excite * 0.25 + beat + Math.min(0.2, this.hopY * 0.2)
    this.glow += (want - this.glow) * ease
    this.light.x = this.pose.x + ox
    this.light.y = this.pose.y + oy
    this.light.i = Math.min(1.2, this.glow) * this.gain.v
    this.ears.scale.setScalar(Math.max(this.acc.ear, 0.001))
    this.ears.visible = this.acc.ear > 0.02
    this.headset.scale.setScalar(Math.max(this.acc.headset, 0.001))
    this.headset.visible = this.acc.headset > 0.02
    this.renderer.render(this.scene, this.camera)
  }
}

function makeFace(mat: MeshStandardMaterial, pointRight: boolean) {
  const root = new Group()
  const pill = new Mesh(new CapsuleGeometry(0.085, 0.16, 4, 8), mat)
  const round = new Mesh(new SphereGeometry(0.12, 18, 14), mat)
  const squeeze = chevron(pointRight, mat)
  const star = asterisk(mat)
  round.visible = false
  squeeze.visible = false
  star.visible = false
  root.add(pill, round, squeeze, star)
  return { root, pill, round, squeeze, star }
}

function chevron(pointRight: boolean, mat: MeshStandardMaterial) {
  const group = new Group()
  const geo = new CapsuleGeometry(0.04, 0.1, 2, 5)
  const dir = pointRight ? 1 : -1
  const tip = 0.08 * dir
  for (const y of [0.07, -0.07]) {
    const baseX = -0.02 * dir
    const piece = new Mesh(geo, mat)
    const dx = tip - baseX
    const dy = -y
    piece.position.set((baseX + tip) / 2, y / 2, 0.02)
    piece.rotation.z = Math.atan2(dy, dx) - Math.PI / 2
    group.add(piece)
  }
  return group
}

function asterisk(mat: MeshStandardMaterial) {
  const group = new Group()
  const geo = new CapsuleGeometry(0.034, 0.15, 2, 5)
  for (let i = 0; i < 4; i++) {
    const piece = new Mesh(geo, mat)
    piece.rotation.z = (i * Math.PI) / 4
    piece.position.z = 0.02
    group.add(piece)
  }
  return group
}
