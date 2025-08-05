
import { db } from '../db';
import { transactionsTable, transactionItemsTable, medicinesTable, patientsTable } from '../db/schema';
import { type GetTransactionByIdInput, type Transaction } from '../schema';
import { eq } from 'drizzle-orm';

export async function getTransactionById(input: GetTransactionByIdInput): Promise<Transaction | null> {
  try {
    // Query transaction with patient data
    const transactionResults = await db.select()
      .from(transactionsTable)
      .innerJoin(patientsTable, eq(transactionsTable.patient_id, patientsTable.id))
      .where(eq(transactionsTable.id, input.id))
      .execute();

    if (transactionResults.length === 0) {
      return null;
    }

    const transactionData = transactionResults[0].transactions;

    // Convert numeric fields back to numbers
    return {
      ...transactionData,
      total_amount: parseFloat(transactionData.total_amount)
    };
  } catch (error) {
    console.error('Transaction retrieval failed:', error);
    throw error;
  }
}
