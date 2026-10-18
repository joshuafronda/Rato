import { EmptyState } from '../ui/empty-state.tsx'
import { ErrorBanner } from '../ui/error-banner.tsx'
import { useGallery } from './use-gallery.ts'

// What guests see on their phones at http://<laptop-ip>:3000/gallery.
export function GalleryPage() {
  const gallery = useGallery()

  return (
    <main className="page">
      <header className="page-header">
        <h1 className="brand">
          <span className="brand-mark" aria-hidden="true" />
          Rato gallery
        </h1>
        <span className="caption">Strips guests chose to share</span>
      </header>
      {gallery.status === 'loading' && <p className="page-note">Loading…</p>}
      {gallery.status === 'error' && <ErrorBanner message={gallery.message} />}
      {gallery.status === 'ready' && !gallery.enabled && (
        <EmptyState icon="image" title="The gallery is turned off." />
      )}
      {gallery.status === 'ready' && gallery.enabled && gallery.strips.length === 0 && (
        <EmptyState icon="image" title="No strips have been shared yet." text="Make a strip at the booth and tap “Show my strip in the gallery”." />
      )}
      {gallery.status === 'ready' && gallery.enabled && gallery.strips.length > 0 && (
        <ul className="gallery-grid">
          {gallery.strips.map((strip) => (
            <li key={strip.shareCode}>
              <a href={`/s/${strip.shareCode}`}>
                <img src={strip.imageUrl} alt="A shared photo strip" loading="lazy" />
              </a>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
