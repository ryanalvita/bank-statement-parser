import type { Transaction } from '../models/transaction';
import { transactionsToTsv } from '../output/transactionsToTsv';
import { isAbnAmroStatement } from '../parsers/detectAbnAmro';
import { extractCandidateTransactionLines } from '../parsers/extractCandidateTransactionLines';
import { parseFullStatement } from '../parsers/parseFullStatement';

export const MESSAGE_UNSUPPORTED = 'Unsupported statement format';
export const MESSAGE_NO_TRANSACTIONS = 'No transactions found';

export interface AbnAmroPipelineResult {
  candidateLines: string[];
  transactions: Transaction[];
  tsvOutput: string;
  error: string;
}

export const runAbnAmroPipeline = (pages: string[]): AbnAmroPipelineResult => {
  if (!isAbnAmroStatement(pages)) {
    return {
      candidateLines: [],
      transactions: [],
      tsvOutput: '',
      error: MESSAGE_UNSUPPORTED,
    };
  }

  const candidateLines = extractCandidateTransactionLines(pages);
  const transactions = parseFullStatement(candidateLines);

  if (transactions.length === 0) {
    return {
      candidateLines,
      transactions,
      tsvOutput: '',
      error: MESSAGE_NO_TRANSACTIONS,
    };
  }

  return {
    candidateLines,
    transactions,
    tsvOutput: transactionsToTsv(transactions),
    error: '',
  };
};
