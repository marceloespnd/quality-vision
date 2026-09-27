import { doc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db, hasFirebaseConfig } from '../firebase'
import { saveLocalRecords } from '../hooks/useRecords'
export async function saveRecord(collectionName, id, payload, owner) {
  const now = hasFirebaseConfig && db ? serverTimestamp() : new Date().toISOString()
  const data = { ...payload, updatedAt: now, updatedBy: owner }
  const recordId = id || crypto.randomUUID()
  if (hasFirebaseConfig && db) {
    if (id) await updateDoc(doc(db, collectionName, id), data)
    else await setDoc(doc(db, collectionName, recordId), { ...data, createdAt: now, createdBy: owner })
  } else {
    const records = JSON.parse(localStorage.getItem(`quality-vision-${collectionName}`) || '[]')
    if (!Array.isArray(records) || (id && !records.some((item) => item.id === id))) throw new Error('Registro indisponível. Recarregue a página.')
    saveLocalRecords(collectionName, id ? records.map((item) => item.id === id ? { ...item, ...data } : item) : [...records, { ...data, id: recordId, createdAt: now, createdBy: owner }])
  }
  return recordId
}
