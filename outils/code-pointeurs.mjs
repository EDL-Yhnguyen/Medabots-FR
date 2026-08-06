// Toutes les adresses ROM que le CODE charge réellement (pools littéraux).
//
// Une police est forcément désignée quelque part par un pointeur constant chargé
// par `LDR Rd,=0x08xxxxxx`. Cet ensemble est petit (quelques milliers) comparé aux
// 8 Mio de la ROM : c'est le bon espace de recherche pour une heuristique
// graphique, qui serait noyée de faux positifs sur la ROM entière.
//
// On note en plus COMMENT le pointeur est utilisé dans les 24 instructions qui
// suivent son chargement :
//   - LDRB Rx,[Rp,Ry]  → table d'octets indexée par une variable
//                        (candidat table de largeurs / table d'indirection)
//   - LDR  Rx,[Rp,Ry]  → table de pointeurs
//   - source d'un SWI 0x11/0x12 (LZ77UnComp) ou 0x0B/0x0C (Cpu(Fast)Set)
//
// Usage : node outils/code-pointeurs.mjs <rom.gba>
// Sortie : travail/code-pointeurs.json + résumé sur stdout

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'

const rom = readFileSync(process.argv[2])
const BASE = 0x08000000
const hex = (n, l = 6) => '0x' + (n >>> 0).toString(16).toUpperCase().padStart(l, '0')

// --- 1. Tous les LDR PC-relatifs THUMB dont la valeur est une adresse ROM ---
const cibles = new Map() // offset ROM pointé → { chargements: [{instr, rd, pool}] }
for (let o = 0; o + 2 <= rom.length; o += 2) {
  const hw = rom.readUInt16LE(o)
  if ((hw & 0xf800) !== 0x4800) continue
  const pool = ((o + 4) & ~3) + (hw & 0xff) * 4
  if (pool + 4 > rom.length) continue
  const v = rom.readUInt32LE(pool)
  if (v < BASE || v >= BASE + rom.length) continue
  const t = v - BASE
  let e = cibles.get(t)
  if (!e) cibles.set(t, (e = { chargements: [] }))
  e.chargements.push({ instr: o, rd: (hw >> 8) & 7, pool })
}
// ARM : LDR Rd,[PC,#imm12] = 0xE59Fdiii
for (let o = 0; o + 4 <= rom.length; o += 4) {
  const w = rom.readUInt32LE(o)
  if ((w & 0xfff0f000) !== 0xe59f0000) continue
  const pool = o + 8 + (w & 0xfff)
  if (pool + 4 > rom.length) continue
  const v = rom.readUInt32LE(pool)
  if (v < BASE || v >= BASE + rom.length) continue
  const t = v - BASE
  let e = cibles.get(t)
  if (!e) cibles.set(t, (e = { chargements: [] }))
  e.chargements.push({ instr: o, rd: -1, pool, arm: true })
}

console.log('=== POINTEURS ROM CHARGES PAR DU CODE THUMB ===')
console.log('cibles distinctes : ' + cibles.size)

// --- 2. Usage : le pointeur sert-il de base à un accès indexé ? -------------
// On regarde les 24 halfwords qui suivent le LDR, en suivant grossièrement le
// registre (pas de renommage : on abandonne si le registre est réécrit).
const analyseUsage = (instr, rd) => {
  const u = { ldrb_idx: 0, ldrh_idx: 0, ldr_idx: 0, ldrb_imm: 0, swi: [], mov: 0 }
  let reg = rd
  for (let i = 1; i <= 24; i++) {
    const o = instr + i * 2
    if (o + 2 > rom.length) break
    const hw = rom.readUInt16LE(o)
    // LDRB Rx,[Rb,Ro] : 0101 110 Ro Rb Rx
    if ((hw & 0xfe00) === 0x5c00 && ((hw >> 3) & 7) === reg) u.ldrb_idx++
    // LDR Rx,[Rb,Ro]  : 0101 100
    if ((hw & 0xfe00) === 0x5800 && ((hw >> 3) & 7) === reg) u.ldr_idx++
    // LDRH Rx,[Rb,Ro] : 0101 101
    if ((hw & 0xfe00) === 0x5a00 && ((hw >> 3) & 7) === reg) u.ldrh_idx++
    // LDRB Rx,[Rb,#n]
    if ((hw & 0xf800) === 0x7800 && ((hw >> 3) & 7) === reg) u.ldrb_imm++
    // MOV Rh,Rl (format 5) — le pointeur part dans un registre haut
    if ((hw & 0xff00) === 0x4600 && ((hw >> 3) & 15) === reg) u.mov++
    // SWI
    if ((hw & 0xff00) === 0xdf00) u.swi.push(hw & 0xff)
    // le registre est écrasé ?
    if ((hw & 0xf800) === 0x4800 && ((hw >> 8) & 7) === reg) break
    if ((hw & 0xf800) === 0x2000 && ((hw >> 8) & 7) === reg) break
  }
  return u
}

const res = []
for (const [t, e] of cibles) {
  const agg = { ldrb_idx: 0, ldrh_idx: 0, ldr_idx: 0, ldrb_imm: 0, swi: new Set(), mov: 0 }
  for (const c of e.chargements) {
    const u = analyseUsage(c.instr, c.rd)
    agg.ldrb_idx += u.ldrb_idx; agg.ldrh_idx += u.ldrh_idx
    agg.ldr_idx += u.ldr_idx; agg.ldrb_imm += u.ldrb_imm; agg.mov += u.mov
    for (const s of u.swi) agg.swi.add(s)
  }
  res.push({
    off: t, n: e.chargements.length, instrs: e.chargements.map((c) => c.instr),
    ldrb_idx: agg.ldrb_idx, ldrh_idx: agg.ldrh_idx, ldr_idx: agg.ldr_idx,
    ldrb_imm: agg.ldrb_imm, mov: agg.mov, swi: [...agg.swi],
  })
}
res.sort((a, b) => a.off - b.off)

mkdirSync('travail', { recursive: true })
writeFileSync('travail/code-pointeurs.json', JSON.stringify(res, null, 1))

const tablesOctets = res.filter((r) => r.ldrb_idx > 0)
console.log('\n=== BASES DE TABLES D\'OCTETS INDEXEES (LDRB Rx,[ptr,Ridx]) ===')
console.log(tablesOctets.length + ' candidates — c\'est la forme d\'une table de largeurs ou d\'indirection\n')
for (const r of tablesOctets) {
  const a = [...rom.subarray(r.off, r.off + 24)]
  const max = Math.max(...a), min = Math.min(...a)
  console.log('  ' + hex(r.off) + '  chargé ' + r.n + '× (ex. ' + hex(r.instrs[0]) + ')  ldrb_idx=' + r.ldrb_idx +
    '  min=' + min + ' max=' + max + '  ' + a.slice(0, 20).map((b) => b.toString(16).padStart(2, '0')).join(' '))
}

console.log('\n=== SOURCES PASSEES A UN SWI (décompression / copie) ===')
for (const r of res.filter((x) => x.swi.length)) {
  console.log('  ' + hex(r.off) + '  swi=' + r.swi.map((s) => '0x' + s.toString(16)).join(',') + '  ' +
    [...rom.subarray(r.off, r.off + 8)].map((b) => b.toString(16).padStart(2, '0')).join(' '))
}
