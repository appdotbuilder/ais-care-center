
import { db } from '../db';
import { patientsTable, transactionsTable } from '../db/schema';
import { type PatientReport } from '../schema';
import { eq, sum, count, max, sql } from 'drizzle-orm';

export async function generatePatientReport(): Promise<PatientReport[]> {
  try {
    // Query to generate patient report with transaction summaries
    const results = await db
      .select({
        patient_id: patientsTable.id,
        patient_code: patientsTable.patient_code,
        patient_name: patientsTable.name,
        total_transactions: count(transactionsTable.id),
        total_amount_spent: sum(transactionsTable.total_amount),
        last_visit: max(transactionsTable.transaction_date)
      })
      .from(patientsTable)
      .leftJoin(transactionsTable, eq(patientsTable.id, transactionsTable.patient_id))
      .groupBy(patientsTable.id, patientsTable.patient_code, patientsTable.name)
      .orderBy(patientsTable.name)
      .execute();

    // Convert numeric fields and handle nulls
    return results.map(result => ({
      patient_id: result.patient_id,
      patient_code: result.patient_code,
      patient_name: result.patient_name,
      total_transactions: result.total_transactions || 0,
      total_amount_spent: result.total_amount_spent ? parseFloat(result.total_amount_spent) : 0,
      last_visit: result.last_visit || null
    }));
  } catch (error) {
    console.error('Patient report generation failed:', error);
    throw error;
  }
}
