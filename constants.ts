
import { InventoryItem, SalesMetric, PurchaseInvoice, PurchaseRow, SalesInvoice, SalesRow } from './types';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  Users, 
  ClipboardList, 
  BarChart3, 
  Settings, 
  Truck,
  Ruler,
  Wallet,
  Factory
} from 'lucide-react';

export const NAV_ITEMS = [
  { id: 'dashboard', label: 'لوحة التحكم', icon: LayoutDashboard },
  { 
    id: 'sales', 
    label: 'المبيعات', 
    icon: ShoppingCart,
    subItems: [
      { id: 'sales_new', label: 'فاتورة مبيعات' },
      { id: 'sales_list', label: 'سجل المبيعات' },
      { id: 'sales_detailed', label: 'قائمة مبيعات تفصيلية' },
      { id: 'sales_returns', label: 'إضافة مرتجع' },
      { id: 'sales_returns_list', label: 'سجل المرتجعات' },
    ]
  },
  { 
    id: 'purchases', 
    label: 'المشتريات', 
    icon: Truck,
    subItems: [
      { id: 'purchases_register', label: 'تسجيل مشتريات' },
      { id: 'purchases_list', label: 'قائمة المشتريات' },
      { id: 'purchases_returns', label: 'إضافة مرتجع' },
      { id: 'purchases_returns_list', label: 'سجل المرتجعات' },
      { id: 'purchases_match', label: 'مطابقة اصناف' },
    ]
  },
  { 
    id: 'customers', 
    label: 'العملاء', 
    icon: Users,
    subItems: [
      { id: 'customers_new', label: 'إضافة عميل' },
      { id: 'customers_list', label: 'دليل العملاء' },
      { id: 'customers_statement', label: 'كشف حساب عميل' },
    ]
  },
  { 
    id: 'suppliers', 
    label: 'الموردين', 
    icon: Factory,
    subItems: [
      { id: 'suppliers_new', label: 'إضافة مورد' },
      { id: 'suppliers_list', label: 'دليل الموردين' },
      { id: 'suppliers_statement', label: 'كشف حساب مورد' },
    ]
  },
  {
    id: 'accounting',
    label: 'الحسابات',
    icon: Wallet,
    subItems: [
      { id: 'accounting_receipt', label: 'استلام نقدية' },
      { id: 'accounting_payment', label: 'دفع نقدية' },
      { id: 'accounting_receipt_list', label: 'قائمة استلام نقدية' },
      { id: 'accounting_payment_list', label: 'قائمة دفع نقدية' },
      { id: 'accounting_expense', label: 'تسجيل خصم وصرف' },
      { id: 'accounting_expense_list', label: 'قائمة الخصومات والمصروفات' },
      { id: 'accounting_payroll', label: 'تسجيل المرتبات' },
    ]
  },
  { 
    id: 'inventory', 
    label: 'المخزون', 
    icon: Package,
    subItems: [
      { id: 'inventory_list', label: 'قائمة الأصناف' },
      { id: 'inventory_add', label: 'إضافة صنف (بطاقة)' },
      { id: 'inventory_quick_entry', label: 'تسجيل سريع (جدول)' },
      { id: 'inventory_movements', label: 'حركة المخزون' },
      { id: 'inventory_units', label: 'وحدات القياس' },
    ]
  },
  { 
    id: 'stocktake', 
    label: 'الجرد', 
    icon: ClipboardList,
    subItems: [
      { id: 'stocktake_new', label: 'جرد جديد' },
      { id: 'stocktake_list', label: 'قائمة الجرد' },
      { id: 'stocktake_adjust', label: 'تسوية مخزنية' },
    ]
  },
  { 
    id: 'reports', 
    label: 'التقارير', 
    icon: BarChart3,
    subItems: [
      { id: 'reports_shortage', label: 'نواقص المخزون' },
      { id: 'reports_expiry', label: 'تقرير الصلاحية' },
      { id: 'reports_general', label: 'تقارير عامة' },
    ]
  },
  { 
    id: 'settings', 
    label: 'الإعدادات', 
    icon: Settings,
    subItems: [
      { id: 'settings_company', label: 'بيانات الشركة' },
      { id: 'settings_users', label: 'المستخدمين' },
      { id: 'settings_database', label: 'قاعدة البيانات' },
      { id: 'settings_general', label: 'إعدادات عامة' },
    ]
  },
] as const;

// --- ZERO DATA START ---
export const INITIAL_INVENTORY: InventoryItem[] = [];
export const MOCK_INVOICES: PurchaseInvoice[] = [];
export const MOCK_SALES: SalesInvoice[] = [];
// --- ZERO DATA END ---

export const MOCK_METRICS: SalesMetric[] = [
  { name: 'المبيعات اليومية', value: 0, change: 0, trend: 'up' },
  { name: 'عدد الفواتير', value: 0, change: 0, trend: 'down' },
  { name: 'أرباح اليوم', value: 0, change: 0, trend: 'up' },
];

export const SALES_DATA = [
  { name: '08:00', sales: 0 },
  { name: '10:00', sales: 0 },
  { name: '12:00', sales: 0 },
  { name: '14:00', sales: 0 },
  { name: '16:00', sales: 0 },
  { name: '18:00', sales: 0 },
  { name: '20:00', sales: 0 },
];
