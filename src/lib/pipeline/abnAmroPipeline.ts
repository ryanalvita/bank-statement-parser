import type { Transaction } from '../models/transaction';
import type { ExtractedPdfText } from '../pdf/extractPdfText';
import { transactionsToTsv } from '../output/transactionsToTsv';
import { isAbnAmroStatement } from '../parsers/detectAbnAmro';
import { extractCandidateTransactionLines } from '../parsers/extractCandidateTransactionLines';
import { parsePositionedTransactions } from '../parsers/parsePositionedTransactions';
import type { BankParser, BankParserResult } from './bankParser';

export const MESSAGE_UNSUPPORTED = 'Unsupported statement format';
export const MESSAGE_NO_TRANSACTIONS = 'No transactions found';

export interface AbnAmroPipelineResult extends BankParserResult {
  candidateLines: string[];
  transactions: Transaction[];
  tsvOutput: string;
  error: string;
}

// Legacy API kept for compatibility with BankParser interface.
// Position-aware parsing requires PDF text-item coordinates, so this path only validates format.
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

  return {
    candidateLines,
    transactions: [],
    tsvOutput: '',
    error: MESSAGE_NO_TRANSACTIONS,
  };
};

export const runAbnAmroPipelineFromExtraction = (extracted: ExtractedPdfText): AbnAmroPipelineResult => {
  const pages = extracted.pages;

  if (!isAbnAmroStatement(pages)) {
    return {
      candidateLines: [],
      transactions: [],
      tsvOutput: '',
      error: MESSAGE_UNSUPPORTED,
    };
  }

  const candidateLines = extractCandidateTransactionLines(pages);
  const transactions = parsePositionedTransactions(extracted.pageItems);

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
