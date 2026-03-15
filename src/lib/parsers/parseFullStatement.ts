import type { Transaction } from '../models/transaction';
import { parseTransactionLine } from './parseTransactionLine';

const DATE_AT_START = /^\d{2}-\d{2}(?:-\d{4})?\b/;

const mergeMultilineDescriptions = (candidateLines: string[]): string[] => {
  const merged: string[] = [];
  let current = '';

  for (const line of candidateLines) {
    const normalized = line.trim();
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
  const seen = new Set<string>();

  for (const line of mergedLines) {
    const parsed = parseTransactionLine(line);
    if (!parsed) {
      continue;
    }

    const fingerprint = `${parsed.date}|${parsed.description}|${parsed.outcome}|${parsed.income}`;
    if (seen.has(fingerprint)) {
      continue;
    }

    seen.add(fingerprint);
    transactions.push(parsed);
  }

  return transactions;
};
