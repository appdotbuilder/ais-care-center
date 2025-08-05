
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { patientsTable } from '../db/schema';
import { type CreatePatientInput, type UpdatePatientInput } from '../schema';
import { updatePatient } from '../handlers/update_patient';
import { eq } from 'drizzle-orm';

// Helper to create a test patient
const createTestPatient = async (): Promise<number> => {
  const testPatient: CreatePatientInput = {
    name: 'John Doe',
    date_of_birth: new Date('1990-01-01'),
    gender: 'male',
    phone: '1234567890',
    email: 'john.doe@example.com',
    address: '123 Main St',
    emergency_contact: 'Jane Doe - 0987654321',
    medical_history: 'No significant history',
    allergies: 'None'
  };

  const result = await db.insert(patientsTable)
    .values({
      ...testPatient,
      patient_code: 'P000001',
      date_of_birth: testPatient.date_of_birth.toISOString().split('T')[0]
    })
    .returning()
    .execute();

  return result[0].id;
};

describe('updatePatient', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update patient basic information', async () => {
    const patientId = await createTestPatient();

    const updateInput: UpdatePatientInput = {
      id: patientId,
      name: 'John Updated',
      phone: '9999999999',
      email: 'john.updated@example.com'
    };

    const result = await updatePatient(updateInput);

    expect(result.id).toEqual(patientId);
    expect(result.name).toEqual('John Updated');
    expect(result.phone).toEqual('9999999999');
    expect(result.email).toEqual('john.updated@example.com');
    expect(result.updated_at).toBeInstanceOf(Date);

    // Verify unchanged fields remain the same
    expect(result.gender).toEqual('male');
    expect(result.date_of_birth).toEqual(new Date('1990-01-01'));
    expect(result.address).toEqual('123 Main St');
  });

  it('should update patient with partial fields', async () => {
    const patientId = await createTestPatient();

    const updateInput: UpdatePatientInput = {
      id: patientId,
      address: '456 New Street',
      allergies: 'Peanuts'
    };

    const result = await updatePatient(updateInput);

    expect(result.id).toEqual(patientId);
    expect(result.address).toEqual('456 New Street');
    expect(result.allergies).toEqual('Peanuts');
    expect(result.updated_at).toBeInstanceOf(Date);

    // Verify unchanged fields remain the same
    expect(result.name).toEqual('John Doe');
    expect(result.phone).toEqual('1234567890');
    expect(result.email).toEqual('john.doe@example.com');
  });

  it('should update nullable fields to null', async () => {
    const patientId = await createTestPatient();

    const updateInput: UpdatePatientInput = {
      id: patientId,
      phone: null,
      email: null,
      medical_history: null
    };

    const result = await updatePatient(updateInput);

    expect(result.id).toEqual(patientId);
    expect(result.phone).toBeNull();
    expect(result.email).toBeNull();
    expect(result.medical_history).toBeNull();
    expect(result.updated_at).toBeInstanceOf(Date);

    // Verify other fields unchanged
    expect(result.name).toEqual('John Doe');
    expect(result.address).toEqual('123 Main St');
  });

  it('should update date of birth correctly', async () => {
    const patientId = await createTestPatient();

    const newDateOfBirth = new Date('1985-06-15');
    const updateInput: UpdatePatientInput = {
      id: patientId,
      date_of_birth: newDateOfBirth
    };

    const result = await updatePatient(updateInput);

    expect(result.id).toEqual(patientId);
    expect(result.date_of_birth).toEqual(newDateOfBirth);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save changes to database', async () => {
    const patientId = await createTestPatient();

    const updateInput: UpdatePatientInput = {
      id: patientId,
      name: 'Database Test',
      gender: 'female'
    };

    await updatePatient(updateInput);

    // Verify changes persisted in database
    const patients = await db.select()
      .from(patientsTable)
      .where(eq(patientsTable.id, patientId))
      .execute();

    expect(patients).toHaveLength(1);
    expect(patients[0].name).toEqual('Database Test');
    expect(patients[0].gender).toEqual('female');
    expect(patients[0].updated_at).toBeInstanceOf(Date);
  });

  it('should update updated_at timestamp', async () => {
    const patientId = await createTestPatient();

    // Get original timestamp
    const originalPatient = await db.select()
      .from(patientsTable)
      .where(eq(patientsTable.id, patientId))
      .execute();

    const originalUpdatedAt = originalPatient[0].updated_at;

    // Wait a moment to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    const updateInput: UpdatePatientInput = {
      id: patientId,
      name: 'Timestamp Test'
    };

    const result = await updatePatient(updateInput);

    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
  });

  it('should reject update for non-existent patient', async () => {
    const updateInput: UpdatePatientInput = {
      id: 99999,
      name: 'Non-existent'
    };

    await expect(updatePatient(updateInput)).rejects.toThrow(/not found/i);
  });

  it('should handle gender update correctly', async () => {
    const patientId = await createTestPatient();

    const updateInput: UpdatePatientInput = {
      id: patientId,
      gender: 'female'
    };

    const result = await updatePatient(updateInput);

    expect(result.gender).toEqual('female');
    expect(result.updated_at).toBeInstanceOf(Date);
  });
});
