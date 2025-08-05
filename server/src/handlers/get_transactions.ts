
import { db } from '../db';
import { transactionsTable } from '../db/schema';
import { type Transaction } from '../schema';

export const getTransactions = async (): Promise<Transaction[]> => {
  try {
    const results = await db.select()
      .from(transactionsTable)
      .execute();

    // Convert numeric fields back to numbers
    return results.map(transaction => ({
      ...transaction,
      total_amount: parseFloat(transaction.total_amount)
    }));
  } catch (error) {
    console.error('Get transactions failed:', error);
    throw error;
  }
};
