
import { db } from '../db';
import { patientsTable } from '../db/schema';
import { type CreatePatientInput, type Patient } from '../schema';
import { eq, desc } from 'drizzle-orm';

export const createPatient = async (input: CreatePatientInput): Promise<Patient> => {
  try {
    // Check email uniqueness if email is provided
    if (input.email) {
      const existingPatient = await db.select()
        .from(patientsTable)
        .where(eq(patientsTable.email, input.email))
        .limit(1)
        .execute();

      if (existingPatient.length > 0) {
        throw new Error('Email already exists');
      }
    }

    // Generate sequential patient code
    const lastPatient = await db.select()
      .from(patientsTable)
      .orderBy(desc(patientsTable.id))
      .limit(1)
      .execute();

    let nextPatientNumber = 1;
    if (lastPatient.length > 0) {
      // Extract number from patient code (e.g., "P000001" -> 1)
      const lastCode = lastPatient[0].patient_code;
      const lastNumber = parseInt(lastCode.substring(1));
      nextPatientNumber = lastNumber + 1;
    }

    // Format patient code with leading zeros (P000001, P000002, etc.)
    const patientCode = `P${nextPatientNumber.toString().padStart(6, '0')}`;

    // Insert patient record - convert Date to string for date column
    const result = await db.insert(patientsTable)
      .values({
        patient_code: patientCode,
        name: input.name,
        date_of_birth: input.date_of_birth.toISOString().split('T')[0], // Convert Date to YYYY-MM-DD string
        gender: input.gender,
        phone: input.phone,
        email: input.email,
        address: input.address,
        emergency_contact: input.emergency_contact,
        medical_history: input.medical_history,
        allergies: input.allergies
      })
      .returning()
      .execute();

    // Convert date string back to Date object for return
    const patient = result[0];
    return {
      ...patient,
      date_of_birth: new Date(patient.date_of_birth)
    };
  } catch (error) {
    console.error('Patient creation failed:', error);
    throw error;
  }
};
