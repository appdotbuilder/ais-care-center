
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { medicinesTable, patientsTable, transactionsTable, transactionItemsTable } from '../db/schema';
import { generateReceipt } from '../handlers/generate_receipt';
import { type GetTransactionByIdInput } from '../schema';

describe('generateReceipt', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should generate a receipt for valid transaction', async () => {
    // Create test patient
    const patientResult = await db.insert(patientsTable)
      .values({
        patient_code: 'P001',
        name: 'John Doe',
        date_of_birth: '1990-01-01',
        gender: 'male'
      })
      .returning()
      .execute();

    const patient = patientResult[0];

    // Create test medicines
    const medicineResults = await db.insert(medicinesTable)
      .values([
        {
          name: 'Paracetamol',
          category: 'Pain Relief',
          unit: 'tablet',
          price: '5.50',
          stock_quantity: 100,
          minimum_stock: 10,
          expiry_date: '2025-12-31'
        },
        {
          name: 'Vitamin C',
          category: 'Supplements',
          unit: 'bottle',
          price: '12.99',
          stock_quantity: 50,
          minimum_stock: 5,
          expiry_date: '2024-06-30'
        }
      ])
      .returning()
      .execute();

    const medicines = medicineResults;

    // Create transaction
    const transactionResult = await db.insert(transactionsTable)
      .values({
        transaction_code: 'TXN001',
        patient_id: patient.id,
        total_amount: '31.48',
        payment_status: 'paid',
        notes: 'Regular prescription'
      })
      .returning()
      .execute();

    const transaction = transactionResult[0];

    // Create transaction items
    await db.insert(transactionItemsTable)
      .values([
        {
          transaction_id: transaction.id,
          medicine_id: medicines[0].id,
          quantity: 2,
          unit_price: '5.50',
          subtotal: '11.00'
        },
        {
          transaction_id: transaction.id,
          medicine_id: medicines[1].id,
          quantity: 1,
          unit_price: '12.99',
          subtotal: '12.99'
        }
      ])
      .execute();

    const input: GetTransactionByIdInput = {
      id: transaction.id
    };

    const result = await generateReceipt(input);

    // Verify receipt structure
    expect(result).not.toBeNull();
    expect(result!.transaction_id).toBe(transaction.id);
    expect(result!.transaction_code).toBe('TXN001');
    expect(result!.patient_name).toBe('John Doe');
    expect(result!.patient_code).toBe('P001');
    expect(result!.transaction_date).toBeInstanceOf(Date);
    expect(result!.total_amount).toBe(31.48);
    expect(result!.payment_status).toBe('paid');
    expect(result!.notes).toBe('Regular prescription');

    // Verify items array
    expect(result!.items).toHaveLength(2);
    
    const paracetamolItem = result!.items.find(item => item.medicine_name === 'Paracetamol');
    expect(paracetamolItem).toBeDefined();
    expect(paracetamolItem!.quantity).toBe(2);
    expect(paracetamolItem!.unit_price).toBe(5.50);
    expect(paracetamolItem!.subtotal).toBe(11.00);

    const vitaminItem = result!.items.find(item => item.medicine_name === 'Vitamin C');
    expect(vitaminItem).toBeDefined();
    expect(vitaminItem!.quantity).toBe(1);
    expect(vitaminItem!.unit_price).toBe(12.99);
    expect(vitaminItem!.subtotal).toBe(12.99);
  });

  it('should return null for non-existent transaction', async () => {
    const input: GetTransactionByIdInput = {
      id: 999
    };

    const result = await generateReceipt(input);

    expect(result).toBeNull();
  });

  it('should handle transaction with no items', async () => {
    // Create test patient
    const patientResult = await db.insert(patientsTable)
      .values({
        patient_code: 'P002',
        name: 'Jane Smith',
        date_of_birth: '1985-05-15',
        gender: 'female'
      })
      .returning()
      .execute();

    const patient = patientResult[0];

    // Create transaction without items
    const transactionResult = await db.insert(transactionsTable)
      .values({
        transaction_code: 'TXN002',
        patient_id: patient.id,
        total_amount: '0.00',
        payment_status: 'cancelled',
        notes: null
      })
      .returning()
      .execute();

    const transaction = transactionResult[0];

    const input: GetTransactionByIdInput = {
      id: transaction.id
    };

    const result = await generateReceipt(input);

    expect(result).not.toBeNull();
    expect(result!.transaction_id).toBe(transaction.id);
    expect(result!.transaction_code).toBe('TXN002');
    expect(result!.patient_name).toBe('Jane Smith');
    expect(result!.items).toHaveLength(0);
    expect(result!.total_amount).toBe(0.00);
    expect(result!.payment_status).toBe('cancelled');
    expect(result!.notes).toBeNull();
  });

  it('should handle numeric conversions correctly', async () => {
    // Create test patient
    const patientResult = await db.insert(patientsTable)
      .values({
        patient_code: 'P003',
        name: 'Test Patient',
        date_of_birth: '1980-01-01',
        gender: 'male'
      })
      .returning()
      .execute();

    const patient = patientResult[0];

    // Create medicine with decimal price
    const medicineResult = await db.insert(medicinesTable)
      .values({
        name: 'Test Medicine',
        category: 'Test',
        unit: 'capsule',
        price: '15.75',
        stock_quantity: 20,
        minimum_stock: 2,
        expiry_date: '2025-01-01'
      })
      .returning()
      .execute();

    const medicine = medicineResult[0];

    // Create transaction
    const transactionResult = await db.insert(transactionsTable)
      .values({
        transaction_code: 'TXN003',
        patient_id: patient.id,
        total_amount: '47.25',
        payment_status: 'pending'
      })
      .returning()
      .execute();

    const transaction = transactionResult[0];

    // Create transaction item
    await db.insert(transactionItemsTable)
      .values({
        transaction_id: transaction.id,
        medicine_id: medicine.id,
        quantity: 3,
        unit_price: '15.75',
        subtotal: '47.25'
      })
      .execute();

    const input: GetTransactionByIdInput = {
      id: transaction.id
    };

    const result = await generateReceipt(input);

    // Verify numeric types
    expect(typeof result!.total_amount).toBe('number');
    expect(result!.total_amount).toBe(47.25);
    expect(typeof result!.items[0].unit_price).toBe('number');
    expect(result!.items[0].unit_price).toBe(15.75);
    expect(typeof result!.items[0].subtotal).toBe('number');
    expect(result!.items[0].subtotal).toBe(47.25);
  });
});
