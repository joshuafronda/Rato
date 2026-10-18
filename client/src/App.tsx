import { BoothScreen } from './booth/booth-screen.tsx'
import { GalleryPage } from './gallery/gallery-page.tsx'
import { SharePage } from './gallery/share-page.tsx'

const SHARE_PATH = /^\/s\/([a-z2-9]{10})\/?$/

// Three small pages, picked by path: the booth (/), the gallery and a shared strip.
export default function App() {
  const path = window.location.pathname
  const share = SHARE_PATH.exec(path)
  if (share) return <SharePage shareCode={share[1]} />
  if (path === '/gallery' || path === '/gallery/') return <GalleryPage />
  return <BoothScreen />
}
