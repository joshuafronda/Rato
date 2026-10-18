import { composeStrip } from '../composer/compose-strip.ts'
import { createSession, uploadPhoto, uploadStrip } from './api.ts'
import type { BoothSettings, Filter, Frame, Layout, SavedStrip } from './booth-types.ts'
import { formatDate } from './format-date.ts'

export interface StripToSave {
  layout: Layout
  frame: Frame | null
  filter: Filter
  shots: Blob[]
  settings: BoothSettings
  date: Date
}

// Composes the strip in the browser, then records the session with its shots and the strip.
// Composing first means a strip that cannot be drawn never leaves a session behind.
export async function saveStrip({ layout, frame, filter, shots, settings, date }: StripToSave): Promise<SavedStrip> {
  // A frame with its own text (showText off) gets no date or caption lines.
  const showText = frame?.showText !== false
  const png = await composeStrip({
    shots,
    filterParams: filter.params,
    frameUrl: frame?.imageUrl ?? null,
    slots: frame?.slots ?? null,
    caption: showText ? settings.captionText : '',
    caption2: showText ? settings.captionLine2 : '',
    dateText: showText ? formatDate(date, settings.dateFormat) : '',
  })
  const session = await createSession({ layoutId: layout.id, frameId: frame?.id ?? null, filterId: filter.id })
  for (const [index, shot] of shots.entries()) await uploadPhoto(session.id, index + 1, shot)
  return uploadStrip(session.id, png)
}
