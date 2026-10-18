import { useEffect, useState } from 'react'
import { getStrip } from '../lib/api.ts'
import type { GalleryStrip } from '../lib/booth-types.ts'

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
      <h1>Your Rato strip</h1>
      {state.status === 'loading' && <p className="page-note">Loading…</p>}
      {state.status === 'error' && <p role="alert">{state.message}</p>}
      {state.status === 'ready' && (
        <>
          <img className="shared-strip" src={state.strip.imageUrl} alt="Your photo strip" />
          <a className="button-link" href={state.strip.imageUrl} download={`rato-${shareCode}.png`}>
            Download
          </a>
          <p className="page-note">On iPhone, press and hold the photo, then tap Save to Photos.</p>
        </>
      )}
      <a href="/gallery">See the gallery</a>
    </main>
  )
}
