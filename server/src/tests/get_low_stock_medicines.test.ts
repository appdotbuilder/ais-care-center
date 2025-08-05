
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { medicinesTable } from '../db/schema';
import { type CreateMedicineInput, type GetLowStockMedicinesInput } from '../schema';
import { getLowStockMedicines } from '../handlers/get_low_stock_medicines';

// Helper function to create test medicine
const createTestMedicine = async (overrides: Partial<CreateMedicineInput> = {}) => {
  const defaultMedicine: CreateMedicineInput = {
    name: 'Test Medicine',
    category: 'Pain Relief',
    description: 'Test description',
    unit: 'tablet',
    price: 10.99,
    stock_quantity: 50,
    minimum_stock: 20,
    expiry_date: new Date('2025-12-31'),
    supplier: 'Test Supplier'
  };

  const medicineData = { ...defaultMedicine, ...overrides };
  
  const result = await db.insert(medicinesTable)
    .values({
      ...medicineData,
      price: medicineData.price.toString(),
      expiry_date: medicineData.expiry_date.toISOString().split('T')[0]
    })
    .returning()
    .execute();

  return result[0];
};

describe('getLowStockMedicines', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return medicines with stock below specified threshold', async () => {
    // Create medicines with different stock levels
    await createTestMedicine({ name: 'Medicine A', stock_quantity: 5, minimum_stock: 10 });
    await createTestMedicine({ name: 'Medicine B', stock_quantity: 15, minimum_stock: 10 });
    await createTestMedicine({ name: 'Medicine C', stock_quantity: 3, minimum_stock: 20 });

    const input: GetLowStockMedicinesInput = { threshold: 10 };
    const result = await getLowStockMedicines(input);

    expect(result).toHaveLength(2);
    expect(result.map(m => m.name).sort()).toEqual(['Medicine A', 'Medicine C']);
    
    // Verify numeric conversion
    result.forEach(medicine => {
      expect(typeof medicine.price).toBe('number');
      expect(medicine.stock_quantity).toBeLessThanOrEqual(10);
    });
  });

  it('should return medicines where stock is below minimum stock when no threshold provided', async () => {
    // Create medicines with stock below their minimum
    await createTestMedicine({ 
      name: 'Low Stock Medicine', 
      stock_quantity: 5, 
      minimum_stock: 10 
    });
    
    // Create medicine with adequate stock
    await createTestMedicine({ 
      name: 'Adequate Stock Medicine', 
      stock_quantity: 25, 
      minimum_stock: 10 
    });
    
    // Create medicine where stock equals minimum (should be included)
    await createTestMedicine({ 
      name: 'Equal Stock Medicine', 
      stock_quantity: 15, 
      minimum_stock: 15 
    });

    const input: GetLowStockMedicinesInput = {};
    const result = await getLowStockMedicines(input);

    expect(result).toHaveLength(2);
    expect(result.map(m => m.name).sort()).toEqual(['Equal Stock Medicine', 'Low Stock Medicine']);
    
    // Verify all returned medicines have stock <= minimum_stock
    result.forEach(medicine => {
      expect(medicine.stock_quantity).toBeLessThanOrEqual(medicine.minimum_stock);
    });
  });

  it('should return empty array when no medicines are low stock', async () => {
    await createTestMedicine({ 
      name: 'Well Stocked Medicine', 
      stock_quantity: 100, 
      minimum_stock: 20 
    });

    const input: GetLowStockMedicinesInput = { threshold: 10 };
    const result = await getLowStockMedicines(input);

    expect(result).toHaveLength(0);
  });

  it('should handle zero threshold correctly', async () => {
    await createTestMedicine({ name: 'Out of Stock', stock_quantity: 0, minimum_stock: 10 });
    await createTestMedicine({ name: 'Has Stock', stock_quantity: 5, minimum_stock: 10 });

    const input: GetLowStockMedicinesInput = { threshold: 0 };
    const result = await getLowStockMedicines(input);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Out of Stock');
    expect(result[0].stock_quantity).toBe(0);
  });

  it('should return all medicines when threshold is very high', async () => {
    await createTestMedicine({ name: 'Medicine 1', stock_quantity: 50, minimum_stock: 20 });
    await createTestMedicine({ name: 'Medicine 2', stock_quantity: 100, minimum_stock: 30 });

    const input: GetLowStockMedicinesInput = { threshold: 200 };
    const result = await getLowStockMedicines(input);

    expect(result).toHaveLength(2);
    expect(result.map(m => m.name).sort()).toEqual(['Medicine 1', 'Medicine 2']);
  });

  it('should preserve all medicine properties with correct types', async () => {
    const testDate = new Date('2025-06-15');
    await createTestMedicine({ 
      name: 'Complete Medicine',
      category: 'Antibiotics',
      description: 'Full description',
      unit: 'capsule',
      price: 25.50,
      stock_quantity: 5,
      minimum_stock: 20,
      expiry_date: testDate,
      supplier: 'Big Pharma Corp'
    });

    const input: GetLowStockMedicinesInput = { threshold: 10 };
    const result = await getLowStockMedicines(input);

    expect(result).toHaveLength(1);
    const medicine = result[0];
    
    expect(medicine.name).toBe('Complete Medicine');
    expect(medicine.category).toBe('Antibiotics');
    expect(medicine.description).toBe('Full description');
    expect(medicine.unit).toBe('capsule');
    expect(medicine.price).toBe(25.50);
    expect(typeof medicine.price).toBe('number');
    expect(medicine.stock_quantity).toBe(5);
    expect(medicine.minimum_stock).toBe(20);
    expect(medicine.expiry_date).toBeInstanceOf(Date);
    expect(medicine.expiry_date.toISOString().split('T')[0]).toBe('2025-06-15');
    expect(medicine.supplier).toBe('Big Pharma Corp');
    expect(medicine.id).toBeDefined();
    expect(medicine.created_at).toBeInstanceOf(Date);
    expect(medicine.updated_at).toBeInstanceOf(Date);
  });
});
