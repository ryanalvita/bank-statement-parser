import type { Transaction } from '../models/transaction';

const DATE_AT_START = /^(\d{2}-\d{2}(?:-\d{4})?)\b/;
const AMOUNT_PATTERN = /([+-]?\d{1,3}(?:\.\d{3})*,\d{2})\b/g;

const toNumber = (rawAmount: string): number => {
  const normalized = rawAmount.replace(/\./g, '').replace(',', '.');
  const value = Number.parseFloat(normalized);
  return Number.isFinite(value) ? value : Number.NaN;
};

const cleanDescription = (line: string, date: string, amount: string): string => {
  return line.replace(date, '').replace(amount, '').replace(/\s+/g, ' ').trim();
};

export const parseTransactionLine = (line: string): Transaction | null => {
  const trimmed = line.replace(/\s+/g, ' ').trim();
  const dateMatch = trimmed.match(DATE_AT_START);

  if (!dateMatch) {
    return null;
  }

  const amountMatches = [...trimmed.matchAll(AMOUNT_PATTERN)];
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
  const description = cleanDescription(trimmed, date, rawAmount);

  const isMoneyOut = amountValue < 0;

  return {
    date,
    time: '',
    description,
    category: '',
    outcome: isMoneyOut ? amount : '',
    income: isMoneyOut ? '' : amount,
  };
};
