// Localisation de la police par « sondes de table ».
//
// On connaît déjà la table : 0x00 = espace, 0x01-0x1A = A-Z, 0x40 = point.
// Dans N'IMPORTE quelle police, cela impose une signature très contraignante :
//   - le glyphe 0 est entièrement vide ;
//   - les glyphes 1 à 26 sont tous non vides et modérément encrés ;
//   - le glyphe 64 (le point) ne fait que quelques pixels, tous en bas ;
//   - le 'I' (glyphe 9) est plus fin que le 'M' (13) et le 'W' (23).
// Obtenir tout ça par hasard sur des octets quelconques est très improbable.
import { readFileSync, writeFileSync } from 'node:fs'
import { deflateSync } from 'node:zlib'

const rom = readFileSync(process.argv[2])
const pc = (x) => { let n = 0; while (x) { n += x & 1; x >>= 1 } return n }

// Formats testés : 1bpp 8x8, 1bpp 8x16, 4bpp 8x8, 4bpp 8x16.
const formats = [
  { nom: '1bpp 8x8', taille: 8, haut: 8, bpp: 1 },
  { nom: '1bpp 8x16', taille: 16, haut: 16, bpp: 1 },
  { nom: '4bpp 8x8', taille: 32, haut: 8, bpp: 4 },
  { nom: '4bpp 8x16', taille: 64, haut: 16, bpp: 4 },
]

// Pixels allumés d'un glyphe, et pixels situés dans le tiers bas.
function encre(base, f) {
  let total = 0, bas = 0
  const octetsParLigne = f.bpp === 1 ? 1 : 4
  for (let l = 0; l < f.haut; l++) {
    let ligne = 0
    for (let o = 0; o < octetsParLigne; o++) {
      const b = rom[base + l * octetsParLigne + o]
      if (b === undefined) return null
      ligne += f.bpp === 1 ? pc(b) : (b & 0x0f ? 1 : 0) + (b >> 4 ? 1 : 0)
    }
    total += ligne
    if (l >= f.haut - Math.max(2, f.haut / 3)) bas += ligne
  }
  return { total, bas }
}

const resultats = []
for (const f of formats) {
  const besoin = 0x41 * f.taille // il faut au moins jusqu'au glyphe 0x40 inclus
  for (let base = 0; base + besoin < rom.length; base += 4) {
    // Sonde 1 — glyphe 0 (espace) entièrement vide.
    let vide = true
    for (let o = 0; o < f.taille; o++) if (rom[base + o] !== 0) { vide = false; break }
    if (!vide) continue

    // Sonde 2 — les 26 lettres majuscules sont toutes encrées, sans excès.
    let lettresOk = true
    const encres = []
    for (let g = 1; g <= 26; g++) {
      const e = encre(base + g * f.taille, f)
      if (!e) { lettresOk = false; break }
      const max = f.haut === 8 ? 40 : 70
      if (e.total < 5 || e.total > max) { lettresOk = false; break }
      encres.push(e.total)
    }
    if (!lettresOk) continue

    // Sonde 3 — le point (glyphe 0x40) : peu de pixels, et tous en bas.
    const pt = encre(base + 0x40 * f.taille, f)
    if (!pt || pt.total < 1 || pt.total > 8) continue
    if (pt.bas !== pt.total) continue

    // Sonde 4 — le 'I' est plus fin que le 'M' et le 'W'.
    const I = encres[8], M = encres[12], W = encres[22]
    if (!(I < M && I < W)) continue

    resultats.push({ base, f, pt: pt.total, I, M, W })
  }
}

console.log('=== CANDIDATS POLICE (sondes de table) ===')
console.log('Correspondances : ' + resultats.length + '\n')
for (const r of resultats.slice(0, 20)) {
  console.log('  0x' + r.base.toString(16).toUpperCase().padStart(6, '0') +
    '  ' + r.f.nom.padEnd(10) + '  point=' + r.pt + 'px  I=' + r.I + ' M=' + r.M + ' W=' + r.W)
}

// --- Rendu PNG des candidats pour confirmation visuelle ---
if (resultats.length) {
  const crcT = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0 } return t })()
  const crc = (b) => { let c = 0xffffffff; for (const x of b) c = crcT[(c ^ x) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0 }
  const ch = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const co = Buffer.concat([Buffer.from(t, 'latin1'), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(co)); return Buffer.concat([l, co, c]) }
  const png = (w, h, px) => {
    const ih = Buffer.alloc(13); ih.writeUInt32BE(w, 0); ih.writeUInt32BE(h, 4); ih[8] = 8
    const br = Buffer.alloc(h * (w + 1))
    for (let y = 0; y < h; y++) { br[y * (w + 1)] = 0; px.copy(br, y * (w + 1) + 1, y * w, (y + 1) * w) }
    return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), ch('IHDR', ih), ch('IDAT', deflateSync(br, { level: 9 })), ch('IEND', Buffer.alloc(0))])
  }

  const montres = resultats.slice(0, 6)
  const COLS = 16, ZOOM = 3, NBG = 96
  const larg = COLS * 8 * ZOOM
  const hauts = montres.map((r) => Math.ceil(NBG / COLS) * r.f.haut * ZOOM + 10)
  const haut = hauts.reduce((a, x) => a + x, 0)
  const px = Buffer.alloc(larg * haut, 60)
  let y0 = 0
  for (let i = 0; i < montres.length; i++) {
    const { base, f } = montres[i]
    const opl = f.bpp === 1 ? 1 : 4
    for (let g = 0; g < NBG; g++) {
      const gx = (g % COLS) * 8, gy = ((g / COLS) | 0) * f.haut
      for (let l = 0; l < f.haut; l++) {
        for (let b = 0; b < 8; b++) {
          let on = 0
          if (f.bpp === 1) {
            const o = rom[base + g * f.taille + l]
            on = o === undefined ? 0 : (o >> (7 - b)) & 1
          } else {
            const o = rom[base + g * f.taille + l * opl + (b >> 1)]
            on = o === undefined ? 0 : (b & 1 ? o >> 4 : o & 0x0f) ? 1 : 0
          }
          for (let zy = 0; zy < ZOOM; zy++) for (let zx = 0; zx < ZOOM; zx++) {
            const x = (gx + b) * ZOOM + zx, y = y0 + (gy + l) * ZOOM + zy
            if (x < larg && y < haut) px[y * larg + x] = on ? 255 : 0
          }
        }
      }
    }
    y0 += hauts[i]
  }
  writeFileSync(process.argv[3], png(larg, haut, px))
  console.log('\nPlanche : ' + process.argv[3])
  console.log('Zones de haut en bas : ' + montres.map((r) => '0x' + r.base.toString(16).toUpperCase() + ' (' + r.f.nom + ')').join(', '))
}
