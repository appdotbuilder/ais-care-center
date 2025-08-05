import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { medicinesTable, medicineUsageTable } from '../db/schema';
import { getMedicineUsage } from '../handlers/get_medicine_usage';

describe('getMedicineUsage', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no usage records exist', async () => {
    const result = await getMedicineUsage();
    expect(result).toEqual([]);
  });

  it('should return medicine usage records with medicine names', async () => {
    // Create test medicines
    const medicine1Result = await db.insert(medicinesTable)
      .values({
        name: 'Medicine A',
        category: 'Tablet',
        description: 'Test medicine A',
        unit: 'tablet',
        price: '10.00',
        stock_quantity: 100,
        minimum_stock: 10,
        expiry_date: '2025-12-31',
        supplier: 'Supplier A'
      })
      .returning()
      .execute();

    const medicine2Result = await db.insert(medicinesTable)
      .values({
        name: 'Medicine B',
        category: 'Capsule',
        description: 'Test medicine B',
        unit: 'capsule',
        price: '15.00',
        stock_quantity: 50,
        minimum_stock: 5,
        expiry_date: '2025-06-30',
        supplier: 'Supplier B'
      })
      .returning()
      .execute();

    const medicine1 = medicine1Result[0];
    const medicine2 = medicine2Result[0];

    // Create usage records
    const usage1Date = new Date('2024-01-15T10:00:00Z');
    const usage2Date = new Date('2024-01-16T14:30:00Z');

    await db.insert(medicineUsageTable)
      .values([
        {
          medicine_id: medicine1.id,
          quantity_used: 20,
          usage_date: usage1Date,
          notes: 'Patient treatment A'
        },
        {
          medicine_id: medicine2.id,
          quantity_used: 15,
          usage_date: usage2Date,
          notes: 'Patient treatment B'
        }
      ])
      .execute();

    const result = await getMedicineUsage();

    expect(result).toHaveLength(2);
    
    // Results should be ordered by most recent usage date (desc)
    expect(result[0].medicine_id).toEqual(medicine2.id);
    expect(result[0].medicine_name).toEqual('Medicine B');
    expect(result[0].quantity_used).toEqual(15);
    expect(result[0].notes).toEqual('Patient treatment B');
    expect(result[0].usage_date).toBeInstanceOf(Date);
    expect(result[0].created_at).toBeInstanceOf(Date);

    expect(result[1].medicine_id).toEqual(medicine1.id);
    expect(result[1].medicine_name).toEqual('Medicine A');
    expect(result[1].quantity_used).toEqual(20);
    expect(result[1].notes).toEqual('Patient treatment A');
    expect(result[1].usage_date).toBeInstanceOf(Date);
    expect(result[1].created_at).toBeInstanceOf(Date);
  });

  it('should handle null notes correctly', async () => {
    // Create test medicine
    const medicineResult = await db.insert(medicinesTable)
      .values({
        name: 'Medicine C',
        category: 'Syrup',
        description: 'Test medicine C',
        unit: 'bottle',
        price: '25.00',
        stock_quantity: 30,
        minimum_stock: 3,
        expiry_date: '2025-09-30',
        supplier: 'Supplier C'
      })
      .returning()
      .execute();

    const medicine = medicineResult[0];

    // Create usage record with null notes
    await db.insert(medicineUsageTable)
      .values({
        medicine_id: medicine.id,
        quantity_used: 5,
        usage_date: new Date(),
        notes: null
      })
      .execute();

    const result = await getMedicineUsage();

    expect(result).toHaveLength(1);
    expect(result[0].medicine_name).toEqual('Medicine C');
    expect(result[0].quantity_used).toEqual(5);
    expect(result[0].notes).toBeNull();
  });

  it('should return multiple usage records for same medicine', async () => {
    // Create test medicine
    const medicineResult = await db.insert(medicinesTable)
      .values({
        name: 'Multi Usage Medicine',
        category: 'Injection',
        description: 'Medicine with multiple usage records',
        unit: 'vial',
        price: '50.00',
        stock_quantity: 100,
        minimum_stock: 10,
        expiry_date: '2025-12-31',
        supplier: 'Supplier D'
      })
      .returning()
      .execute();

    const medicine = medicineResult[0];

    // Create multiple usage records for same medicine
    const usageDate1 = new Date('2024-01-10T09:00:00Z');
    const usageDate2 = new Date('2024-01-11T15:30:00Z');
    const usageDate3 = new Date('2024-01-12T11:15:00Z');

    await db.insert(medicineUsageTable)
      .values([
        {
          medicine_id: medicine.id,
          quantity_used: 10,
          usage_date: usageDate1,
          notes: 'First usage'
        },
        {
          medicine_id: medicine.id,
          quantity_used: 5,
          usage_date: usageDate2,
          notes: 'Second usage'
        },
        {
          medicine_id: medicine.id,
          quantity_used: 8,
          usage_date: usageDate3,
          notes: 'Third usage'
        }
      ])
      .execute();

    const result = await getMedicineUsage();

    expect(result).toHaveLength(3);
    
    // All should have same medicine name
    result.forEach(usage => {
      expect(usage.medicine_name).toEqual('Multi Usage Medicine');
      expect(usage.medicine_id).toEqual(medicine.id);
    });

    // Should be ordered by usage date descending (most recent first)
    expect(result[0].notes).toEqual('Third usage');
    expect(result[1].notes).toEqual('Second usage');
    expect(result[2].notes).toEqual('First usage');
  });
});