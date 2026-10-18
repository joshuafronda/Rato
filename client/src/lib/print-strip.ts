import type { PrintPaper } from './booth-types.ts'

// The page for each paper: 4x6 holds two strips side by side, to be cut in half.
const PAGES: Record<PrintPaper, { css: string; strips: number }> = {
  '4x6': { css: '@page { size: 4in 6in; margin: 0; }', strips: 2 },
  '2x6': { css: '@page { size: 2in 6in; margin: 0; }', strips: 1 },
}

// Prints a strip through the browser. In Chrome started with --kiosk-printing this goes
// straight to the default printer with no dialog. Everything else on the page is hidden
// while printing (see #print-root in index.css).
export async function printStrip(imageUrl: string, copies: number, paper: PrintPaper): Promise<void> {
  const page = PAGES[paper]
  const root = document.createElement('div')
  root.id = 'print-root'
  const style = document.createElement('style')
  style.textContent = page.css
  root.append(style)
  const images = Array.from({ length: page.strips }, () => {
    const image = new Image()
    image.src = imageUrl
    image.alt = ''
    root.append(image)
    return image
  })
  document.body.append(root)
  try {
    await Promise.all(images.map((image) => image.decode()))
    for (let copy = 0; copy < copies; copy += 1) window.print()
  } finally {
    root.remove()
  }
}
