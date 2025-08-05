
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { patientsTable, transactionsTable } from '../db/schema';
import { type CreatePatientInput } from '../schema';
import { generatePatientReport } from '../handlers/generate_patient_report';

// Test patient data
const testPatient1: CreatePatientInput = {
  name: 'John Doe',
  date_of_birth: new Date('1990-05-15'),
  gender: 'male',
  phone: '+1234567890',
  email: 'john.doe@example.com',
  address: '123 Main St',
  emergency_contact: 'Jane Doe +1234567891',
  medical_history: 'No significant history',
  allergies: 'None'
};

const testPatient2: CreatePatientInput = {
  name: 'Alice Smith',
  date_of_birth: new Date('1985-08-20'),
  gender: 'female',
  phone: '+1987654321',
  email: 'alice.smith@example.com',
  address: '456 Oak Ave',
  emergency_contact: 'Bob Smith +1987654322',
  medical_history: 'Diabetes',
  allergies: 'Penicillin'
};

const testPatient3: CreatePatientInput = {
  name: 'Bob Wilson',
  date_of_birth: new Date('1975-12-10'),
  gender: 'male',
  phone: null,
  email: null,
  address: null,
  emergency_contact: null,
  medical_history: null,
  allergies: null
};

describe('generatePatientReport', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should generate empty report when no patients exist', async () => {
    const result = await generatePatientReport();
    expect(result).toEqual([]);
  });

  it('should generate report for patients without transactions', async () => {
    // Create patients without transactions
    await db.insert(patientsTable).values([
      {
        patient_code: 'P001',
        name: testPatient1.name,
        date_of_birth: testPatient1.date_of_birth.toISOString().split('T')[0],
        gender: testPatient1.gender,
        phone: testPatient1.phone,
        email: testPatient1.email,
        address: testPatient1.address,
        emergency_contact: testPatient1.emergency_contact,
        medical_history: testPatient1.medical_history,
        allergies: testPatient1.allergies
      },
      {
        patient_code: 'P002',
        name: testPatient2.name,
        date_of_birth: testPatient2.date_of_birth.toISOString().split('T')[0],
        gender: testPatient2.gender,
        phone: testPatient2.phone,
        email: testPatient2.email,
        address: testPatient2.address,
        emergency_contact: testPatient2.emergency_contact,
        medical_history: testPatient2.medical_history,
        allergies: testPatient2.allergies
      }
    ]).execute();

    const result = await generatePatientReport();

    expect(result).toHaveLength(2);
    
    // Verify first patient (alphabetically by name)
    expect(result[0].patient_name).toEqual('Alice Smith');
    expect(result[0].patient_code).toEqual('P002');
    expect(result[0].total_transactions).toEqual(0);
    expect(result[0].total_amount_spent).toEqual(0);
    expect(result[0].last_visit).toBeNull();

    // Verify second patient
    expect(result[1].patient_name).toEqual('John Doe');
    expect(result[1].patient_code).toEqual('P001');
    expect(result[1].total_transactions).toEqual(0);
    expect(result[1].total_amount_spent).toEqual(0);
    expect(result[1].last_visit).toBeNull();
  });

  it('should generate report with transaction summaries', async () => {
    // Create patients
    const patients = await db.insert(patientsTable).values([
      {
        patient_code: 'P001',
        name: testPatient1.name,
        date_of_birth: testPatient1.date_of_birth.toISOString().split('T')[0],
        gender: testPatient1.gender,
        phone: testPatient1.phone,
        email: testPatient1.email,
        address: testPatient1.address,
        emergency_contact: testPatient1.emergency_contact,
        medical_history: testPatient1.medical_history,
        allergies: testPatient1.allergies
      },
      {
        patient_code: 'P003',
        name: testPatient3.name,
        date_of_birth: testPatient3.date_of_birth.toISOString().split('T')[0],
        gender: testPatient3.gender,
        phone: testPatient3.phone,
        email: testPatient3.email,
        address: testPatient3.address,
        emergency_contact: testPatient3.emergency_contact,
        medical_history: testPatient3.medical_history,
        allergies: testPatient3.allergies
      }
    ]).returning().execute();

    // Create transactions for first patient
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    await db.insert(transactionsTable).values([
      {
        transaction_code: 'TXN001',
        patient_id: patients[0].id,
        transaction_date: yesterday,
        total_amount: '25.50',
        payment_status: 'paid',
        notes: 'Regular checkup'
      },
      {
        transaction_code: 'TXN002',
        patient_id: patients[0].id,
        transaction_date: today,
        total_amount: '45.75',
        payment_status: 'paid',
        notes: 'Follow-up visit'
      }
    ]).execute();

    // Create one transaction for second patient
    await db.insert(transactionsTable).values([
      {
        transaction_code: 'TXN003',
        patient_id: patients[1].id,
        transaction_date: yesterday,
        total_amount: '15.25',
        payment_status: 'pending',
        notes: 'Initial consultation'
      }
    ]).execute();

    const result = await generatePatientReport();

    expect(result).toHaveLength(2);

    // Find patients in result (ordered by name)
    const bobReport = result.find(r => r.patient_name === 'Bob Wilson')!;
    const johnReport = result.find(r => r.patient_name === 'John Doe')!;

    // Verify Bob Wilson's report
    expect(bobReport.patient_code).toEqual('P003');
    expect(bobReport.total_transactions).toEqual(1);
    expect(bobReport.total_amount_spent).toEqual(15.25);
    expect(bobReport.last_visit).toEqual(yesterday);

    // Verify John Doe's report
    expect(johnReport.patient_code).toEqual('P001');
    expect(johnReport.total_transactions).toEqual(2);
    expect(johnReport.total_amount_spent).toEqual(71.25); // 25.50 + 45.75
    expect(johnReport.last_visit).toEqual(today);
  });

  it('should order patients alphabetically by name', async () => {
    // Create patients in non-alphabetical order
    await db.insert(patientsTable).values([
      {
        patient_code: 'P002',
        name: 'Zoe Adams',
        date_of_birth: '1990-01-01',
        gender: 'female',
        phone: null,
        email: null,
        address: null,
        emergency_contact: null,
        medical_history: null,
        allergies: null
      },
      {
        patient_code: 'P001',
        name: 'Alice Brown',
        date_of_birth: '1985-01-01',
        gender: 'female',
        phone: null,
        email: null,
        address: null,
        emergency_contact: null,
        medical_history: null,
        allergies: null
      },
      {
        patient_code: 'P003',
        name: 'Mark Wilson',
        date_of_birth: '1980-01-01',
        gender: 'male',
        phone: null,
        email: null,
        address: null,
        emergency_contact: null,
        medical_history: null,
        allergies: null
      }
    ]).execute();

    const result = await generatePatientReport();

    expect(result).toHaveLength(3);
    expect(result[0].patient_name).toEqual('Alice Brown');
    expect(result[1].patient_name).toEqual('Mark Wilson');
    expect(result[2].patient_name).toEqual('Zoe Adams');
  });

  it('should handle numeric conversion correctly', async () => {
    // Create patient
    const patient = await db.insert(patientsTable).values({
      patient_code: 'P001',
      name: 'Test Patient',
      date_of_birth: '1990-01-01',
      gender: 'male',
      phone: null,
      email: null,
      address: null,
      emergency_contact: null,
      medical_history: null,
      allergies: null
    }).returning().execute();

    // Create transaction with decimal amount
    await db.insert(transactionsTable).values({
      transaction_code: 'TXN001',
      patient_id: patient[0].id,
      total_amount: '123.45',
      payment_status: 'paid',
      notes: null
    }).execute();

    const result = await generatePatientReport();

    expect(result).toHaveLength(1);
    expect(typeof result[0].total_amount_spent).toBe('number');
    expect(result[0].total_amount_spent).toEqual(123.45);
  });
});
