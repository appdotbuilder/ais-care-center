
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { patientsTable, transactionsTable } from '../db/schema';
import { type CreatePatientInput, type CreateTransactionInput } from '../schema';
import { getTransactions } from '../handlers/get_transactions';

// Test data
const testPatient: CreatePatientInput = {
  name: 'John Doe',
  date_of_birth: new Date('1990-01-01'),
  gender: 'male',
  phone: '123-456-7890',
  email: 'john.doe@example.com',
  address: '123 Main St',
  emergency_contact: 'Jane Doe: 987-654-3210',
  medical_history: 'No significant history',
  allergies: 'None'
};

describe('getTransactions', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no transactions exist', async () => {
    const result = await getTransactions();
    expect(result).toEqual([]);
  });

  it('should return all transactions', async () => {
    // Create patient first
    const patientResult = await db.insert(patientsTable)
      .values({
        patient_code: 'P001',
        name: testPatient.name,
        date_of_birth: testPatient.date_of_birth.toISOString().split('T')[0],
        gender: testPatient.gender,
        phone: testPatient.phone,
        email: testPatient.email,
        address: testPatient.address,
        emergency_contact: testPatient.emergency_contact,
        medical_history: testPatient.medical_history,
        allergies: testPatient.allergies
      })
      .returning()
      .execute();

    const patientId = patientResult[0].id;

    // Create test transactions
    await db.insert(transactionsTable)
      .values([
        {
          transaction_code: 'T001',
          patient_id: patientId,
          total_amount: '29.99',
          payment_status: 'paid',
          notes: 'Regular prescription'
        },
        {
          transaction_code: 'T002',
          patient_id: patientId,
          total_amount: '45.50',
          payment_status: 'pending',
          notes: 'Emergency medication'
        }
      ])
      .execute();

    const result = await getTransactions();

    expect(result).toHaveLength(2);
    
    // Check first transaction
    const transaction1 = result.find(t => t.transaction_code === 'T001');
    expect(transaction1).toBeDefined();
    expect(transaction1!.patient_id).toEqual(patientId);
    expect(transaction1!.total_amount).toEqual(29.99);
    expect(typeof transaction1!.total_amount).toBe('number');
    expect(transaction1!.payment_status).toEqual('paid');
    expect(transaction1!.notes).toEqual('Regular prescription');
    expect(transaction1!.id).toBeDefined();
    expect(transaction1!.transaction_date).toBeInstanceOf(Date);
    expect(transaction1!.created_at).toBeInstanceOf(Date);
    expect(transaction1!.updated_at).toBeInstanceOf(Date);

    // Check second transaction
    const transaction2 = result.find(t => t.transaction_code === 'T002');
    expect(transaction2).toBeDefined();
    expect(transaction2!.patient_id).toEqual(patientId);
    expect(transaction2!.total_amount).toEqual(45.50);
    expect(typeof transaction2!.total_amount).toBe('number');
    expect(transaction2!.payment_status).toEqual('pending');
    expect(transaction2!.notes).toEqual('Emergency medication');
  });

  it('should handle multiple transactions from different patients', async () => {
    // Create two patients
    const patient1Result = await db.insert(patientsTable)
      .values({
        patient_code: 'P001',
        name: 'John Doe',
        date_of_birth: '1990-01-01',
        gender: 'male',
        phone: '123-456-7890',
        email: 'john@example.com',
        address: '123 Main St',
        emergency_contact: null,
        medical_history: null,
        allergies: null
      })
      .returning()
      .execute();

    const patient2Result = await db.insert(patientsTable)
      .values({
        patient_code: 'P002',
        name: 'Jane Smith',
        date_of_birth: '1985-05-15',
        gender: 'female',
        phone: '987-654-3210',
        email: 'jane@example.com',
        address: '456 Oak Ave',
        emergency_contact: null,
        medical_history: null,
        allergies: null
      })
      .returning()
      .execute();

    // Create transactions for both patients
    await db.insert(transactionsTable)
      .values([
        {
          transaction_code: 'T001',
          patient_id: patient1Result[0].id,
          total_amount: '25.00',
          payment_status: 'paid',
          notes: null
        },
        {
          transaction_code: 'T002',
          patient_id: patient2Result[0].id,
          total_amount: '75.25',
          payment_status: 'cancelled',
          notes: 'Patient cancelled order'
        }
      ])
      .execute();

    const result = await getTransactions();

    expect(result).toHaveLength(2);
    
    // Verify both transactions are present and properly formatted
    const transactionCodes = result.map(t => t.transaction_code).sort();
    expect(transactionCodes).toEqual(['T001', 'T002']);
    
    // Verify numeric conversion
    result.forEach(transaction => {
      expect(typeof transaction.total_amount).toBe('number');
      expect(transaction.patient_id).toBeGreaterThan(0);
      expect(transaction.transaction_date).toBeInstanceOf(Date);
    });
  });
});
