import QRCode from 'qrcode'
import { readSettings } from '../db/catalog-queries.ts'
import type { Database } from '../db/connection.ts'
import { findStripVisibility, listPublicStrips, setStripPublic } from '../db/strip-queries.ts'
import { RequestError } from './request-error.ts'
import { SHARE_CODE_PATTERN, stripImageUrl } from './strips.ts'

export interface GalleryStrip {
  shareCode: string
  imageUrl: string
  createdAt: string
}

export interface Gallery {
  enabled: boolean
  strips: GalleryStrip[]
}

export interface ShareLink {
  url: string
  qrSvg: string
  // Every finished strip is also posted to the online gallery, so the booth tells the guest.
  onlineGallery: boolean
}

// The guest's choice: only strips they agree to share appear in the gallery.
export function setVisibility(db: Database, shareCode: string, isPublic: boolean): void {
  if (!SHARE_CODE_PATTERN.test(shareCode) || !setStripPublic(db, shareCode, isPublic)) {
    throw new RequestError(404, 'Strip not found')
  }
}

export function gallery(db: Database, limit: number): Gallery {
  if (!galleryEnabled(db)) return { enabled: false, strips: [] }
  const strips = listPublicStrips(db, limit).map((row) => ({
    shareCode: row.share_code,
    imageUrl: stripImageUrl(row.share_code),
    createdAt: row.created_at,
  }))
  return { enabled: true, strips }
}

export function galleryEnabled(db: Database): boolean {
  return readSettings(db, ['gallery_enabled']).get('gallery_enabled') !== 'false'
}

// The link a phone opens to see one strip, and its QR code.
export async function shareLink(
  db: Database,
  baseUrl: string,
  shareCode: string,
  onlineGallery: boolean,
): Promise<ShareLink> {
  if (!SHARE_CODE_PATTERN.test(shareCode) || findStripVisibility(db, shareCode) === undefined) {
    throw new RequestError(404, 'Strip not found')
  }
  const url = `${baseUrl}/s/${shareCode}`
  const qrSvg = await QRCode.toString(url, { type: 'svg', margin: 1, errorCorrectionLevel: 'M' })
  return { url, qrSvg, onlineGallery }
}
