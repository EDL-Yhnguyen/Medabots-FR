// Analyse d'en-tête et de contenu d'une ROM GBA — lecture seule.
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'

const chemin = process.argv[2]
const rom = readFileSync(chemin)

const hex = (b) => b.toString(16).toUpperCase().padStart(2, '0')
const ascii = (deb, lon) => rom.subarray(deb, deb + lon).toString('latin1').replace(/\0/g, ' ').trim()

// --- CRC32 ---
const tableCrc = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()
const crc32 = (buf) => {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = tableCrc[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return ((c ^ 0xffffffff) >>> 0).toString(16).toUpperCase().padStart(8, '0')
}

console.log('=== IDENTITÉ ===')
console.log('Taille        :', rom.length, 'octets =', rom.length / 1024 / 1024, 'Mio =', (rom.length * 8) / 1024 / 1024, 'Mbit')
console.log('CRC32         :', crc32(rom))
console.log('MD5           :', createHash('md5').update(rom).digest('hex').toUpperCase())
console.log('SHA1          :', createHash('sha1').update(rom).digest('hex').toUpperCase())

console.log('\n=== EN-TÊTE GBA ===')
console.log('Point entrée  : 0x' + rom.readUInt32LE(0x00).toString(16).toUpperCase())
// Le logo Nintendo (0x04-0x9F) doit avoir un checksum précis, sinon la console refuse de démarrer.
const logo = rom.subarray(0x04, 0xa0)
console.log('Logo Nintendo : CRC32 ' + crc32(logo) + ' (attendu 9A6CB350 pour un logo intact)')
console.log('Titre         : "' + ascii(0xa0, 12) + '"')
console.log('Code jeu      : "' + ascii(0xac, 4) + '"  (4e car. = région : E=USA, P=Europe, J=Japon, F=France)')
console.log('Code éditeur  : "' + ascii(0xb0, 2) + '"')
console.log('Unité fixe    : 0x' + hex(rom[0xb2]) + ' (doit valoir 96)')
console.log('Code unité    : 0x' + hex(rom[0xb3]))
console.log('Type appareil : 0x' + hex(rom[0xb4]))
console.log('Version       : ' + rom[0xbd])
console.log('Complément    : 0x' + hex(rom[0xbe]))

// Le complément d'en-tête : somme de 0xA0..0xBC, vérifié par le BIOS.
let somme = 0
for (let i = 0xa0; i <= 0xbc; i++) somme = (somme + rom[i]) & 0xff
const attendu = (-(0x19 + somme)) & 0xff
console.log('  → recalculé : 0x' + hex(attendu) + (attendu === rom[0xbe] ? '  ✅ conforme' : '  ❌ NON conforme'))

console.log('\n=== TYPE DE SAUVEGARDE (chaîne signature) ===')
const signatures = ['EEPROM_V', 'SRAM_V', 'SRAM_F_V', 'FLASH_V', 'FLASH512_V', 'FLASH1M_V']
const texte = rom.toString('latin1')
for (const s of signatures) {
  const p = texte.indexOf(s)
  if (p >= 0) console.log('  ' + s.padEnd(12) + ' → 0x' + p.toString(16).toUpperCase() + '  "' + ascii(p, 16) + '"')
}

console.log('\n=== REMPLISSAGE / ESPACE LIBRE ===')
// Un long bloc de 0x00 ou 0xFF en fin de ROM = place libre pour du code ou du texte ajouté.
let finUtile = rom.length - 1
const bourrage = rom[rom.length - 1]
while (finUtile > 0 && rom[finUtile] === bourrage) finUtile--
console.log('Octet de bourrage final : 0x' + hex(bourrage))
console.log('Dernier octet utile     : 0x' + finUtile.toString(16).toUpperCase())
console.log('Espace libre en fin     : ' + (rom.length - 1 - finUtile) + ' octets (' + (((rom.length - 1 - finUtile) / 1024) | 0) + ' Kio)')

console.log('\n=== CHAÎNES ASCII LISIBLES (échantillon) ===')
// Si le texte du jeu est en ASCII brut, la traduction est bien plus simple.
const chaines = []
let courante = ''
for (let i = 0; i < rom.length; i++) {
  const c = rom[i]
  if (c >= 0x20 && c <= 0x7e) courante += String.fromCharCode(c)
  else {
    if (courante.length >= 8) chaines.push([i - courante.length, courante])
    courante = ''
  }
}
console.log('Nombre de chaînes ASCII >= 8 caractères : ' + chaines.length)
for (const [p, s] of chaines.slice(0, 40)) console.log('  0x' + p.toString(16).toUpperCase().padStart(6, '0') + '  ' + s)

console.log('\n=== RECHERCHE DE MOTS-CLÉS ===')
for (const mot of ['Medabot', 'MEDABOT', 'Metabee', 'METABEE', 'Rokusho', 'Medarot', 'Natsuhiko', 'Ikki', 'Nintendo', 'Imagineer', 'Ubi', 'Natsume']) {
  const p = texte.indexOf(mot)
  console.log('  ' + mot.padEnd(12) + (p >= 0 ? '→ 0x' + p.toString(16).toUpperCase() : '— absent en ASCII brut'))
}
