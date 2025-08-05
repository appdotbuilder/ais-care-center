
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { medicinesTable } from '../db/schema';
import { type CreateMedicineInput } from '../schema';
import { getMedicines } from '../handlers/get_medicines';

const testMedicine1: CreateMedicineInput = {
  name: 'Paracetamol',
  category: 'Pain Relief',
  description: 'Over-the-counter pain reliever',
  unit: 'tablet',
  price: 9.99,
  stock_quantity: 100,
  minimum_stock: 20,
  expiry_date: new Date('2025-12-31'),
  supplier: 'PharmaCorp'
};

const testMedicine2: CreateMedicineInput = {
  name: 'Ibuprofen',
  category: 'Pain Relief',
  description: 'Anti-inflammatory medication',
  unit: 'tablet',
  price: 12.50,
  stock_quantity: 50,
  minimum_stock: 10,
  expiry_date: new Date('2024-06-30'),
  supplier: 'MediSupply'
};

describe('getMedicines', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no medicines exist', async () => {
    const result = await getMedicines();
    expect(result).toEqual([]);
  });

  it('should return all medicines', async () => {
    // Create test medicines
    await db.insert(medicinesTable)
      .values([
        {
          ...testMedicine1,
          price: testMedicine1.price.toString(),
          expiry_date: testMedicine1.expiry_date.toISOString().split('T')[0]
        },
        {
          ...testMedicine2,
          price: testMedicine2.price.toString(),
          expiry_date: testMedicine2.expiry_date.toISOString().split('T')[0]
        }
      ])
      .execute();

    const result = await getMedicines();

    expect(result).toHaveLength(2);
    
    // Check first medicine
    const medicine1 = result.find(m => m.name === 'Paracetamol');
    expect(medicine1).toBeDefined();
    expect(medicine1!.name).toEqual('Paracetamol');
    expect(medicine1!.category).toEqual('Pain Relief');
    expect(medicine1!.description).toEqual('Over-the-counter pain reliever');
    expect(medicine1!.unit).toEqual('tablet');
    expect(medicine1!.price).toEqual(9.99);
    expect(typeof medicine1!.price).toBe('number');
    expect(medicine1!.stock_quantity).toEqual(100);
    expect(medicine1!.minimum_stock).toEqual(20);
    expect(medicine1!.supplier).toEqual('PharmaCorp');
    expect(medicine1!.id).toBeDefined();
    expect(medicine1!.created_at).toBeInstanceOf(Date);
    expect(medicine1!.updated_at).toBeInstanceOf(Date);
    expect(medicine1!.expiry_date).toBeInstanceOf(Date);

    // Check second medicine
    const medicine2 = result.find(m => m.name === 'Ibuprofen');
    expect(medicine2).toBeDefined();
    expect(medicine2!.name).toEqual('Ibuprofen');
    expect(medicine2!.category).toEqual('Pain Relief');
    expect(medicine2!.price).toEqual(12.50);
    expect(typeof medicine2!.price).toBe('number');
    expect(medicine2!.stock_quantity).toEqual(50);
    expect(medicine2!.supplier).toEqual('MediSupply');
    expect(medicine2!.expiry_date).toBeInstanceOf(Date);
  });

  it('should handle medicines with null values correctly', async () => {
    const medicineWithNulls: CreateMedicineInput = {
      name: 'Generic Medicine',
      category: 'General',
      description: null,
      unit: 'bottle',
      price: 5.00,
      stock_quantity: 25,
      minimum_stock: 5,
      expiry_date: new Date('2024-12-31'),
      supplier: null
    };

    await db.insert(medicinesTable)
      .values({
        ...medicineWithNulls,
        price: medicineWithNulls.price.toString(),
        expiry_date: medicineWithNulls.expiry_date.toISOString().split('T')[0]
      })
      .execute();

    const result = await getMedicines();

    expect(result).toHaveLength(1);
    expect(result[0].name).toEqual('Generic Medicine');
    expect(result[0].description).toBeNull();
    expect(result[0].supplier).toBeNull();
    expect(result[0].price).toEqual(5.00);
    expect(typeof result[0].price).toBe('number');
    expect(result[0].expiry_date).toBeInstanceOf(Date);
  });

  it('should preserve correct data types for all fields', async () => {
    await db.insert(medicinesTable)
      .values({
        ...testMedicine1,
        price: testMedicine1.price.toString(),
        expiry_date: testMedicine1.expiry_date.toISOString().split('T')[0]
      })
      .execute();

    const result = await getMedicines();
    const medicine = result[0];

    // Verify all field types
    expect(typeof medicine.id).toBe('number');
    expect(typeof medicine.name).toBe('string');
    expect(typeof medicine.category).toBe('string');
    expect(typeof medicine.unit).toBe('string');
    expect(typeof medicine.price).toBe('number');
    expect(typeof medicine.stock_quantity).toBe('number');
    expect(typeof medicine.minimum_stock).toBe('number');
    expect(medicine.expiry_date).toBeInstanceOf(Date);
    expect(medicine.created_at).toBeInstanceOf(Date);
    expect(medicine.updated_at).toBeInstanceOf(Date);
  });
});
