
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { medicinesTable } from '../db/schema';
import { type CreateMedicineInput, type UpdateMedicineInput } from '../schema';
import { updateMedicine } from '../handlers/update_medicine';
import { eq } from 'drizzle-orm';

// Test medicine data
const testMedicine: CreateMedicineInput = {
  name: 'Test Medicine',
  category: 'Pain Relief',
  description: 'A medicine for testing',
  unit: 'tablet',
  price: 10.50,
  stock_quantity: 100,
  minimum_stock: 10,
  expiry_date: new Date('2025-12-31'),
  supplier: 'Test Supplier'
};

// Helper function to create a medicine directly in the database
const createTestMedicine = async (input: CreateMedicineInput) => {
  const result = await db.insert(medicinesTable)
    .values({
      name: input.name,
      category: input.category,
      description: input.description,
      unit: input.unit,
      price: input.price.toString(),
      stock_quantity: input.stock_quantity,
      minimum_stock: input.minimum_stock,
      expiry_date: input.expiry_date.toISOString().split('T')[0], // Convert Date to string format
      supplier: input.supplier
    })
    .returning()
    .execute();

  const medicine = result[0];
  return {
    ...medicine,
    price: parseFloat(medicine.price),
    expiry_date: new Date(medicine.expiry_date)
  };
};

describe('updateMedicine', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update medicine name and price', async () => {
    // Create a medicine first
    const created = await createTestMedicine(testMedicine);

    const updateInput: UpdateMedicineInput = {
      id: created.id,
      name: 'Updated Medicine Name',
      price: 15.75
    };

    const result = await updateMedicine(updateInput);

    // Verify updated fields
    expect(result.name).toEqual('Updated Medicine Name');
    expect(result.price).toEqual(15.75);
    expect(typeof result.price).toBe('number');
    
    // Verify unchanged fields
    expect(result.category).toEqual('Pain Relief');
    expect(result.description).toEqual('A medicine for testing');
    expect(result.unit).toEqual('tablet');
    expect(result.stock_quantity).toEqual(100);
    expect(result.minimum_stock).toEqual(10);
    expect(result.supplier).toEqual('Test Supplier');
    
    // Verify timestamps
    expect(result.id).toEqual(created.id);
    expect(result.created_at).toEqual(created.created_at);
    expect(result.updated_at).not.toEqual(created.updated_at);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update stock quantities', async () => {
    const created = await createTestMedicine(testMedicine);

    const updateInput: UpdateMedicineInput = {
      id: created.id,
      stock_quantity: 50,
      minimum_stock: 5
    };

    const result = await updateMedicine(updateInput);

    expect(result.stock_quantity).toEqual(50);
    expect(result.minimum_stock).toEqual(5);
    expect(result.name).toEqual('Test Medicine'); // Unchanged
  });

  it('should update expiry date and supplier', async () => {
    const created = await createTestMedicine(testMedicine);
    const newExpiryDate = new Date('2026-06-30');

    const updateInput: UpdateMedicineInput = {
      id: created.id,
      expiry_date: newExpiryDate,
      supplier: 'New Supplier'
    };

    const result = await updateMedicine(updateInput);

    expect(result.expiry_date).toEqual(newExpiryDate);
    expect(result.supplier).toEqual('New Supplier');
  });

  it('should update nullable fields to null', async () => {
    const created = await createTestMedicine(testMedicine);

    const updateInput: UpdateMedicineInput = {
      id: created.id,
      description: null,
      supplier: null
    };

    const result = await updateMedicine(updateInput);

    expect(result.description).toBeNull();
    expect(result.supplier).toBeNull();
    expect(result.name).toEqual('Test Medicine'); // Unchanged
  });

  it('should save changes to database', async () => {
    const created = await createTestMedicine(testMedicine);

    const updateInput: UpdateMedicineInput = {
      id: created.id,
      name: 'Database Updated Name',
      price: 25.99
    };

    await updateMedicine(updateInput);

    // Query database directly to verify changes were saved
    const medicines = await db.select()
      .from(medicinesTable)
      .where(eq(medicinesTable.id, created.id))
      .execute();

    expect(medicines).toHaveLength(1);
    expect(medicines[0].name).toEqual('Database Updated Name');
    expect(parseFloat(medicines[0].price)).toEqual(25.99);
    expect(medicines[0].updated_at).not.toEqual(created.updated_at);
  });

  it('should throw error for non-existent medicine', async () => {
    const updateInput: UpdateMedicineInput = {
      id: 999,
      name: 'Non-existent Medicine'
    };

    await expect(updateMedicine(updateInput)).rejects.toThrow(/Medicine with id 999 not found/i);
  });

  it('should update all fields at once', async () => {
    const created = await createTestMedicine(testMedicine);
    const newExpiryDate = new Date('2027-03-15');

    const updateInput: UpdateMedicineInput = {
      id: created.id,
      name: 'Completely Updated Medicine',
      category: 'Antibiotics',
      description: 'Updated description',
      unit: 'bottle',
      price: 99.99,
      stock_quantity: 200,
      minimum_stock: 20,
      expiry_date: newExpiryDate,
      supplier: 'Updated Supplier'
    };

    const result = await updateMedicine(updateInput);

    expect(result.name).toEqual('Completely Updated Medicine');
    expect(result.category).toEqual('Antibiotics');
    expect(result.description).toEqual('Updated description');
    expect(result.unit).toEqual('bottle');
    expect(result.price).toEqual(99.99);
    expect(result.stock_quantity).toEqual(200);
    expect(result.minimum_stock).toEqual(20);
    expect(result.expiry_date).toEqual(newExpiryDate);
    expect(result.supplier).toEqual('Updated Supplier');
    expect(result.updated_at).not.toEqual(created.updated_at);
  });
});
