
import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as XLSX from 'xlsx'; 
import { ViewType, InventoryItem, CompanyInfo, PurchaseInvoice, SalesInvoice, Customer, Supplier, StocktakeSession, CashReceipt, CashPayment, User } from './types';
import { NAV_ITEMS, INITIAL_INVENTORY, MOCK_INVOICES, MOCK_SALES } from './constants';
import { Stocktake } from './components/Stocktake';
import { StocktakeReport } from './components/StocktakeReport';
import { Dashboard } from './components/Dashboard';
import { Sales } from './components/Sales';
import { SalesInvoice as SalesInvoiceForm } from './components/SalesInvoice';
import { SalesList } from './components/SalesList';
import { DetailedSalesList } from './components/DetailedSalesList'; 
import { SalesReturns } from './components/SalesReturns'; 
import { SalesReturnsList } from './components/SalesReturnsList';
import { PurchaseReturns } from './components/PurchaseReturns'; 
import { PurchaseReturnsList } from './components/PurchaseReturnsList';
import { PurchaseRegister } from './components/PurchaseRegister';
import { PurchaseList } from './components/PurchaseList';
import { InventoryAdd } from './components/InventoryAdd';
import { InventoryQuickEntry } from './components/InventoryQuickEntry'; // Import New Component
import { InventoryUnits } from './components/InventoryUnits';
import { InventoryList } from './components/InventoryList';
import { SettingsDatabase } from './components/SettingsDatabase'; 
import { SettingsCompany } from './components/SettingsCompany';
import { SettingsUsers } from './components/SettingsUsers';
import { CustomersNew } from './components/CustomersNew'; 
import { CustomersList } from './components/CustomersList'; 
import { CustomerStatement } from './components/CustomerStatement';
import { SuppliersNew } from './components/SuppliersNew';
import { SuppliersList } from './components/SuppliersList';
import { SupplierStatement } from './components/SupplierStatement';
import { ShortageReport } from './components/ShortageReport';
import { ExpiryReport } from './components/ExpiryReport';
import { AccountingReceipt } from './components/AccountingReceipt';
import { AccountingReceiptList } from './components/AccountingReceiptList';
import { AccountingPayment } from './components/AccountingPayment';
import { AccountingPaymentList } from './components/AccountingPaymentList';
import { Login } from './components/Login';
import { Bell, LogOut, ChevronDown, Upload, Save, Building2, Languages, Printer, Database, Wallet, User as UserIcon, Plus, X, CircleDot, FileText } from 'lucide-react';

