
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { medicinesTable, patientsTable, transactionsTable, transactionItemsTable } from '../db/schema';
import { type GetMedicineByIdInput, type CreateMedicineInput, type CreatePatientInput } from '../schema';
import { deleteMedicine } from '../handlers/delete_medicine';
import { eq } from 'drizzle-orm';

const testMedicineInput: CreateMedicineInput = {
  name: 'Test Medicine',
  category: 'Antibiotics',
  description: 'A test medicine',
  unit: 'tablet',
  price: 25.50,
  stock_quantity: 100,
  minimum_stock: 10,
  expiry_date: new Date('2025-12-31'),
  supplier: 'Test Supplier'
};

const testPatientInput: CreatePatientInput = {
  name: 'Test Patient',
  date_of_birth: new Date('1990-01-01'),
  gender: 'male',
  phone: '1234567890',
  email: 'test@example.com',
  address: '123 Test St',
  emergency_contact: '0987654321',
  medical_history: 'No known issues',
  allergies: 'None'
};

describe('deleteMedicine', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete a medicine successfully', async () => {
    // Create a medicine first
    const medicineResult = await db.insert(medicinesTable)
      .values({
        ...testMedicineInput,
        price: testMedicineInput.price.toString(),
        expiry_date: testMedicineInput.expiry_date.toISOString().split('T')[0]
      })
      .returning()
      .execute();

    const medicineId = medicineResult[0].id;
    const input: GetMedicineByIdInput = { id: medicineId };

    // Delete the medicine
    const result = await deleteMedicine(input);

    expect(result.success).toBe(true);

    // Verify medicine is deleted from database
    const medicines = await db.select()
      .from(medicinesTable)
      .where(eq(medicinesTable.id, medicineId))
      .execute();

    expect(medicines).toHaveLength(0);
  });

  it('should throw error when medicine does not exist', async () => {
    const input: GetMedicineByIdInput = { id: 999 };

    await expect(deleteMedicine(input)).rejects.toThrow(/medicine not found/i);
  });

  it('should throw error when medicine is used in transactions', async () => {
    // Create a patient first
    const patientResult = await db.insert(patientsTable)
      .values({
        ...testPatientInput,
        patient_code: 'PAT001',
        date_of_birth: testPatientInput.date_of_birth.toISOString().split('T')[0]
      })
      .returning()
      .execute();

    const patientId = patientResult[0].id;

    // Create a medicine
    const medicineResult = await db.insert(medicinesTable)
      .values({
        ...testMedicineInput,
        price: testMedicineInput.price.toString(),
        expiry_date: testMedicineInput.expiry_date.toISOString().split('T')[0]
      })
      .returning()
      .execute();

    const medicineId = medicineResult[0].id;

    // Create a transaction
    const transactionResult = await db.insert(transactionsTable)
      .values({
        transaction_code: 'TXN001',
        patient_id: patientId,
        total_amount: '25.50',
        payment_status: 'pending',
        notes: 'Test transaction'
      })
      .returning()
      .execute();

    const transactionId = transactionResult[0].id;

    // Create a transaction item linking the medicine
    await db.insert(transactionItemsTable)
      .values({
        transaction_id: transactionId,
        medicine_id: medicineId,
        quantity: 2,
        unit_price: '25.50',
        subtotal: '51.00'
      })
      .execute();

    const input: GetMedicineByIdInput = { id: medicineId };

    // Attempt to delete medicine - should fail
    await expect(deleteMedicine(input)).rejects.toThrow(/cannot delete medicine.*used in existing transactions/i);

    // Verify medicine still exists in database
    const medicines = await db.select()
      .from(medicinesTable)
      .where(eq(medicinesTable.id, medicineId))
      .execute();

    expect(medicines).toHaveLength(1);
  });

  it('should verify medicine is completely removed from database', async () => {
    // Create multiple medicines
    const medicine1 = await db.insert(medicinesTable)
      .values({
        ...testMedicineInput,
        name: 'Medicine 1',
        price: testMedicineInput.price.toString(),
        expiry_date: testMedicineInput.expiry_date.toISOString().split('T')[0]
      })
      .returning()
      .execute();

    const medicine2 = await db.insert(medicinesTable)
      .values({
        ...testMedicineInput,
        name: 'Medicine 2',
        price: testMedicineInput.price.toString(),
        expiry_date: testMedicineInput.expiry_date.toISOString().split('T')[0]
      })
      .returning()
      .execute();

    const input: GetMedicineByIdInput = { id: medicine1[0].id };

    // Delete first medicine
    await deleteMedicine(input);

    // Verify only the deleted medicine is gone
    const allMedicines = await db.select()
      .from(medicinesTable)
      .execute();

    expect(allMedicines).toHaveLength(1);
    expect(allMedicines[0].name).toBe('Medicine 2');
    expect(allMedicines[0].id).toBe(medicine2[0].id);
  });
});
