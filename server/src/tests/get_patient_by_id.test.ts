
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { patientsTable } from '../db/schema';
import { type GetPatientByIdInput } from '../schema';
import { getPatientById } from '../handlers/get_patient_by_id';

// Test patient data
const testPatientData = {
  patient_code: 'PAT001',
  name: 'John Doe',
  date_of_birth: '1990-05-15',
  gender: 'male' as const,
  phone: '+1234567890',
  email: 'john.doe@example.com',
  address: '123 Main St, City',
  emergency_contact: 'Jane Doe - +1234567891',
  medical_history: 'No significant medical history',
  allergies: 'Penicillin'
};

describe('getPatientById', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return patient when found', async () => {
    // Create test patient
    const insertResult = await db.insert(patientsTable)
      .values(testPatientData)
      .returning()
      .execute();

    const createdPatient = insertResult[0];
    const input: GetPatientByIdInput = { id: createdPatient.id };

    const result = await getPatientById(input);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(createdPatient.id);
    expect(result!.patient_code).toEqual('PAT001');
    expect(result!.name).toEqual('John Doe');
    expect(result!.date_of_birth).toBeInstanceOf(Date);
    expect(result!.date_of_birth.toISOString().split('T')[0]).toEqual('1990-05-15');
    expect(result!.gender).toEqual('male');
    expect(result!.phone).toEqual('+1234567890');
    expect(result!.email).toEqual('john.doe@example.com');
    expect(result!.address).toEqual('123 Main St, City');
    expect(result!.emergency_contact).toEqual('Jane Doe - +1234567891');
    expect(result!.medical_history).toEqual('No significant medical history');
    expect(result!.allergies).toEqual('Penicillin');
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should return null when patient not found', async () => {
    const input: GetPatientByIdInput = { id: 999 };

    const result = await getPatientById(input);

    expect(result).toBeNull();
  });

  it('should handle patient with null optional fields', async () => {
    // Create patient with minimal required fields
    const minimalPatientData = {
      patient_code: 'PAT002',
      name: 'Jane Smith',
      date_of_birth: '1985-10-20',
      gender: 'female' as const,
      phone: null,
      email: null,
      address: null,
      emergency_contact: null,
      medical_history: null,
      allergies: null
    };

    const insertResult = await db.insert(patientsTable)
      .values(minimalPatientData)
      .returning()
      .execute();

    const createdPatient = insertResult[0];
    const input: GetPatientByIdInput = { id: createdPatient.id };

    const result = await getPatientById(input);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(createdPatient.id);
    expect(result!.patient_code).toEqual('PAT002');
    expect(result!.name).toEqual('Jane Smith');
    expect(result!.gender).toEqual('female');
    expect(result!.phone).toBeNull();
    expect(result!.email).toBeNull();
    expect(result!.address).toBeNull();
    expect(result!.emergency_contact).toBeNull();
    expect(result!.medical_history).toBeNull();
    expect(result!.allergies).toBeNull();
    expect(result!.date_of_birth).toBeInstanceOf(Date);
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });
});
