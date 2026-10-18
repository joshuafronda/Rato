import { useEffect, useRef } from 'react'

interface ShotImageProps {
  shot: Blob
  alt: string
}

// Shows a captured shot, releasing its object URL when it is no longer shown.
export function ShotImage({ shot, alt }: ShotImageProps) {
  const imageRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    const image = imageRef.current
    if (!image) return
    const url = URL.createObjectURL(shot)
    image.src = url
    return () => URL.revokeObjectURL(url)
  }, [shot])

  return <img ref={imageRef} alt={alt} />
}