export function App() {
  const [activeView, setActiveView] = useState<ViewType>('dashboard'); 
  const [time, setTime] = useState(new Date().toLocaleTimeString('ar-EG'));

  // --- Multi-Database Management ---
  const [dbList, setDbList] = useState<string[]>(() => {
      const saved = localStorage.getItem('nightmare_db_list');
      return saved ? JSON.parse(saved) : ['default'];
  });

  const [activeDb, setActiveDb] = useState<string>(() => {
      return localStorage.getItem('nightmare_active_db') || 'default';
  });

  // State - Start ALL Empty
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [purchaseInvoices, setPurchaseInvoices] = useState<PurchaseInvoice[]>([]);
  const [salesInvoices, setSalesInvoices] = useState<SalesInvoice[]>([]);
  const [stocktakeHistory, setStocktakeHistory] = useState<StocktakeSession[]>([]); 
  const [units, setUnits] = useState<string[]>(["قطعة", "علبة", "كرتونة", "كيلو", "لتر"]);
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>({
    name: 'اسم الشركة', address: '', phone: '', logo: null, dbName: 'default'
  });
  
  // Users State
  const [users, setUsers] = useState<User[]>([
      { id: '1', username: 'admin', pin: '1234', role: 'admin', fullName: 'المدير العام', permissions: [], isActive: true }
  ]);
  
  // Auth State
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Customers State
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [focusedCustomerId, setFocusedCustomerId] = useState<number>(0); 

  // Suppliers State
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [focusedSupplierId, setFocusedSupplierId] = useState<number>(0);

  // Accounting State
  const [receipts, setReceipts] = useState<CashReceipt[]>([]);
  const [selectedReceipt, setSelectedReceipt] = useState<CashReceipt | null>(null);

  const [payments, setPayments] = useState<CashPayment[]>([]);
  const [selectedPayment, setSelectedPayment] = useState<CashPayment | null>(null);

  // Selection States
  const [selectedInvoice, setSelectedInvoice] = useState<PurchaseInvoice | null>(null);
  const [selectedSale, setSelectedSale] = useState<SalesInvoice | null>(null);
  const [selectedStocktake, setSelectedStocktake] = useState<StocktakeSession | null>(null);

  // --- Purchase Sessions (Multi-Tabs) ---
  interface PurchaseSession {
      id: string; // Unique Session ID (e.g. 'tab-1', 'tab-2')
      label: string; // Tab Label (e.g. 'New Invoice', 'Edit #1005')
      data: PurchaseInvoice | null; // Current Invoice Data (Draft)
      isModified: boolean;
      mode: 'new' | 'edit'; // ADDED: To track if this is a new sequence or editing existing
  }
  const [purchaseSessions, setPurchaseSessions] = useState<PurchaseSession[]>([
      { id: 'tab-1', label: 'فاتورة جديدة', data: null, isModified: false, mode: 'new' }
  ]);
  const [activeSessionId, setActiveSessionId] = useState<string>('tab-1');

  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  
  // UI State for Navigation
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const navRef = useRef<HTMLElement>(null);
  
  const isInitialMount = useRef(true);

  // --- ID GENERATION HELPERS ---
  const getNextSaleId = () => { if (salesInvoices.length === 0) return 1; const ids = salesInvoices.map(inv => parseInt(inv.id) || 0); return Math.max(...ids) + 1; };
  const getNextPurchaseId = () => { if (purchaseInvoices.length === 0) return 1; const ids = purchaseInvoices.map(inv => parseInt(inv.id) || 0); return Math.max(...ids) + 1; };
  const getNextReceiptId = () => { if (receipts.length === 0) return 'REC-1001'; const ids = receipts.map(r => parseInt(r.id.split('-')[1]) || 0); return `REC-${Math.max(...ids) + 1}`; };
  const getNextPaymentId = () => { if (payments.length === 0) return 'PAY-1001'; const ids = payments.map(p => parseInt(p.id.split('-')[1]) || 0); return `PAY-${Math.max(...ids) + 1}`; };
  const getNextCustomerCode = () => { if (customers.length === 0) return 'CUS-1001'; const codes = customers.map(c => parseInt(c.code.split('-')[1]) || 0); return `CUS-${Math.max(...codes) + 1}`; };
  const getNextSupplierCode = () => { if (suppliers.length === 0) return 'SUP-1001'; const codes = suppliers.map(s => parseInt(s.code.split('-')[1]) || 0); return `SUP-${Math.max(...codes) + 1}`; };
  
  // --- ADDED: Stocktake ID Generator ---
  const getNextStocktakeId = () => {
      if (stocktakeHistory.length === 0) return 1;
      const ids = stocktakeHistory.map(s => parseInt(s.id) || 0);
      return Math.max(...ids) + 1;
  };

  // ... (Keep Auth & Navigation & Database Logic as is) ...
  useEffect(() => { const savedUserStr = localStorage.getItem('nightmare_session_user'); if (savedUserStr) { try { const savedUser = JSON.parse(savedUserStr); setCurrentUser(savedUser); } catch(e) { localStorage.removeItem('nightmare_session_user'); } } }, []);
  const handleLogin = (username: string, pin: string) => { const user = users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.pin === pin); if (user) { if (!user.isActive) { alert('هذا الحساب معطل. يرجى مراجعة المسؤول.'); return false; } setCurrentUser(user); localStorage.setItem('nightmare_session_user', JSON.stringify(user)); if (user.role === 'admin') setActiveView('dashboard'); else if (user.permissions.length > 0) setActiveView(user.permissions[0]); else setActiveView('dashboard'); return true; } return false; };
  const handleLogout = () => { setCurrentUser(null); localStorage.removeItem('nightmare_session_user'); };
  const allowedNavItems = useMemo(() => { if (!currentUser) return []; if (currentUser.role === 'admin') return NAV_ITEMS; return NAV_ITEMS.map(item => { const hasParentAccess = currentUser.permissions.includes(item.id as ViewType); let allowedSubItems: any[] = []; if ('subItems' in item) { allowedSubItems = item.subItems.filter((sub: any) => currentUser.permissions.includes(sub.id as ViewType)); } if (hasParentAccess || allowedSubItems.length > 0) { return { ...item, subItems: allowedSubItems.length > 0 ? allowedSubItems : undefined }; } return null; }).filter(item => item !== null); }, [currentUser]);
  useEffect(() => { const handleClickOutside = (event: MouseEvent) => { if (navRef.current && !navRef.current.contains(event.target as Node)) { setOpenMenu(null); } }; document.addEventListener('mousedown', handleClickOutside); return () => document.removeEventListener('mousedown', handleClickOutside); }, []);
  useEffect(() => { const loadData = async () => { const savedCompany = localStorage.getItem(`nightmare_${activeDb}_company`); let currentCompanyInfo = savedCompany ? JSON.parse(savedCompany) : null; if (currentCompanyInfo?.dbPath && window.electron) { try { if (currentCompanyInfo.dbType === 'sqlite') { const result = await window.electron.importSQLite(currentCompanyInfo.dbPath); if (result.success && result.data) { setInventory(result.data.inventory || []); setSalesInvoices(result.data.salesInvoices || []); setPurchaseInvoices(result.data.purchaseInvoices || []); setStocktakeHistory(result.data.stocktakeHistory || []); setUnits(result.data.units || []); setCompanyInfo({ ...result.data.companyInfo, dbPath: currentCompanyInfo.dbPath, dbType: 'sqlite' }); } else { loadFromLocalStorage(); } return; } const result = await window.electron.readFile(currentCompanyInfo.dbPath); if (result.success) { if (result.ext === '.json') { const json = JSON.parse(atob(result.data)); setInventory(json.inventory || []); setSalesInvoices(json.salesInvoices || []); setPurchaseInvoices(json.purchaseInvoices || []); setStocktakeHistory(json.stocktakeHistory || []); setUnits(json.units || []); setReceipts(json.receipts || []); setPayments(json.payments || []); setCustomers(json.customers || []); setSuppliers(json.suppliers || []); setUsers(json.users || users); setCompanyInfo({ ...json.companyInfo, dbPath: currentCompanyInfo.dbPath, dbType: 'json' }); } } else { loadFromLocalStorage(); } } catch (e) { loadFromLocalStorage(); } } else { loadFromLocalStorage(); } }; loadData(); isInitialMount.current = false; }, [activeDb]);
  const loadFromLocalStorage = () => { const getKey = (k: string) => `nightmare_${activeDb}_${k}`; const ls = <T,>(k: string, d: T): T => { const s = localStorage.getItem(getKey(k)); return s ? JSON.parse(s) : d; }; setInventory(ls('inventory', [])); setPurchaseInvoices(ls('purchases', [])); setSalesInvoices(ls('sales', [])); setStocktakeHistory(ls('stocktake', [])); setReceipts(ls('receipts', [])); setPayments(ls('payments', [])); setCustomers(ls('customers', [])); setSuppliers(ls('suppliers', [])); setUsers(ls('users', users)); setUnits(ls('units', ["قطعة", "علبة", "كرتونة"])); setCompanyInfo(ls('company', { name: 'My Company', address: '', phone: '', logo: null, dbName: activeDb })); }
  useEffect(() => { if (isInitialMount.current) return; const saveData = async () => { setSaveStatus('saving'); const getKey = (k: string) => `nightmare_${activeDb}_${k}`; localStorage.setItem(getKey('inventory'), JSON.stringify(inventory)); localStorage.setItem(getKey('purchases'), JSON.stringify(purchaseInvoices)); localStorage.setItem(getKey('sales'), JSON.stringify(salesInvoices)); localStorage.setItem(getKey('stocktake'), JSON.stringify(stocktakeHistory)); localStorage.setItem(getKey('receipts'), JSON.stringify(receipts)); localStorage.setItem(getKey('payments'), JSON.stringify(payments)); localStorage.setItem(getKey('customers'), JSON.stringify(customers)); localStorage.setItem(getKey('suppliers'), JSON.stringify(suppliers)); localStorage.setItem(getKey('users'), JSON.stringify(users)); localStorage.setItem(getKey('company'), JSON.stringify(companyInfo)); localStorage.setItem(getKey('units'), JSON.stringify(units)); localStorage.setItem('nightmare_active_db', activeDb); if (companyInfo.dbPath && window.electron) { try { if (companyInfo.dbType === 'sqlite') { const fullData = { inventory, salesInvoices, purchaseInvoices, stocktakeHistory, companyInfo, units }; await window.electron.exportSQLite(companyInfo.dbPath, fullData); } else if (companyInfo.dbType === 'json') { const fullData = { inventory, salesInvoices, purchaseInvoices, stocktakeHistory, companyInfo, units, receipts, payments, customers, suppliers, users }; await window.electron.writeFile(companyInfo.dbPath, JSON.stringify(fullData, null, 2), false); } setSaveStatus('saved'); } catch (e) { setSaveStatus('error'); } } else { setSaveStatus('saved'); } }; const timeout = setTimeout(saveData, 2000); return () => clearTimeout(timeout); }, [inventory, purchaseInvoices, salesInvoices, stocktakeHistory, companyInfo, units, receipts, payments, customers, suppliers, users, activeDb]);

  // --- LOGIC: Purchase Sessions (Tabs) ---
  const handleCreateNewSession = () => {
      const newId = `tab-${Date.now()}`;
      setPurchaseSessions(prev => [
          ...prev, 
          { id: newId, label: 'فاتورة جديدة', data: null, isModified: false, mode: 'new' }
      ]);
      setActiveSessionId(newId);
  };

  const handleCloseSession = (id: string, e?: React.MouseEvent) => {
      if (e) e.stopPropagation();
      if (purchaseSessions.length === 1) {
          if (purchaseSessions[0].isModified) {
              if (!window.confirm('هناك تغييرات غير محفوظة في الفاتورة الأخيرة. هل تريد مسحها؟')) return;
          }
          setPurchaseSessions([{ id: 'tab-1', label: 'فاتورة جديدة', data: null, isModified: false, mode: 'new' }]);
          setActiveSessionId('tab-1');
          return;
      }
      const session = purchaseSessions.find(s => s.id === id);
      if (session?.isModified) {
          if (!window.confirm(`الفاتورة "${session.label}" غير محفوظة. هل تريد إغلاقها؟`)) return;
      }
      const newSessions = purchaseSessions.filter(s => s.id !== id);
      setPurchaseSessions(newSessions);
      if (activeSessionId === id) {
          setActiveSessionId(newSessions[newSessions.length - 1].id);
      }
  };

  const handleUpdateSessionData = (data: PurchaseInvoice) => {
      setPurchaseSessions(prev => prev.map(s => {
          if (s.id === activeSessionId) {
              const label = s.mode === 'edit' ? `تعديل #${data.id}` : 'فاتورة جديدة';
              return { ...s, data, label, isModified: true };
          }
          return s;
      }));
  };

  // --- Business Logic Helper: Calculate Inventory Change ---
  // Operation 'deduct': for SALES (Completed)
  // Operation 'add': for PURCHASES (Converted) OR reversing Sales (Deleting Sale / Return)
  const updateInventoryForSale = (currentInv: InventoryItem[], invoice: SalesInvoice, operation: 'deduct' | 'add'): InventoryItem[] => {
      if (!invoice.rows) return currentInv;
      const newInv = [...currentInv];
      
      invoice.rows.forEach(row => {
          const idx = newInv.findIndex(i => i.id === row.itemId || i.code === row.code);
          if (idx > -1) {
              const item = newInv[idx];
              // Normalize Qty if sold in Minor Unit
              let qty = row.qty;
              if (item.hasSubUnits && item.factor > 1 && row.unit !== item.majorUnit) {
                  qty = qty / item.factor;
              }
              
              const change = operation === 'add' ? qty : -qty;
              const newStock = Math.max(0, item.actualStock + change);
              newInv[idx] = { ...item, actualStock: newStock, systemStock: newStock };
          }
      });
      return newInv;
  };

  // --- HANDLER: Save Sale (New or Edit) ---
  const handleSaveSale = (invoice: SalesInvoice) => {
      // 1. Check stock for NEW/COMPLETED invoice only if we are deducting
      if (invoice.status === 'مكتمل' && invoice.rows) {
          for (const row of invoice.rows) {
              const item = inventory.find(i => i.id === row.itemId || i.code === row.code);
              // Only check if we are making a NEW deduction or increasing deduction (simplified: just check current stock for now)
              if (item && item.actualStock < row.qty) {
                  // Allow negative stock but warn (or block depending on policy)
                  // For now, we allow but alert already shown in component
              }
          }
      }

      const existingIndex = salesInvoices.findIndex(inv => inv.id === invoice.id);
      let newInventory = [...inventory];
      let newReceipts = [...receipts];
      let newCustomers = [...customers];

      // A. REVERT Old Invoice Effect (If it existed and was Completed)
      // This step handles "Suspending" indirectly. If I edit a 'Completed' invoice to 'Pending',
      // I first REVERT the 'Completed' effect here, then apply the 'Pending' effect (which is nothing).
      if (existingIndex > -1) {
          const oldInvoice = salesInvoices[existingIndex];
          
          // 1. Revert Stock (Add back) if it was completed
          if (oldInvoice.status === 'مكتمل') {
              newInventory = updateInventoryForSale(newInventory, oldInvoice, 'add');
          }

          // 2. Revert Financials
          // Remove old auto-receipt if it was cash
          if (oldInvoice.paymentType === 'نقدي') {
              const autoDesc = `سداد تلقائي - فاتورة مبيعات رقم ${oldInvoice.id}`;
              newReceipts = newReceipts.filter(r => r.description !== autoDesc);
          }
          // Reduce customer balance if it was credit
          if (oldInvoice.paymentType === 'آجل' && oldInvoice.customerName) {
              const custIdx = newCustomers.findIndex(c => c.name === oldInvoice.customerName);
              if (custIdx > -1) {
                  newCustomers[custIdx] = { ...newCustomers[custIdx], balance: newCustomers[custIdx].balance - oldInvoice.amount };
              }
          }
      }

      // B. APPLY New Invoice Effect
      // 1. Apply Stock (Deduct) ONLY if status is Completed
      if (invoice.status === 'مكتمل') {
          newInventory = updateInventoryForSale(newInventory, invoice, 'deduct');
      }

      // 2. Apply Financials ONLY if status is Completed
      if (invoice.status === 'مكتمل') { 
          if (invoice.paymentType === 'نقدي') {
              const autoDesc = `سداد تلقائي - فاتورة مبيعات رقم ${invoice.id}`;
              const newReceipt: CashReceipt = { 
                  id: getNextReceiptId(), 
                  date: invoice.date, 
                  amount: invoice.amount, 
                  payer: invoice.customerName, 
                  description: autoDesc, 
                  method: 'نقدي', 
                  timestamp: Date.now() 
              };
              // Add to receipts
              newReceipts.push(newReceipt);
          } else if (invoice.paymentType === 'آجل' && invoice.customerName) {
              const custIdx = newCustomers.findIndex(c => c.name === invoice.customerName);
              if (custIdx > -1) {
                  newCustomers[custIdx] = { ...newCustomers[custIdx], balance: newCustomers[custIdx].balance + invoice.amount };
              }
          }
      }

      // C. Update State
      setInventory(newInventory);
      setReceipts(newReceipts);
      setCustomers(newCustomers);

      if (existingIndex > -1) {
          setSalesInvoices(prev => prev.map(inv => inv.id === invoice.id ? invoice : inv));
      } else {
          setSalesInvoices(prev => [invoice, ...prev]);
      }

      setSelectedSale(null);
      // Removed setActiveView('sales_list') to stay on screen or allow next sale
  };

  // --- HANDLER: Delete Sale ---
  const handleDeleteSale = (id: string) => {
      const invoice = salesInvoices.find(inv => inv.id === id);
      if (!invoice) return;
      
      if (!window.confirm('هل أنت متأكد من حذف هذه الفاتورة؟ سيتم استرجاع المخزون وإلغاء التأثير المالي.')) return;

      let newInventory = [...inventory];
      let newReceipts = [...receipts];
      let newCustomers = [...customers];

      // 1. Revert Stock if it was completed
      if (invoice.status === 'مكتمل') {
          newInventory = updateInventoryForSale(newInventory, invoice, 'add');
      }

      // 2. Revert Financials if it was completed
      if (invoice.status === 'مكتمل') {
          if (invoice.paymentType === 'نقدي') {
              const autoDesc = `سداد تلقائي - فاتورة مبيعات رقم ${invoice.id}`;
              newReceipts = newReceipts.filter(r => r.description !== autoDesc);
          } else if (invoice.paymentType === 'آجل' && invoice.customerName) {
              const custIdx = newCustomers.findIndex(c => c.name === invoice.customerName);
              if (custIdx > -1) {
                  newCustomers[custIdx] = { ...newCustomers[custIdx], balance: newCustomers[custIdx].balance - invoice.amount };
              }
          }
      }

      setInventory(newInventory);
      setReceipts(newReceipts);
      setCustomers(newCustomers);
      
      // Mark as deleted instead of removing (to keep ID sequence if needed, or filter out)
      setSalesInvoices(prev => prev.map(inv => inv.id === id ? { ...inv, status: 'محذوف', amount: 0, rows: [] } : inv));
  };

  // --- HANDLER: Sales Returns ---
  const handleSaveSalesReturn = (returnInvoice: SalesInvoice) => {
      // Add return invoice to list
      setSalesInvoices(prev => [returnInvoice, ...prev]);
      
      // Update Inventory (Add items back)
      // Since it's a "Return", we ADD to stock
      const newInventory = updateInventoryForSale(inventory, returnInvoice, 'add');
      setInventory(newInventory);

      // Update Customer Balance (Reduce debt if Credit Sale originally, or Create Refund?)
      // Usually Returns reduce the customer's balance (Credit Note)
      if (returnInvoice.customerName) {
          setCustomers(prev => prev.map(c => {
              if (c.name === returnInvoice.customerName) {
                  return { ...c, balance: c.balance - returnInvoice.amount };
              }
              return c;
          }));
      }

      setActiveView('sales_list');
  };

  // --- HANDLER: Quick Return from Detailed List ---
  const handleQuickReturn = (invoiceId: string, itemCode: string, qty: number) => {
      // 1. Find Original Invoice
      const originalInvoice = salesInvoices.find(inv => inv.id === invoiceId);
      if (!originalInvoice) return;

      // 2. Find Item in Row
      const row = originalInvoice.rows?.find(r => r.code === itemCode);
      if (!row) return;

      // 3. Create Return Invoice
      const returnInvoice: SalesInvoice = {
          id: `RET-${invoiceId}-${Date.now().toString().slice(-4)}`,
          date: new Date().toLocaleDateString('en-GB'),
          customerName: originalInvoice.customerName,
          amount: row.price * qty,
          status: 'مرتجع',
          paymentType: originalInvoice.paymentType,
          rows: [{ ...row, qty: qty }] // Only returned items
      };

      // 4. Update State
      setSalesInvoices(prev => [returnInvoice, ...prev]);
      
      // Update Inventory
      setInventory(prev => updateInventoryForSale(prev, returnInvoice, 'add'));

      // Update Customer
      if (originalInvoice.customerName) {
          setCustomers(prev => prev.map(c => {
              if (c.name === originalInvoice.customerName) {
                  return { ...c, balance: c.balance - returnInvoice.amount };
              }
              return c;
          }));
      }
  };
  
  // --- Purchase Logic (Existing) ---
  const calculateNewInventory = (currentInventory: InventoryItem[], invoice: PurchaseInvoice, operation: 'add' | 'reverse'): { newInventory: InventoryItem[], changed: boolean } => { let tempInventory = [...currentInventory]; let changed = false; if (invoice.rows) { invoice.rows.forEach(row => { const itemIndex = tempInventory.findIndex(i => i.id === row.itemId || i.code === row.barcode); if (itemIndex > -1) { const item = tempInventory[itemIndex]; let rowQty = row.qty; let rowPriceMajor = row.price; if (item.hasSubUnits && item.factor > 0 && row.selectedUnitType === 'minor') { rowQty = row.qty / item.factor; rowPriceMajor = row.price * item.factor; } const rowDiscount = row.discount || 0; const sign = operation === 'add' ? 1 : -1; const oldStock = item.actualStock; const newStock = Math.max(0, oldStock + (rowQty * sign)); let newCostMajor = item.costMajor; let newAvgDiscount = item.averageDiscount; if (newStock > 0) { const oldTotalCostVal = oldStock * item.costMajor; const transactionCostVal = rowQty * rowPriceMajor; const oldTotalDiscWeight = oldStock * item.averageDiscount; const transDiscWeight = rowQty * rowDiscount; const newTotalCostVal = oldTotalCostVal + (sign * transactionCostVal); const newTotalDiscWeight = oldTotalDiscWeight + (sign * transDiscWeight); newCostMajor = Math.max(0, newTotalCostVal / newStock); newAvgDiscount = Math.max(0, newTotalDiscWeight / newStock); } else { if (operation === 'add') { newCostMajor = rowPriceMajor; newAvgDiscount = rowDiscount; } } tempInventory[itemIndex] = { ...item, actualStock: newStock, systemStock: newStock, costMajor: parseFloat(newCostMajor.toFixed(2)), averageDiscount: parseFloat(newAvgDiscount.toFixed(2)), lastUpdated: new Date().toISOString().split('T')[0] }; changed = true; } }); } return { newInventory: tempInventory, changed }; };
  const handleSavePurchase = (invoice: PurchaseInvoice) => { 
      if (invoice.status === 'محول' && invoice.rows) { for (const row of invoice.rows) { if (row.qty <= 0) { alert(`خطأ: الكمية 0 للصنف: ${row.name}`); return; } } } 
      const existingInvoiceIndex = purchaseInvoices.findIndex(inv => inv.id === invoice.id); 
      let currentInvState = [...inventory]; 
      if (existingInvoiceIndex > -1) { 
          const oldInvoice = purchaseInvoices[existingInvoiceIndex]; 
          if (oldInvoice.status === 'محول') { const { newInventory } = calculateNewInventory(currentInvState, oldInvoice, 'reverse'); currentInvState = newInventory; } 
      } 
      if (invoice.status === 'محول') { const { newInventory } = calculateNewInventory(currentInvState, invoice, 'add'); currentInvState = newInventory; } 
      setInventory(currentInvState); 
      if (existingInvoiceIndex > -1) { setPurchaseInvoices(prev => prev.map(inv => inv.id === invoice.id ? invoice : inv)); } else { setPurchaseInvoices(prev => [invoice, ...prev]); } 
      if (invoice.paymentType === 'آجل' && invoice.vendor) { 
          if (existingInvoiceIndex === -1) { setSuppliers(prev => prev.map(s => { if (s.name === invoice.vendor) { return { ...s, balance: s.balance + invoice.amount }; } return s; })); } 
          else { const oldAmount = purchaseInvoices[existingInvoiceIndex].amount; setSuppliers(prev => prev.map(s => { if (s.name === invoice.vendor) { return { ...s, balance: s.balance - oldAmount + invoice.amount }; } return s; })); } 
      } 
      if (invoice.status === 'محول' || invoice.status === 'محذوف') {
          setPurchaseSessions(prev => {
              const remaining = prev.filter(s => s.id !== activeSessionId);
              if (remaining.length === 0) {
                  const newId = `tab-${Date.now()}`;
                  setTimeout(() => setActiveSessionId(newId), 0);
                  return [{ id: newId, label: 'فاتورة جديدة', data: null, isModified: false, mode: 'new' }];
              }
              setTimeout(() => setActiveSessionId(remaining[remaining.length - 1].id), 0);
              return remaining;
          });
      } else {
          setPurchaseSessions(prev => prev.map(s => s.id === activeSessionId ? { ...s, isModified: false, label: `معلق #${invoice.id}` } : s));
      }
  };

  const handleDeleteInvoice = (id: string) => { if (!window.confirm('هل أنت متأكد من حذف هذه الفاتورة؟ سيتم عكس تأثيرها على المخزون.')) return; const invoice = purchaseInvoices.find(inv => inv.id === id); if (!invoice) return; if (invoice.status === 'محول') { const { newInventory, changed } = calculateNewInventory(inventory, invoice, 'reverse'); if (changed) setInventory(newInventory); } setPurchaseInvoices(prev => prev.map(inv => inv.id === id ? { ...inv, status: 'محذوف', amount: 0, rows: [] } : inv)); if (invoice.paymentType === 'آجل' && invoice.vendor) { setSuppliers(prev => prev.map(s => { if (s.name === invoice.vendor) { return { ...s, balance: s.balance - invoice.amount }; } return s; })); } };
  const handleSavePurchaseReturn = (returnInvoice: PurchaseInvoice) => { setPurchaseInvoices(prev => [returnInvoice, ...prev]); if (returnInvoice.rows) { const newInventory = [...inventory]; let stockChanged = false; returnInvoice.rows.forEach(row => { const itemIndex = newInventory.findIndex(i => i.id === row.itemId || i.code === row.barcode); if (itemIndex > -1) { const newStock = Math.max(0, newInventory[itemIndex].actualStock - row.qty); newInventory[itemIndex] = { ...newInventory[itemIndex], actualStock: newStock, systemStock: newStock }; stockChanged = true; } }); if (stockChanged) setInventory(newInventory); } if (returnInvoice.paymentType === 'آجل') { setSuppliers(prev => prev.map(s => { if (s.name === returnInvoice.vendor) { return { ...s, balance: s.balance - returnInvoice.amount }; } return s; })); } setActiveView('purchases_list'); };

  // --- STOCKTAKE HANDLERS ---
  const handleSaveStocktakeSession = (session: StocktakeSession) => { setStocktakeHistory(prev => [session, ...prev]); setSelectedStocktake(null); setActiveView('stocktake_list'); };
  const handleOpenStocktake = (session: StocktakeSession) => { setSelectedStocktake(session); setActiveView('stocktake_new'); };
  const handleDeleteStocktake = (id: string) => { if (window.confirm('هل أنت متأكد من حذف محضر الجرد هذا؟ (للعلم: هذا لا يعكس التأثير المخزني تلقائياً، فقط يحذف السجل)')) { setStocktakeHistory(prev => prev.filter(s => s.id !== id)); } };

  // ... (Other handlers) ...
  const handleUpdateInventory = (id: string, updates: Partial<InventoryItem>) => { setInventory(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item)); };
  const handleAddItem = (newItem: InventoryItem) => setInventory(prev => [...prev, newItem]);
  const handleAddItemsBulk = (newItems: InventoryItem[]) => setInventory(prev => [...prev, ...newItems]); // Bulk Add
  const handleEditItem = (updatedItem: InventoryItem) => setInventory(prev => prev.map(item => item.id === updatedItem.id ? updatedItem : item));
  const handleDeleteItem = (id: string) => { if (window.confirm('حذف نهائي؟')) setInventory(prev => prev.filter(item => item.id !== id)); };
  const handleImportInventory = (newItems: InventoryItem[]) => setInventory(prev => [...prev, ...newItems]);
  
  // Open Invoice in a NEW TAB or focus existing
  const handleOpenInvoice = (invoice: PurchaseInvoice) => { 
      const existingSession = purchaseSessions.find(s => s.data?.id === invoice.id);
      if (existingSession) {
          setActiveSessionId(existingSession.id);
          setActiveView('purchases_register');
          return;
      }
      const newId = `tab-edit-${invoice.id}`;
      setPurchaseSessions(prev => [
          ...prev,
          { id: newId, label: `تعديل #${invoice.id}`, data: invoice, isModified: false, mode: 'edit' }
      ]);
      setActiveSessionId(newId);
      setActiveView('purchases_register'); 
  };

  const handleOpenSale = (invoice: SalesInvoice) => { setSelectedSale(invoice); setActiveView('sales_new'); };
  
  const handleNavigate = (view: ViewType) => {
      if (view === 'sales_new') setSelectedSale(null);
      if (view === 'stocktake_new') setSelectedStocktake(null);
      if (view === 'customers_new') setSelectedCustomer(null);
      if (view === 'suppliers_new') setSelectedSupplier(null);
      if (view === 'accounting_receipt') setSelectedReceipt(null);
      if (view === 'accounting_payment') setSelectedPayment(null);
      
      // Ensure Purchase Register has at least one tab
      if (view === 'purchases_register' && purchaseSessions.length === 0) {
          setPurchaseSessions([{ id: 'tab-1', label: 'فاتورة جديدة', data: null, isModified: false, mode: 'new' }]);
          setActiveSessionId('tab-1');
      }

      setActiveView(view);
      setOpenMenu(null); 
  };
  const handleAddUnit = (u: string) => !units.includes(u) && setUnits(p => [u, ...p]);
  const handleRemoveUnit = (u: string) => setUnits(p => p.filter(x => x !== u));
  const handleEditCustomer = (customer: Customer) => { setSelectedCustomer(customer); setFocusedCustomerId(customer.id); setActiveView('customers_new'); };
  const handleDeleteCustomer = (id: number) => { setCustomers(prev => prev.filter(c => c.id !== id)); };
  const handleSaveCustomer = (customer: Customer) => { setCustomers(prev => { const existing = prev.findIndex(c => c.id === customer.id); if (existing !== -1) { const newCustomers = [...prev]; newCustomers[existing] = customer; return newCustomers; } else { return [...prev, customer]; } }); setFocusedCustomerId(customer.id); };
  const handleEditSupplier = (supplier: Supplier) => { setSelectedSupplier(supplier); setFocusedSupplierId(supplier.id); setActiveView('suppliers_new'); };
  const handleDeleteSupplier = (id: number) => { setSuppliers(prev => prev.filter(s => s.id !== id)); };
  const handleSaveSupplier = (supplier: Supplier) => { setSuppliers(prev => { const existing = prev.findIndex(s => s.id === supplier.id); if (existing !== -1) { const newSuppliers = [...prev]; newSuppliers[existing] = supplier; return newSuppliers; } else { return [...prev, supplier]; } }); setFocusedSupplierId(supplier.id); };
  const handleSaveReceipt = (receipt: CashReceipt) => { setReceipts(prev => { const index = prev.findIndex(r => r.id === receipt.id); if (index !== -1) { const updated = [...prev]; updated[index] = receipt; return updated; } else { const customerIndex = customers.findIndex(c => c.name === receipt.payer); if (customerIndex !== -1) { setCustomers(prevCust => { const newCustomers = [...prevCust]; newCustomers[customerIndex].balance -= receipt.amount; return newCustomers; }); } return [receipt, ...prev]; } }); setSelectedReceipt(null); };
  const handleEditReceipt = (receipt: CashReceipt) => { setSelectedReceipt(receipt); setActiveView('accounting_receipt'); };
  const handleDeleteReceipt = (id: string) => { setReceipts(prev => prev.filter(r => r.id !== id)); };
  const handleSavePayment = (payment: CashPayment) => { setPayments(prev => { const index = prev.findIndex(p => p.id === payment.id); if (index !== -1) { const updated = [...prev]; updated[index] = payment; return updated; } else { const supplierIndex = suppliers.findIndex(s => s.name === payment.receiver); if (supplierIndex !== -1) { setSuppliers(prevSupp => { const newSuppliers = [...prevSupp]; newSuppliers[supplierIndex].balance -= payment.amount; return newSuppliers; }); } return [payment, ...prev]; } }); setSelectedPayment(null); };
  const handleEditPayment = (payment: CashPayment) => { setSelectedPayment(payment); setActiveView('accounting_payment'); };
  const handleDeletePayment = (id: string) => { setPayments(prev => prev.filter(p => p.id !== id)); };
  const handleSaveUser = (user: User) => { setUsers(prev => { const existing = prev.findIndex(u => u.id === user.id); if (existing !== -1) { const updated = [...prev]; updated[existing] = user; return updated; } else { return [...prev, user]; } }); };
  const handleDeleteUser = (id: string) => { setUsers(prev => prev.filter(u => u.id !== id)); };
  const handleRestoreDatabase = (data: any) => { if(data.inventory) setInventory(data.inventory); if(data.salesInvoices) setSalesInvoices(data.salesInvoices); if(data.purchaseInvoices) setPurchaseInvoices(data.purchaseInvoices); if(data.stocktakeHistory) setStocktakeHistory(data.stocktakeHistory); if(data.companyInfo) setCompanyInfo({ ...data.companyInfo, dbName: activeDb, dbPath: companyInfo.dbPath, dbType: companyInfo.dbType }); if(data.units) setUnits(data.units); if(data.receipts) setReceipts(data.receipts); if(data.payments) setPayments(data.payments); if(data.customers) setCustomers(data.customers); if(data.suppliers) setSuppliers(data.suppliers); if(data.users) setUsers(data.users); };
  const handleCreateNewDb = (name: string) => { /* Logic from prev step */ };
  const handleRenameDatabase = (name: string) => setCompanyInfo(p => ({...p, dbName: name}));
  const handleConnectFile = async (type: 'json' | 'excel' | 'sqlite', mode: 'open' | 'create') => { /* ... */ }; 
  const handleExportSQLite = async () => { /* ... */ };
  const handleImportSQLite = async () => { /* ... */ };
  const isParentActive = (item: any) => activeView === item.id || (item.subItems && item.subItems.some((sub: any) => sub.id === activeView));
  const renderAccountingPlaceholder = (title: string) => ( <div className="h-[calc(100vh-140px)] flex flex-col items-center justify-center animate-in fade-in zoom-in-95"> <div className="bg-[#1e293b] p-8 rounded-2xl border border-white/5 shadow-2xl text-center max-w-md"> <div className="w-20 h-20 bg-blue-600/20 rounded-full flex items-center justify-center mx-auto mb-6"> <Wallet size={40} className="text-blue-500" /> </div> <h2 className="text-2xl font-black text-white mb-2">{title}</h2> <p className="text-slate-400">هذه الوحدة قيد التطوير حالياً وستكون متاحة في التحديث القادم.</p> <div className="mt-6"> <button onClick={() => setActiveView('dashboard')} className="bg-slate-800 hover:bg-slate-700 text-white px-6 py-2 rounded-lg font-bold text-sm transition-colors"> العودة للرئيسية </button> </div> </div> </div> );

  const renderOtherContent = () => {
    if (!currentUser) return null;

    switch (activeView) {
      // ... (Rest of views)
      case 'dashboard': return <Dashboard inventory={inventory} salesInvoices={salesInvoices} purchaseInvoices={purchaseInvoices} customers={customers} />;
      
      // Update the Sales View to receive props
      case 'sales': 
        return <Sales 
            inventory={inventory} 
            customers={customers} 
            nextId={getNextSaleId()} 
            onSave={handleSaveSale} 
        />;

      // ... (Rest of existing switch cases)
      case 'stocktake_new': 
        return <Stocktake 
            key={selectedStocktake ? selectedStocktake.id : 'new-session'} 
            items={inventory} 
            onUpdateItem={handleUpdateInventory} 
            onSaveSession={handleSaveStocktakeSession}
            initialSession={selectedStocktake} 
            nextId={getNextStocktakeId()} // Pass Sequential ID
            onCancel={() => setActiveView('stocktake_list')}
        />;
      case 'stocktake_list': 
        return <StocktakeReport 
            history={stocktakeHistory} 
            onOpenSession={handleOpenStocktake} 
            onDeleteSession={handleDeleteStocktake}
        />;
      case 'reports_general': return <Dashboard inventory={inventory} salesInvoices={salesInvoices} purchaseInvoices={purchaseInvoices} customers={customers} />;
      case 'sales_new': return <SalesInvoiceForm key={selectedSale ? `edit-${selectedSale.id}` : 'new'} inventory={inventory} customers={customers} companyInfo={companyInfo} nextId={getNextSaleId()} initialInvoice={selectedSale} onSave={handleSaveSale} onCancel={() => { setSelectedSale(null); setActiveView('sales_list'); }} isEditMode={!!selectedSale} />;
      case 'sales_list': return <SalesList invoices={salesInvoices} onDelete={handleDeleteSale} onOpenInvoice={handleOpenSale} />;
      case 'sales_detailed': 
        return <DetailedSalesList 
            invoices={salesInvoices} // Pass Real Invoices
            onReturnItem={handleQuickReturn} // Pass Return Logic
        />;
      case 'sales_returns': return <SalesReturns inventory={inventory} salesInvoices={salesInvoices} companyInfo={companyInfo} onSave={handleSaveSalesReturn} onCancel={() => setActiveView('sales_list')} />; 
      case 'sales_returns_list': return <SalesReturnsList invoices={salesInvoices} />;
      case 'purchases_returns': return <PurchaseReturns inventory={inventory} purchaseInvoices={purchaseInvoices} companyInfo={companyInfo} onSave={handleSavePurchaseReturn} onCancel={() => setActiveView('purchases_list')} />; 
      case 'purchases_returns_list': return <PurchaseReturnsList invoices={purchaseInvoices} />;
      
      case 'purchases_register': 
         return (
             <div className="flex flex-col h-full">
                 {/* Purchase Tabs Bar */}
                 <div className="flex items-center gap-1 bg-[#0f172a] p-1 border-b border-white/5 overflow-x-auto custom-scrollbar no-print">
                     {purchaseSessions.map(session => (
                         <div 
                            key={session.id}
                            onClick={() => setActiveSessionId(session.id)}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-t-lg cursor-pointer text-xs font-bold transition-all min-w-[120px] justify-between border-t border-x ${
                                activeSessionId === session.id 
                                ? 'bg-[#1e293b] text-white border-blue-500/50 relative top-[1px] z-10' 
                                : 'bg-[#0b0f1a] text-slate-500 border-transparent hover:bg-white/5'
                            }`}
                         >
                             <div className="flex items-center gap-2 truncate">
                                 {session.isModified && <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" title="غير محفوظ"></div>}
                                 <span className="truncate max-w-[100px]">{session.label}</span>
                             </div>
                             <button 
                                onClick={(e) => handleCloseSession(session.id, e)}
                                className="text-slate-600 hover:text-red-400 p-0.5 rounded hover:bg-white/10"
                             >
                                 <X size={12} />
                             </button>
                         </div>
                     ))}
                     <button 
                        onClick={handleCreateNewSession}
                        className="p-1.5 bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white rounded transition-colors ml-1"
                        title="فاتورة جديدة (Tab)"
                     >
                         <Plus size={14} />
                     </button>
                 </div>

                 <div className="flex-1 bg-[#1e293b] border-t border-white/5">
                    {(() => {
                        const currentSession = purchaseSessions.find(s => s.id === activeSessionId);
                        return (
                            <PurchaseRegister 
                                key={activeSessionId} // Forces remount/reset when tab changes
                                companyInfo={companyInfo} 
                                inventory={inventory} 
                                suppliers={suppliers} 
                                onSave={handleSavePurchase}
                                onChange={handleUpdateSessionData}
                                onAddProduct={handleAddItem} // Allow quick product adding
                                initialInvoice={currentSession?.data} 
                                nextId={getNextPurchaseId()} 
                                isEditMode={currentSession?.mode === 'edit'} // PASS MODE
                                onClose={() => {}} // We handle tab closing manually
                                onCancel={() => handleCloseSession(activeSessionId)} 
                            />
                        );
                    })()}
                 </div>
             </div>
         );

      case 'purchases_list': return <PurchaseList invoices={purchaseInvoices} onOpenInvoice={handleOpenInvoice} onDelete={handleDeleteInvoice} initialSelectedId={selectedInvoice?.id} />;
      case 'inventory_add': return <InventoryAdd onAdd={handleAddItem} availableUnits={units} inventory={inventory} />;
      case 'inventory_quick_entry': return <InventoryQuickEntry onAddItems={handleAddItemsBulk} availableUnits={units} />;
      case 'inventory_list': return <InventoryList items={inventory} onImport={handleImportInventory} onEdit={handleEditItem} onDelete={handleDeleteItem} onNavigateAdd={() => setActiveView('inventory_add')} onAdd={handleAddItem} />;
      case 'inventory_units': return <InventoryUnits units={units} onAdd={handleAddUnit} onRemove={handleRemoveUnit} />;
      case 'customers_new': return <CustomersNew initialCustomer={selectedCustomer} onSave={handleSaveCustomer} onCancel={() => { setSelectedCustomer(null); setActiveView('customers_list'); }} nextCode={getNextCustomerCode()} />;
      case 'customers_list': return <CustomersList customers={customers} initialSelectedId={focusedCustomerId} onSelect={(id) => setFocusedCustomerId(id)} onEdit={handleEditCustomer} onDelete={handleDeleteCustomer} onAdd={() => { setSelectedCustomer(null); setActiveView('customers_new'); }} />;
      case 'customers_statement': return <CustomerStatement customers={customers} salesInvoices={salesInvoices} companyInfo={companyInfo} />;
      case 'suppliers_new': return <SuppliersNew initialSupplier={selectedSupplier} onSave={handleSaveSupplier} onCancel={() => { setSelectedSupplier(null); setActiveView('suppliers_list'); }} nextCode={getNextSupplierCode()} />;
      case 'suppliers_list': return <SuppliersList suppliers={suppliers} initialSelectedId={focusedSupplierId} onEdit={handleEditSupplier} onDelete={handleDeleteSupplier} onAdd={() => { setSelectedSupplier(null); setActiveView('suppliers_new'); }} />;
      case 'suppliers_statement': return <SupplierStatement suppliers={suppliers} purchaseInvoices={purchaseInvoices} payments={payments} companyInfo={companyInfo} />;
      case 'reports_shortage': return <ShortageReport inventory={inventory} salesInvoices={salesInvoices} />;
      case 'reports_expiry': return <ExpiryReport inventory={inventory} purchaseInvoices={purchaseInvoices} salesInvoices={salesInvoices} />;
      case 'accounting_receipt': return <AccountingReceipt key={selectedReceipt ? selectedReceipt.id : 'new'} customers={customers} onSave={handleSaveReceipt} initialReceipt={selectedReceipt} nextIdProp={getNextReceiptId()} onCancel={() => { setSelectedReceipt(null); setActiveView('accounting_receipt_list'); }} />;
      case 'accounting_receipt_list': return <AccountingReceiptList receipts={receipts} onDelete={handleDeleteReceipt} onEdit={handleEditReceipt} onNavigateAdd={() => { setSelectedReceipt(null); setActiveView('accounting_receipt'); }} />;
      case 'accounting_payment': return <AccountingPayment key={selectedPayment ? selectedPayment.id : 'new'} customers={customers} onSave={handleSavePayment} initialPayment={selectedPayment} nextIdProp={getNextPaymentId()} onCancel={() => { setSelectedPayment(null); setActiveView('accounting_payment_list'); }} />;
      case 'accounting_payment_list': return <AccountingPaymentList payments={payments} onDelete={handleDeletePayment} onEdit={handleEditPayment} onNavigateAdd={() => { setSelectedPayment(null); setActiveView('accounting_payment'); }} />;
      case 'accounting_expense': return renderAccountingPlaceholder('تسجيل خصم وصرف');
      case 'accounting_expense_list': return renderAccountingPlaceholder('قائمة الخصومات والمصروفات');
      case 'accounting_payroll': return renderAccountingPlaceholder('تسجيل المرتبات');
      case 'settings_company': return <SettingsCompany companyInfo={companyInfo} onSave={(info) => setCompanyInfo(info)} />;
      case 'settings_users': return <SettingsUsers users={users} onSaveUser={handleSaveUser} onDeleteUser={handleDeleteUser} />;
      case 'settings_database': return <SettingsDatabase data={{ inventory, salesInvoices, purchaseInvoices, companyInfo }} onRestore={handleRestoreDatabase} onReset={(n) => handleCreateNewDb(n)} onRename={handleRenameDatabase} dbList={dbList} activeDb={activeDb} onSwitchDb={(n) => setActiveDb(n)} onDeleteDb={() => {}} currentPath={companyInfo.dbPath} onConnectFile={handleConnectFile} onExportSQLite={handleExportSQLite} onImportSQLite={handleImportSQLite} />;
      default: return <div className="text-white text-center mt-20">View Not Found</div>;
    }
  };

  if (!currentUser) { return <Login onLogin={handleLogin} />; }

  return (
    <div className="min-h-screen flex flex-col bg-[#05070a] text-slate-200 font-sans selection:bg-red-900 selection:text-white">
      <header className="h-[60px] bg-[#0f172a] border-b border-white/5 flex items-center px-4 sticky top-0 z-50 shadow-2xl shadow-black/50 print:hidden">
        <div className="ml-6 flex items-center gap-2 bg-gradient-to-br from-red-900 to-red-950 px-4 py-1.5 rounded shadow-[0_0_15px_rgba(185,28,28,0.3)] border border-red-900/50">
          <span className="text-red-500 animate-pulse text-lg">★</span>
          <span className="font-bold text-white tracking-wider text-sm">NIGHTMARE</span>
        </div>
        <nav ref={navRef as React.RefObject<HTMLElement>} className="flex-1 h-full flex items-center mx-4 gap-1">
          {allowedNavItems.map((item: any) => (
              <div 
                key={item.id} 
                className="relative h-full flex items-center z-50"
                onMouseEnter={() => {
                  if (openMenu && item.subItems) {
                    setOpenMenu(item.id);
                  }
                }}
              >
                <button onClick={() => { if (item.subItems) { setOpenMenu(openMenu === item.id ? null : item.id); } else { handleNavigate(item.id as ViewType); setOpenMenu(null); } }} className={`h-full px-4 flex items-center gap-2 text-sm transition-all border-b-2 whitespace-nowrap cursor-pointer select-none ${ isParentActive(item) || openMenu === item.id ? 'border-blue-500 text-blue-400 bg-blue-500/5' : 'border-transparent text-slate-400 hover:text-white hover:bg-white/5' }`}>
                  <item.icon size={16} /> <span>{item.label}</span> {item.subItems && ( <ChevronDown size={10} className={`transition-transform duration-200 ${openMenu === item.id ? 'rotate-180' : ''}`} /> )}
                </button>
                {item.subItems && openMenu === item.id && (
                  <div className="absolute top-full right-0 w-56 bg-[#0f172a] border border-white/10 shadow-2xl rounded-b-lg animate-in fade-in slide-in-from-top-1 z-50 overflow-hidden ring-1 ring-black/50">
                    <div className="py-1.5">
                      {item.subItems.map((sub: any) => (
                        <button key={sub.id} onClick={() => { handleNavigate(sub.id as ViewType); setOpenMenu(null); }} className={`w-full text-right px-4 py-3 text-sm flex items-center gap-3 transition-colors ${ activeView === sub.id ? 'bg-blue-600/10 text-blue-400 border-r-2 border-blue-500' : 'text-gray-400 hover:bg-white/5 hover:text-white border-r-2 border-transparent' }`}>
                            {sub.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
          ))}
        </nav>
        <div className="mr-auto flex items-center gap-4">
           <div className="flex items-center gap-3 pl-4 border-l border-white/10 ml-4">
               <div className="text-right">
                   <div className="text-xs font-bold text-white">{currentUser.fullName || currentUser.username}</div>
                   <div className="text-[9px] text-blue-400 font-mono">{currentUser.role === 'admin' ? 'مدير النظام' : 'مستخدم'}</div>
               </div>
               <button onClick={handleLogout} className="bg-red-500/10 hover:bg-red-500 hover:text-white text-red-400 p-2 rounded-lg transition-colors" title="تسجيل الخروج"> <LogOut size={16} /> </button>
           </div>
           {companyInfo.dbPath && ( <div className="flex flex-col items-end text-[10px] text-gray-500 leading-tight" title={companyInfo.dbPath}> <span>ملف متصل ({companyInfo.dbType})</span> <span className="text-blue-400 max-w-[150px] truncate">{companyInfo.dbName}</span> </div> )}
           <div className={`w-2 h-2 rounded-full ${saveStatus === 'saving' ? 'bg-yellow-500 animate-pulse' : saveStatus === 'error' ? 'bg-red-500' : 'bg-green-500'}`} title={saveStatus}></div>
        </div>
      </header>
      <main className="flex-1 p-6 max-w-[1400px] mx-auto w-full overflow-y-auto overflow-x-hidden">
        {renderOtherContent()}
      </main>
      <footer className="h-8 bg-[#0f172a] border-t border-white/5 flex items-center justify-between px-6 text-[11px] text-slate-500 fixed bottom-0 w-full z-40 backdrop-blur-sm print:hidden">
        <div className="flex gap-4 items-center">
          <span className="font-mono text-slate-400">{new Date().toLocaleDateString('en-GB')}</span>
          <span className="w-px h-3 bg-white/10"></span>
          <span className="font-mono text-slate-400 w-16 text-center">{time}</span>
        </div>
      </footer>
    </div>
  );
}
