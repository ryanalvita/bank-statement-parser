export const CATEGORIES = [
  'Income',
  'Bank Organizing',
  'Housing',
  'Groceries',
  'Dine Out',
  'Insurance',
  'Transportation',
  'Communication',
  'Personal',
  'Travel',
  'Fashion',
  'Health',
  'Home Appliances',
  'Electronics',
  'Other',
] as const;

export type Category = '' | (typeof CATEGORIES)[number];

export interface Transaction {
  date: string;
  time: string;
  description: string;
  category: Category;
  outcome: string;
  income: string;
}
