import type { Transaction } from '../models/transaction';

const DATE_AT_START = /^(\d{2}-\d{2}(?:-\d{4})?)\b/;
const AMOUNT_PATTERN = /([+-]?\s?\d{1,3}(?:\.\d{3})*,\d{2})\b/g;
const OUTCOME_HINTS = /\b(af|debit|debited|afschrijving|incasso|bea)\b/i;
const INCOME_HINTS = /\b(bij|credit|credited|bijschrijving|salaris)\b/i;

const toNumber = (rawAmount: string): number => {
  const normalized = rawAmount.replace(/\./g, '').replace(',', '.');
  const value = Number.parseFloat(normalized);
  return Number.isFinite(value) ? value : Number.NaN;
};

const cleanDescription = (fullText: string, date: string): string => {
  return fullText.replace(date, '').replace(/\s+/g, ' ').trim();
};

export const parseTransactionLine = (line: string): Transaction | null => {
  const parts = line
    .split(/\r?\n/g)
    .map((part) => part.trim())
    .filter(Boolean);
  const firstLine = (parts[0] ?? '').replace(/\s+/g, ' ').trim();
  const fullText = parts.join(' ').replace(/\s+/g, ' ').trim();

  const dateMatch = firstLine.match(DATE_AT_START) ?? fullText.match(DATE_AT_START);

  if (!dateMatch) {
    return null;
  }

  const amountMatchesFirst = [...firstLine.matchAll(AMOUNT_PATTERN)];
  const amountMatchesFull = [...fullText.matchAll(AMOUNT_PATTERN)];
  const amountMatches = amountMatchesFirst.length > 0 ? amountMatchesFirst : amountMatchesFull;

  if (amountMatches.length === 0) {
    return null;
  }

  const date = dateMatch[1];
  const rawAmount = amountMatches[amountMatches.length - 1][1];
  const amountValue = toNumber(rawAmount);

  if (!Number.isFinite(amountValue)) {
    return null;
  }

  const amount = Math.abs(amountValue).toFixed(2);
  const description = cleanDescription(fullText, date);

  const firstLineAndText = `${firstLine} ${fullText}`;
  const hasOutcomeHint = OUTCOME_HINTS.test(firstLineAndText);
  const hasIncomeHint = INCOME_HINTS.test(firstLineAndText);
  const isMoneyOut = amountValue < 0 || (hasOutcomeHint && !hasIncomeHint);

  return {
    date,
    time: '',
    description,
    category: '',
    outcome: isMoneyOut ? amount : '',
    income: isMoneyOut ? '' : amount,
  };
};
