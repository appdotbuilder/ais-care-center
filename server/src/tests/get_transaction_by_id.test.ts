
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { patientsTable, medicinesTable, transactionsTable, transactionItemsTable } from '../db/schema';
import { type GetTransactionByIdInput } from '../schema';
import { getTransactionById } from '../handlers/get_transaction_by_id';

describe('getTransactionById', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return null for non-existent transaction', async () => {
    const input: GetTransactionByIdInput = {
      id: 999
    };

    const result = await getTransactionById(input);
    expect(result).toBeNull();
  });

  it('should return transaction with correct data types', async () => {
    // Create patient first
    const patientResult = await db.insert(patientsTable)
      .values({
        patient_code: 'PAT001',
        name: 'John Doe',
        date_of_birth: '1990-01-15',
        gender: 'male',
        phone: '1234567890',
        email: 'john@example.com',
        address: '123 Main St',
        emergency_contact: '0987654321',
        medical_history: 'No known conditions',
        allergies: 'None'
      })
      .returning()
      .execute();

    const patient = patientResult[0];

    // Create medicine
    const medicineResult = await db.insert(medicinesTable)
      .values({
        name: 'Aspirin',
        category: 'Pain Relief',
        description: 'Pain reliever',
        unit: 'tablet',
        price: '5.99',
        stock_quantity: 100,
        minimum_stock: 10,
        expiry_date: '2025-12-31',
        supplier: 'PharmaCorp'
      })
      .returning()
      .execute();

    const medicine = medicineResult[0];

    // Create transaction
    const transactionResult = await db.insert(transactionsTable)
      .values({
        transaction_code: 'TXN001',
        patient_id: patient.id,
        total_amount: '29.95',
        payment_status: 'paid',
        notes: 'Regular checkup prescription'
      })
      .returning()
      .execute();

    const transaction = transactionResult[0];

    // Create transaction item
    await db.insert(transactionItemsTable)
      .values({
        transaction_id: transaction.id,
        medicine_id: medicine.id,
        quantity: 5,
        unit_price: '5.99',
        subtotal: '29.95'
      })
      .execute();

    const input: GetTransactionByIdInput = {
      id: transaction.id
    };

    const result = await getTransactionById(input);

    expect(result).not.toBeNull();
    expect(result?.id).toEqual(transaction.id);
    expect(result?.transaction_code).toEqual('TXN001');
    expect(result?.patient_id).toEqual(patient.id);
    expect(result?.total_amount).toEqual(29.95);
    expect(typeof result?.total_amount).toEqual('number');
    expect(result?.payment_status).toEqual('paid');
    expect(result?.notes).toEqual('Regular checkup prescription');
    expect(result?.transaction_date).toBeInstanceOf(Date);
    expect(result?.created_at).toBeInstanceOf(Date);
    expect(result?.updated_at).toBeInstanceOf(Date);
  });

  it('should handle transaction with null notes', async () => {
    // Create patient
    const patientResult = await db.insert(patientsTable)
      .values({
        patient_code: 'PAT002',
        name: 'Jane Smith',
        date_of_birth: '1985-05-20',
        gender: 'female'
      })
      .returning()
      .execute();

    const patient = patientResult[0];

    // Create transaction with null notes
    const transactionResult = await db.insert(transactionsTable)
      .values({
        transaction_code: 'TXN002',
        patient_id: patient.id,
        total_amount: '15.50',
        payment_status: 'pending',
        notes: null
      })
      .returning()
      .execute();

    const transaction = transactionResult[0];

    const input: GetTransactionByIdInput = {
      id: transaction.id
    };

    const result = await getTransactionById(input);

    expect(result).not.toBeNull();
    expect(result?.notes).toBeNull();
    expect(result?.payment_status).toEqual('pending');
    expect(result?.total_amount).toEqual(15.50);
  });

  it('should handle different payment statuses', async () => {
    // Create patient
    const patientResult = await db.insert(patientsTable)
      .values({
        patient_code: 'PAT003',
        name: 'Bob Wilson',
        date_of_birth: '1975-10-30',
        gender: 'male'
      })
      .returning()
      .execute();

    const patient = patientResult[0];

    // Create cancelled transaction
    const transactionResult = await db.insert(transactionsTable)
      .values({
        transaction_code: 'TXN003',
        patient_id: patient.id,
        total_amount: '0.00',
        payment_status: 'cancelled',
        notes: 'Transaction cancelled by patient'
      })
      .returning()
      .execute();

    const transaction = transactionResult[0];

    const input: GetTransactionByIdInput = {
      id: transaction.id
    };

    const result = await getTransactionById(input);

    expect(result).not.toBeNull();
    expect(result?.payment_status).toEqual('cancelled');
    expect(result?.total_amount).toEqual(0);
  });
});
