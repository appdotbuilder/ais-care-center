
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { patientsTable } from '../db/schema';
import { type CreatePatientInput } from '../schema';
import { getPatients } from '../handlers/get_patients';

// Test patient data
const testPatient1: CreatePatientInput = {
  name: 'John Doe',
  date_of_birth: new Date('1990-05-15'),
  gender: 'male',
  phone: '+1234567890',
  email: 'john.doe@example.com',
  address: '123 Main St, City, State',
  emergency_contact: '+0987654321',
  medical_history: 'No significant medical history',
  allergies: 'None known'
};

const testPatient2: CreatePatientInput = {
  name: 'Jane Smith',
  date_of_birth: new Date('1985-08-22'),
  gender: 'female',
  phone: '+1987654321',
  email: 'jane.smith@example.com',
  address: '456 Oak Ave, City, State',
  emergency_contact: '+1234567890',
  medical_history: 'Hypertension',
  allergies: 'Penicillin'
};

describe('getPatients', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no patients exist', async () => {
    const result = await getPatients();
    expect(result).toEqual([]);
  });

  it('should return all patients', async () => {
    // Create test patients with generated patient codes
    await db.insert(patientsTable)
      .values([
        {
          ...testPatient1,
          patient_code: 'P001',
          date_of_birth: testPatient1.date_of_birth.toISOString().split('T')[0]
        },
        {
          ...testPatient2,
          patient_code: 'P002',
          date_of_birth: testPatient2.date_of_birth.toISOString().split('T')[0]
        }
      ])
      .execute();

    const result = await getPatients();

    expect(result).toHaveLength(2);
    
    // Verify first patient
    const patient1 = result.find(p => p.name === 'John Doe');
    expect(patient1).toBeDefined();
    expect(patient1!.patient_code).toEqual('P001');
    expect(patient1!.gender).toEqual('male');
    expect(patient1!.phone).toEqual('+1234567890');
    expect(patient1!.email).toEqual('john.doe@example.com');
    expect(patient1!.date_of_birth).toBeInstanceOf(Date);
    expect(patient1!.created_at).toBeInstanceOf(Date);
    expect(patient1!.updated_at).toBeInstanceOf(Date);

    // Verify second patient
    const patient2 = result.find(p => p.name === 'Jane Smith');
    expect(patient2).toBeDefined();
    expect(patient2!.patient_code).toEqual('P002');
    expect(patient2!.gender).toEqual('female');
    expect(patient2!.medical_history).toEqual('Hypertension');
    expect(patient2!.allergies).toEqual('Penicillin');
  });

  it('should handle patients with null fields correctly', async () => {
    // Create patient with minimal required fields
    await db.insert(patientsTable)
      .values({
        patient_code: 'P003',
        name: 'Test Patient',
        date_of_birth: '1995-01-01',
        gender: 'male',
        phone: null,
        email: null,
        address: null,
        emergency_contact: null,
        medical_history: null,
        allergies: null
      })
      .execute();

    const result = await getPatients();

    expect(result).toHaveLength(1);
    const patient = result[0];
    
    expect(patient.name).toEqual('Test Patient');
    expect(patient.patient_code).toEqual('P003');
    expect(patient.phone).toBeNull();
    expect(patient.email).toBeNull();
    expect(patient.address).toBeNull();
    expect(patient.emergency_contact).toBeNull();
    expect(patient.medical_history).toBeNull();
    expect(patient.allergies).toBeNull();
    expect(patient.date_of_birth).toBeInstanceOf(Date);
  });

  it('should return patients in creation order', async () => {
    // Create patients with slight time differences
    await db.insert(patientsTable)
      .values({
        ...testPatient1,
        patient_code: 'P001',
        date_of_birth: testPatient1.date_of_birth.toISOString().split('T')[0]
      })
      .execute();

    // Small delay to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 1));

    await db.insert(patientsTable)
      .values({
        ...testPatient2,
        patient_code: 'P002',
        date_of_birth: testPatient2.date_of_birth.toISOString().split('T')[0]
      })
      .execute();

    const result = await getPatients();

    expect(result).toHaveLength(2);
    // Should be returned in the order they were created (by id)
    expect(result[0].name).toEqual('John Doe');
    expect(result[1].name).toEqual('Jane Smith');
  });
});
