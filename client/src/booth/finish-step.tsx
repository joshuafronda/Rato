import { useEffect, useState } from 'react'
import { getShareLink, queuePrint, setStripPublic } from '../lib/api.ts'
import type { SavedStrip, ShareLink } from '../lib/booth-types.ts'

interface FinishStepProps {
  strip: SavedStrip
  onPrintQueued: () => void
  onDone: () => void
}

type PrintState = { status: 'idle' } | { status: 'sending' } | { status: 'sent'; copies: number } | { status: 'error'; message: string }

const COPY_CHOICES = [1, 2, 3]

export function FinishStep({ strip, onPrintQueued, onDone }: FinishStepProps) {
  const [link, setLink] = useState<ShareLink | null>(null)
  const [copies, setCopies] = useState(1)
  const [print, setPrint] = useState<PrintState>({ status: 'idle' })
  const [isPublic, setIsPublic] = useState(false)
  const [shareError, setShareError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    getShareLink(strip.shareCode).then(
      (found) => {
        if (!cancelled) setLink(found)
      },
      () => {
        // No QR code then; printing and downloading still work.
      },
    )
    return () => {
      cancelled = true
    }
  }, [strip.shareCode])

  const sendToPrinter = async () => {
    setPrint({ status: 'sending' })
    try {
      await queuePrint(strip.shareCode, copies)
      setPrint({ status: 'sent', copies })
      onPrintQueued()
    } catch (error) {
      setPrint({ status: 'error', message: error instanceof Error ? error.message : 'Printing failed' })
    }
  }

  const toggleGallery = async (next: boolean) => {
    setShareError(null)
    setIsPublic(next)
    try {
      await setStripPublic(strip.shareCode, next)
    } catch (error) {
      setIsPublic(!next)
      setShareError(error instanceof Error ? error.message : 'Could not change sharing')
    }
  }

  return (
    <>
      <div className="step-header">
        <h2>Your strip is ready!</h2>
      </div>
      <div className="finish">
        <img className="finished-strip" src={strip.imageUrl} alt="Your photo strip" />
        <div className="finish-panel">
          <section className="finish-section" aria-label="Print">
            <h3>Print</h3>
            {print.status === 'sent' ? (
              <p>
                Printing {print.copies} {print.copies === 1 ? 'copy' : 'copies'}…
              </p>
            ) : (
              <>
                <div className="button-row" role="group" aria-label="Copies">
                  {COPY_CHOICES.map((choice) => (
                    <button
                      key={choice}
                      type="button"
                      className="filter-chip"
                      aria-pressed={copies === choice}
                      onClick={() => setCopies(choice)}
                    >
                      {choice} {choice === 1 ? 'copy' : 'copies'}
                    </button>
                  ))}
                </div>
                <button type="button" onClick={sendToPrinter} disabled={print.status === 'sending'}>
                  Print
                </button>
                {print.status === 'error' && <p role="alert">{print.message}</p>}
              </>
            )}
          </section>

          <section className="finish-section" aria-label="Phone">
            <h3>Get it on your phone</h3>
            {link ? (
              <>
                <img
                  className="qr-code"
                  src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(link.qrSvg)}`}
                  alt="QR code for your strip"
                />
                <p className="share-url">{link.url}</p>
              </>
            ) : (
              <p className="page-note">Loading the QR code…</p>
            )}
            <label className="toggle">
              <input type="checkbox" checked={isPublic} onChange={(event) => void toggleGallery(event.target.checked)} />
              Show my strip in the gallery
            </label>
            {shareError && <p role="alert">{shareError}</p>}
          </section>
        </div>
      </div>
      <footer className="step-actions button-row">
        <a className="button-link secondary-action" href={strip.imageUrl} download={`rato-${strip.shareCode}.png`}>
          Download
        </a>
        <button type="button" className="primary-action" onClick={onDone}>
          Done
        </button>
      </footer>
    </>
  )
}
