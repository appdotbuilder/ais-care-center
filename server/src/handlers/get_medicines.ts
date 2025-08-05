
import { db } from '../db';
import { medicinesTable } from '../db/schema';
import { type Medicine } from '../schema';

export const getMedicines = async (): Promise<Medicine[]> => {
  try {
    const results = await db.select()
      .from(medicinesTable)
      .execute();

    // Convert numeric and date fields to match schema expectations
    return results.map(medicine => ({
      ...medicine,
      price: parseFloat(medicine.price),
      expiry_date: new Date(medicine.expiry_date)
    }));
  } catch (error) {
    console.error('Failed to fetch medicines:', error);
    throw error;
  }
};
