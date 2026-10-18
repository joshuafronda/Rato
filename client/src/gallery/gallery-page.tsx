import { useGallery } from './use-gallery.ts'

// What guests see on their phones at http://<laptop-ip>:3000/gallery.
export function GalleryPage() {
  const gallery = useGallery()

  return (
    <main className="page">
      <h1>Rato gallery</h1>
      {gallery.status === 'loading' && <p className="page-note">Loading…</p>}
      {gallery.status === 'error' && <p role="alert">{gallery.message}</p>}
      {gallery.status === 'ready' && !gallery.enabled && <p className="page-note">The gallery is turned off.</p>}
      {gallery.status === 'ready' && gallery.enabled && gallery.strips.length === 0 && (
        <p className="page-note">No strips have been shared yet.</p>
      )}
      {gallery.status === 'ready' && gallery.enabled && (
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
