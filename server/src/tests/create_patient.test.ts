
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { patientsTable } from '../db/schema';
import { type CreatePatientInput } from '../schema';
import { createPatient } from '../handlers/create_patient';
import { eq } from 'drizzle-orm';

// Test input with all fields
const testInput: CreatePatientInput = {
  name: 'John Doe',
  date_of_birth: new Date('1990-01-15'),
  gender: 'male',
  phone: '+1234567890',
  email: 'john.doe@email.com',
  address: '123 Main Street, City',
  emergency_contact: 'Jane Doe - +0987654321',
  medical_history: 'No major medical history',
  allergies: 'Penicillin'
};

// Minimal test input (only required fields)
const minimalInput: CreatePatientInput = {
  name: 'Jane Smith',
  date_of_birth: new Date('1985-05-20'),
  gender: 'female',
  phone: null,
  email: null,
  address: null,
  emergency_contact: null,
  medical_history: null,
  allergies: null
};

describe('createPatient', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a patient with all fields', async () => {
    const result = await createPatient(testInput);

    // Basic field validation
    expect(result.name).toEqual('John Doe');
    expect(result.date_of_birth).toEqual(new Date('1990-01-15'));
    expect(result.gender).toEqual('male');
    expect(result.phone).toEqual('+1234567890');
    expect(result.email).toEqual('john.doe@email.com');
    expect(result.address).toEqual('123 Main Street, City');
    expect(result.emergency_contact).toEqual('Jane Doe - +0987654321');
    expect(result.medical_history).toEqual('No major medical history');
    expect(result.allergies).toEqual('Penicillin');
    expect(result.id).toBeDefined();
    expect(result.patient_code).toEqual('P000001');
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a patient with minimal fields', async () => {
    const result = await createPatient(minimalInput);

    expect(result.name).toEqual('Jane Smith');
    expect(result.date_of_birth).toEqual(new Date('1985-05-20'));
    expect(result.gender).toEqual('female');
    expect(result.phone).toBeNull();
    expect(result.email).toBeNull();
    expect(result.address).toBeNull();
    expect(result.emergency_contact).toBeNull();
    expect(result.medical_history).toBeNull();
    expect(result.allergies).toBeNull();
    expect(result.patient_code).toEqual('P000001');
  });

  it('should save patient to database', async () => {
    const result = await createPatient(testInput);

    const patients = await db.select()
      .from(patientsTable)
      .where(eq(patientsTable.id, result.id))
      .execute();

    expect(patients).toHaveLength(1);
    expect(patients[0].name).toEqual('John Doe');
    expect(patients[0].patient_code).toEqual('P000001');
    expect(patients[0].email).toEqual('john.doe@email.com');
    expect(patients[0].date_of_birth).toEqual('1990-01-15'); // Database stores as string
    expect(patients[0].created_at).toBeInstanceOf(Date);
  });

  it('should generate sequential patient codes', async () => {
    // Create first patient
    const patient1 = await createPatient(testInput);
    expect(patient1.patient_code).toEqual('P000001');

    // Create second patient
    const patient2Input = {
      ...testInput,
      name: 'Second Patient',
      email: 'second@email.com'
    };
    const patient2 = await createPatient(patient2Input);
    expect(patient2.patient_code).toEqual('P000002');

    // Create third patient
    const patient3Input = {
      ...testInput,
      name: 'Third Patient',
      email: 'third@email.com'
    };
    const patient3 = await createPatient(patient3Input);
    expect(patient3.patient_code).toEqual('P000003');
  });

  it('should enforce email uniqueness', async () => {
    // Create first patient
    await createPatient(testInput);

    // Try to create second patient with same email
    const duplicateInput = {
      ...testInput,
      name: 'Different Name'
    };

    await expect(createPatient(duplicateInput)).rejects.toThrow(/email already exists/i);
  });

  it('should allow multiple patients without email', async () => {
    // Create first patient without email
    const patient1 = await createPatient(minimalInput);
    expect(patient1.email).toBeNull();

    // Create second patient without email - should work
    const patient2Input = {
      ...minimalInput,
      name: 'Another Patient'
    };
    const patient2 = await createPatient(patient2Input);
    expect(patient2.email).toBeNull();
    expect(patient2.patient_code).toEqual('P000002');
  });

  it('should handle date of birth correctly', async () => {
    const dateInput = {
      ...testInput,
      date_of_birth: new Date('1975-12-25')
    };

    const result = await createPatient(dateInput);
    expect(result.date_of_birth).toEqual(new Date('1975-12-25'));

    // Verify in database - date column stores as string
    const patients = await db.select()
      .from(patientsTable)
      .where(eq(patientsTable.id, result.id))
      .execute();

    expect(patients[0].date_of_birth).toEqual('1975-12-25');
  });

  it('should generate correct patient code format', async () => {
    const result = await createPatient(testInput);

    // Patient code should be 7 characters: P + 6 digits
    expect(result.patient_code).toMatch(/^P\d{6}$/);
    expect(result.patient_code.length).toEqual(7);
    expect(result.patient_code.startsWith('P')).toBe(true);
  });

  it('should handle edge cases in patient code generation', async () => {
    // Create 9 patients to test code formatting
    for (let i = 1; i <= 9; i++) {
      const patientInput = {
        ...minimalInput,
        name: `Patient ${i}`,
        email: i <= 5 ? `patient${i}@email.com` : null // Mix of emails and nulls
      };
      
      const result = await createPatient(patientInput);
      const expectedCode = `P${i.toString().padStart(6, '0')}`;
      expect(result.patient_code).toEqual(expectedCode);
    }
  });

  it('should preserve date precision', async () => {
    // Test different date formats
    const dates = [
      new Date('2000-01-01'),
      new Date('1950-12-31'),
      new Date('2023-06-15')
    ];

    for (const testDate of dates) {
      const patientInput = {
        ...minimalInput,
        name: `Patient ${testDate.getFullYear()}`,
        date_of_birth: testDate
      };

      const result = await createPatient(patientInput);
      expect(result.date_of_birth.getTime()).toEqual(testDate.getTime());
    }
  });
});
