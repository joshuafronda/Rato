import type { PrintPaper } from './booth-types.ts'

interface Page {
  css: string
  /** How many copies of the strip fit on one sheet. */
  strips: number
  /** Turned sideways and stacked (A4), instead of standing side by side. */
  sideways: boolean
}

// The page for each paper: 4x6 holds two strips side by side, to be cut in half; A4 holds
// five strips turned sideways, like the event's Canva print sheet.
const PAGES: Record<PrintPaper, Page> = {
  '4x6': { css: '@page { size: 4in 6in; margin: 0; }', strips: 2, sideways: false },
  '2x6': { css: '@page { size: 2in 6in; margin: 0; }', strips: 1, sideways: false },
  A4: { css: '@page { size: A4 portrait; margin: 0.4in 0; }', strips: 5, sideways: true },
}

// Prints a strip through the browser. In Chrome started with --kiosk-printing this goes
// straight to the default printer with no dialog. Everything else on the page is hidden
// while printing (see #print-root in index.css).
export async function printStrip(imageUrl: string, copies: number, paper: PrintPaper): Promise<void> {
  const page = PAGES[paper]
  const root = document.createElement('div')
  root.id = 'print-root'
  if (page.sideways) root.className = 'print-sideways'
  const style = document.createElement('style')
  style.textContent = page.css
  root.append(style)
  const images = Array.from({ length: page.strips }, () => {
    const image = new Image()
    image.src = imageUrl
    image.alt = ''
    const slot = document.createElement('div')
    slot.className = 'print-slot'
    slot.append(image)
    root.append(slot)
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
