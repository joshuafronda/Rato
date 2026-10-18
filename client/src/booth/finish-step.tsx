import { useEffect, useState } from 'react'
import { getShareLink, queuePrint, setStripPublic } from '../lib/api.ts'
import type { SavedStrip, ShareLink } from '../lib/booth-types.ts'
import { Button, ButtonLink } from '../ui/button.tsx'
import { Card } from '../ui/card.tsx'
import { Chip } from '../ui/chip.tsx'
import { ErrorBanner } from '../ui/error-banner.tsx'
import { Toggle } from '../ui/toggle.tsx'

interface FinishStepProps {
  strip: SavedStrip
  onPrintQueued: () => void
  onDone: () => void
}

type PrintState = { status: 'idle' } | { status: 'sending' } | { status: 'sent'; copies: number } | { status: 'error'; message: string }

const COPY_CHOICES = [1, 2, 3]
const GALLERY_LABEL = 'Show my strip in the gallery'
const ONLINE_GALLERY_LABEL = 'Show my strip in the online gallery (anyone with the link can see it)'

export function FinishStep({ strip, onPrintQueued, onDone }: FinishStepProps) {
  const [link, setLink] = useState<ShareLink | null>(null)
  const [linkFailed, setLinkFailed] = useState(false)
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
        // No QR code then; printing, downloading and sharing still work.
        if (!cancelled) setLinkFailed(true)
      },
    )
    return () => {
      cancelled = true
    }
  }, [strip.shareCode])

  // Without the link the booth cannot tell whether the online gallery is on, so the wording
  // assumes it is: a guest is never told less than what sharing does.
  const galleryLabel = link && !link.onlineGallery ? GALLERY_LABEL : ONLINE_GALLERY_LABEL

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
          <Card title="Print" label="Print">
            {print.status === 'sent' ? (
              <p>
                Printing {print.copies} {print.copies === 1 ? 'copy' : 'copies'}…
              </p>
            ) : (
              <>
                <div className="button-row" role="group" aria-label="Copies">
                  {COPY_CHOICES.map((choice) => (
                    <Chip key={choice} selected={copies === choice} onClick={() => setCopies(choice)}>
                      {choice} {choice === 1 ? 'copy' : 'copies'}
                    </Chip>
                  ))}
                </div>
                <Button icon="printer" onClick={sendToPrinter} disabled={print.status === 'sending'}>
                  Print
                </Button>
                {print.status === 'error' && <ErrorBanner message={print.message} />}
              </>
            )}
          </Card>

          <Card title="Get it on your phone" label="Phone">
            {link ? (
              <>
                <img
                  className="qr-code"
                  src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(link.qrSvg)}`}
                  alt="QR code for your strip"
                />
                <p className="caption share-url">{link.url}</p>
              </>
            ) : (
              <p className="caption">Loading the QR code…</p>
            )}
            {/* Disabled while the link loads, so the guest consents to the right wording. */}
            <Toggle
              label={galleryLabel}
              checked={isPublic}
              disabled={!link && !linkFailed}
              onChange={(event) => void toggleGallery(event.target.checked)}
            />
            {shareError && <ErrorBanner message={shareError} />}
          </Card>
        </div>
      </div>
      <footer className="step-actions button-row">
        <ButtonLink variant="secondary" size="lg" icon="download" href={strip.imageUrl} download={`rato-${strip.shareCode}.png`}>
          Download
        </ButtonLink>
        <Button size="lg" onClick={onDone}>
          Done
        </Button>
      </footer>
    </>
  )
}
