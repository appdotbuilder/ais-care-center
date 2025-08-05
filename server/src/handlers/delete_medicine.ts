
import { db } from '../db';
import { medicinesTable, transactionItemsTable } from '../db/schema';
import { type GetMedicineByIdInput } from '../schema';
import { eq } from 'drizzle-orm';

export async function deleteMedicine(input: GetMedicineByIdInput): Promise<{ success: boolean }> {
  try {
    // First, check if medicine exists
    const existingMedicine = await db.select()
      .from(medicinesTable)
      .where(eq(medicinesTable.id, input.id))
      .execute();

    if (existingMedicine.length === 0) {
      throw new Error('Medicine not found');
    }

    // Check if medicine is used in any transactions
    const transactionItems = await db.select()
      .from(transactionItemsTable)
      .where(eq(transactionItemsTable.medicine_id, input.id))
      .execute();

    if (transactionItems.length > 0) {
      throw new Error('Cannot delete medicine: it is used in existing transactions');
    }

    // Delete the medicine
    const result = await db.delete(medicinesTable)
      .where(eq(medicinesTable.id, input.id))
      .execute();

    return { success: true };
  } catch (error) {
    console.error('Medicine deletion failed:', error);
    throw error;
  }
}
