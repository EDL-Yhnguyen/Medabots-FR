// Dernière piste avant l'émulateur : appliquer les sondes de table AUX BLOCS
// DÉCOMPRESSÉS. Les deux essais précédents faisaient l'un ou l'autre, jamais les deux.
import { readFileSync, writeFileSync } from 'node:fs'
import { deflateSync } from 'node:zlib'

const rom = readFileSync(process.argv[2])

function delz(src, pos) {
  if (src[pos] !== 0x10) return null
  const taille = src[pos + 1] | (src[pos + 2] << 8) | (src[pos + 3] << 16)
  if (taille < 0x200 || taille > 0x20000) return null
  const out = Buffer.alloc(taille)
  let i = pos + 4, o = 0
  while (o < taille) {
    if (i >= src.length) return null
    const dr = src[i++]
    for (let b = 0; b < 8 && o < taille; b++) {
      if (dr & (0x80 >> b)) {
        if (i + 1 >= src.length) return null
        const a = src[i++], z = src[i++]
        const lon = (a >> 4) + 3, dist = (((a & 0x0f) << 8) | z) + 1
        if (dist > o) return null
        for (let k = 0; k < lon && o < taille; k++) { out[o] = out[o - dist]; o++ }
      } else { if (i >= src.length) return null; out[o++] = src[i++] }
    }
  }
  return out
}

const pc = (x) => { let n = 0; while (x) { n += x & 1; x >>= 1 } return n }

// Sondes sur une police 1bpp 8x8 supposée commencer à `base` dans `buf`.
function sonde(buf, base) {
  const T = 8
  if (base + 0x41 * T > buf.length) return null
  for (let o = 0; o < T; o++) if (buf[base + o] !== 0) return null // espace vide
  const encres = []
  for (let g = 1; g <= 26; g++) {
    let t = 0
    for (let l = 0; l < T; l++) t += pc(buf[base + g * T + l])
    if (t < 6 || t > 34) return null
    encres.push(t)
  }
  // le point : peu de pixels, uniquement sur les 3 lignes du bas
  let ptTotal = 0, ptHaut = 0
  for (let l = 0; l < T; l++) {
    const n = pc(buf[base + 0x40 * T + l])
    ptTotal += n
    if (l < 5) ptHaut += n
  }
  if (ptTotal < 1 || ptTotal > 8 || ptHaut !== 0) return null
  const I = encres[8], M = encres[12], W = encres[22]
  if (!(I < M && I < W)) return null
  return { I, M, W, pt: ptTotal }
}

console.log('=== SONDES DE TABLE SUR BLOCS DÉCOMPRESSÉS ===')
const trouves = []
let blocs = 0
for (let i = 0; i < rom.length - 4; i += 4) {
  if (rom[i] !== 0x10) continue
  const out = delz(rom, i)
  if (!out) continue
  blocs++
  for (let base = 0; base + 0x41 * 8 <= out.length; base += 4) {
    const r = sonde(out, base)
    if (r) trouves.push({ src: i, base, taille: out.length, ...r, data: out })
  }
}
console.log('Blocs décompressés analysés : ' + blocs)
console.log('Correspondances : ' + trouves.length + '\n')
for (const t of trouves.slice(0, 15)) {
  console.log('  bloc 0x' + t.src.toString(16).toUpperCase().padStart(6, '0') +
    ' (' + t.taille + ' o)  offset interne 0x' + t.base.toString(16).toUpperCase() +
    '  point=' + t.pt + 'px  I=' + t.I + ' M=' + t.M + ' W=' + t.W)
}

if (trouves.length) {
  const crcT = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0 } return t })()
  const crc = (b) => { let c = 0xffffffff; for (const x of b) c = crcT[(c ^ x) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0 }
  const ch = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const co = Buffer.concat([Buffer.from(t, 'latin1'), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(co)); return Buffer.concat([l, co, c]) }
  const png = (w, h, px) => {
    const ih = Buffer.alloc(13); ih.writeUInt32BE(w, 0); ih.writeUInt32BE(h, 4); ih[8] = 8
    const br = Buffer.alloc(h * (w + 1))
    for (let y = 0; y < h; y++) { br[y * (w + 1)] = 0; px.copy(br, y * (w + 1) + 1, y * w, (y + 1) * w) }
    return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), ch('IHDR', ih), ch('IDAT', deflateSync(br, { level: 9 })), ch('IEND', Buffer.alloc(0))])
  }
  const montres = trouves.slice(0, 5)
  const COLS = 16, ZOOM = 4, NBG = 80
  const larg = COLS * 8 * ZOOM, hz = (NBG / COLS) * 8 * ZOOM + 12
  const haut = hz * montres.length
  const px = Buffer.alloc(larg * haut, 60)
  for (let i = 0; i < montres.length; i++) {
    const { data, base } = montres[i]
    for (let g = 0; g < NBG; g++) {
      const gx = (g % COLS) * 8, gy = ((g / COLS) | 0) * 8
      for (let l = 0; l < 8; l++) {
        const o = data[base + g * 8 + l] || 0
        for (let b = 0; b < 8; b++) {
          const on = (o >> (7 - b)) & 1
          for (let zy = 0; zy < ZOOM; zy++) for (let zx = 0; zx < ZOOM; zx++) {
            const x = (gx + b) * ZOOM + zx, y = i * hz + (gy + l) * ZOOM + zy
            if (x < larg && y < haut) px[y * larg + x] = on ? 255 : 0
          }
        }
      }
    }
  }
  writeFileSync(process.argv[3], png(larg, haut, px))
  console.log('\nPlanche : ' + process.argv[3])
}
