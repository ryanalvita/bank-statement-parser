import type { Transaction } from '../models/transaction';

const HEADER = ['Date', 'Time', 'Description', 'Category', 'Outcome', 'Income'];

const sanitizeCell = (value: string): string => value.replace(/\t/g, ' ').replace(/\r?\n/g, ' ').trim();

export const transactionsToTsv = (transactions: Transaction[]): string => {
  const rows = transactions.map((transaction) =>
    [
      transaction.date,
      transaction.time,
      sanitizeCell(transaction.description),
      transaction.category,
      transaction.outcome,
      transaction.income,
    ].join('\t'),
  );

  return [HEADER.join('\t'), ...rows].join('\n');
};
