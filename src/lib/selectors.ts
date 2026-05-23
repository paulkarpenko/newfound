/**
 * Legacy selectors facade — re-exports static getters from dataAccess and
 * forwards merged lookups via `snapshotMerged()` for non-React contexts
 * (panel layout, fly-to handlers, etc).
 *
 * React components should prefer `useMerged()` directly so they re-render
 * when user-added spans/annotations change.
 */
import {
  allClauses as _allClauses,
  allSections as _allSections,
  corpusBounds as _corpusBounds,
  defaultClauseId as _defaultClauseId,
  getClause as _getClause,
  getSection as _getSection,
  neighborClauses as _neighborClauses,
  snapshotMerged,
} from './dataAccess';
import type { Annotation, Span } from './types';

export const allSections = _allSections;
export const allClauses = _allClauses;
export const getSection = _getSection;
export const getClause = _getClause;
export const corpusBounds = _corpusBounds;
export const defaultClauseId = _defaultClauseId;
export const neighborClauses = _neighborClauses;

export function allSpans(): Span[] {
  return snapshotMerged().spans;
}
export function getSpan(id: string | null | undefined): Span | undefined {
  return snapshotMerged().getSpan(id);
}
export function getAnnotation(id: string): Annotation | undefined {
  return snapshotMerged().getAnnotation(id);
}
export function spansForClause(clauseId: string): Span[] {
  return snapshotMerged().spansForClause(clauseId);
}
export function annotationsForSpan(spanId: string): Annotation[] {
  return snapshotMerged().annotationsForSpan(spanId);
}
export function clauseAnnotationCount(clauseId: string): number {
  return snapshotMerged().clauseAnnotationCount(clauseId);
}
export function spanAnnotationCount(spanId: string): number {
  const s = snapshotMerged().getSpan(spanId);
  return s?.annotationIds.length ?? 0;
}
export function corpusMaxClauseCount(): number {
  return snapshotMerged().maxClauseCount;
}
