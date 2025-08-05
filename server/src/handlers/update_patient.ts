
import { db } from '../db';
import { patientsTable } from '../db/schema';
import { type UpdatePatientInput, type Patient } from '../schema';
import { eq } from 'drizzle-orm';

export const updatePatient = async (input: UpdatePatientInput): Promise<Patient> => {
  try {
    // Extract id and update fields
    const { id, ...updateFields } = input;

    // Check if patient exists
    const existingPatient = await db.select()
      .from(patientsTable)
      .where(eq(patientsTable.id, id))
      .execute();

    if (existingPatient.length === 0) {
      throw new Error(`Patient with id ${id} not found`);
    }

    // Convert date to string format for database if provided
    const updateData: any = {
      ...updateFields,
      updated_at: new Date()
    };

    if (updateData.date_of_birth) {
      updateData.date_of_birth = updateData.date_of_birth.toISOString().split('T')[0];
    }

    // Update patient record
    const result = await db.update(patientsTable)
      .set(updateData)
      .where(eq(patientsTable.id, id))
      .returning()
      .execute();

    // Convert date string back to Date object for return
    const patient = result[0];
    return {
      ...patient,
      date_of_birth: new Date(patient.date_of_birth)
    };
  } catch (error) {
    console.error('Patient update failed:', error);
    throw error;
  }
};
