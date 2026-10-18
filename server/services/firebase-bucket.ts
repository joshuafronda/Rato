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
    upload: async (path, data, { contentType, cacheControl }) => {
      await bucket.file(path).save(data, { resumable: false, contentType, metadata: { cacheControl } })
    },
    remove: async (path) => {
      await bucket.file(path).delete({ ignoreNotFound: true })
    },
  }
}
