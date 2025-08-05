
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { medicinesTable } from '../db/schema';
import { generateStockReport } from '../handlers/generate_stock_report';

describe('generateStockReport', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should generate empty report when no medicines exist', async () => {
    const report = await generateStockReport();
    expect(report).toEqual([]);
  });

  it('should generate report with stock status indicators', async () => {
    // Create test medicines with different stock levels
    const today = new Date();
    const futureDate = new Date(today);
    futureDate.setFullYear(today.getFullYear() + 1);

    await db.insert(medicinesTable).values([
      {
        name: 'Medicine A',
        category: 'Antibiotics',
        description: 'Test medicine A',
        unit: 'tablet',
        price: '10.50',
        stock_quantity: 100,
        minimum_stock: 20,
        expiry_date: futureDate.toISOString().split('T')[0],
        supplier: 'Supplier A'
      },
      {
        name: 'Medicine B',
        category: 'Painkillers',
        description: 'Test medicine B',
        unit: 'bottle',
        price: '25.00',
        stock_quantity: 15,
        minimum_stock: 20,
        expiry_date: futureDate.toISOString().split('T')[0],
        supplier: 'Supplier B'
      },
      {
        name: 'Medicine C',
        category: 'Vitamins',
        description: 'Test medicine C',
        unit: 'box',
        price: '8.75',
        stock_quantity: 0,
        minimum_stock: 10,
        expiry_date: futureDate.toISOString().split('T')[0],
        supplier: 'Supplier C'
      }
    ]).execute();

    const report = await generateStockReport();

    expect(report).toHaveLength(3);
    
    // Check sufficient stock medicine
    const medicineA = report.find(r => r.medicine_name === 'Medicine A');
    expect(medicineA).toBeDefined();
    expect(medicineA!.stock_status).toEqual('sufficient');
    expect(medicineA!.current_stock).toEqual(100);
    expect(medicineA!.minimum_stock).toEqual(20);

    // Check low stock medicine
    const medicineB = report.find(r => r.medicine_name === 'Medicine B');
    expect(medicineB).toBeDefined();
    expect(medicineB!.stock_status).toEqual('low');
    expect(medicineB!.current_stock).toEqual(15);

    // Check out of stock medicine
    const medicineC = report.find(r => r.medicine_name === 'Medicine C');
    expect(medicineC).toBeDefined();
    expect(medicineC!.stock_status).toEqual('out_of_stock');
    expect(medicineC!.current_stock).toEqual(0);
  });

  it('should calculate days to expiry correctly', async () => {
    const today = new Date();
    const nearExpiry = new Date(today);
    nearExpiry.setDate(today.getDate() + 30);

    await db.insert(medicinesTable).values({
      name: 'Expiring Medicine',
      category: 'Test',
      description: 'Medicine expiring soon',
      unit: 'tablet',
      price: '15.00',
      stock_quantity: 50,
      minimum_stock: 10,
      expiry_date: nearExpiry.toISOString().split('T')[0],
      supplier: 'Test Supplier'
    }).execute();

    const report = await generateStockReport();
    
    expect(report).toHaveLength(1);
    expect(report[0].days_to_expiry).toBeGreaterThan(0);
    expect(report[0].days_to_expiry).toBeLessThanOrEqual(31);
    expect(report[0].expiry_date).toBeInstanceOf(Date);
  });

  it('should include all required fields in report', async () => {
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);

    await db.insert(medicinesTable).values({
      name: 'Complete Medicine',
      category: 'Complete Category',
      description: 'Complete description',
      unit: 'tablet',
      price: '12.99',
      stock_quantity: 75,
      minimum_stock: 25,
      expiry_date: futureDate.toISOString().split('T')[0],
      supplier: 'Complete Supplier'
    }).execute();

    const report = await generateStockReport();
    
    expect(report).toHaveLength(1);
    const item = report[0];
    
    expect(item.medicine_id).toBeDefined();
    expect(typeof item.medicine_id).toBe('number');
    expect(item.medicine_name).toEqual('Complete Medicine');
    expect(item.category).toEqual('Complete Category');
    expect(typeof item.current_stock).toBe('number');
    expect(typeof item.minimum_stock).toBe('number');
    expect(['sufficient', 'low', 'out_of_stock']).toContain(item.stock_status);
    expect(item.expiry_date).toBeInstanceOf(Date);
    expect(typeof item.days_to_expiry).toBe('number');
  });

  it('should handle expired medicines correctly', async () => {
    const pastDate = new Date();
    pastDate.setFullYear(pastDate.getFullYear() - 1);

    await db.insert(medicinesTable).values({
      name: 'Expired Medicine',
      category: 'Expired',
      description: 'Already expired',
      unit: 'tablet',
      price: '20.00',
      stock_quantity: 30,
      minimum_stock: 15,
      expiry_date: pastDate.toISOString().split('T')[0],
      supplier: 'Test Supplier'
    }).execute();

    const report = await generateStockReport();
    
    expect(report).toHaveLength(1);
    expect(report[0].days_to_expiry).toBeLessThan(0);
    expect(report[0].expiry_date).toBeInstanceOf(Date);
  });
});
