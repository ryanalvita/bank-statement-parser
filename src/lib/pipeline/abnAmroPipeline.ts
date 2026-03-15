import type { Transaction } from '../models/transaction';
import { transactionsToTsv } from '../output/transactionsToTsv';
import { isAbnAmroStatement } from '../parsers/detectAbnAmro';
import { extractCandidateTransactionLines } from '../parsers/extractCandidateTransactionLines';
import { parseFullStatement } from '../parsers/parseFullStatement';
import type { BankParser, BankParserResult } from './bankParser';

export const MESSAGE_UNSUPPORTED = 'Unsupported statement format';
export const MESSAGE_NO_TRANSACTIONS = 'No transactions found';

export interface AbnAmroPipelineResult extends BankParserResult {
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

export const abnAmroParser: BankParser = {
  id: 'abn-amro',
  name: 'ABN AMRO',
  detect: isAbnAmroStatement,
  parse: runAbnAmroPipeline,
};
