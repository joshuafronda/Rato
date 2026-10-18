// One reading of a filter's params, shared by the live preview (CSS on the video) and the
// strip composer (canvas ctx.filter), so the strip looks like what the guest saw.
const CSS_FUNCTIONS: ReadonlyArray<[key: string, css: string, unit: string]> = [
  ['brightness', 'brightness', ''],
  ['contrast', 'contrast', ''],
  ['saturate', 'saturate', ''],
  ['grayscale', 'grayscale', ''],
  ['sepia', 'sepia', ''],
  ['hueRotate', 'hue-rotate', 'deg'],
  ['blur', 'blur', 'px'],
]

export function filterCss(params: Record<string, number>): string {
  const parts: string[] = []
  for (const [key, css, unit] of CSS_FUNCTIONS) {
    if (key in params) parts.push(`${css}(${params[key]}${unit})`)
  }
  return parts.length > 0 ? parts.join(' ') : 'none'
}

// Film grain has no CSS filter; it is a noise layer drawn on top, this strong (0 to 1).
export function grainAmount(params: Record<string, number>): number {
  return Math.min(1, Math.max(0, params.grain ?? 0))
}
