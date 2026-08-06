/**
 * Stockage local de la ROM, en IndexedDB.
 *
 * Pourquoi IndexedDB et pas localStorage : localStorage ne stocke que du texte et
 * plafonne à quelques mégaoctets. Une ROM GBA fait 8 Mio de binaire.
 *
 * Le fichier reste sur l'appareil. Il n'est jamais envoyé, jamais partagé. Le
 * cloisonnement par origine du navigateur s'en charge, et « Oublier ma ROM »
 * l'efface pour de bon.
 */

const BASE = 'medabots-fr'
const MAGASIN = 'fichiers'
const CLE_ROM = 'rom-europe'

function ouvre(): Promise<IDBDatabase> {
  return new Promise((resoudre, rejeter) => {
    const requete = indexedDB.open(BASE, 1)
    requete.onupgradeneeded = () => {
      const base = requete.result
      if (!base.objectStoreNames.contains(MAGASIN)) base.createObjectStore(MAGASIN)
    }
    requete.onsuccess = () => resoudre(requete.result)
    requete.onerror = () => rejeter(requete.error)
  })
}

async function transaction<T>(
  mode: IDBTransactionMode,
  action: (magasin: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const base = await ouvre()
  try {
    return await new Promise<T>((resoudre, rejeter) => {
      const tr = base.transaction(MAGASIN, mode)
      const requete = action(tr.objectStore(MAGASIN))
      requete.onsuccess = () => resoudre(requete.result)
      requete.onerror = () => rejeter(requete.error)
    })
  } finally {
    base.close()
  }
}

export async function rangeRom(donnees: ArrayBuffer): Promise<void> {
  await transaction('readwrite', (m) => m.put(donnees, CLE_ROM))
}

export async function litRom(): Promise<ArrayBuffer | null> {
  const trouve = await transaction<ArrayBuffer | undefined>('readonly', (m) => m.get(CLE_ROM))
  return trouve ?? null
}

export async function oublieRom(): Promise<void> {
  await transaction('readwrite', (m) => m.delete(CLE_ROM))
}
