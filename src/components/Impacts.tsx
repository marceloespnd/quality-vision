import Occurrences from './Occurrences.tsx'

// Compatibility wrapper for callers using the former Impactos component.
export default function Impacts({ owner }) {
  return <Occurrences kind="impacts" owner={owner} />
}
