// Rasterises the MERIDIAN mark (public/icon.svg) into the PNG sizes the PWA
// manifest needs. Self-contained: SVG path -> flattened polygons ->
// supersampled scanline fill -> zlib/PNG encode.
import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'

const MARK_PATHS = [
  'M101.141 53H136.632C151.023 53 162.689 64.6662 162.689 79.0573V112.904H148.112V79.0573C148.112 78.7105 148.098 78.3662 148.072 78.0251L112.581 112.898C112.701 112.902 112.821 112.904 112.941 112.904H148.112V126.672H112.941C98.5504 126.672 86.5638 114.891 86.5638 100.5V66.7434H101.141V100.5C101.141 101.15 101.191 101.792 101.289 102.422L137.56 66.7816C137.255 66.7563 136.945 66.7434 136.632 66.7434H101.141V53Z',
  'M65.2926 124.136L14 66.7372H34.6355L64.7495 100.436V66.7372H80.1365V118.47C80.1365 126.278 70.4953 129.958 65.2926 124.136Z',
]

function parsePath(d) {
  const tokens = d.match(/[MmLlHhVvCcZz]|-?\d*\.?\d+/g) || []
  const subpaths = []
  let pts = null
  let cx = 0, cy = 0, sx = 0, sy = 0, cmd = null, i = 0
  const num = () => parseFloat(tokens[i++])
  const push = (x, y) => pts.push([x, y])
  const cubic = (x1, y1, x2, y2, x, y) => {
    const steps = 24
    for (let s = 1; s <= steps; s++) {
      const t = s / steps, u = 1 - t
      push(
        u * u * u * cx + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x,
        u * u * u * cy + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y,
      )
    }
    cx = x; cy = y
  }
  while (i < tokens.length) {
    const tok = tokens[i]
    if (/^[MmLlHhVvCcZz]$/.test(tok)) { cmd = tok; i++ }
    switch (cmd) {
      case 'M': case 'm': {
        let x = num(), y = num()
        if (cmd === 'm') { x += cx; y += cy }
        if (pts && pts.length) subpaths.push(pts)
        pts = []; cx = sx = x; cy = sy = y; push(x, y)
        cmd = cmd === 'M' ? 'L' : 'l'
        break
      }
      case 'L': case 'l': {
        let x = num(), y = num()
        if (cmd === 'l') { x += cx; y += cy }
        cx = x; cy = y; push(x, y)
        break
      }
      case 'H': case 'h': { let x = num(); if (cmd === 'h') x += cx; cx = x; push(cx, cy); break }
      case 'V': case 'v': { let y = num(); if (cmd === 'v') y += cy; cy = y; push(cx, cy); break }
      case 'C': case 'c': {
        let x1 = num(), y1 = num(), x2 = num(), y2 = num(), x = num(), y = num()
        if (cmd === 'c') { x1 += cx; y1 += cy; x2 += cx; y2 += cy; x += cx; y += cy }
        cubic(x1, y1, x2, y2, x, y)
        break
      }
      case 'Z': case 'z': { push(sx, sy); cx = sx; cy = sy; i++; break }
      default: i++
    }
  }
  if (pts && pts.length) subpaths.push(pts)
  return subpaths
}

function roundedRect(x, y, w, h, r) {
  const pts = []
  const arc = (ccx, ccy, from) => {
    for (let s = 0; s <= 16; s++) {
      const a = from + (Math.PI / 2) * (s / 16)
      pts.push([ccx + r * Math.cos(a), ccy + r * Math.sin(a)])
    }
  }
  arc(x + w - r, y + h - r, 0)
  arc(x + r, y + h - r, Math.PI / 2)
  arc(x + r, y + r, Math.PI)
  arc(x + w - r, y + r, -Math.PI / 2)
  pts.push(pts[0])
  return [pts]
}

const scaleAbout = (subpaths, k, ox, oy) =>
  subpaths.map((p) => p.map(([x, y]) => [ox + (x - ox) * k, oy + (y - oy) * k]))

