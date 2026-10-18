import { cert, initializeApp } from 'firebase-admin/app'
import { getStorage } from 'firebase-admin/storage'
import type { CloudBucket } from './cloud-gallery.ts'

// The real CloudBucket. The service account key gives admin access, so Storage security
// rules do not apply to these calls; they only guard what phones can read.
export function firebaseBucket(bucketName: string, keyFile: string): CloudBucket {
  const app = initializeApp({ credential: cert(keyFile), storageBucket: bucketName })
  const bucket = getStorage(app).bucket()
  return {
    list: async (prefix) => {
      const [files] = await bucket.getFiles({ prefix })
      return files.map((file) => file.name)
    },
    read: async (path) => {
      const file = bucket.file(path)
      const [exists] = await file.exists()
      if (!exists) return undefined
      // Read the version first, then exactly that version, so the pair always matches.
      const [metadata] = await file.getMetadata()
      const generation = String(metadata.generation)
      const [data] = await bucket.file(path, { generation }).download()
      return { data, generation }
    },
    upload: async (path, data, { contentType, cacheControl, ifGeneration }) => {
      const preconditionOpts = ifGeneration === undefined ? undefined : { ifGenerationMatch: ifGeneration }
      await bucket.file(path).save(data, { resumable: false, contentType, metadata: { cacheControl }, preconditionOpts })
    },
    remove: async (path) => {
      await bucket.file(path).delete({ ignoreNotFound: true })
    },
  }
}
