
export type ViewType = 
  | 'dashboard' 
  | 'sales_new' | 'sales_list' | 'sales_returns' | 'sales_returns_list' | 'sales_detailed'
  | 'purchases_register' | 'purchases_list' | 'purchases_match' | 'purchases_returns' | 'purchases_returns_list'
  | 'customers_new' | 'customers_list' | 'customers_account' | 'customers_statement'
  | 'suppliers_new' | 'suppliers_list' | 'suppliers_statement'
  | 'inventory_list' | 'inventory_add' | 'inventory_quick_entry' | 'inventory_movements' | 'inventory_units'
  | 'stocktake_new' | 'stocktake_list' | 'stocktake_adjust'
  | 'accounting_receipt' | 'accounting_payment' | 'accounting_receipt_list' | 'accounting_payment_list'
  | 'accounting_expense' | 'accounting_expense_list' | 'accounting_payroll'
  | 'reports_general' | 'reports_shortage' | 'reports_expiry'
  | 'settings_company' | 'settings_users' | 'settings_general' | 'settings_database'
  | 'sales' | 'inventory' | 'stocktake' | 'customers' | 'suppliers' | 'purchases' | 'settings' | 'accounting' | 'reports';

// --- Electron Interface ---
declare global {
  interface Window {
    electron?: {
      openFileDialog: () => Promise<string | null>;
      saveFileDialog: (defaultName?: string) => Promise<string | null>;
      readFile: (filePath: string) => Promise<{ success: boolean; data: string; ext: string; error?: string }>;
      writeFile: (filePath: string, data: string, isBase64: boolean) => Promise<{ success: boolean; error?: string }>;
      // SQLite Support
      exportSQLite: (filePath: string, data: any) => Promise<{ success: boolean; error?: string }>;
      importSQLite: (filePath: string) => Promise<{ success: boolean; data?: any; error?: string }>;
    };
  }
}

export interface PrintSettings {
  showCode: boolean;
  showLocation: boolean;
  showUnit: boolean;
  showNotes: boolean;
  showFooterSignatures: boolean;
}

export interface CompanyInfo {
  name: string;
  address: string;
  phone: string;
  logo: string | null;
  dbName?: string; 
  dbPath?: string; // Path to local file
  dbType?: 'json' | 'excel' | 'sqlite'; // Type of local file
  language?: 'ar' | 'en'; 
  printSettings?: PrintSettings; 
}

export interface User {
  id: string;
  username: string;
  pin: string; // Password or PIN
  role: 'admin' | 'user'; // Admin has full access, User depends on permissions
  fullName?: string;
  permissions: ViewType[]; // List of allowed View IDs
  isActive: boolean;
}

export interface InventoryItem {
  id: string;
  code: string; 
  name: string; 
  nameEn?: string; 
  location?: string;
  category: string;
  
  hasSubUnits: boolean;
  majorUnit: string; 
  minorUnit?: string; 
  factor: number; 
  
  priceMajor: number; 
  priceMinor: number; 
  costMajor: number; 
  supplierDiscount: number; // Initial discount (reference)
  averageDiscount: number; // Calculated Weighted Average Discount
  
  systemStock: number; 
  actualStock: number;
  stocktakeExpiry?: string; // Stores MM/YYYY or YYYY-MM-DD
  lastUpdated: string;
}

export interface StocktakeSession {
  id: string;
  date: string;
  timestamp: number;
  totalItems: number;
  stats: {
    matched: number;
    surplus: number;
    shortage: number;
    netValue: number;
    plusValue: number;
    minusValue: number;
  };
  items: {
    id: string;
    code: string;
    name: string;
    systemStock: number;
    actualStock: number;
    cost: number;
    expiry?: string;
  }[];
}

export interface SalesMetric {
  name: string;
  value: number;
  change: number;
  trend: 'up' | 'down';
}

export interface CartItem extends InventoryItem {
  quantity: number;
  selectedUnit: 'major' | 'minor'; 
}

export interface PurchaseRow {
    id: number;
    barcode: string;
    itemId?: string; 
    name: string;
    unit: string;
    selectedUnitType: 'major' | 'minor';
    qty: number;
    price: number;
    discount: number;
    expiry: string;
    location?: string; 
}

export interface PurchaseInvoice {
  id: string;
  vendor: string;
  amount: number;
  date: string;
  status: 'معلق' | 'محول' | 'محذوف' | 'مرتجع';
  rows?: PurchaseRow[];
  warehouse?: string;
  paymentType?: string;
  reference?: string;
}

export interface SalesRow {
  id: number;
  itemId?: string;
  code: string;
  name: string;
  unit: string;
  qty: number;
  price: number;
  discount: number;
  location?: string; 
}

export interface SalesInvoice {
  id: string;
  customerName: string;
  amount: number;
  date: string;
  status: 'مكتمل' | 'مرتجع' | 'محذوف' | 'معلق';
  paymentType: 'نقدي' | 'آجل' | 'توصيل'; 
  rows?: SalesRow[]; 
  discountValue?: number;
  discountType?: 'value' | 'percent';
  extraValue?: number;
}

export interface ReturnItem {
  id: number;
  code: string;
  name: string;
  qty: number;
  price: number;
  total: number;
}

export interface Customer {
  id: number;
  code: string;
  name: string;
  type: 'company' | 'individual';
  phone: string;
  email?: string;
  address?: string;
  balance: number;
  creditLimit?: number;
  paymentDays?: number;
  paymentCycle: 'monthly' | 'weekly' | 'daily' | 'quarterly';
  collectionDay: string;
  notes?: string;
  photo?: string | null;
}

export interface Supplier {
  id: number;
  code: string;
  name: string;
  type: 'company' | 'individual';
  phone: string;
  email?: string;
  address?: string;
  balance: number; // الرصيد (للمورد = دائن)
  taxNumber?: string;
  paymentDays?: number;
  notes?: string;
  photo?: string | null;
}

export interface CashReceipt {
  id: string;
  date: string;
  amount: number;
  payer: string;
  description: string;
  method: 'نقدي' | 'شيك' | 'تحويل بنكي';
  costCenter?: string;
  timestamp: number;
}

export interface CashPayment {
  id: string;
  date: string;
  amount: number;
  receiver: string; // اسم المدفوع له
  description: string;
  method: 'نقدي' | 'شيك' | 'تحويل بنكي';
  costCenter?: string;
  timestamp: number;
}
