
import { db } from '../db';
import { transactionsTable, transactionItemsTable, medicinesTable, patientsTable } from '../db/schema';
import { type CreateTransactionInput, type Transaction } from '../schema';
import { eq, sql, inArray, desc } from 'drizzle-orm';

export async function createTransaction(input: CreateTransactionInput): Promise<Transaction> {
  try {
    // Validate patient exists
    const patient = await db.select()
      .from(patientsTable)
      .where(eq(patientsTable.id, input.patient_id))
      .execute();

    if (patient.length === 0) {
      throw new Error('Patient not found');
    }

    // Validate medicines exist and have sufficient stock
    const medicineIds = input.items.map(item => item.medicine_id);
    const medicines = await db.select()
      .from(medicinesTable)
      .where(inArray(medicinesTable.id, medicineIds))
      .execute();

    if (medicines.length !== medicineIds.length) {
      throw new Error('One or more medicines not found');
    }

    // Check stock availability and calculate totals
    let totalAmount = 0;
    const itemsWithPrices = [];

    for (const item of input.items) {
      const medicine = medicines.find(m => m.id === item.medicine_id);
      if (!medicine) {
        throw new Error(`Medicine with id ${item.medicine_id} not found`);
      }

      if (medicine.stock_quantity < item.quantity) {
        throw new Error(`Insufficient stock for medicine ${medicine.name}. Available: ${medicine.stock_quantity}, Required: ${item.quantity}`);
      }

      const unitPrice = parseFloat(medicine.price);
      const subtotal = unitPrice * item.quantity;
      totalAmount += subtotal;

      itemsWithPrices.push({
        medicine_id: item.medicine_id,
        quantity: item.quantity,
        unit_price: unitPrice,
        subtotal: subtotal
      });
    }

    // Generate unique transaction code - get the last transaction code and increment
    const lastTransaction = await db.select()
      .from(transactionsTable)
      .orderBy(desc(transactionsTable.id))
      .limit(1)
      .execute();

    let nextNumber = 1;
    if (lastTransaction.length > 0) {
      // Extract number from last transaction code (e.g., "TXN000005" -> 5)
      const lastCode = lastTransaction[0].transaction_code;
      const lastNumber = parseInt(lastCode.substring(3), 10);
      nextNumber = lastNumber + 1;
    }

    const transactionCode = `TXN${String(nextNumber).padStart(6, '0')}`;

    // Create transaction
    const transactionResult = await db.insert(transactionsTable)
      .values({
        transaction_code: transactionCode,
        patient_id: input.patient_id,
        total_amount: totalAmount.toString(),
        payment_status: 'pending',
        notes: input.notes
      })
      .returning()
      .execute();

    const transaction = transactionResult[0];

    // Create transaction items
    const transactionItemsData = itemsWithPrices.map(item => ({
      transaction_id: transaction.id,
      medicine_id: item.medicine_id,
      quantity: item.quantity,
      unit_price: item.unit_price.toString(),
      subtotal: item.subtotal.toString()
    }));

    await db.insert(transactionItemsTable)
      .values(transactionItemsData)
      .execute();

    // Update medicine stock quantities
    for (const item of input.items) {
      await db.update(medicinesTable)
        .set({
          stock_quantity: sql`${medicinesTable.stock_quantity} - ${item.quantity}`,
          updated_at: new Date()
        })
        .where(eq(medicinesTable.id, item.medicine_id))
        .execute();
    }

    // Return transaction with converted numeric fields
    return {
      ...transaction,
      total_amount: parseFloat(transaction.total_amount)
    };
  } catch (error) {
    console.error('Transaction creation failed:', error);
    throw error;
  }
}
