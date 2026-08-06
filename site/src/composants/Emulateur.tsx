import { useEffect, useRef, useState } from 'react'
import { Bouton, Etiquette } from './ui'

/**
 * Émulateur GBA dans la page, via EmulatorJS (cœur mGBA compilé en WebAssembly).
 *
 * La ROM lui est passée par une URL d'objet (`blob:`), c'est-à-dire un pointeur
 * vers de la mémoire du navigateur. Elle ne transite par aucun serveur : le CDN
 * ne sert que le code de l'émulateur, jamais le jeu.
 */

declare global {
  interface Window {
    EJS_player?: string
    EJS_core?: string
    EJS_gameUrl?: string
    EJS_pathtodata?: string
    EJS_startOnLoaded?: boolean
    EJS_gameName?: string
    EJS_color?: string
    EJS_language?: string
  }
}

const SOURCE_EMULATEUR = 'https://cdn.emulatorjs.org/stable/data/'

export function Emulateur({ rom, surQuitter }: { rom: ArrayBuffer; surQuitter: () => void }) {
  const [erreur, setErreur] = useState<string | null>(null)
  const lance = useRef(false)

  useEffect(() => {
    // EmulatorJS s'installe sur des variables globales et ne se démonte pas
    // proprement : on ne le lance donc qu'une fois par chargement de page.
    if (lance.current) return
    lance.current = true

    const url = URL.createObjectURL(new Blob([rom], { type: 'application/octet-stream' }))

    window.EJS_player = '#jeu'
    window.EJS_core = 'gba'
    window.EJS_gameUrl = url
    window.EJS_pathtodata = SOURCE_EMULATEUR
    window.EJS_gameName = 'Medabots — Metabee'
    window.EJS_startOnLoaded = true
    window.EJS_color = '#FFC42E'
    window.EJS_language = 'fr-FR'

    const script = document.createElement('script')
    script.src = SOURCE_EMULATEUR + 'loader.js'
    script.onerror = () =>
      setErreur(
        'Le moteur d’émulation n’a pas pu être chargé. Il vient d’un service externe : ' +
          'vérifiez votre connexion, ou réessayez plus tard.',
      )
    document.body.appendChild(script)

    return () => {
      URL.revokeObjectURL(url)
    }
  }, [rom])

  return (
    <div className="monte">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Etiquette ton="jaune">Version originale</Etiquette>
          <Etiquette>Aucun patch appliqué</Etiquette>
        </div>
        {/* Recharger la page est le seul arrêt fiable : l'émulateur tient des
            ressources globales (audio, WebGL, boucle de rendu). */}
        <Bouton ton="discret" onClick={surQuitter}>
          Quitter le jeu
        </Bouton>
      </div>

      {erreur ? (
        <div role="alert" className="rounded-carte border border-corail/40 bg-corail/10 p-6">
          <p className="text-sm text-texte-doux">{erreur}</p>
        </div>
      ) : (
        <div
          id="jeu"
          className="aspect-[3/2] w-full overflow-hidden rounded-carte border border-trait bg-black"
        />
      )}

      <p className="mt-4 text-xs text-texte-doux">
        Vos sauvegardes restent dans ce navigateur. Sur mobile, ajoutez le site à l’écran
        d’accueil pour le retrouver comme une application.
      </p>
    </div>
  )
}
