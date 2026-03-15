import type { Transaction } from '../models/transaction';
import { parseTransactionLine } from './parseTransactionLine';

const DATE_AT_START = /^\d{2}-\d{2}(?:-\d{4})?\b/;
const DATE_ANYWHERE = /\d{2}-\d{2}(?:-\d{4})?\b/;
const TABLE_HEADER_PREFIX =
  /^page\s+\d+\s+of\s+\d+\s+date\s+description\s+amount\s+debited\s+amount\s+credited\s*/i;
const TABLE_HEADER_INLINE = /^date\s+description\s+amount\s+debited\s+amount\s+credited\s*/i;

const normalizeCandidateLine = (line: string): string => {
  let normalized = line.replace(/\s+/g, ' ').trim();
  const removedHeader = TABLE_HEADER_PREFIX.test(normalized) || TABLE_HEADER_INLINE.test(normalized);
  normalized = normalized.replace(TABLE_HEADER_PREFIX, '').replace(TABLE_HEADER_INLINE, '').trim();

  const dateIndex = normalized.search(DATE_ANYWHERE);
  // Only reposition to first date when the line had an inline page/table prefix.
  // Continuation lines may legitimately contain dates (e.g. EREF/15-02-2026) and
  // must stay attached to the current transaction.
  if (removedHeader && dateIndex > 0) {
    normalized = normalized.slice(dateIndex).trim();
  }

  return normalized;
};

const mergeMultilineDescriptions = (candidateLines: string[]): string[] => {
  const merged: string[] = [];
  let current = '';

  for (const line of candidateLines) {
    const normalized = normalizeCandidateLine(line);
    if (!normalized) {
      continue;
    }

    if (DATE_AT_START.test(normalized)) {
      if (current) {
        merged.push(current);
      }
      current = normalized;
      continue;
    }

    if (!current) {
      continue;
    }

    current = `${current}\n${normalized}`;
  }

  if (current) {
    merged.push(current);
  }

  return merged;
};

export const parseFullStatement = (candidateLines: string[]): Transaction[] => {
  const mergedLines = mergeMultilineDescriptions(candidateLines);
  const transactions: Transaction[] = [];
  let previousRawKey = '';

  for (const line of mergedLines) {
    const rawKey = line.replace(/\s+/g, ' ').trim();
    // Guard only against immediate duplicate rows introduced by extraction artifacts.
    if (rawKey && rawKey === previousRawKey) {
      continue;
    }
    previousRawKey = rawKey;

    const parsed = parseTransactionLine(line);
    if (!parsed) {
      continue;
    }
    transactions.push(parsed);
  }

  return transactions;
};
