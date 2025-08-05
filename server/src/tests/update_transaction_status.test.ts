
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { patientsTable, transactionsTable } from '../db/schema';
import { type UpdateTransactionStatusInput } from '../schema';
import { updateTransactionStatus } from '../handlers/update_transaction_status';
import { eq } from 'drizzle-orm';

describe('updateTransactionStatus', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update transaction payment status', async () => {
    // Create test patient
    const patientResult = await db.insert(patientsTable)
      .values({
        patient_code: 'P001',
        name: 'Test Patient',
        date_of_birth: '1990-01-01',
        gender: 'male'
      })
      .returning()
      .execute();

    // Create test transaction
    const transactionResult = await db.insert(transactionsTable)
      .values({
        transaction_code: 'TXN001',
        patient_id: patientResult[0].id,
        total_amount: '100.00',
        payment_status: 'pending'
      })
      .returning()
      .execute();

    const testInput: UpdateTransactionStatusInput = {
      id: transactionResult[0].id,
      payment_status: 'paid'
    };

    const result = await updateTransactionStatus(testInput);

    expect(result.id).toEqual(transactionResult[0].id);
    expect(result.payment_status).toEqual('paid');
    expect(result.total_amount).toEqual(100.00);
    expect(typeof result.total_amount).toBe('number');
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save updated status to database', async () => {
    // Create test patient
    const patientResult = await db.insert(patientsTable)
      .values({
        patient_code: 'P002',
        name: 'Another Patient',
        date_of_birth: '1985-05-15',
        gender: 'female'
      })
      .returning()
      .execute();

    // Create test transaction
    const transactionResult = await db.insert(transactionsTable)
      .values({
        transaction_code: 'TXN002',
        patient_id: patientResult[0].id,
        total_amount: '75.50',
        payment_status: 'pending'
      })
      .returning()
      .execute();

    const testInput: UpdateTransactionStatusInput = {
      id: transactionResult[0].id,
      payment_status: 'cancelled'
    };

    await updateTransactionStatus(testInput);

    // Query database to verify update
    const transactions = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.id, transactionResult[0].id))
      .execute();

    expect(transactions).toHaveLength(1);
    expect(transactions[0].payment_status).toEqual('cancelled');
    expect(transactions[0].updated_at).toBeInstanceOf(Date);
    expect(transactions[0].updated_at > transactionResult[0].created_at).toBe(true);
  });

  it('should throw error for non-existent transaction', async () => {
    const testInput: UpdateTransactionStatusInput = {
      id: 999999,
      payment_status: 'paid'
    };

    expect(updateTransactionStatus(testInput)).rejects.toThrow(/not found/i);
  });

  it('should update from pending to paid', async () => {
    // Create test patient
    const patientResult = await db.insert(patientsTable)
      .values({
        patient_code: 'P003',
        name: 'Payment Test Patient',
        date_of_birth: '1995-03-20',
        gender: 'male'
      })
      .returning()
      .execute();

    // Create test transaction
    const transactionResult = await db.insert(transactionsTable)
      .values({
        transaction_code: 'TXN003',
        patient_id: patientResult[0].id,
        total_amount: '200.75',
        payment_status: 'pending'
      })
      .returning()
      .execute();

    const testInput: UpdateTransactionStatusInput = {
      id: transactionResult[0].id,
      payment_status: 'paid'
    };

    const result = await updateTransactionStatus(testInput);

    expect(result.payment_status).toEqual('paid');
    expect(result.total_amount).toEqual(200.75);
    expect(typeof result.total_amount).toBe('number');
  });
});
