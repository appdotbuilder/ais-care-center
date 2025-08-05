
import { db } from '../db';
import { medicinesTable } from '../db/schema';
import { type UpdateMedicineInput, type Medicine } from '../schema';
import { eq } from 'drizzle-orm';

export const updateMedicine = async (input: UpdateMedicineInput): Promise<Medicine> => {
  try {
    // First check if medicine exists
    const existing = await db.select()
      .from(medicinesTable)
      .where(eq(medicinesTable.id, input.id))
      .execute();

    if (existing.length === 0) {
      throw new Error(`Medicine with id ${input.id} not found`);
    }

    // Prepare update values - only include fields that are defined
    const updateValues: any = {
      updated_at: new Date()
    };

    if (input.name !== undefined) {
      updateValues.name = input.name;
    }
    if (input.category !== undefined) {
      updateValues.category = input.category;
    }
    if (input.description !== undefined) {
      updateValues.description = input.description;
    }
    if (input.unit !== undefined) {
      updateValues.unit = input.unit;
    }
    if (input.price !== undefined) {
      updateValues.price = input.price.toString(); // Convert number to string for numeric column
    }
    if (input.stock_quantity !== undefined) {
      updateValues.stock_quantity = input.stock_quantity;
    }
    if (input.minimum_stock !== undefined) {
      updateValues.minimum_stock = input.minimum_stock;
    }
    if (input.expiry_date !== undefined) {
      updateValues.expiry_date = input.expiry_date;
    }
    if (input.supplier !== undefined) {
      updateValues.supplier = input.supplier;
    }

    // Update medicine record
    const result = await db.update(medicinesTable)
      .set(updateValues)
      .where(eq(medicinesTable.id, input.id))
      .returning()
      .execute();

    // Convert numeric fields back to numbers and dates back to Date objects
    const medicine = result[0];
    return {
      ...medicine,
      price: parseFloat(medicine.price), // Convert string back to number
      expiry_date: new Date(medicine.expiry_date) // Convert string back to Date
    };
  } catch (error) {
    console.error('Medicine update failed:', error);
    throw error;
  }
};
