import { describe, expect, it } from 'vitest';
import { parsePositionedTransactions } from '../../src/lib/parsers/parsePositionedTransactions';

type Item = {
  str: string;
  transform: [number, number, number, number, number, number];
};

const makeItem = (str: string, x: number, y: number): Item => ({
  str,
  transform: [1, 0, 0, 1, x, y],
});

describe('parsePositionedTransactions', () => {
  it('maps debit and credit amounts by detected amount columns', () => {
    const page = [
      makeItem('Date', 40, 800),
      makeItem('Description', 120, 800),
      makeItem('Amount', 430, 800),
      makeItem('debited', 480, 800),
      makeItem('Amount', 520, 800),
      makeItem('credited', 580, 800),

      makeItem('15-02-2026', 40, 780),
      makeItem('BEA,', 120, 780),
      makeItem('Google', 150, 780),
      makeItem('Pay', 200, 780),
      makeItem('22,69', 450, 780),

      makeItem('19-02-2026', 40, 760),
      makeItem('SALARY', 120, 760),
      makeItem('3.454,16', 560, 760),
    ];

    const transactions = parsePositionedTransactions([page]);

    expect(transactions).toHaveLength(2);
    expect(transactions[0]).toMatchObject({
      date: '2026-02-15',
      outcome: '22.69',
      income: '',
      time: '',
    });
    expect(transactions[1]).toMatchObject({
      date: '2026-02-19',
      outcome: '',
      income: '3454.16',
      time: '',
    });
  });

  it('uses hints when amount x-position is ambiguous around split', () => {
    const page = [
      makeItem('Date', 40, 800),
      makeItem('Description', 120, 800),
      makeItem('Amount', 430, 800),
      makeItem('debited', 500, 800),
      makeItem('Amount', 520, 800),
      makeItem('credited', 540, 800),

      makeItem('16-02-2026', 40, 780),
      makeItem('/TRTP/iDEAL/Wero/NAME/Test', 120, 780),
      makeItem('22,69', 520, 780),

      makeItem('16-02-2026', 40, 760),
      makeItem('/TRTP/SEPA OVERBOEKING/NAME/AAB INZ TIKKIE', 120, 760),
      makeItem('22,69', 520, 760),
    ];

    const transactions = parsePositionedTransactions([page]);

    expect(transactions).toHaveLength(2);
    expect(transactions[0].outcome).toBe('22.69');
    expect(transactions[0].income).toBe('');
    expect(transactions[1].outcome).toBe('');
    expect(transactions[1].income).toBe('22.69');
  });

  it('does not append summary footer text to the final transaction', () => {
    const page = [
      makeItem('Date', 40, 800),
      makeItem('Description', 120, 800),
      makeItem('Amount', 430, 800),
      makeItem('debited', 480, 800),
      makeItem('Amount', 520, 800),
      makeItem('credited', 580, 800),

      makeItem('13-03-2026', 40, 780),
      makeItem('BEA,', 120, 780),
      makeItem('Google', 150, 780),
      makeItem('Pay', 200, 780),
      makeItem('Babaque,', 230, 780),
      makeItem('62,50', 450, 780),

      makeItem('Number', 120, 760),
      makeItem('of', 165, 760),
      makeItem('debit', 180, 760),
      makeItem('transactions', 220, 760),
      makeItem('34', 520, 760),
      makeItem('24', 560, 760),
    ];

    const transactions = parsePositionedTransactions([page]);

    expect(transactions).toHaveLength(1);
    expect(transactions[0].outcome).toBe('62.50');
    expect(transactions[0].income).toBe('');
    expect(transactions[0].description.toLowerCase()).not.toContain('number of debit transactions');
  });

  it('handles multiline descriptions while keeping debit classification', () => {
    const page = [
      makeItem('Date', 40, 800),
      makeItem('Description', 120, 800),
      makeItem('Amount', 430, 800),
      makeItem('debited', 480, 800),
      makeItem('Amount', 520, 800),
      makeItem('credited', 580, 800),

      makeItem('09-03-2026', 40, 780),
      makeItem('/TRTP/SEPA', 120, 780),
      makeItem('Incasso', 200, 780),
      makeItem('109,00', 450, 780),

      makeItem('doorlopend/NAME/Wellsius', 120, 760),
      makeItem('Residential', 280, 760),
    ];

    const transactions = parsePositionedTransactions([page]);

    expect(transactions).toHaveLength(1);
    expect(transactions[0].date).toBe('2026-03-09');
    expect(transactions[0].outcome).toBe('109.00');
    expect(transactions[0].income).toBe('');
    expect(transactions[0].description).toContain('Wellsius');
  });
});
