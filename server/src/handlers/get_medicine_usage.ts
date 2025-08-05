import { db } from '../db';
import { medicineUsageTable, medicinesTable } from '../db/schema';
import { type MedicineUsage } from '../schema';
import { desc, eq } from 'drizzle-orm';

export async function getMedicineUsage(): Promise<(MedicineUsage & { medicine_name: string })[]> {
  try {
    const results = await db.select({
        id: medicineUsageTable.id,
        medicine_id: medicineUsageTable.medicine_id,
        quantity_used: medicineUsageTable.quantity_used,
        usage_date: medicineUsageTable.usage_date,
        notes: medicineUsageTable.notes,
        created_at: medicineUsageTable.created_at,
        medicine_name: medicinesTable.name // Include medicine name
      })
      .from(medicineUsageTable)
      .innerJoin(medicinesTable, eq(medicineUsageTable.medicine_id, medicinesTable.id))
      .orderBy(desc(medicineUsageTable.usage_date)) // Order by most recent usage
      .execute();

    return results.map(row => ({
      ...row,
      usage_date: new Date(row.usage_date),
      created_at: new Date(row.created_at)
    }));
  } catch (error) {
    console.error('Failed to fetch medicine usage:', error);
    throw error;
  }
}