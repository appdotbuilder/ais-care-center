
import { db } from '../db';
import { patientsTable } from '../db/schema';
import { type Patient } from '../schema';

export const getPatients = async (): Promise<Patient[]> => {
  try {
    const results = await db.select()
      .from(patientsTable)
      .execute();

    // Convert date fields and return
    return results.map(patient => ({
      ...patient,
      date_of_birth: new Date(patient.date_of_birth),
      created_at: new Date(patient.created_at),
      updated_at: new Date(patient.updated_at)
    }));
  } catch (error) {
    console.error('Failed to fetch patients:', error);
    throw error;
  }
};
