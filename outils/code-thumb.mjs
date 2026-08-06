// Désassembleur THUMB minimal + recherche de la routine de lecture de texte.
//
// La routine qui parcourt un message compare fatalement l'octet lu aux codes de
// contrôle : 0xFD (saut de ligne), 0xFE (fin d'entrée), 0xFF (fin de message).
// En THUMB c'est `CMP Rd, #imm8` = 0x28xx..0x2Fxx.
// On cherche les endroits où PLUSIEURS de ces comparaisons sont proches : une
// comparaison isolée à 0xFF est banale (masques, -1), un aiguillage sur
// 0xF8..0xFF au même endroit ne l'est pas.
//
// Usage : node outils/code-thumb.mjs <rom.gba> [adresse-hex]
//   sans adresse : liste les zones candidates
//   avec adresse : désassemble 128 instructions à partir de là

import { readFileSync } from 'node:fs'

const rom = readFileSync(process.argv[2])
const BASE = 0x08000000
const hex = (n, l = 6) => '0x' + (n >>> 0).toString(16).toUpperCase().padStart(l, '0')
const R = (n) => (n === 13 ? 'sp' : n === 14 ? 'lr' : n === 15 ? 'pc' : 'r' + n)

// --- Désassembleur THUMB partiel (suffisant pour lire une routine) ---------
export function desasm(off) {
  const hw = rom.readUInt16LE(off)
  const h = (x) => '#' + x + (x > 9 ? ' (0x' + x.toString(16) + ')' : '')
  const op = hw >> 13
  // Format 1/2 : shifts et add/sub
  if ((hw & 0xe000) === 0x0000) {
    if ((hw & 0xf800) === 0x1800) { // ADD/SUB
      const rd = hw & 7, rs = (hw >> 3) & 7, v = (hw >> 6) & 7
      const sub = hw & 0x200, imm = hw & 0x400
      return (sub ? 'SUB ' : 'ADD ') + R(rd) + ',' + R(rs) + ',' + (imm ? h(v) : R(v))
    }
    const rd = hw & 7, rs = (hw >> 3) & 7, n = (hw >> 6) & 0x1f
    const nom = ['LSL', 'LSR', 'ASR'][(hw >> 11) & 3]
    return nom + ' ' + R(rd) + ',' + R(rs) + ',#' + n
  }
  // Format 3 : mov/cmp/add/sub immédiat
  if ((hw & 0xe000) === 0x2000) {
    const nom = ['MOV', 'CMP', 'ADD', 'SUB'][(hw >> 11) & 3]
    return nom + ' ' + R((hw >> 8) & 7) + ',' + h(hw & 0xff)
  }
  // Format 4 : ALU
  if ((hw & 0xfc00) === 0x4000) {
    const nom = ['AND', 'EOR', 'LSL', 'LSR', 'ASR', 'ADC', 'SBC', 'ROR', 'TST', 'NEG', 'CMP', 'CMN', 'ORR', 'MUL', 'BIC', 'MVN'][(hw >> 6) & 15]
    return nom + ' ' + R(hw & 7) + ',' + R((hw >> 3) & 7)
  }
  // Format 5 : Hi register / BX
  if ((hw & 0xfc00) === 0x4400) {
    const rd = (hw & 7) | ((hw >> 4) & 8), rs = (hw >> 3) & 15
    const nom = ['ADD', 'CMP', 'MOV', 'BX'][(hw >> 8) & 3]
    return nom === 'BX' ? 'BX ' + R(rs) : nom + ' ' + R(rd) + ',' + R(rs)
  }
  // Format 6 : LDR PC-relatif
  if ((hw & 0xf800) === 0x4800) {
    const cible = ((off + 4) & ~3) + (hw & 0xff) * 4
    const v = cible + 4 <= rom.length ? rom.readUInt32LE(cible) : 0
    return 'LDR ' + R((hw >> 8) & 7) + ',=' + hex(v, 8) + '   [pool ' + hex(cible) + ']'
  }
  // Format 7/8 : load/store registre
  if ((hw & 0xf200) === 0x5000) {
    const l = hw & 0x800, b = hw & 0x400
    return (l ? 'LDR' : 'STR') + (b ? 'B ' : ' ') + R(hw & 7) + ',[' + R((hw >> 3) & 7) + ',' + R((hw >> 6) & 7) + ']'
  }
  if ((hw & 0xf200) === 0x5200) {
    const nom = ['STRH', 'LDSB', 'LDRH', 'LDSH'][(hw >> 10) & 3]
    return nom + ' ' + R(hw & 7) + ',[' + R((hw >> 3) & 7) + ',' + R((hw >> 6) & 7) + ']'
  }
  // Format 9 : load/store immédiat
  if ((hw & 0xe000) === 0x6000) {
    const l = hw & 0x800, b = hw & 0x1000
    const n = ((hw >> 6) & 0x1f) * (b ? 1 : 4)
    return (l ? 'LDR' : 'STR') + (b ? 'B ' : ' ') + R(hw & 7) + ',[' + R((hw >> 3) & 7) + ',#' + n + ']'
  }
  // Format 10 : halfword
  if ((hw & 0xf000) === 0x8000) {
    const l = hw & 0x800
    return (l ? 'LDRH ' : 'STRH ') + R(hw & 7) + ',[' + R((hw >> 3) & 7) + ',#' + ((hw >> 6) & 0x1f) * 2 + ']'
  }
  // Format 11 : SP-relatif
  if ((hw & 0xf000) === 0x9000) return ((hw & 0x800) ? 'LDR ' : 'STR ') + R((hw >> 8) & 7) + ',[sp,#' + (hw & 0xff) * 4 + ']'
  // Format 12 : load address
  if ((hw & 0xf000) === 0xa000) return 'ADD ' + R((hw >> 8) & 7) + ',' + ((hw & 0x800) ? 'sp' : 'pc') + ',#' + (hw & 0xff) * 4
  // Format 13 : add offset to SP
  if ((hw & 0xff00) === 0xb000) return 'ADD sp,#' + ((hw & 0x80) ? '-' : '') + (hw & 0x7f) * 4
  // Format 14 : push/pop
  if ((hw & 0xf600) === 0xb400) {
    const l = hw & 0x800, r = hw & 0x100
    const regs = []
    for (let i = 0; i < 8; i++) if (hw & (1 << i)) regs.push(R(i))
    if (r) regs.push(l ? 'pc' : 'lr')
    return (l ? 'POP {' : 'PUSH {') + regs.join(',') + '}'
  }
  // Format 15 : multiple load/store
  if ((hw & 0xf000) === 0xc000) {
    const regs = []
    for (let i = 0; i < 8; i++) if (hw & (1 << i)) regs.push(R(i))
    return ((hw & 0x800) ? 'LDMIA ' : 'STMIA ') + R((hw >> 8) & 7) + '!,{' + regs.join(',') + '}'
  }
  // Format 16/17 : branchements conditionnels / SWI
  if ((hw & 0xf000) === 0xd000) {
    const cond = (hw >> 8) & 15
    if (cond === 15) return 'SWI #' + (hw & 0xff)
    if (cond === 14) return 'UNDEF'
    let o8 = hw & 0xff; if (o8 & 0x80) o8 -= 256
    const nom = ['BEQ', 'BNE', 'BCS', 'BCC', 'BMI', 'BPL', 'BVS', 'BVC', 'BHI', 'BLS', 'BGE', 'BLT', 'BGT', 'BLE'][cond]
    return nom + ' ' + hex(off + 4 + o8 * 2)
  }
  // Format 18 : branchement inconditionnel
  if ((hw & 0xf800) === 0xe000) {
    let o11 = hw & 0x7ff; if (o11 & 0x400) o11 -= 0x800
    return 'B ' + hex(off + 4 + o11 * 2)
  }
  // Format 19 : BL
  if ((hw & 0xf800) === 0xf000) {
    const hw2 = off + 4 <= rom.length ? rom.readUInt16LE(off + 2) : 0
    if ((hw2 & 0xf800) === 0xf800) {
      let hi = hw & 0x7ff; if (hi & 0x400) hi -= 0x800
      const cible = off + 4 + (hi << 12) + ((hw2 & 0x7ff) << 1)
      return 'BL ' + hex(cible)
    }
    return 'BL(hi)'
  }
  if ((hw & 0xf800) === 0xf800) return 'BL(lo)'
  return '?? ' + hw.toString(16)
}

