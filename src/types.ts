import type { FieldValue, Timestamp } from 'firebase/firestore'

export type Locale = 'pt-BR' | 'en-US'
export type StoredDate = string | Timestamp | FieldValue
export interface Metadata {
  id: string
  createdAt?: StoredDate
  updatedAt?: StoredDate
  createdBy?: string
  updatedBy?: string
}
export interface Project extends Metadata {
  name: string
  owner: string
  squad?: string
  status?: string
}
export interface Flow extends Metadata {
  projectId: string
  name: string
  owner: string
}
export interface Scenario extends Metadata {
  title: string
  description?: string
  projectId?: string
  flowId?: string
  status?: string
  scriptFile?: string
  executedAt?: string
  notes?: string
  exclusionReason?: string
}
export interface Occurrence extends Metadata {
  desc: string
  owner: string
  status: string
  projectId?: string
  flowId?: string
  scenarioId?: string
  scenarioIds?: string[]
  blocksExecution?: boolean
  severity?: string
  action?: string
  startedAt?: string
  resolvedAt?: string
  developer?: string
  squad?: string
}
export interface Task extends Metadata {
  desc: string
  status: string
  type?: string
  squad?: string
  projectId?: string
  project?: string
  owner: string
}
export interface Log extends Metadata { message: string }
export interface Collections {
  projects: Project
  flows: Flow
  scenarios: Scenario
  impacts: Occurrence
  bugs: Occurrence
  ens: Task
  logs: Log
}
export interface RecordsState<T> { records: T[]; loading: boolean; error: string }
export type RouteParams = Record<string, string>
export type Navigate = (tab: string, params?: RouteParams) => void
