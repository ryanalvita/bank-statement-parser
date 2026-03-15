import type { Transaction } from '../models/transaction';
import { parseTransactionLine } from './parseTransactionLine';

export const parseFullStatement = (candidateLines: string[]): Transaction[] => {
  const transactions: Transaction[] = [];

  for (const line of candidateLines) {
    const parsed = parseTransactionLine(line);
    if (!parsed) {
      continue;
    }

    transactions.push(parsed);
  }

  return transactions;
};
