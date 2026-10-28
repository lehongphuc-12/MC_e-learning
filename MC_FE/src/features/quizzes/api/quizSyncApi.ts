import { request } from '../../../services/api';

export interface SyncCell { table: string; id: number; field: string; baseValue?: string | null; databaseValue?: string | null; sheetValue?: string | null; direction?: string; }
export interface SyncResult { quizId: number; status: string; problems?: string[]; changes?: SyncCell[]; conflicts?: SyncCell[]; }
export interface RecoveryApproval { operationId: string; expectedDatabaseValue: string; expectedSheetValue: string; }

export const quizSyncApi = {
  plan: (quizId: number) => request<SyncResult>(`/quizzes/sync/full/plan/${quizId}`),
  adopt: (quizId: number) => request<SyncResult>(`/quizzes/sync/full/adopt/${quizId}`, { method: 'POST' }),
  conflicts: (quizId: number) => request<unknown>(`/quizzes/sync/conflicts/${quizId}`),
  resolve: (quizId: number, cell: SyncCell, winner: 'DATABASE' | 'SHEET') => request<SyncResult>(`/quizzes/sync/conflicts/resolve/${quizId}`, { method: 'POST', body: JSON.stringify({ table: cell.table, recordId: cell.id, field: cell.field, winner }) }),
  recover: (quizId: number, approval: RecoveryApproval) => request<SyncResult>(`/quizzes/sync/full/recover-diverged/${quizId}`, { method: 'POST', body: JSON.stringify(approval) }),
};
