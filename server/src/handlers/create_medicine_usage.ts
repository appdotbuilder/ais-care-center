import { db } from '../db';
import { medicinesTable, medicineUsageTable } from '../db/schema';
import { type CreateMedicineUsageInput, type MedicineUsage } from '../schema';
import { eq, sql } from 'drizzle-orm';

export async function createMedicineUsage(input: CreateMedicineUsageInput): Promise<MedicineUsage> {
  return db.transaction(async (tx) => {
    // 1. Check if medicine exists and has sufficient stock
    const medicine = await tx.select()
      .from(medicinesTable)
      .where(eq(medicinesTable.id, input.medicine_id))
      .for('update') // Lock the row for update to prevent race conditions
      .execute();

    if (medicine.length === 0) {
      throw new Error(`Medicine with ID ${input.medicine_id} not found.`);
    }

    const currentStock = medicine[0].stock_quantity;
    if (currentStock < input.quantity_used) {
      throw new Error(`Insufficient stock for ${medicine[0].name}. Available: ${currentStock}, Required: ${input.quantity_used}.`);
    }

    // 2. Decrement medicine stock
    await tx.update(medicinesTable)
      .set({
        stock_quantity: sql`${medicinesTable.stock_quantity} - ${input.quantity_used}`,
        updated_at: new Date(),
      })
      .where(eq(medicinesTable.id, input.medicine_id))
      .execute();

    // 3. Insert medicine usage record
    const result = await tx.insert(medicineUsageTable)
      .values({
        medicine_id: input.medicine_id,
        quantity_used: input.quantity_used,
        notes: input.notes,
        usage_date: new Date(),
      })
      .returning()
      .execute();

    const newUsage = result[0];
    return {
      ...newUsage,
      usage_date: new Date(newUsage.usage_date),
      created_at: new Date(newUsage.created_at),
    };
  });
}