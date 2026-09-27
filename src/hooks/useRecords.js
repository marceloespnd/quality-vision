import { useEffect, useState } from 'react'
import { collection, onSnapshot } from 'firebase/firestore'
import { db, hasFirebaseConfig } from '../firebase'

export default function useRecords(name) {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  useEffect(() => {
    if (hasFirebaseConfig && db) return onSnapshot(collection(db, name), (snapshot) => {
      setRecords(snapshot.docs.map((item) => ({ ...item.data(), id: item.id })))
      setLoading(false)
      setError('')
    }, () => { setError('Não foi possível carregar os registros. Verifique sua conexão e permissão de acesso.'); setLoading(false) })
    const read = () => {
      try {
        const saved = JSON.parse(localStorage.getItem(`quality-vision-${name}`) || '[]')
        if (!Array.isArray(saved) || saved.some((item) => !item || typeof item.id !== 'string')) throw new Error('Invalid data')
        setRecords(saved)
        setError('')
      } catch { setError('Não foi possível ler os registros salvos neste navegador.') }
      setLoading(false)
    }
    read()
    window.addEventListener('quality-vision-records', read)
    window.addEventListener('storage', read)
    return () => { window.removeEventListener('quality-vision-records', read); window.removeEventListener('storage', read) }
  }, [name])
  return { records, loading, error }
}

export function saveLocalRecords(name, records) {
  localStorage.setItem(`quality-vision-${name}`, JSON.stringify(records))
  window.dispatchEvent(new Event('quality-vision-records'))
}
