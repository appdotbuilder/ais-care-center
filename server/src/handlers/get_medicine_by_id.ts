
import { db } from '../db';
import { medicinesTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type GetMedicineByIdInput, type Medicine } from '../schema';

export async function getMedicineById(input: GetMedicineByIdInput): Promise<Medicine | null> {
  try {
    const result = await db.select()
      .from(medicinesTable)
      .where(eq(medicinesTable.id, input.id))
      .execute();

    if (result.length === 0) {
      return null;
    }

    const medicine = result[0];
    return {
      ...medicine,
      price: parseFloat(medicine.price), // Convert numeric field to number
      expiry_date: new Date(medicine.expiry_date), // Convert date string to Date object
      created_at: medicine.created_at,
      updated_at: medicine.updated_at
    };
  } catch (error) {
    console.error('Failed to get medicine by ID:', error);
    throw error;
  }
}
