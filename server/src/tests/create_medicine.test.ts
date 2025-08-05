
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { medicinesTable } from '../db/schema';
import { type CreateMedicineInput } from '../schema';
import { createMedicine } from '../handlers/create_medicine';
import { eq, gte, lte, and } from 'drizzle-orm';

// Test input with all required fields
const testInput: CreateMedicineInput = {
  name: 'Aspirin',
  category: 'Pain Relief',
  description: 'Pain and fever reducer',
  unit: 'tablet',
  price: 15.99,
  stock_quantity: 200,
  minimum_stock: 50,
  expiry_date: new Date('2025-12-31'),
  supplier: 'PharmaCorp'
};

describe('createMedicine', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a medicine with all fields', async () => {
    const result = await createMedicine(testInput);

    // Basic field validation
    expect(result.name).toEqual('Aspirin');
    expect(result.category).toEqual('Pain Relief');
    expect(result.description).toEqual('Pain and fever reducer');
    expect(result.unit).toEqual('tablet');
    expect(result.price).toEqual(15.99);
    expect(typeof result.price).toBe('number');
    expect(result.stock_quantity).toEqual(200);
    expect(result.minimum_stock).toEqual(50);
    expect(result.expiry_date).toEqual(new Date('2025-12-31'));
    expect(result.supplier).toEqual('PharmaCorp');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save medicine to database correctly', async () => {
    const result = await createMedicine(testInput);

    // Query database to verify record was saved
    const medicines = await db.select()
      .from(medicinesTable)
      .where(eq(medicinesTable.id, result.id))
      .execute();

    expect(medicines).toHaveLength(1);
    expect(medicines[0].name).toEqual('Aspirin');
    expect(medicines[0].category).toEqual('Pain Relief');
    expect(medicines[0].description).toEqual('Pain and fever reducer');
    expect(medicines[0].unit).toEqual('tablet');
    expect(parseFloat(medicines[0].price)).toEqual(15.99);
    expect(medicines[0].stock_quantity).toEqual(200);
    expect(medicines[0].minimum_stock).toEqual(50);
    expect(medicines[0].expiry_date).toEqual('2025-12-31'); // Date stored as string in DB
    expect(medicines[0].supplier).toEqual('PharmaCorp');
    expect(medicines[0].created_at).toBeInstanceOf(Date);
    expect(medicines[0].updated_at).toBeInstanceOf(Date);
  });

  it('should create medicine with null optional fields', async () => {
    const inputWithNulls: CreateMedicineInput = {
      name: 'Generic Medicine',
      category: 'General',
      description: null,
      unit: 'box',
      price: 25.50,
      stock_quantity: 100,
      minimum_stock: 25,
      expiry_date: new Date('2024-06-30'),
      supplier: null
    };

    const result = await createMedicine(inputWithNulls);

    expect(result.name).toEqual('Generic Medicine');
    expect(result.description).toBeNull();
    expect(result.supplier).toBeNull();
    expect(result.price).toEqual(25.50);
    expect(typeof result.price).toBe('number');
  });

  it('should query medicines by expiry date range correctly', async () => {
    // Create test medicines with different expiry dates
    await createMedicine({
      ...testInput,
      name: 'Medicine A',
      expiry_date: new Date('2024-06-15')
    });

    await createMedicine({
      ...testInput,
      name: 'Medicine B', 
      expiry_date: new Date('2024-12-31')
    });

    // Query medicines expiring within date range - use string format for date columns
    const startDateStr = '2024-01-01';
    const endDateStr = '2024-12-31';

    const query = db.select()
      .from(medicinesTable)
      .where(
        and(
          gte(medicinesTable.expiry_date, startDateStr),
          lte(medicinesTable.expiry_date, endDateStr)
        )
      );

    const medicines = await query.execute();

    expect(medicines.length).toEqual(2);
    medicines.forEach(medicine => {
      // Compare date strings directly since expiry_date is stored as string
      expect(medicine.expiry_date >= startDateStr).toBe(true);
      expect(medicine.expiry_date <= endDateStr).toBe(true);
    });
  });

  it('should handle zero stock quantities', async () => {
    const zeroStockInput: CreateMedicineInput = {
      name: 'Out of Stock Medicine',
      category: 'Emergency',
      description: 'Currently out of stock',
      unit: 'vial',
      price: 45.00,
      stock_quantity: 0,
      minimum_stock: 10,
      expiry_date: new Date('2025-03-15'),
      supplier: 'EmergencySupplies Inc'
    };

    const result = await createMedicine(zeroStockInput);

    expect(result.stock_quantity).toEqual(0);
    expect(result.minimum_stock).toEqual(10);
    expect(result.price).toEqual(45.00);
  });
});
