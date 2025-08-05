
import { db } from '../db';
import { patientsTable } from '../db/schema';
import { type GetPatientByIdInput, type Patient } from '../schema';
import { eq } from 'drizzle-orm';

export const getPatientById = async (input: GetPatientByIdInput): Promise<Patient | null> => {
  try {
    const result = await db.select()
      .from(patientsTable)
      .where(eq(patientsTable.id, input.id))
      .execute();

    if (result.length === 0) {
      return null;
    }

    const patient = result[0];
    return {
      ...patient,
      // Convert date fields to proper Date objects
      date_of_birth: new Date(patient.date_of_birth),
      created_at: new Date(patient.created_at),
      updated_at: new Date(patient.updated_at)
    };
  } catch (error) {
    console.error('Failed to get patient by ID:', error);
    throw error;
  }
};
