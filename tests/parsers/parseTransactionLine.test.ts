import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parseTransactionLine } from '../../src/lib/parsers/parseTransactionLine';

const currentDir = dirname(fileURLToPath(import.meta.url));
const fixturePath = join(currentDir, '..', 'fixtures', 'single-transaction-line.txt');

describe('parseTransactionLine', () => {
  it('parses a single candidate line into a normalized transaction', () => {
    const line = readFileSync(fixturePath, 'utf8').trim();
    const parsed = parseTransactionLine(line);

    expect(parsed).not.toBeNull();
    expect(parsed?.date).toBe('2026-01-01');
    expect(parsed?.time).toBe('');
    expect(parsed?.outcome).toBe('4.50');
    expect(parsed?.income).toBe('');
    expect(parsed?.category).toBe('');
  });

  it('maps iDEAL/Wero transaction to outcome (debit)', () => {
    const line =
      '15-02-2026 /TRTP/iDEAL/Wero/IBAN/NL00TEST0000000000/NAME/Test Payment 22,69';
    const parsed = parseTransactionLine(line);

    expect(parsed).not.toBeNull();
    expect(parsed?.outcome).toBe('22.69');
    expect(parsed?.income).toBe('');
    expect(parsed?.time).toBe('');
  });

  it('maps salary-like transaction to income (credit)', () => {
    const line =
      '19-02-2026 /TRTP/SEPA OVERBOEKING/NAME/TEST PERSONEELS B.V./REMI/Salary 3.454,16';
    const parsed = parseTransactionLine(line);

    expect(parsed).not.toBeNull();
    expect(parsed?.income).toBe('3454.16');
    expect(parsed?.outcome).toBe('');
    expect(parsed?.time).toBe('');
  });

  it('ignores trailing statement totals in description and amount selection', () => {
    const line =
      "13-03-2026 BEA, Google Pay Babaque,PAS462 NR:21CBD5, 13.03.26/20:06 'S-GRAVENHAGE 62,50 Number of debit transactions Number of credit transactions 34 24 Total amount debited Total amount credited € 5.793,79 € 5.904,34";
    const parsed = parseTransactionLine(line);

    expect(parsed).not.toBeNull();
    expect(parsed?.outcome).toBe('62.50');
    expect(parsed?.income).toBe('');
    expect(parsed?.description.toLowerCase()).not.toContain('total amount debited');
    expect(parsed?.description.toLowerCase()).not.toContain('number of debit transactions');
  });
});
