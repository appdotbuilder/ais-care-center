
import { db } from '../db';
import { transactionsTable } from '../db/schema';
import { type UpdateTransactionStatusInput, type Transaction } from '../schema';
import { eq } from 'drizzle-orm';

export const updateTransactionStatus = async (input: UpdateTransactionStatusInput): Promise<Transaction> => {
  try {
    // Update transaction status
    const result = await db.update(transactionsTable)
      .set({
        payment_status: input.payment_status,
        updated_at: new Date()
      })
      .where(eq(transactionsTable.id, input.id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error(`Transaction with id ${input.id} not found`);
    }

    // Convert numeric fields back to numbers before returning
    const transaction = result[0];
    return {
      ...transaction,
      total_amount: parseFloat(transaction.total_amount)
    };
  } catch (error) {
    console.error('Transaction status update failed:', error);
    throw error;
  }
};
