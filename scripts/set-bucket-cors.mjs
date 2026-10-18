// One-time setup: lets the online gallery page (Firebase Hosting) read gallery.json from the
// Storage bucket. Browsers block that cross-site read unless the bucket allows it.
// Usage: FIREBASE_BUCKET=... FIREBASE_KEY_FILE=... node scripts/set-bucket-cors.mjs
import { cert, initializeApp } from 'firebase-admin/app'
import { getStorage } from 'firebase-admin/storage'

const ORIGINS = ['https://rato-d2428.web.app', 'https://rato-d2428.firebaseapp.com']

const bucketName = process.env.FIREBASE_BUCKET
const keyFile = process.env.FIREBASE_KEY_FILE
if (!bucketName || !keyFile) {
  console.error('Set FIREBASE_BUCKET and FIREBASE_KEY_FILE first')
  process.exit(1)
}

const app = initializeApp({ credential: cert(keyFile), storageBucket: bucketName })
const bucket = getStorage(app).bucket()
await bucket.setCorsConfiguration([{ origin: ORIGINS, method: ['GET'], responseHeader: ['Content-Type'], maxAgeSeconds: 3600 }])
const [metadata] = await bucket.getMetadata()
console.log('Bucket CORS is now:', JSON.stringify(metadata.cors))
