
import { serial, text, pgTable, timestamp, numeric, integer, date, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Define enums
export const genderEnum = pgEnum('gender', ['male', 'female']);
export const paymentStatusEnum = pgEnum('payment_status', ['pending', 'paid', 'cancelled']);

// Medicines table
export const medicinesTable = pgTable('medicines', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  category: text('category').notNull(),
  description: text('description'),
  unit: text('unit').notNull(), // e.g., "tablet", "bottle", "box"
  price: numeric('price', { precision: 10, scale: 2 }).notNull(),
  stock_quantity: integer('stock_quantity').notNull(),
  minimum_stock: integer('minimum_stock').notNull(),
  expiry_date: date('expiry_date').notNull(),
  supplier: text('supplier'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Patients table
export const patientsTable = pgTable('patients', {
  id: serial('id').primaryKey(),
  patient_code: text('patient_code').notNull().unique(),
  name: text('name').notNull(),
  date_of_birth: date('date_of_birth').notNull(),
  gender: genderEnum('gender').notNull(),
  phone: text('phone'),
  email: text('email'),
  address: text('address'),
  emergency_contact: text('emergency_contact'),
  medical_history: text('medical_history'),
  allergies: text('allergies'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Transactions table (for medicine sales/prescriptions)
export const transactionsTable = pgTable('transactions', {
  id: serial('id').primaryKey(),
  transaction_code: text('transaction_code').notNull().unique(),
  patient_id: integer('patient_id').notNull().references(() => patientsTable.id),
  transaction_date: timestamp('transaction_date').defaultNow().notNull(),
  total_amount: numeric('total_amount', { precision: 10, scale: 2 }).notNull(),
  payment_status: paymentStatusEnum('payment_status').notNull().default('pending'),
  notes: text('notes'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Transaction items table (medicines in each transaction)
export const transactionItemsTable = pgTable('transaction_items', {
  id: serial('id').primaryKey(),
  transaction_id: integer('transaction_id').notNull().references(() => transactionsTable.id),
  medicine_id: integer('medicine_id').notNull().references(() => medicinesTable.id),
  quantity: integer('quantity').notNull(),
  unit_price: numeric('unit_price', { precision: 10, scale: 2 }).notNull(),
  subtotal: numeric('subtotal', { precision: 10, scale: 2 }).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const medicinesRelations = relations(medicinesTable, ({ many }) => ({
  transactionItems: many(transactionItemsTable),
}));

export const patientsRelations = relations(patientsTable, ({ many }) => ({
  transactions: many(transactionsTable),
}));

export const transactionsRelations = relations(transactionsTable, ({ one, many }) => ({
  patient: one(patientsTable, {
    fields: [transactionsTable.patient_id],
    references: [patientsTable.id],
  }),
  items: many(transactionItemsTable),
}));

export const transactionItemsRelations = relations(transactionItemsTable, ({ one }) => ({
  transaction: one(transactionsTable, {
    fields: [transactionItemsTable.transaction_id],
    references: [transactionsTable.id],
  }),
  medicine: one(medicinesTable, {
    fields: [transactionItemsTable.medicine_id],
    references: [medicinesTable.id],
  }),
}));

// TypeScript types for the table schemas
export type Medicine = typeof medicinesTable.$inferSelect;
export type NewMedicine = typeof medicinesTable.$inferInsert;

export type Patient = typeof patientsTable.$inferSelect;
export type NewPatient = typeof patientsTable.$inferInsert;

export type Transaction = typeof transactionsTable.$inferSelect;
export type NewTransaction = typeof transactionsTable.$inferInsert;

export type TransactionItem = typeof transactionItemsTable.$inferSelect;
export type NewTransactionItem = typeof transactionItemsTable.$inferInsert;

// Export all tables for relation queries
export const tables = {
  medicines: medicinesTable,
  patients: patientsTable,
  transactions: transactionsTable,
  transactionItems: transactionItemsTable,
};
