// Client GDB Remote Serial Protocol minimal, en Node pur.
//
// mGBA (mgba-sdl.exe -g) expose un stub GDB sur le port 2345. Ce module parle
// ce protocole : c'est le seul moyen de piloter l'émulateur sans interface, la
// version 0.10.5 n'ayant pas d'option --script.
//
// Protocole : paquets "$<données>#<somme sur 2 hex>", accusés par "+".
// L'interruption s'envoie en octet brut 0x03, hors paquet.

import net from 'node:net';

const ACK = 0x2b; // '+'
const NACK = 0x2d; // '-'

function somme(donnees) {
  let s = 0;
  for (let i = 0; i < donnees.length; i++) s = (s + donnees.charCodeAt(i)) & 0xff;
  return s.toString(16).padStart(2, '0');
}

// Le protocole échappe '#', '$', '}' et '*' par '}' + (octet ^ 0x20).
// '*' introduit aussi une répétition (RLE) : caractère précédent répété n-29 fois.
function desechapper(brut) {
  let sortie = '';
  for (let i = 0; i < brut.length; i++) {
    const c = brut[i];
    if (c === '}') {
      sortie += String.fromCharCode(brut.charCodeAt(++i) ^ 0x20);
    } else if (c === '*') {
      const n = brut.charCodeAt(++i) - 29;
      const precedent = sortie[sortie.length - 1];
      sortie += precedent.repeat(n);
    } else {
      sortie += c;
    }
  }
  return sortie;
}

export class Gdb {
  constructor() {
    this.socket = null;
    this.tampon = '';
    this.attentes = [];
    this.spontanes = [];
  }

  async connecter(hote = '127.0.0.1', port = 2345, essais = 40) {
    for (let i = 0; i < essais; i++) {
      try {
        this.socket = await new Promise((ok, ko) => {
          const s = net.connect({ host: hote, port });
          s.once('connect', () => ok(s));
          s.once('error', ko);
        });
        break;
      } catch {
        await new Promise((r) => setTimeout(r, 500));
      }
    }
    if (!this.socket) throw new Error(`stub GDB injoignable sur ${hote}:${port}`);
    this.socket.setNoDelay(true);
    this.socket.on('data', (d) => this._recevoir(d));
    return this;
  }

  _recevoir(donnees) {
    this.tampon += donnees.toString('binary');
    for (;;) {
      // On ignore les accusés isolés.
      while (this.tampon.length && (this.tampon.charCodeAt(0) === ACK || this.tampon.charCodeAt(0) === NACK)) {
        this.tampon = this.tampon.slice(1);
      }
      const debut = this.tampon.indexOf('$');
      if (debut < 0) return;
      const diese = this.tampon.indexOf('#', debut);
      if (diese < 0 || this.tampon.length < diese + 3) return;
      const corps = this.tampon.slice(debut + 1, diese);
      this.tampon = this.tampon.slice(diese + 3);
      this.socket.write('+');
      const message = desechapper(corps);
      const attente = this.attentes.shift();
      if (attente) attente(message);
      else this.spontanes.push(message);
    }
  }

  envoyer(commande) {
    const paquet = `$${commande}#${somme(commande)}`;
    return new Promise((ok) => {
      this.attentes.push(ok);
      this.socket.write(paquet);
    });
  }

  // « c » ne rend la main qu'au prochain arrêt : on garde la promesse de côté
  // au lieu de l'attendre, sinon le pilote se bloque pour toujours.
  relancer() {
    this.enCours = this.envoyer('c');
    return this.enCours;
  }

  // Interruption : octet brut 0x03. Le paquet d'arrêt qui suit résout la
  // promesse laissée en attente par relancer().
  async interrompre() {
    if (!this.enCours) return this.envoyerBrut(Buffer.from([0x03]));
    this.socket.write(Buffer.from([0x03]));
    const arret = await this.enCours;
    this.enCours = null;
    return arret;
  }

  envoyerBrut(octets) {
    return new Promise((ok) => {
      this.attentes.push(ok);
      this.socket.write(octets);
    });
  }

  async lire(adresse, longueur) {
    // Le stub de mGBA plafonne la taille de paquet ; on découpe large mais sûr.
    const morceaux = [];
    const PAS = 512;
    for (let d = 0; d < longueur; d += PAS) {
      const n = Math.min(PAS, longueur - d);
      const r = await this.envoyer(`m${(adresse + d).toString(16)},${n.toString(16)}`);
      if (r.startsWith('E') || r.length !== n * 2) {
        throw new Error(`lecture refusée à 0x${(adresse + d).toString(16)} (${n} o) : ${r.slice(0, 40)}`);
      }
      morceaux.push(Buffer.from(r, 'hex'));
    }
    return Buffer.concat(morceaux);
  }

  async registres() {
    const r = await this.envoyer('g');
    // ARM : r0-r15 en petit-boutiste, puis cpsr. mGBA renvoie 17 mots de 8 hex.
    const mots = [];
    for (let i = 0; i + 8 <= r.length; i += 8) {
      mots.push(Buffer.from(r.slice(i, i + 8), 'hex').readUInt32LE(0));
    }
    return mots;
  }

  fermer() {
    if (this.socket) this.socket.destroy();
  }
}

export const hex = (n, l = 8) => '0x' + (n >>> 0).toString(16).toUpperCase().padStart(l, '0');
