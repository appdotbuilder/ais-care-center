
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { patientsTable, medicinesTable, transactionsTable, transactionItemsTable } from '../db/schema';
import { type CreateTransactionInput } from '../schema';
import { createTransaction } from '../handlers/create_transaction';
import { eq } from 'drizzle-orm';

// Test data
const testPatient = {
  patient_code: 'P001',
  name: 'John Doe',
  date_of_birth: '1990-01-01',
  gender: 'male' as const,
  phone: null,
  email: null,
  address: null,
  emergency_contact: null,
  medical_history: null,
  allergies: null
};

const testMedicine1 = {
  name: 'Paracetamol',
  category: 'Pain Relief',
  description: 'Pain and fever relief',
  unit: 'tablet',
  price: '5.99',
  stock_quantity: 100,
  minimum_stock: 10,
  expiry_date: '2025-12-31',
  supplier: 'PharmaCorp'
};

const testMedicine2 = {
  name: 'Ibuprofen',
  category: 'Anti-inflammatory',
  description: 'Anti-inflammatory medicine',
  unit: 'tablet',
  price: '8.50',
  stock_quantity: 50,
  minimum_stock: 5,
  expiry_date: '2025-10-15',
  supplier: 'MediSupply'
};

describe('createTransaction', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a transaction with items', async () => {
    // Create prerequisite data
    const patientResult = await db.insert(patientsTable)
      .values(testPatient)
      .returning()
      .execute();
    const patient = patientResult[0];

    const medicine1Result = await db.insert(medicinesTable)
      .values(testMedicine1)
      .returning()
      .execute();
    const medicine1 = medicine1Result[0];

    const medicine2Result = await db.insert(medicinesTable)
      .values(testMedicine2)
      .returning()
      .execute();
    const medicine2 = medicine2Result[0];

    const input: CreateTransactionInput = {
      patient_id: patient.id,
      items: [
        { medicine_id: medicine1.id, quantity: 2 },
        { medicine_id: medicine2.id, quantity: 1 }
      ],
      notes: 'Test transaction'
    };

    const result = await createTransaction(input);

    // Validate transaction
    expect(result.patient_id).toEqual(patient.id);
    expect(result.transaction_code).toMatch(/^TXN\d{6}$/);
    expect(result.total_amount).toEqual(20.48); // (5.99 * 2) + (8.50 * 1)
    expect(result.payment_status).toEqual('pending');
    expect(result.notes).toEqual('Test transaction');
    expect(result.id).toBeDefined();
    expect(result.transaction_date).toBeInstanceOf(Date);
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create transaction items correctly', async () => {
    // Create prerequisite data
    const patientResult = await db.insert(patientsTable)
      .values(testPatient)
      .returning()
      .execute();
    const patient = patientResult[0];

    const medicine1Result = await db.insert(medicinesTable)
      .values(testMedicine1)
      .returning()
      .execute();
    const medicine1 = medicine1Result[0];

    const input: CreateTransactionInput = {
      patient_id: patient.id,
      items: [
        { medicine_id: medicine1.id, quantity: 3 }
      ],
      notes: null
    };

    const result = await createTransaction(input);

    // Check transaction items were created
    const transactionItems = await db.select()
      .from(transactionItemsTable)
      .where(eq(transactionItemsTable.transaction_id, result.id))
      .execute();

    expect(transactionItems).toHaveLength(1);
    expect(transactionItems[0].medicine_id).toEqual(medicine1.id);
    expect(transactionItems[0].quantity).toEqual(3);
    expect(parseFloat(transactionItems[0].unit_price)).toEqual(5.99);
    expect(parseFloat(transactionItems[0].subtotal)).toEqual(17.97);
  });

  it('should update medicine stock quantities', async () => {
    // Create prerequisite data
    const patientResult = await db.insert(patientsTable)
      .values(testPatient)
      .returning()
      .execute();
    const patient = patientResult[0];

    const medicine1Result = await db.insert(medicinesTable)
      .values(testMedicine1)
      .returning()
      .execute();
    const medicine1 = medicine1Result[0];

    const input: CreateTransactionInput = {
      patient_id: patient.id,
      items: [
        { medicine_id: medicine1.id, quantity: 5 }
      ],
      notes: null
    };

    await createTransaction(input);

    // Check stock was updated
    const updatedMedicine = await db.select()
      .from(medicinesTable)
      .where(eq(medicinesTable.id, medicine1.id))
      .execute();

    expect(updatedMedicine[0].stock_quantity).toEqual(95); // 100 - 5
  });

  it('should generate unique transaction codes', async () => {
    // Create prerequisite data
    const patientResult = await db.insert(patientsTable)
      .values(testPatient)
      .returning()
      .execute();
    const patient = patientResult[0];

    const medicine1Result = await db.insert(medicinesTable)
      .values(testMedicine1)
      .returning()
      .execute();
    const medicine1 = medicine1Result[0];

    const input: CreateTransactionInput = {
      patient_id: patient.id,
      items: [
        { medicine_id: medicine1.id, quantity: 1 }
      ],
      notes: null
    };

    // Create two transactions
    const result1 = await createTransaction(input);
    const result2 = await createTransaction(input);

    expect(result1.transaction_code).toEqual('TXN000001');
    expect(result2.transaction_code).toEqual('TXN000002');
    expect(result1.transaction_code).not.toEqual(result2.transaction_code);
  });

  it('should throw error for non-existent patient', async () => {
    const input: CreateTransactionInput = {
      patient_id: 999,
      items: [
        { medicine_id: 1, quantity: 1 }
      ],
      notes: null
    };

    await expect(createTransaction(input)).rejects.toThrow(/patient not found/i);
  });

  it('should throw error for non-existent medicine', async () => {
    // Create prerequisite data
    const patientResult = await db.insert(patientsTable)
      .values(testPatient)
      .returning()
      .execute();
    const patient = patientResult[0];

    const input: CreateTransactionInput = {
      patient_id: patient.id,
      items: [
        { medicine_id: 999, quantity: 1 }
      ],
      notes: null
    };

    await expect(createTransaction(input)).rejects.toThrow(/medicines not found/i);
  });

  it('should throw error for insufficient stock', async () => {
    // Create prerequisite data
    const patientResult = await db.insert(patientsTable)
      .values(testPatient)
      .returning()
      .execute();
    const patient = patientResult[0];

    const medicine1Result = await db.insert(medicinesTable)
      .values(testMedicine1)
      .returning()
      .execute();
    const medicine1 = medicine1Result[0];

    const input: CreateTransactionInput = {
      patient_id: patient.id,
      items: [
        { medicine_id: medicine1.id, quantity: 150 } // More than available stock (100)
      ],
      notes: null
    };

    await expect(createTransaction(input)).rejects.toThrow(/insufficient stock/i);
  });

  it('should save transaction to database', async () => {
    // Create prerequisite data
    const patientResult = await db.insert(patientsTable)
      .values(testPatient)
      .returning()
      .execute();
    const patient = patientResult[0];

    const medicine1Result = await db.insert(medicinesTable)
      .values(testMedicine1)
      .returning()
      .execute();
    const medicine1 = medicine1Result[0];

    const input: CreateTransactionInput = {
      patient_id: patient.id,
      items: [
        { medicine_id: medicine1.id, quantity: 2 }
      ],
      notes: 'Database test'
    };

    const result = await createTransaction(input);

    // Verify transaction was saved
    const savedTransaction = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.id, result.id))
      .execute();

    expect(savedTransaction).toHaveLength(1);
    expect(savedTransaction[0].patient_id).toEqual(patient.id);
    expect(savedTransaction[0].transaction_code).toEqual(result.transaction_code);
    expect(parseFloat(savedTransaction[0].total_amount)).toEqual(11.98);
    expect(savedTransaction[0].notes).toEqual('Database test');
  });
});
