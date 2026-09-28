import Occurrences from './Occurrences'

// Compatibility wrapper for callers using the former Impactos component.
export default function Impacts({ owner }) {
  return <Occurrences kind="impacts" owner={owner} />
}
