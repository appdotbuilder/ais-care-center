
import { db } from '../db';
import { transactionsTable, transactionItemsTable, patientsTable, medicinesTable } from '../db/schema';
import { type GetTransactionByIdInput, type Receipt } from '../schema';
import { eq } from 'drizzle-orm';

export async function generateReceipt(input: GetTransactionByIdInput): Promise<Receipt | null> {
  try {
    // Get transaction with patient data
    const transactionResults = await db.select()
      .from(transactionsTable)
      .innerJoin(patientsTable, eq(transactionsTable.patient_id, patientsTable.id))
      .where(eq(transactionsTable.id, input.id))
      .execute();

    if (transactionResults.length === 0) {
      return null;
    }

    const transactionData = transactionResults[0];
    const transaction = transactionData.transactions;
    const patient = transactionData.patients;

    // Get transaction items with medicine details
    const itemResults = await db.select()
      .from(transactionItemsTable)
      .innerJoin(medicinesTable, eq(transactionItemsTable.medicine_id, medicinesTable.id))
      .where(eq(transactionItemsTable.transaction_id, input.id))
      .execute();

    // Build receipt items array
    const items = itemResults.map(result => ({
      medicine_name: result.medicines.name,
      quantity: result.transaction_items.quantity,
      unit_price: parseFloat(result.transaction_items.unit_price),
      subtotal: parseFloat(result.transaction_items.subtotal)
    }));

    // Construct receipt object
    const receipt: Receipt = {
      transaction_id: transaction.id,
      transaction_code: transaction.transaction_code,
      patient_name: patient.name,
      patient_code: patient.patient_code,
      transaction_date: transaction.transaction_date,
      items: items,
      total_amount: parseFloat(transaction.total_amount),
      payment_status: transaction.payment_status,
      notes: transaction.notes
    };

    return receipt;
  } catch (error) {
    console.error('Receipt generation failed:', error);
    throw error;
  }
}
