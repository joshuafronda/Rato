export type FrameGrabber = (stream: MediaStream) => Promise<Blob>

const SHOT_TYPE = 'image/jpeg'
const SHOT_QUALITY = 0.92

// Draws the current frame of a stream onto a canvas at the camera's full resolution.
// Uses a detached video element so it works in every browser, not only Chrome's ImageCapture.
export const grabFrame: FrameGrabber = async (stream) => {
  const video = document.createElement('video')
  video.muted = true
  video.playsInline = true
  video.srcObject = stream
  try {
    await video.play()
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Canvas 2D is not available')
    context.drawImage(video, 0, 0)
    return await canvasToBlob(canvas)
  } finally {
    video.pause()
    video.srcObject = null
  }
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Could not encode the shot'))),
      SHOT_TYPE,
      SHOT_QUALITY,
    )
  })
}
