
import { z } from 'zod';

// Medicine schema
export const medicineSchema = z.object({
  id: z.number(),
  name: z.string(),
  category: z.string(),
  description: z.string().nullable(),
  unit: z.string(), // e.g., "tablet", "bottle", "box"
  price: z.number(),
  stock_quantity: z.number().int(),
  minimum_stock: z.number().int(),
  expiry_date: z.coerce.date(),
  supplier: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Medicine = z.infer<typeof medicineSchema>;

// Patient schema
export const patientSchema = z.object({
  id: z.number(),
  patient_code: z.string(),
  name: z.string(),
  date_of_birth: z.coerce.date(),
  gender: z.enum(['male', 'female']),
  phone: z.string().nullable(),
  email: z.string().email().nullable(),
  address: z.string().nullable(),
  emergency_contact: z.string().nullable(),
  medical_history: z.string().nullable(),
  allergies: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Patient = z.infer<typeof patientSchema>;

// Transaction schema for medicine sales/usage
export const transactionSchema = z.object({
  id: z.number(),
  transaction_code: z.string(),
  patient_id: z.number(),
  transaction_date: z.coerce.date(),
  total_amount: z.number(),
  payment_status: z.enum(['pending', 'paid', 'cancelled']),
  notes: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Transaction = z.infer<typeof transactionSchema>;

// Transaction item schema (medicines in a transaction)
export const transactionItemSchema = z.object({
  id: z.number(),
  transaction_id: z.number(),
  medicine_id: z.number(),
  quantity: z.number().int(),
  unit_price: z.number(),
  subtotal: z.number(),
  created_at: z.coerce.date()
});

export type TransactionItem = z.infer<typeof transactionItemSchema>;

// Medicine usage schema
export const medicineUsageSchema = z.object({
  id: z.number(),
  medicine_id: z.number(),
  quantity_used: z.number().int().positive(),
  usage_date: z.coerce.date(),
  notes: z.string().nullable(),
  created_at: z.coerce.date(),
});

export type MedicineUsage = z.infer<typeof medicineUsageSchema>;

// Input schemas for creating records
export const createMedicineInputSchema = z.object({
  name: z.string().min(1),
  category: z.string().min(1),
  description: z.string().nullable(),
  unit: z.string().min(1),
  price: z.number().positive(),
  stock_quantity: z.number().int().nonnegative(),
  minimum_stock: z.number().int().nonnegative(),
  expiry_date: z.coerce.date(),
  supplier: z.string().nullable()
});

export type CreateMedicineInput = z.infer<typeof createMedicineInputSchema>;

export const createPatientInputSchema = z.object({
  name: z.string().min(1),
  date_of_birth: z.coerce.date(),
  gender: z.enum(['male', 'female']),
  phone: z.string().nullable(),
  email: z.string().email().nullable(),
  address: z.string().nullable(),
  emergency_contact: z.string().nullable(),
  medical_history: z.string().nullable(),
  allergies: z.string().nullable()
});

export type CreatePatientInput = z.infer<typeof createPatientInputSchema>;

export const createTransactionInputSchema = z.object({
  patient_id: z.number(),
  items: z.array(z.object({
    medicine_id: z.number(),
    quantity: z.number().int().positive()
  })).min(1),
  notes: z.string().nullable()
});

export type CreateTransactionInput = z.infer<typeof createTransactionInputSchema>;

export const createMedicineUsageInputSchema = z.object({
  medicine_id: z.number(),
  quantity_used: z.number().int().positive(),
  notes: z.string().nullable().optional(),
});

export type CreateMedicineUsageInput = z.infer<typeof createMedicineUsageInputSchema>;

// Update schemas
export const updateMedicineInputSchema = z.object({
  id: z.number(),
  name: z.string().min(1).optional(),
  category: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  unit: z.string().min(1).optional(),
  price: z.number().positive().optional(),
  stock_quantity: z.number().int().nonnegative().optional(),
  minimum_stock: z.number().int().nonnegative().optional(),
  expiry_date: z.coerce.date().optional(),
  supplier: z.string().nullable().optional()
});

export type UpdateMedicineInput = z.infer<typeof updateMedicineInputSchema>;

export const updatePatientInputSchema = z.object({
  id: z.number(),
  name: z.string().min(1).optional(),
  date_of_birth: z.coerce.date().optional(),
  gender: z.enum(['male', 'female']).optional(),
  phone: z.string().nullable().optional(),
  email: z.string().email().nullable().optional(),
  address: z.string().nullable().optional(),
  emergency_contact: z.string().nullable().optional(),
  medical_history: z.string().nullable().optional(),
  allergies: z.string().nullable().optional()
});

export type UpdatePatientInput = z.infer<typeof updatePatientInputSchema>;

export const updateTransactionStatusInputSchema = z.object({
  id: z.number(),
  payment_status: z.enum(['pending', 'paid', 'cancelled'])
});

export type UpdateTransactionStatusInput = z.infer<typeof updateTransactionStatusInputSchema>;

// Query schemas
export const getMedicineByIdInputSchema = z.object({
  id: z.number()
});

export type GetMedicineByIdInput = z.infer<typeof getMedicineByIdInputSchema>;

export const getPatientByIdInputSchema = z.object({
  id: z.number()
});

export type GetPatientByIdInput = z.infer<typeof getPatientByIdInputSchema>;

export const getTransactionByIdInputSchema = z.object({
  id: z.number()
});

export type GetTransactionByIdInput = z.infer<typeof getTransactionByIdInputSchema>;

export const getLowStockMedicinesInputSchema = z.object({
  threshold: z.number().int().nonnegative().optional()
});

export type GetLowStockMedicinesInput = z.infer<typeof getLowStockMedicinesInputSchema>;

// Report schemas
export const stockReportSchema = z.object({
  medicine_id: z.number(),
  medicine_name: z.string(),
  category: z.string(),
  current_stock: z.number().int(),
  minimum_stock: z.number().int(),
  stock_status: z.enum(['sufficient', 'low', 'out_of_stock']),
  expiry_date: z.coerce.date(),
  days_to_expiry: z.number().int()
});

export type StockReport = z.infer<typeof stockReportSchema>;

export const patientReportSchema = z.object({
  patient_id: z.number(),
  patient_code: z.string(),
  patient_name: z.string(),
  total_transactions: z.number().int(),
  total_amount_spent: z.number(),
  last_visit: z.coerce.date().nullable()
});

export type PatientReport = z.infer<typeof patientReportSchema>;

// Receipt/Invoice schema
export const receiptSchema = z.object({
  transaction_id: z.number(),
  transaction_code: z.string(),
  patient_name: z.string(),
  patient_code: z.string(),
  transaction_date: z.coerce.date(),
  items: z.array(z.object({
    medicine_name: z.string(),
    quantity: z.number().int(),
    unit_price: z.number(),
    subtotal: z.number()
  })),
  total_amount: z.number(),
  payment_status: z.enum(['pending', 'paid', 'cancelled']),
  notes: z.string().nullable()
});

export type Receipt = z.infer<typeof receiptSchema>;
