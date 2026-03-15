import type { Transaction } from '../models/transaction';

export interface BankParserResult {
  candidateLines: string[];
  transactions: Transaction[];
  tsvOutput: string;
  error: string;
}

export interface BankParser {
  id: string;
  name: string;
  detect(pages: string[]): boolean;
  parse(pages: string[]): BankParserResult;
}
