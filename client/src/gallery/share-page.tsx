import { useEffect, useState } from 'react'
import { getStrip } from '../lib/api.ts'
import type { GalleryStrip } from '../lib/booth-types.ts'
import { ButtonLink } from '../ui/button.tsx'
import { ErrorBanner } from '../ui/error-banner.tsx'

type StripState = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; strip: GalleryStrip }

// One strip, opened from the QR code at http://<laptop-ip>:3000/s/<code>.
export function SharePage({ shareCode }: { shareCode: string }) {
  const [state, setState] = useState<StripState>({ status: 'loading' })

  useEffect(() => {
    let cancelled = false
    getStrip(shareCode).then(
      (strip) => {
        if (!cancelled) setState({ status: 'ready', strip })
      },
      (error: Error) => {
        if (!cancelled) setState({ status: 'error', message: error.message })
      },
    )
    return () => {
      cancelled = true
    }
  }, [shareCode])

  return (
    <main className="page share-page">
      <h1 className="brand">
        <span className="brand-mark" aria-hidden="true" />
        Your Rato strip
      </h1>
      {state.status === 'loading' && <p className="page-note">Loading…</p>}
      {state.status === 'error' && <ErrorBanner message={state.message} />}
      {state.status === 'ready' && (
        <>
          <img className="shared-strip" src={state.strip.imageUrl} alt="Your photo strip" />
          <ButtonLink size="lg" icon="download" href={state.strip.imageUrl} download={`rato-${shareCode}.png`}>
            Download
          </ButtonLink>
          <p className="caption">On iPhone, press and hold the photo, then tap Save to Photos.</p>
        </>
      )}
      <ButtonLink variant="secondary" icon="image" href="/gallery">
        See the gallery
      </ButtonLink>
    </main>
  )
}
