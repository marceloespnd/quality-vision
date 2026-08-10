import { readFile } from 'node:fs/promises'
import { initializeApp } from 'firebase/app'
import { getFirestore, doc, setDoc, Timestamp } from 'firebase/firestore'
import dotenv from 'dotenv'

dotenv.config()

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
}

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

function convertDates(record) {
  const copy = { ...record }
  if (copy.createdAt && typeof copy.createdAt === 'string') {
    copy.createdAt = Timestamp.fromDate(new Date(copy.createdAt))
  }
  if (copy.updatedAt && typeof copy.updatedAt === 'string') {
    copy.updatedAt = Timestamp.fromDate(new Date(copy.updatedAt))
  }
  return copy
}

async function importCollection(name) {
  const raw = await readFile(new URL(`./seed/${name}.json`, import.meta.url), 'utf8')
  const items = JSON.parse(raw)

  for (const item of items) {
    const { id, ...data } = convertDates(item)
    await setDoc(doc(db, name, id), data, { merge: true })
    console.log(`Imported ${name}/${id}`)
  }
}

await importCollection('ens')
await importCollection('bugs')
await importCollection('logs')
await importCollection('settings')

console.log('Seed import finished.')