const transform = (subpaths, k, dx, dy) =>
  subpaths.map((p) => p.map(([x, y]) => [x * k + dx, y * k + dy]))

function fill(buf, size, shapes, color) {
  const [r, g, b] = color
  const edges = []
  for (const poly of shapes) {
    for (const sub of poly) {
      for (let i = 0; i + 1 < sub.length; i++) {
        const [x0, y0] = sub[i]
        const [x1, y1] = sub[i + 1]
        if (y0 !== y1) edges.push([x0, y0, x1, y1])
      }
      const [fx, fy] = sub[0]
      const [lx, ly] = sub[sub.length - 1]
      if (fy !== ly) edges.push([lx, ly, fx, fy])
    }
  }
  for (let py = 0; py < size; py++) {
    const y = py + 0.5
    const xs = []
    for (const [x0, y0, x1, y1] of edges) {
      if ((y >= y0 && y < y1) || (y >= y1 && y < y0)) {
        xs.push([x0 + ((y - y0) / (y1 - y0)) * (x1 - x0), y1 > y0 ? 1 : -1])
      }
    }
    xs.sort((a, c) => a[0] - c[0])
    let wind = 0
    for (let i = 0; i < xs.length - 1; i++) {
      wind += xs[i][1]
      if (wind === 0) continue
      const from = Math.max(0, Math.ceil(xs[i][0] - 0.5))
      const to = Math.min(size - 1, Math.floor(xs[i + 1][0] - 0.5))
      for (let px = from; px <= to; px++) {
        const o = (py * size + px) * 4
        buf[o] = r; buf[o + 1] = g; buf[o + 2] = b; buf[o + 3] = 255
      }
    }
  }
}

function downsample(src, srcSize, factor) {
  const size = srcSize / factor
  const out = Buffer.alloc(size * size * 4)
  const n = factor * factor
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0, a = 0
      for (let sy = 0; sy < factor; sy++) {
        for (let sx = 0; sx < factor; sx++) {
          const o = ((y * factor + sy) * srcSize + (x * factor + sx)) * 4
          r += src[o]; g += src[o + 1]; b += src[o + 2]; a += src[o + 3]
        }
      }
      const o = (y * size + x) * 4
      out[o] = Math.round(r / n)
      out[o + 1] = Math.round(g / n)
      out[o + 2] = Math.round(b / n)
      out[o + 3] = Math.round(a / n)
    }
  }
  return out
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})
const crc32 = (buf) => {
  let c = 0xffffffff
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}
function encodePng(rgba, size) {
  const stride = size * 4 + 1
  const raw = Buffer.alloc(stride * size)
  for (let y = 0; y < size; y++) {
    raw[y * stride] = 0
    rgba.copy(raw, y * stride + 1, y * size * 4, (y + 1) * size * 4)
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

const BG = [22, 22, 22]
const FG = [255, 255, 255]
const SS = 4

function render(size, maskable) {
  const S = size * SS
  const buf = Buffer.alloc(S * S * 4)
  const radius = maskable ? 0 : (37 / 180) * S
  fill(buf, S, [roundedRect(0, 0, S, S, radius)], BG)

  const markScale = maskable ? 0.62 : 0.95
  const k = (S / 180) * markScale
  const offset = (S - 180 * k) / 2
  const mark = MARK_PATHS.flatMap((d) =>
    transform(scaleAbout(parsePath(d), 0.95, 90, 90), k, offset, offset),
  )
  fill(buf, S, [mark], FG)
  return encodePng(downsample(buf, S, SS), size)
}

mkdirSync('public/icons', { recursive: true })
const targets = [
  ['public/icons/icon-192.png', 192, false],
  ['public/icons/icon-512.png', 512, false],
  ['public/icons/icon-maskable-192.png', 192, true],
  ['public/icons/icon-maskable-512.png', 512, true],
]
for (const [path, size, maskable] of targets) {
  writeFileSync(path, render(size, maskable))
  console.log('wrote', path, size)
}
