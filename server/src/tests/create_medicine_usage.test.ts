import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { medicinesTable, medicineUsageTable } from '../db/schema';
import { type CreateMedicineUsageInput } from '../schema';
import { createMedicineUsage } from '../handlers/create_medicine_usage';
import { eq } from 'drizzle-orm';

describe('createMedicineUsage', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a medicine usage record and update stock', async () => {
    // Create test medicine first
    const medicineResult = await db.insert(medicinesTable)
      .values({
        name: 'Test Medicine',
        category: 'Tablet',
        description: 'A test medicine',
        unit: 'tablet',
        price: '10.00',
        stock_quantity: 100,
        minimum_stock: 10,
        expiry_date: '2025-12-31',
        supplier: 'Test Supplier'
      })
      .returning()
      .execute();

    const medicine = medicineResult[0];

    const testInput: CreateMedicineUsageInput = {
      medicine_id: medicine.id,
      quantity_used: 25,
      notes: 'Test usage for patient treatment'
    };

    const result = await createMedicineUsage(testInput);

    // Verify usage record
    expect(result.medicine_id).toEqual(medicine.id);
    expect(result.quantity_used).toEqual(25);
    expect(result.notes).toEqual('Test usage for patient treatment');
    expect(result.id).toBeDefined();
    expect(result.usage_date).toBeInstanceOf(Date);
    expect(result.created_at).toBeInstanceOf(Date);

    // Verify stock was decremented
    const updatedMedicine = await db.select()
      .from(medicinesTable)
      .where(eq(medicinesTable.id, medicine.id))
      .execute();

    expect(updatedMedicine[0].stock_quantity).toEqual(75); // 100 - 25
  });

  it('should save usage record to database', async () => {
    // Create test medicine first
    const medicineResult = await db.insert(medicinesTable)
      .values({
        name: 'Test Medicine 2',
        category: 'Capsule',
        description: 'Another test medicine',
        unit: 'capsule',
        price: '15.00',
        stock_quantity: 50,
        minimum_stock: 5,
        expiry_date: '2025-06-30',
        supplier: 'Test Supplier 2'
      })
      .returning()
      .execute();

    const medicine = medicineResult[0];

    const testInput: CreateMedicineUsageInput = {
      medicine_id: medicine.id,
      quantity_used: 10,
      notes: null
    };

    const result = await createMedicineUsage(testInput);

    // Verify record exists in database
    const usageRecords = await db.select()
      .from(medicineUsageTable)
      .where(eq(medicineUsageTable.id, result.id))
      .execute();

    expect(usageRecords).toHaveLength(1);
    expect(usageRecords[0].medicine_id).toEqual(medicine.id);
    expect(usageRecords[0].quantity_used).toEqual(10);
    expect(usageRecords[0].notes).toBeNull();
    expect(usageRecords[0].usage_date).toBeInstanceOf(Date);
  });

  it('should throw error for non-existent medicine', async () => {
    const testInput: CreateMedicineUsageInput = {
      medicine_id: 99999, // Non-existent ID
      quantity_used: 10,
      notes: 'This should fail'
    };

    expect(createMedicineUsage(testInput)).rejects.toThrow(/Medicine with ID 99999 not found/i);
  });

  it('should throw error for insufficient stock', async () => {
    // Create test medicine with low stock
    const medicineResult = await db.insert(medicinesTable)
      .values({
        name: 'Low Stock Medicine',
        category: 'Tablet',
        description: 'Medicine with low stock',
        unit: 'tablet',
        price: '5.00',
        stock_quantity: 5, // Low stock
        minimum_stock: 2,
        expiry_date: '2025-03-31',
        supplier: 'Test Supplier'
      })
      .returning()
      .execute();

    const medicine = medicineResult[0];

    const testInput: CreateMedicineUsageInput = {
      medicine_id: medicine.id,
      quantity_used: 10, // More than available stock
      notes: 'This should fail due to insufficient stock'
    };

    expect(createMedicineUsage(testInput)).rejects.toThrow(/Insufficient stock/i);
  });

  it('should handle exact stock usage', async () => {
    // Create test medicine
    const medicineResult = await db.insert(medicinesTable)
      .values({
        name: 'Exact Stock Medicine',
        category: 'Syrup',
        description: 'Medicine for exact stock test',
        unit: 'bottle',
        price: '20.00',
        stock_quantity: 30,
        minimum_stock: 5,
        expiry_date: '2025-09-15',
        supplier: 'Test Supplier'
      })
      .returning()
      .execute();

    const medicine = medicineResult[0];

    const testInput: CreateMedicineUsageInput = {
      medicine_id: medicine.id,
      quantity_used: 30, // Use all available stock
      notes: 'Using all available stock'
    };

    const result = await createMedicineUsage(testInput);

    expect(result.quantity_used).toEqual(30);

    // Verify stock is now zero
    const updatedMedicine = await db.select()
      .from(medicinesTable)
      .where(eq(medicinesTable.id, medicine.id))
      .execute();

    expect(updatedMedicine[0].stock_quantity).toEqual(0);
  });
});