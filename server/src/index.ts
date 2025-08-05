
import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';

// Import schemas
import {
  createMedicineInputSchema,
  updateMedicineInputSchema,
  getMedicineByIdInputSchema,
  createPatientInputSchema,
  updatePatientInputSchema,
  getPatientByIdInputSchema,
  createTransactionInputSchema,
  updateTransactionStatusInputSchema,
  getTransactionByIdInputSchema,
  getLowStockMedicinesInputSchema
} from './schema';

// Import handlers
import { createMedicine } from './handlers/create_medicine';
import { getMedicines } from './handlers/get_medicines';
import { getMedicineById } from './handlers/get_medicine_by_id';
import { updateMedicine } from './handlers/update_medicine';
import { deleteMedicine } from './handlers/delete_medicine';
import { createPatient } from './handlers/create_patient';
import { getPatients } from './handlers/get_patients';
import { getPatientById } from './handlers/get_patient_by_id';
import { updatePatient } from './handlers/update_patient';
import { createTransaction } from './handlers/create_transaction';
import { getTransactions } from './handlers/get_transactions';
import { getTransactionById } from './handlers/get_transaction_by_id';
import { updateTransactionStatus } from './handlers/update_transaction_status';
import { getLowStockMedicines } from './handlers/get_low_stock_medicines';
import { generateStockReport } from './handlers/generate_stock_report';
import { generatePatientReport } from './handlers/generate_patient_report';
import { generateReceipt } from './handlers/generate_receipt';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // Medicine management routes
  createMedicine: publicProcedure
    .input(createMedicineInputSchema)
    .mutation(({ input }) => createMedicine(input)),
  
  getMedicines: publicProcedure
    .query(() => getMedicines()),
  
  getMedicineById: publicProcedure
    .input(getMedicineByIdInputSchema)
    .query(({ input }) => getMedicineById(input)),
  
  updateMedicine: publicProcedure
    .input(updateMedicineInputSchema)
    .mutation(({ input }) => updateMedicine(input)),
  
  deleteMedicine: publicProcedure
    .input(getMedicineByIdInputSchema)
    .mutation(({ input }) => deleteMedicine(input)),

  // Patient management routes
  createPatient: publicProcedure
    .input(createPatientInputSchema)
    .mutation(({ input }) => createPatient(input)),
  
  getPatients: publicProcedure
    .query(() => getPatients()),
  
  getPatientById: publicProcedure
    .input(getPatientByIdInputSchema)
    .query(({ input }) => getPatientById(input)),
  
  updatePatient: publicProcedure
    .input(updatePatientInputSchema)
    .mutation(({ input }) => updatePatient(input)),

  // Transaction management routes
  createTransaction: publicProcedure
    .input(createTransactionInputSchema)
    .mutation(({ input }) => createTransaction(input)),
  
  getTransactions: publicProcedure
    .query(() => getTransactions()),
  
  getTransactionById: publicProcedure
    .input(getTransactionByIdInputSchema)
    .query(({ input }) => getTransactionById(input)),
  
  updateTransactionStatus: publicProcedure
    .input(updateTransactionStatusInputSchema)
    .mutation(({ input }) => updateTransactionStatus(input)),

  // Inventory management routes
  getLowStockMedicines: publicProcedure
    .input(getLowStockMedicinesInputSchema)
    .query(({ input }) => getLowStockMedicines(input)),

  // Reporting routes
  generateStockReport: publicProcedure
    .query(() => generateStockReport()),
  
  generatePatientReport: publicProcedure
    .query(() => generatePatientReport()),
  
  generateReceipt: publicProcedure
    .input(getTransactionByIdInputSchema)
    .query(({ input }) => generateReceipt(input)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`AIS Care Center Management Server listening at port: ${port}`);
}

start();
