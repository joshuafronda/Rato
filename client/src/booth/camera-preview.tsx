import { useEffect, useRef } from 'react'

interface CameraPreviewProps {
  stream: MediaStream
}

// Live feed, mirrored so guests see themselves like in a mirror.
export function CameraPreview({ stream }: CameraPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    video.srcObject = stream
    return () => {
      video.srcObject = null
    }
  }, [stream])

  return (
    <video
      ref={videoRef}
      className="camera-preview"
      data-testid="camera-preview"
      autoPlay
      muted
      playsInline
    />
  )
}
