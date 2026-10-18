import { canvasToBlob } from '../lib/canvas-to-blob.ts'

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
    if (video.videoWidth === 0 || video.videoHeight === 0) throw new Error('The camera sent no picture')
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Canvas 2D is not available')
    context.drawImage(video, 0, 0)
    return await canvasToBlob(canvas, SHOT_TYPE, SHOT_QUALITY)
  } finally {
    video.pause()
    video.srcObject = null
  }
}