export function dump(deb, n = 128) {
  for (let i = 0, o = deb; i < n; i++) {
    const t = desasm(o)
    console.log('  ' + hex(o) + '  ' + rom.readUInt16LE(o).toString(16).padStart(4, '0') + '  ' + t)
    o += t.startsWith('BL 0x') ? 4 : 2
    if (t.startsWith('BL 0x')) i++
  }
}

// --- Mode 1 : recherche ----------------------------------------------------
if (process.argv[3]) { dump(parseInt(process.argv[3], 16), parseInt(process.argv[4] || '128')); process.exit(0) }

// Toutes les CMP Rd,#imm avec imm dans 0xF8..0xFF
const cmps = []
for (let o = 0; o + 2 <= rom.length; o += 2) {
  const hw = rom.readUInt16LE(o)
  if ((hw & 0xf800) === 0x2800) {
    const imm = hw & 0xff
    if (imm >= 0xf8) cmps.push({ off: o, rd: (hw >> 8) & 7, imm })
  }
}
console.log('=== CMP Rd,#0xF8..0xFF en THUMB ===')
console.log('total : ' + cmps.length)

// Grappes : au moins 3 comparaisons distinctes dans une fenêtre de 0x100 octets
const grappes = []
for (let i = 0; i < cmps.length; i++) {
  const fen = []
  for (let j = i; j < cmps.length && cmps[j].off - cmps[i].off < 0x120; j++) fen.push(cmps[j])
  const distincts = new Set(fen.map((c) => c.imm))
  if (distincts.size >= 3) {
    const dernier = grappes[grappes.length - 1]
    if (dernier && cmps[i].off - dernier.fin < 0x120) { dernier.fin = fen[fen.length - 1].off; for (const v of distincts) dernier.vals.add(v) }
    else grappes.push({ deb: cmps[i].off, fin: fen[fen.length - 1].off, vals: distincts })
  }
}
console.log('grappes (>=3 valeurs distinctes de 0xF8..0xFF rapprochées) : ' + grappes.length + '\n')
for (const g of grappes) {
  console.log('  ' + hex(g.deb) + '..' + hex(g.fin) + '  valeurs: ' + [...g.vals].sort().map((v) => '0x' + v.toString(16)).join(' '))
}
