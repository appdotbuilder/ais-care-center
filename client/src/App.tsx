
import { useState, useEffect, useCallback } from 'react';
import { trpc } from '@/utils/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { AlertCircle, Package, Users, FileText, Receipt, Search, Plus, Printer } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Import types with correct path - from App.tsx, go up 2 levels to reach server
import type { 
  Medicine, 
  Patient, 
  Transaction, 
  StockReport, 
  PatientReport, 
  Receipt as ReceiptType,
  CreateMedicineInput, 
  CreatePatientInput, 
  CreateTransactionInput 
} from '../../server/src/schema';

function App() {
  // State management
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stockReport, setStockReport] = useState<StockReport[]>([]);
  const [patientReport, setPatientReport] = useState<PatientReport[]>([]);
  const [activeTab, setActiveTab] = useState('medicines');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Dialog states
  const [medicineDialogOpen, setMedicineDialogOpen] = useState(false);
  const [patientDialogOpen, setPatientDialogOpen] = useState(false);
  const [transactionDialogOpen, setTransactionDialogOpen] = useState(false);
  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<ReceiptType | null>(null);

  // Form states
  const [medicineForm, setMedicineForm] = useState<CreateMedicineInput>({
    name: '',
    category: '',
    description: null,
    unit: '',
    price: 0,
    stock_quantity: 0,
    minimum_stock: 0,
    expiry_date: new Date(),
    supplier: null
  });

  const [patientForm, setPatientForm] = useState<CreatePatientInput>({
    name: '',
    date_of_birth: new Date(),
    gender: 'male',
    phone: null,
    email: null,
    address: null,
    emergency_contact: null,
    medical_history: null,
    allergies: null
  });

  const [transactionForm, setTransactionForm] = useState<CreateTransactionInput>({
    patient_id: 0,
    items: [{ medicine_id: 0, quantity: 1 }],
    notes: null
  });

  // Load data functions with useCallback
  const loadMedicines = useCallback(async () => {
    try {
      const result = await trpc.getMedicines.query();
      setMedicines(result);
    } catch (error) {
      console.error('Failed to load medicines:', error);
    }
  }, []);

  const loadPatients = useCallback(async () => {
    try {
      const result = await trpc.getPatients.query();
      setPatients(result);
    } catch (error) {
      console.error('Failed to load patients:', error);
    }
  }, []);

  const loadTransactions = useCallback(async () => {
    try {
      const result = await trpc.getTransactions.query();
      setTransactions(result);
    } catch (error) {
      console.error('Failed to load transactions:', error);
    }
  }, []);

  const loadStockReport = useCallback(async () => {
    try {
      const result = await trpc.generateStockReport.query();
      setStockReport(result);
    } catch (error) {
      console.error('Failed to load stock report:', error);
    }
  }, []);

  const loadPatientReport = useCallback(async () => {
    try {
      const result = await trpc.generatePatientReport.query();
      setPatientReport(result);
    } catch (error) {
      console.error('Failed to load patient report:', error);
    }
  }, []);

  // Initial data loading
  useEffect(() => {
    loadMedicines();
    loadPatients();
    loadTransactions();
    loadStockReport();
    loadPatientReport();
  }, [loadMedicines, loadPatients, loadTransactions, loadStockReport, loadPatientReport]);

  // Form handlers
  const handleCreateMedicine = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await trpc.createMedicine.mutate(medicineForm);
      setMedicineDialogOpen(false);
      setMedicineForm({
        name: '',
        category: '',
        description: null,
        unit: '',
        price: 0,
        stock_quantity: 0,
        minimum_stock: 0,
        expiry_date: new Date(),
        supplier: null
      });
      loadMedicines();
      loadStockReport();
    } catch (error) {
      console.error('Failed to create medicine:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreatePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await trpc.createPatient.mutate(patientForm);
      setPatientDialogOpen(false);
      setPatientForm({
        name: '',
        date_of_birth: new Date(),
        gender: 'male',
        phone: null,
        email: null,
        address: null,
        emergency_contact: null,
        medical_history: null,
        allergies: null
      });
      loadPatients();
      loadPatientReport();
    } catch (error) {
      console.error('Failed to create patient:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const result = await trpc.createTransaction.mutate(transactionForm);
      setTransactionDialogOpen(false);
      setTransactionForm({
        patient_id: 0,
        items: [{ medicine_id: 0, quantity: 1 }],
        notes: null
      });
      loadTransactions();
      loadMedicines();
      loadStockReport();
      
      // Generate and show receipt
      const receipt = await trpc.generateReceipt.query({ id: result.id });
      setSelectedReceipt(receipt);
      setReceiptDialogOpen(true);
    } catch (error) {
      console.error('Failed to create transaction:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateReceipt = async (transactionId: number) => {
    try {
      const receipt = await trpc.generateReceipt.query({ id: transactionId });
      setSelectedReceipt(receipt);
      setReceiptDialogOpen(true);
    } catch (error) {
      console.error('Failed to generate receipt:', error);
    }
  };

  const printReceipt = () => {
    if (selectedReceipt) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Receipt - ${selectedReceipt.transaction_code}</title>
              <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                .header { text-align: center; margin-bottom: 20px; }
                .details { margin-bottom: 20px; }
                table { width: 100%; border-collapse: collapse; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #f2f2f2; }
                .total { font-weight: bold; }
              </style>
            </head>
            <body>
              <div class="header">
                <h1>🏥 AIS Care Center</h1>
                <h2>Receipt</h2>
              </div>
              <div class="details">
                <p><strong>Transaction Code:</strong> ${selectedReceipt.transaction_code}</p>
                <p><strong>Patient:</strong> ${selectedReceipt.patient_name} (${selectedReceipt.patient_code})</p>
                <p><strong>Date:</strong> ${selectedReceipt.transaction_date.toLocaleDateString()}</p>
                <p><strong>Status:</strong> ${selectedReceipt.payment_status.toUpperCase()}</p>
              </div>
              <table>
                <tr>
                  <th>Medicine</th>
                  <th>Quantity</th>
                  <th>Unit Price</th>
                  <th>Subtotal</th>
                </tr>
                ${selectedReceipt.items.map((item: { medicine_name: string; quantity: number; unit_price: number; subtotal: number }) => `
                  <tr>
                    <td>${item.medicine_name}</td>
                    <td>${item.quantity}</td>
                    <td>Rp ${item.unit_price.toLocaleString()}</td>
                    <td>Rp ${item.subtotal.toLocaleString()}</td>
                  </tr>
                `).join('')}
                <tr class="total">
                  <td colspan="3">Total Amount</td>
                  <td>Rp ${selectedReceipt.total_amount.toLocaleString()}</td>
                </tr>
              </table>
              ${selectedReceipt.notes ? `<p><strong>Notes:</strong> ${selectedReceipt.notes}</p>` : ''}
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
      }
    }
  };

  const getStockStatusBadge = (status: string) => {
    const colors = {
      sufficient: 'bg-green-100 text-green-800',
      low: 'bg-yellow-100 text-yellow-800',
      out_of_stock: 'bg-red-100 text-red-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getPaymentStatusBadge = (status: string) => {
    const colors = {
      paid: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      cancelled: 'bg-red-100 text-red-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  // Filter functions
  const filteredMedicines = medicines.filter((medicine: Medicine) =>
    medicine.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    medicine.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredPatients = patients.filter((patient: Patient) =>
    patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.patient_code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-blue-900 mb-2">🏥 AIS Care Center</h1>
          <p className="text-lg text-blue-600">Sistem Manajemen Stok Obat dan Pasien</p>
        </div>

        {/* Search Bar */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Cari obat, pasien, atau transaksi..."
            value={searchTerm}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 bg-blue-100">
            <TabsTrigger value="medicines" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Obat
            </TabsTrigger>
            <TabsTrigger value="patients" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Pasien
            </TabsTrigger>
            <TabsTrigger value="transactions" className="flex items-center gap-2">
              <Receipt className="h-4 w-4" />
              Transaksi
            </TabsTrigger>
            <TabsTrigger value="stock-report" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Laporan Stok
            </TabsTrigger>
            <TabsTrigger value="patient-report" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Laporan Pasien
            </TabsTrigger>
          </TabsList>

          {/* Medicines Tab */}
          <TabsContent value="medicines" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-semibold text-gray-800">📦 Manajemen Stok Obat</h2>
              <Dialog open={medicineDialogOpen} onOpenChange={setMedicineDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="h-4 w-4 mr-2" />
                    Tambah Obat
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Tambah Obat Baru</DialogTitle>
                    <DialogDescription>
                      Masukkan informasi obat yang akan ditambahkan ke inventaris
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleCreateMedicine} className="space-y-4">
                    <Input
                      placeholder="Nama obat"
                      value={medicineForm.name}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setMedicineForm((prev: CreateMedicineInput) => ({ ...prev, name: e.target.value }))
                      }
                      required
                    />
                    <Select
                      value={medicineForm.category || ''}
                      onValueChange={(value: string) =>
                        setMedicineForm((prev: CreateMedicineInput) => ({ ...prev, category: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih kategori" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Analgesik">Analgesik</SelectItem>
                        <SelectItem value="Antibiotik">Antibiotik</SelectItem>
                        <SelectItem value="Vitamin">Vitamin</SelectItem>
                        <SelectItem value="Herbal">Herbal</SelectItem>
                        <SelectItem value="Lainnya">Lainnya</SelectItem>
                      </SelectContent>
                    </Select>
                    <Textarea
                      placeholder="Deskripsi (opsional)"
                      value={medicineForm.description || ''}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                        setMedicineForm((prev: CreateMedicineInput) => ({
                          ...prev,
                          description: e.target.value || null
                        }))
                      }
                    />
                    <Input
                      placeholder="Satuan (tablet, botol, box)"
                      value={medicineForm.unit}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setMedicineForm((prev: CreateMedicineInput) => ({ ...prev, unit: e.target.value }))
                      }
                      required
                    />
                    <Input
                      type="number"
                      placeholder="Harga"
                      value={medicineForm.price}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setMedicineForm((prev: CreateMedicineInput) => ({ ...prev, price: parseFloat(e.target.value) || 0 }))
                      }
                      min="0"
                      step="0.01"
                      required
                    />
                    <Input
                      type="number"
                      placeholder="Stok tersedia"
                      value={medicineForm.stock_quantity}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setMedicineForm((prev: CreateMedicineInput) => ({ ...prev, stock_quantity: parseInt(e.target.value) || 0 }))
                      }
                      min="0"
                      required
                    />
                    <Input
                      type="number"
                      placeholder="Stok minimum"
                      value={medicineForm.minimum_stock}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setMedicineForm((prev: CreateMedicineInput) => ({ ...prev, minimum_stock: parseInt(e.target.value) || 0 }))
                      }
                      min="0"
                      required
                    />
                    <Input
                      type="date"
                      value={medicineForm.expiry_date.toISOString().split('T')[0]}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setMedicineForm((prev: CreateMedicineInput) => ({ ...prev, expiry_date: new Date(e.target.value) }))
                      }
                      required
                    />
                    <Input
                      placeholder="Supplier (opsional)"
                      value={medicineForm.supplier || ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setMedicineForm((prev: CreateMedicineInput) => ({
                          ...prev,
                          supplier: e.target.value || null
                        }))
                      }
                    />
                    <Button type="submit" disabled={isLoading} className="w-full">
                      {isLoading ? 'Menyimpan...' : 'Simpan Obat'}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {/* STUB NOTICE - Medicine data is currently using placeholder/stub data */}
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Catatan: Data obat saat ini menggunakan stub data. Koneksi database belum diimplementasi.
              </AlertDescription>
            </Alert>

            <div className="grid gap-4">
              {filteredMedicines.length === 0 ? (
                <Card>
                  <CardContent className="flex items-center justify-center h-32">
                    <p className="text-gray-500">Belum ada data obat. Tambahkan obat pertama!</p>
                  </CardContent>
                </Card>
              ) : (
                filteredMedicines.map((medicine: Medicine) => (
                  <Card key={medicine.id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">{medicine.name}</CardTitle>
                          <CardDescription>{medicine.category}</CardDescription>
                        </div>
                        <Badge className={getStockStatusBadge(medicine.stock_quantity <= medicine.minimum_stock ? 'low' : 'sufficient')}>
                          {medicine.stock_quantity <= medicine.minimum_stock ? '⚠️ Stok Rendah' : '✅ Stok Cukup'}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {medicine.description && (
                        <p className="text-gray-600 mb-2">{medicine.description}</p>
                      )}
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium">Harga:</span> Rp {medicine.price.toLocaleString()}
                        </div>
                        <div>
                          <span className="font-medium">Satuan:</span> {medicine.unit}
                        </div>
                        <div>
                          <span className="font-medium">Stok:</span> {medicine.stock_quantity}
                        </div>
                        <div>
                          <span className="font-medium">Min. Stok:</span> {medicine.minimum_stock}
                        </div>
                        <div>
                          <span className="font-medium">Kedaluwarsa:</span> {medicine.expiry_date.toLocaleDateString()}
                        </div>
                        {medicine.supplier && (
                          <div>
                            <span className="font-medium">Supplier:</span> {medicine.supplier}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          {/* Patients Tab */}
          <TabsContent value="patients" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-semibold text-gray-800">👥 Manajemen Pasien</h2>
              <Dialog open={patientDialogOpen} onOpenChange={setPatientDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-green-600 hover:bg-green-700">
                    <Plus className="h-4 w-4 mr-2" />
                    Tambah Pasien
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Tambah Pasien Baru</DialogTitle>
                    <DialogDescription>
                      Masukkan informasi pasien yang akan didaftarkan
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleCreatePatient} className="space-y-4">
                    <Input
                      placeholder="Nama lengkap"
                      value={patientForm.name}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setPatientForm((prev: CreatePatientInput) => ({ ...prev, name: e.target.value }))
                      }
                      required
                    />
                    <Input
                      type="date"
                      value={patientForm.date_of_birth.toISOString().split('T')[0]}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setPatientForm((prev: CreatePatientInput) => ({ ...prev, date_of_birth: new Date(e.target.value) }))
                      }
                      required
                    />
                    <Select
                      value={patientForm.gender || 'male'}
                      onValueChange={(value: 'male' | 'female') =>
                        setPatientForm((prev: CreatePatientInput) => ({ ...prev, gender: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih jenis kelamin" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Laki-laki</SelectItem>
                        <SelectItem value="female">Perempuan</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      placeholder="No. Telepon (opsional)"
                      value={patientForm.phone || ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setPatientForm((prev: CreatePatientInput) => ({
                          ...prev,
                          phone: e.target.value || null
                        }))
                      }
                    />
                    <Input
                      type="email"
                      placeholder="Email (opsional)"
                      value={patientForm.email || ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setPatientForm((prev: CreatePatientInput) => ({
                          ...prev,
                          email: e.target.value || null
                        }))
                      }
                    />
                    <Textarea
                      placeholder="Alamat (opsional)"
                      value={patientForm.address || ''}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                        setPatientForm((prev: CreatePatientInput) => ({
                          ...prev,
                          address: e.target.value || null
                        }))
                      }
                    />
                    <Input
                      placeholder="Kontak darurat (opsional)"
                      value={patientForm.emergency_contact || ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setPatientForm((prev: CreatePatientInput) => ({
                          ...prev,
                          emergency_contact: e.target.value || null
                        }))
                      }
                    />
                    <Button type="submit" disabled={isLoading} className="w-full">
                      {isLoading ? 'Menyimpan...' : 'Simpan Pasien'}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {/* STUB NOTICE - Patient data is currently using placeholder/stub data */}
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Catatan: Data pasien saat ini menggunakan stub data. Koneksi database belum diimplementasi.
              </AlertDescription>
            </Alert>

            <div className="grid gap-4">
              {filteredPatients.length === 0 ? (
                <Card>
                  <CardContent className="flex items-center justify-center h-32">
                    <p className="text-gray-500">Belum ada data pasien. Tambahkan pasien pertama!</p>
                  </CardContent>
                </Card>
              ) : (
                filteredPatients.map((patient: Patient) => (
                  <Card key={patient.id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">{patient.name}</CardTitle>
                          <CardDescription>Kode: {patient.patient_code}</CardDescription>
                        </div>
                        <Badge variant="outline">
                          {patient.gender === 'male' ? '👨 Laki-laki' : '👩 Perempuan'}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium">Tanggal Lahir:</span> {patient.date_of_birth.toLocaleDateString()}
                        </div>
                        {patient.phone && (
                          <div>
                            <span className="font-medium">Telepon:</span> {patient.phone}
                          </div>
                        )}
                        {patient.email && (
                          <div>
                            <span className="font-medium">Email:</span> {patient.email}
                          </div>
                        )}
                        {patient.emergency_contact && (
                          <div>
                            <span className="font-medium">Kontak Darurat:</span> {patient.emergency_contact}
                          </div>
                        )}
                      </div>
                      {patient.address && (
                        <div className="mt-2">
                          <span className="font-medium">Alamat:</span> {patient.address}
                        </div>
                      )}
                      {patient.allergies && (
                        <div className="mt-2">
                          <span className="font-medium">Alergi:</span> {patient.allergies}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          {/* Transactions Tab */}
          <TabsContent value="transactions" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-semibold text-gray-800">💳 Transaksi Penjualan</h2>
              <Dialog open={transactionDialogOpen} onOpenChange={setTransactionDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-purple-600 hover:bg-purple-700">
                    <Plus className="h-4 w-4 mr-2" />
                    Transaksi Baru
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Buat Transaksi Baru</DialogTitle>
                    <DialogDescription>
                      Pilih pasien dan obat untuk transaksi
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleCreateTransaction} className="space-y-4">
                    <Select
                      value={transactionForm.patient_id > 0 ? transactionForm.patient_id.toString() : ''}
                      onValueChange={(value: string) =>
                        setTransactionForm((prev: CreateTransactionInput) => ({ ...prev, patient_id: parseInt(value) }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih pasien" />
                      </SelectTrigger>
                      <SelectContent>
                        {patients.map((patient: Patient) => (
                          <SelectItem key={patient.id} value={patient.id.toString()}>
                            {patient.name} ({patient.patient_code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    {transactionForm.items.map((item, index) => (
                      
                      <div key={index} className="space-y-2 p-3 border rounded">
                        <Select
                          value={item.medicine_id > 0 ? item.medicine_id.toString() : ''}
                          onValueChange={(value: string) => {
                            const newItems = [...transactionForm.items];
                            newItems[index] = { ...newItems[index], medicine_id: parseInt(value) };
                            setTransactionForm((prev: CreateTransactionInput) => ({ ...prev, items: newItems }));
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih obat" />
                          </SelectTrigger>
                          <SelectContent>
                            {medicines.map((medicine: Medicine) => (
                              <SelectItem key={medicine.id} value={medicine.id.toString()}>
                                {medicine.name} (Stok: {medicine.stock_quantity})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input
                          type="number"
                          placeholder="Jumlah"
                          value={item.quantity}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                            const newItems = [...transactionForm.items];
                            newItems[index] = { ...newItems[index], quantity: parseInt(e.target.value) || 1 };
                            setTransactionForm((prev: CreateTransactionInput) => ({ ...prev, items: newItems }));
                          }}
                          min="1"
                          required
                        />
                      </div>
                    ))}
                    
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setTransactionForm((prev: CreateTransactionInput) => ({
                          ...prev,
                          items: [...prev.items, { medicine_id: 0, quantity: 1 }]
                        }));
                      }}
                      className="w-full"
                    >
                      Tambah Item
                    </Button>
                    
                    <Textarea
                      placeholder="Catatan (opsional)"
                      value={transactionForm.notes || ''}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                        setTransactionForm((prev: CreateTransactionInput) => ({
                          ...prev,
                          notes: e.target.value || null
                        }))
                      }
                    />
                    <Button type="submit" disabled={isLoading} className="w-full">
                      {isLoading ? 'Memproses...' : 'Buat Transaksi'}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {/* STUB NOTICE - Transaction data is currently using placeholder/stub data */}
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Catatan: Data transaksi saat ini menggunakan stub data. Koneksi database belum diimplementasi.
              </AlertDescription>
            </Alert>

            <div className="grid gap-4">
              {transactions.length === 0 ? (
                <Card>
                  <CardContent className="flex items-center justify-center h-32">
                    <p className="text-gray-500">Belum ada transaksi. Buat transaksi pertama!</p>
                  </CardContent>
                </Card>
              ) : (
                transactions.map((transaction: Transaction) => (
                  <Card key={transaction.id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">{transaction.transaction_code}</CardTitle>
                          <CardDescription>
                            {transaction.transaction_date.toLocaleDateString()}
                          </CardDescription>
                        </div>
                        <div className="flex gap-2">
                          <Badge className={getPaymentStatusBadge(transaction.payment_status)}>
                            {transaction.payment_status === 'paid' ? '✅ Lunas' :
                             transaction.payment_status === 'pending' ? '⏳ Pending' : '❌ Batal'}
                          </Badge>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleGenerateReceipt(transaction.id)}
                          >
                            <Receipt className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex justify-between items-center">
                        <span className="font-medium">Total: Rp {transaction.total_amount.toLocaleString()}</span>
                      </div>
                      {transaction.notes && (
                        <p className="text-gray-600 mt-2 text-sm">{transaction.notes}</p>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          {/* Stock Report Tab */}
          <TabsContent value="stock-report" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-semibold text-gray-800">📊 Laporan Stok Obat</h2>
              <Button
                onClick={() => window.print()}
                className="bg-orange-600 hover:bg-orange-700"
              >
                <Printer className="h-4 w-4 mr-2" />
                Cetak Laporan
              </Button>
            </div>

            {/* STUB NOTICE - Stock report data is currently using placeholder/stub data */}
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Catatan: Laporan stok saat ini menggunakan stub data. Koneksi database belum diimplementasi.
              </AlertDescription>
            </Alert>

            <Card>
              <CardHeader>
                <CardTitle>Ringkasan Stok</CardTitle>
                <CardDescription>Status stok obat saat ini</CardDescription>
              </CardHeader>
              <CardContent>
                {stockReport.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">Belum ada data laporan stok.</p>
                ) : (
                  <div className="space-y-4">
                    {stockReport.map((report: StockReport) => (
                      <div key={report.medicine_id} className="border rounded p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="font-semibold">{report.medicine_name}</h3>
                            <p className="text-sm text-gray-600">{report.category}</p>
                          </div>
                          <Badge className={getStockStatusBadge(report.stock_status)}>
                            {report.stock_status === 'sufficient' ? '✅ Cukup' :
                             report.stock_status === 'low' ? '⚠️ Rendah' : '❌ Habis'}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="font-medium">Stok Saat Ini:</span> {report.current_stock}
                          </div>
                          <div>
                            <span className="font-medium">Stok Minimum:</span> {report.minimum_stock}
                          </div>
                          <div>
                            <span className="font-medium">Hari ke Kedaluwarsa:</span> {report.days_to_expiry}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Patient Report Tab */}
          <TabsContent value="patient-report" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-semibold text-gray-800">📈 Laporan Pasien</h2>
              <Button
                onClick={() => window.print()}
                className="bg-teal-600 hover:bg-teal-700"
              >
                <Printer className="h-4 w-4 mr-2" />
                Cetak Laporan
              </Button>
            </div>

            {/* STUB NOTICE - Patient report data is currently using placeholder/stub data */}
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Catatan: Laporan pasien saat ini menggunakan stub data. Koneksi database belum diimplementasi.
              </AlertDescription>
            </Alert>

            <Card>
              <CardHeader>
                <CardTitle>Statistik Pasien</CardTitle>
                <CardDescription>Data aktivitas dan pembelian pasien</CardDescription>
              </CardHeader>
              <CardContent>
                {patientReport.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">Belum ada data laporan pasien.</p>
                ) : (
                  <div className="space-y-4">
                    {patientReport.map((report: PatientReport) => (
                      <div key={report.patient_id} className="border rounded p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="font-semibold">{report.patient_name}</h3>
                            <p className="text-sm text-gray-600">Kode: {report.patient_code}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="font-medium">Total Transaksi:</span> {report.total_transactions}
                          </div>
                          <div>
                            <span className="font-medium">Total Pembelian:</span> Rp {report.total_amount_spent.toLocaleString()}
                          </div>
                          <div>
                            <span className="font-medium">Kunjungan Terakhir:</span>{' '}
                            {report.last_visit ? report.last_visit.toLocaleDateString() : 'Belum ada'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Receipt Dialog */}
        <Dialog open={receiptDialogOpen} onOpenChange={setReceiptDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>🧾 Nota Pembayaran</DialogTitle>
              <DialogDescription>
                Detail transaksi dan nota pembayaran
              </DialogDescription>
            </DialogHeader>
            {selectedReceipt && (
              <div className="space-y-4">
                <div className="text-center border-b pb-4">
                  <h3 className="text-lg font-bold">🏥 AIS Care Center</h3>
                  <p className="text-sm text-gray-600">Nota Pembayaran</p>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Kode Transaksi:</span>
                    <span className="font-medium">{selectedReceipt.transaction_code}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Pasien:</span>
                    <span className="font-medium">{selectedReceipt.patient_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Kode Pasien:</span>
                    <span className="font-medium">{selectedReceipt.patient_code}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tanggal:</span>
                    <span className="font-medium">{selectedReceipt.transaction_date.toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Status:</span>
                    <Badge className={getPaymentStatusBadge(selectedReceipt.payment_status)}>
                      {selectedReceipt.payment_status.toUpperCase()}
                    </Badge>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-2">Item Pembelian:</h4>
                  <div className="space-y-2">
                    {selectedReceipt.items.map((item, index) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span>{item.medicine_name} x{item.quantity}</span>
                        <span>Rp {item.subtotal.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="flex justify-between font-bold">
                    <span>Total:</span>
                    <span>Rp {selectedReceipt.total_amount.toLocaleString()}</span>
                  </div>
                </div>

                {selectedReceipt.notes && (
                  <div className="border-t pt-4">
                    <p className="text-sm"><strong>Catatan:</strong> {selectedReceipt.notes}</p>
                  </div>
                )}

                <Button onClick={printReceipt} className="w-full">
                  <Printer className="h-4 w-4 mr-2" />
                  Cetak Nota
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

export default App;
