
import { db } from '../db';
import { medicinesTable } from '../db/schema';
import { type StockReport } from '../schema';

export async function generateStockReport(): Promise<StockReport[]> {
  try {
    // Get all medicines with their stock information
    const medicines = await db.select()
      .from(medicinesTable)
      .execute();

    // Process each medicine to create stock report
    return medicines.map(medicine => {
      const currentStock = medicine.stock_quantity;
      const minimumStock = medicine.minimum_stock;
      
      // Determine stock status
      let stockStatus: 'sufficient' | 'low' | 'out_of_stock';
      if (currentStock === 0) {
        stockStatus = 'out_of_stock';
      } else if (currentStock <= minimumStock) {
        stockStatus = 'low';
      } else {
        stockStatus = 'sufficient';
      }

      // Calculate days to expiry
      const today = new Date();
      const expiryDate = new Date(medicine.expiry_date);
      const timeDiff = expiryDate.getTime() - today.getTime();
      const daysToExpiry = Math.ceil(timeDiff / (1000 * 3600 * 24));

      return {
        medicine_id: medicine.id,
        medicine_name: medicine.name,
        category: medicine.category,
        current_stock: currentStock,
        minimum_stock: minimumStock,
        stock_status: stockStatus,
        expiry_date: expiryDate,
        days_to_expiry: daysToExpiry
      };
    });
  } catch (error) {
    console.error('Stock report generation failed:', error);
    throw error;
  }
}
