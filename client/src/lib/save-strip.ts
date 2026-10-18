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
  const png = await composeStrip({
    shots,
    filterParams: filter.params,
    frameUrl: frame?.imageUrl ?? null,
    caption: settings.captionText,
    caption2: settings.captionLine2,
    dateText: formatDate(date, settings.dateFormat),
  })
  const session = await createSession({ layoutId: layout.id, frameId: frame?.id ?? null, filterId: filter.id })
  for (const [index, shot] of shots.entries()) await uploadPhoto(session.id, index + 1, shot)
  return uploadStrip(session.id, png)
}
