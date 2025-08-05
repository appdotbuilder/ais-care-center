
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { medicinesTable } from '../db/schema';
import { type GetMedicineByIdInput, type CreateMedicineInput } from '../schema';
import { getMedicineById } from '../handlers/get_medicine_by_id';

// Test medicine data
const testMedicine: CreateMedicineInput = {
  name: 'Test Medicine',
  category: 'Tablet',
  description: 'A test medicine',
  unit: 'tablet',
  price: 15.50,
  stock_quantity: 100,
  minimum_stock: 10,
  expiry_date: new Date('2025-12-31'),
  supplier: 'Test Supplier'
};

describe('getMedicineById', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return medicine when found', async () => {
    // Create test medicine
    const insertResult = await db.insert(medicinesTable)
      .values({
        name: testMedicine.name,
        category: testMedicine.category,
        description: testMedicine.description,
        unit: testMedicine.unit,
        price: testMedicine.price.toString(),
        stock_quantity: testMedicine.stock_quantity,
        minimum_stock: testMedicine.minimum_stock,
        expiry_date: testMedicine.expiry_date.toISOString().split('T')[0], // Convert Date to string
        supplier: testMedicine.supplier
      })
      .returning()
      .execute();

    const createdMedicine = insertResult[0];
    
    const input: GetMedicineByIdInput = { id: createdMedicine.id };
    const result = await getMedicineById(input);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(createdMedicine.id);
    expect(result!.name).toEqual('Test Medicine');
    expect(result!.category).toEqual('Tablet');
    expect(result!.description).toEqual('A test medicine');
    expect(result!.unit).toEqual('tablet');
    expect(result!.price).toEqual(15.50);
    expect(typeof result!.price).toEqual('number');
    expect(result!.stock_quantity).toEqual(100);
    expect(result!.minimum_stock).toEqual(10);
    expect(result!.expiry_date).toBeInstanceOf(Date);
    expect(result!.supplier).toEqual('Test Supplier');
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should return null when medicine not found', async () => {
    const input: GetMedicineByIdInput = { id: 999 };
    const result = await getMedicineById(input);

    expect(result).toBeNull();
  });

  it('should handle medicine with null fields', async () => {
    // Create medicine with null optional fields
    const insertResult = await db.insert(medicinesTable)
      .values({
        name: 'Medicine Without Details',
        category: 'Capsule',
        description: null,
        unit: 'capsule',
        price: '25.00',
        stock_quantity: 50,
        minimum_stock: 5,
        expiry_date: '2024-06-30',
        supplier: null
      })
      .returning()
      .execute();

    const createdMedicine = insertResult[0];
    
    const input: GetMedicineByIdInput = { id: createdMedicine.id };
    const result = await getMedicineById(input);

    expect(result).not.toBeNull();
    expect(result!.name).toEqual('Medicine Without Details');
    expect(result!.description).toBeNull();
    expect(result!.supplier).toBeNull();
    expect(result!.price).toEqual(25.00);
    expect(typeof result!.price).toEqual('number');
  });

  it('should handle different medicine categories', async () => {
    // Create multiple medicines with different categories
    const medicines = [
      { ...testMedicine, name: 'Medicine A', category: 'Tablet' },
      { ...testMedicine, name: 'Medicine B', category: 'Syrup' },
      { ...testMedicine, name: 'Medicine C', category: 'Injection' }
    ];

    const insertedIds = [];
    for (const medicine of medicines) {
      const result = await db.insert(medicinesTable)
        .values({
          name: medicine.name,
          category: medicine.category,
          description: medicine.description,
          unit: medicine.unit,
          price: medicine.price.toString(),
          stock_quantity: medicine.stock_quantity,
          minimum_stock: medicine.minimum_stock,
          expiry_date: medicine.expiry_date.toISOString().split('T')[0], // Convert Date to string
          supplier: medicine.supplier
        })
        .returning()
        .execute();
      insertedIds.push(result[0].id);
    }

    // Test retrieving each medicine
    for (let i = 0; i < insertedIds.length; i++) {
      const input: GetMedicineByIdInput = { id: insertedIds[i] };
      const result = await getMedicineById(input);

      expect(result).not.toBeNull();
      expect(result!.name).toEqual(medicines[i].name);
      expect(result!.category).toEqual(medicines[i].category);
      expect(result!.price).toEqual(medicines[i].price);
    }
  });
});
