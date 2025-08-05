
import { db } from '../db';
import { medicinesTable } from '../db/schema';
import { type GetLowStockMedicinesInput, type Medicine } from '../schema';
import { lte, sql } from 'drizzle-orm';

export async function getLowStockMedicines(input: GetLowStockMedicinesInput): Promise<Medicine[]> {
  try {
    let results;
    
    if (input.threshold !== undefined) {
      // Use specific threshold value
      results = await db.select()
        .from(medicinesTable)
        .where(lte(medicinesTable.stock_quantity, input.threshold))
        .execute();
    } else {
      // Default behavior: find medicines where stock_quantity <= minimum_stock
      results = await db.select()
        .from(medicinesTable)
        .where(sql`${medicinesTable.stock_quantity} <= ${medicinesTable.minimum_stock}`)
        .execute();
    }
    
    // Convert numeric fields and dates back to proper types
    return results.map(medicine => ({
      ...medicine,
      price: parseFloat(medicine.price),
      expiry_date: new Date(medicine.expiry_date)
    }));
  } catch (error) {
    console.error('Failed to get low stock medicines:', error);
    throw error;
  }
}
