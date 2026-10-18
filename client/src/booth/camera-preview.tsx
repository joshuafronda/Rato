import { useEffect, useMemo, useRef } from 'react'
import { grainTile } from '../composer/grain.ts'

interface CameraPreviewProps {
  stream: MediaStream
  /** A CSS filter from filterCss(), so the guest sees the filter live. */
  filterCss?: string
  /** Film grain strength, 0 to 1. */
  grain?: number
}

// Live feed, mirrored so guests see themselves like in a mirror.
export function CameraPreview({ stream, filterCss = 'none', grain = 0 }: CameraPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const grainUrl = useMemo(() => (grain > 0 ? grainTile()?.toDataURL() : undefined), [grain])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    video.srcObject = stream
    return () => {
      video.srcObject = null
    }
  }, [stream])

  return (
    <>
      <video
        ref={videoRef}
        className="camera-preview"
        data-testid="camera-preview"
        style={{ filter: filterCss }}
        autoPlay
        muted
        playsInline
      />
      {grainUrl && <div className="grain-overlay" style={{ backgroundImage: `url(${grainUrl})`, opacity: grain }} />}
    </>
  )
}
