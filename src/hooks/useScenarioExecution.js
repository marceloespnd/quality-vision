import useRecords from './useRecords'
import { executionScenarios } from '../domain/occurrences'
export default function useScenarioExecution() {
  const scenarios = useRecords('scenarios'), bugs = useRecords('bugs'), impacts = useRecords('impacts')
  return { records: executionScenarios(scenarios.records, bugs.records, impacts.records), loading: scenarios.loading || bugs.loading || impacts.loading, error: scenarios.error || bugs.error || impacts.error }
}
