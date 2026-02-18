
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Printer, Save, PauseCircle, ChevronDown, Trash2, AlertTriangle, Plus, Check } from 'lucide-react';
import { CompanyInfo, InventoryItem, PurchaseRow, PurchaseInvoice, Supplier } from '../types';

interface OverlayState {
  visible: boolean;
  type: 'supplier' | 'product';
  top: number;
  left: number;
  width: number;
  rowIndex?: number;
  filterText: string;
  selectedIndex: number;
}

interface Props {
  companyInfo?: CompanyInfo;
  inventory: InventoryItem[];
  suppliers: Supplier[]; 
  onSave?: (invoice: PurchaseInvoice) => void;
  onChange?: (invoiceData: PurchaseInvoice) => void;
  onAddProduct?: (item: InventoryItem) => void; 
  initialInvoice?: PurchaseInvoice | null;
  nextId?: number;
  onClose?: () => void;
  onCancel?: () => void;
  isEditMode?: boolean;
}

// --- Helper: Date Formatter DD/MM/YYYY ---
const getTodayDate = () => {
  const d = new Date();
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

export const PurchaseRegister: React.FC<Props> = ({ companyInfo, inventory, suppliers, onSave, onChange, onAddProduct, initialInvoice, nextId = 1, onClose, onCancel, isEditMode = false }) => {
  // State
  const [invoiceHeader, setInvoiceHeader] = useState({
    number: nextId,
    date: getTodayDate(),
    supplier: '',
    warehouse: 'الرئيسي',
    paymentType: 'نقدي',
    reference: ''
  });

  const [rows, setRows] = useState<PurchaseRow[]>([
    { id: 1, barcode: '', name: '', unit: '', selectedUnitType: 'major', qty: 1, price: 0, discount: 0, expiry: '' }
  ]);

  const [overlay, setOverlay] = useState<OverlayState>({
    visible: false, type: 'supplier', top: 0, left: 0, width: 0, filterText: '', selectedIndex: 0
  });

  const [notification, setNotification] = useState<string | null>(null);

  // --- Quick Add Modal State (Expanded) ---
  const [quickAddModal, setQuickAddModal] = useState<{ visible: boolean, rowIndex: number }>({ 
      visible: false, rowIndex: -1 
  });
  
  const [quickForm, setQuickForm] = useState({
      code: '',
      name: '',
      nameEn: '',
      category: 'عام',
      location: '',
      hasSubUnits: false,
      majorUnit: 'قطعة',
      minorUnit: '',
      factor: 1,
      priceMajor: 0, // Sale Price
      costMajor: 0,  // Purchase Cost
      supplierDiscount: 0
  });

  // Refs
  const tableRef = useRef<HTMLTableElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const barcodeLock = useRef(false); 
  const quickNameRef = useRef<HTMLInputElement>(null);

  // --- Print Settings ---
  const printSettings = companyInfo?.printSettings || {
    showCode: true,
    showLocation: false,
    showUnit: true,
    showNotes: true,
    showFooterSignatures: true
  };

  // Initialize Data
  useEffect(() => {
    if (initialInvoice) {
        setInvoiceHeader({
            number: parseInt(initialInvoice.id) || nextId,
            date: initialInvoice.date,
            supplier: initialInvoice.vendor,
            warehouse: initialInvoice.warehouse || 'الرئيسي',
            paymentType: initialInvoice.paymentType || 'نقدي',
            reference: initialInvoice.reference || ''
        });
        if (initialInvoice.rows && initialInvoice.rows.length > 0) {
            setRows(initialInvoice.rows);
        } else {
             setRows([{ id: Date.now(), barcode: '', name: '', unit: '', selectedUnitType: 'major', qty: 1, price: 0, discount: 0, expiry: '' }]);
        }
    } else {
        setInvoiceHeader(prev => ({
            ...prev,
            number: nextId,
            date: getTodayDate(),
            supplier: '',
            reference: ''
        }));
        setRows([{ id: Date.now(), barcode: '', name: '', unit: '', selectedUnitType: 'major', qty: 1, price: 0, discount: 0, expiry: '' }]);
    }
  }, []);

  // Auto-Update ID Logic
  useEffect(() => {
      if (!isEditMode) {
          setInvoiceHeader(prev => ({ ...prev, number: nextId }));
      }
  }, [nextId, isEditMode]);

  // Calculations
  const totals = useMemo(() => {
    let subtotal = 0;
    let totalDiscount = 0;
    
    rows.forEach(r => {
      const gross = r.qty * r.price;
      const discVal = gross * (r.discount / 100);
      subtotal += gross;
      totalDiscount += discVal;
    });

    return { subtotal, totalDiscount, net: subtotal - totalDiscount };
  }, [rows]);

  // Sync Changes
  useEffect(() => {
      if (onChange) {
          const currentData: PurchaseInvoice = {
              id: invoiceHeader.number.toString(),
              vendor: invoiceHeader.supplier,
              amount: totals.net,
              date: invoiceHeader.date,
              status: 'معلق',
              warehouse: invoiceHeader.warehouse,
              paymentType: invoiceHeader.paymentType,
              reference: invoiceHeader.reference,
              rows: rows
          };
          onChange(currentData);
      }
  }, [rows, invoiceHeader, totals.net]);

  // Filtered Lists
  const filteredSuppliers = useMemo(() => 
    suppliers.filter(s => 
      s.name.includes(overlay.filterText) || 
      s.phone.includes(overlay.filterText) ||
      s.code.includes(overlay.filterText)
    ), 
  [overlay.filterText, suppliers]);

  const filteredProducts = useMemo(() => 
    inventory.filter(p => 
      p.name.includes(overlay.filterText) || 
      (p.nameEn && p.nameEn.toLowerCase().includes(overlay.filterText.toLowerCase()))
    ), 
  [overlay.filterText, inventory]);

  useEffect(() => {
    setOverlay(prev => ({ ...prev, selectedIndex: 0 }));
  }, [overlay.filterText]);

  // Actions
  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const addRow = () => {
    setRows(prev => [
      ...prev, 
      { id: Date.now(), barcode: '', name: '', unit: '', selectedUnitType: 'major', qty: 1, price: 0, discount: 0, expiry: '' }
    ]);
  };

  const removeRow = (id: number) => {
    if (rows.length > 1) {
      setRows(prev => prev.filter(r => r.id !== id));
    } else {
      setRows([{ id: Date.now(), barcode: '', name: '', unit: '', selectedUnitType: 'major', qty: 1, price: 0, discount: 0, expiry: '' }]);
    }
  };

  const updateRow = (id: number, field: keyof PurchaseRow, value: any) => {
    setRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const handleClearInvoice = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (window.confirm('تحذير: سيتم حذف الفاتورة الحالية وتسجيلها كـ "محذوف".\nهل أنت متأكد؟')) {
        if (onSave) {
            const deletedInvoice: PurchaseInvoice = {
                id: invoiceHeader.number.toString(),
                vendor: invoiceHeader.supplier || 'غير محدد',
                amount: 0,
                date: invoiceHeader.date,
                status: 'محذوف',
                warehouse: invoiceHeader.warehouse,
                paymentType: invoiceHeader.paymentType,
                reference: invoiceHeader.reference,
                rows: [] 
            };
            onSave(deletedInvoice);
        }
        if (onCancel) onCancel();
    }
  };

  const handleSaveAction = (status: 'معلق' | 'محول') => {
      if (rows.length === 0 || (rows.length === 1 && !rows[0].name)) {
          showNotification('لا يمكن حفظ فاتورة فارغة');
          return;
      }
      for (const row of rows) {
          if (row.qty <= 0) {
              showNotification(`خطأ: الكمية يجب أن تكون أكبر من صفر للصنف: ${row.name}`);
              return;
          }
      }
      if (onSave) {
          const newInvoice: PurchaseInvoice = {
              id: invoiceHeader.number.toString(),
              vendor: invoiceHeader.supplier || 'مورد عام',
              amount: totals.net,
              date: invoiceHeader.date,
              status: status,
              warehouse: invoiceHeader.warehouse,
              paymentType: invoiceHeader.paymentType,
              reference: invoiceHeader.reference,
              rows: rows
          };
          onSave(newInvoice);
      }
  };

  const getPreferredName = (item: InventoryItem) => { if (companyInfo?.language === 'en' && item.nameEn) { return item.nameEn; } return item.name; };
  const handleUnitChange = (id: number, newUnitType: 'major' | 'minor') => { setRows(prev => prev.map(r => { if (r.id === id && r.itemId) { const item = inventory.find(i => i.id === r.itemId); if (item) { const factor = item.factor && item.factor > 0 ? item.factor : 1; let newPrice = 0; if (newUnitType === 'major') { newPrice = item.priceMajor; } else { newPrice = item.priceMinor > 0 ? item.priceMinor : (item.priceMajor / factor); } return { ...r, selectedUnitType: newUnitType, unit: newUnitType === 'major' ? item.majorUnit : (item.minorUnit || ''), price: parseFloat(newPrice.toFixed(2)), discount: item.supplierDiscount || 0 }; } } return r; })); };
  const handleDateBlur = (val: string) => { const clean = val.replace(/\D/g, ''); if (clean.length === 6) { const dd = clean.substring(0, 2); const mm = clean.substring(2, 4); const yy = clean.substring(4, 6); setInvoiceHeader(prev => ({...prev, date: `${dd}/${mm}/20${yy}`})); } else if (clean.length === 8) { const dd = clean.substring(0, 2); const mm = clean.substring(2, 4); const yyyy = clean.substring(4, 8); setInvoiceHeader(prev => ({...prev, date: `${dd}/${mm}/${yyyy}`})); } };
  const handleExpiryChange = (id: number, val: string) => { let clean = val.replace(/[^\d]/g, ''); if (clean.length > 6) clean = clean.substring(0, 6); let formatted = clean; if (clean.length >= 2) { let month = parseInt(clean.substring(0, 2)); if (month > 12) month = 12; if (month === 0) month = 1; const monthStr = month.toString().padStart(2, '0'); if (clean.length > 2) { let yearPart = clean.substring(2); formatted = `${monthStr}/${yearPart}`; } else { formatted = monthStr; if (val.endsWith('/')) formatted += '/'; } } updateRow(id, 'expiry', formatted); };
  const handleExpiryBlur = (id: number, val: string) => { let clean = val.replace(/[^\d]/g, ''); if (clean.length === 4) { const m = clean.substring(0, 2); const y = clean.substring(2, 4); let mInt = parseInt(m); if (mInt > 12) mInt = 12; if (mInt === 0) mInt = 1; updateRow(id, 'expiry', `${mInt.toString().padStart(2,'0')}/20${y}`); } else if (clean.length === 3) { const m = clean.substring(0, 1).padStart(2,'0'); const y = clean.substring(1, 3); updateRow(id, 'expiry', `${m}/20${y}`); } };
  const parseDateHelper = (dateStr: string): Date | null => { if (!dateStr) return null; let d: Date; if (/^\d{2}\/\d{4}$/.test(dateStr)) { const [m, y] = dateStr.split('/'); d = new Date(parseInt(y), parseInt(m), 0); } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) { const [day, m, y] = dateStr.split('/'); d = new Date(parseInt(y), parseInt(m) - 1, parseInt(day)); } else { return null; } return d; };
  const checkExpiryStatus = (row: PurchaseRow) => { if (!row.expiry) return null; const expiryDate = parseDateHelper(row.expiry); if (!expiryDate) return null; const today = new Date(); const threeMonthsLater = new Date(); threeMonthsLater.setMonth(today.getMonth() + 3); if (expiryDate < today) { return { type: 'error', msg: 'تحذير: الصنف منتهي الصلاحية!', color: 'border-red-500 bg-red-500/10 text-red-400' }; } if (expiryDate <= threeMonthsLater) { return { type: 'warning', msg: 'تنبيه: الصلاحية تنتهي قريباً (أقل من 3 أشهر)', color: 'border-amber-500 bg-amber-500/10 text-amber-400' }; } if (row.itemId) { const item = inventory.find(i => i.id === row.itemId); if (item && item.stocktakeExpiry) { const currentStockExpiry = parseDateHelper(item.stocktakeExpiry); if (currentStockExpiry && expiryDate < currentStockExpiry) { return { type: 'info', msg: `تنبيه: يوجد في المخزن تاريخ أحدث (${item.stocktakeExpiry})`, color: 'border-blue-500 bg-blue-500/10 text-blue-300' }; } } } return null; };
  const fillRowWithProduct = (id: number, product: InventoryItem) => { setRows(prev => prev.map(r => r.id === id ? { ...r, itemId: product.id, barcode: product.code, name: getPreferredName(product), unit: product.majorUnit, selectedUnitType: 'major', price: product.priceMajor, discount: product.supplierDiscount || 0, location: product.location } : r)); setOverlay(prev => ({ ...prev, visible: false })); setTimeout(() => { const rowEl = tableRef.current?.querySelector(`tr[data-id="${id}"]`); (rowEl?.querySelector('.qty-input') as HTMLInputElement)?.focus(); }, 50); };
  const handleBarcodeSearch = (id: number, barcode: string) => { if (barcodeLock.current) return; if (!barcode) return; const product = inventory.find(p => p.code === barcode); if (product) { fillRowWithProduct(id, product); } else { showNotification("عذراً، الباركود غير مسجل"); } };
  const selectProductFromOverlay = (product: InventoryItem) => { if (overlay.rowIndex !== undefined) { const rowId = rows[overlay.rowIndex].id; fillRowWithProduct(rowId, product); } };
  const selectSupplierFromOverlay = (supplierName: string) => { setInvoiceHeader(prev => ({ ...prev, supplier: supplierName })); setOverlay({ ...overlay, visible: false }); setTimeout(() => { const firstInput = tableRef.current?.querySelector('input'); firstInput?.focus(); }, 50); };
  
  // --- Quick Add Handler ---
  const handleOpenQuickAdd = (name: string, rowIndex: number) => {
      setQuickAddModal({ visible: true, rowIndex });
      setQuickForm({ 
          code: Math.floor(Math.random() * 1000000).toString(), 
          name: name || '',
          nameEn: '',
          category: 'عام',
          location: '',
          hasSubUnits: false,
          majorUnit: 'قطعة',
          minorUnit: '',
          factor: 1,
          priceMajor: 0,
          costMajor: 0,
          supplierDiscount: 0
      });
      setOverlay(prev => ({ ...prev, visible: false }));
      setTimeout(() => quickNameRef.current?.focus(), 100);
  };

  const handleQuickSave = () => {
      if (!quickForm.name) {
          alert('يرجى إدخال اسم الصنف');
          return;
      }
      if (!quickForm.code) {
          alert('يرجى إدخال الباركود');
          return;
      }
      
      const priceMinor = quickForm.hasSubUnits && quickForm.factor > 0 
        ? (quickForm.priceMajor / quickForm.factor) 
        : quickForm.priceMajor;

      const newItem: InventoryItem = {
          id: Date.now().toString(),
          code: quickForm.code,
          name: quickForm.name,
          nameEn: quickForm.nameEn,
          category: quickForm.category,
          location: quickForm.location,
          hasSubUnits: quickForm.hasSubUnits,
          majorUnit: quickForm.majorUnit,
          minorUnit: quickForm.minorUnit,
          factor: quickForm.factor,
          priceMajor: quickForm.priceMajor,
          priceMinor: priceMinor,
          costMajor: quickForm.costMajor,
          supplierDiscount: quickForm.supplierDiscount,
          averageDiscount: quickForm.supplierDiscount,
          systemStock: 0,
          actualStock: 0,
          lastUpdated: new Date().toISOString().split('T')[0]
      };

      if (onAddProduct) {
          onAddProduct(newItem);
          const rowId = rows[quickAddModal.rowIndex]?.id;
          if (rowId) {
              fillRowWithProduct(rowId, newItem);
          }
          showNotification('تم إضافة الصنف بنجاح');
      }
      setQuickAddModal({ visible: false, rowIndex: -1 });
  };

  // --- Keyboard Handling ---
  const handleGlobalKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'F8') { e.preventDefault(); handleSaveAction('معلق'); return; }
    if (e.key === 'F10') { e.preventDefault(); handleSaveAction('محول'); return; }
    if (e.key === 'Insert') { e.preventDefault(); addRow(); return; }
    if (e.ctrlKey && e.key === 'p') { e.preventDefault(); window.print(); return; }
    if (e.key === 'Escape') {
      if (overlay.visible) {
        setOverlay(prev => ({ ...prev, visible: false }));
        e.preventDefault(); e.stopPropagation();
      }
    }
  };

  const handleTableKeyDown = (e: React.KeyboardEvent, rowIndex: number, colName: string) => {
    if (overlay.visible) {
      if (e.key === 'ArrowDown') { e.preventDefault(); const max = overlay.type === 'supplier' ? filteredSuppliers.length : filteredProducts.length; setOverlay(prev => ({ ...prev, selectedIndex: Math.min(prev.selectedIndex + 1, max - 1) })); } 
      else if (e.key === 'ArrowUp') { e.preventDefault(); setOverlay(prev => ({ ...prev, selectedIndex: Math.max(prev.selectedIndex - 1, 0) })); } 
      else if (e.key === 'Enter') { 
          e.preventDefault(); 
          if (overlay.type === 'supplier') { 
              if (filteredSuppliers[overlay.selectedIndex]) selectSupplierFromOverlay(filteredSuppliers[overlay.selectedIndex].name); 
          } else { 
              if (filteredProducts[overlay.selectedIndex]) {
                  selectProductFromOverlay(filteredProducts[overlay.selectedIndex]); 
              } else if (overlay.filterText) {
                  // If filter text exists but no selection (or creating new), handle create
                  handleOpenQuickAdd(overlay.filterText, overlay.rowIndex || rowIndex);
              }
          } 
      }
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (colName === 'barcode') { const inputVal = (e.target as HTMLInputElement).value; const product = inventory.find(p => p.code === inputVal); if (product) { barcodeLock.current = true; fillRowWithProduct(rows[rowIndex].id, product); setTimeout(() => { barcodeLock.current = false; }, 200); return; } }
      const columns = ['barcode', 'name', 'unit', 'qty', 'price', 'discount', 'expiry']; const currentIdx = columns.indexOf(colName); if (currentIdx < columns.length - 1) { const nextCol = columns[currentIdx + 1]; const cell = tableRef.current?.querySelector(`tr[data-id="${rows[rowIndex].id}"] .${nextCol}-input`) as HTMLInputElement; cell?.focus(); } else { if (rowIndex < rows.length - 1) { const nextRowId = rows[rowIndex + 1].id; const cell = tableRef.current?.querySelector(`tr[data-id="${nextRowId}"] .barcode-input`) as HTMLInputElement; cell?.focus(); } else { addRow(); setTimeout(() => { const lastRow = tableRef.current?.rows[tableRef.current.rows.length - 1]; (lastRow?.querySelector('.barcode-input') as HTMLInputElement)?.focus(); }, 50); } }
    }
  };

  const handleDateChange = (val: string) => { setInvoiceHeader({...invoiceHeader, date: val}); };

  return (
    <div className="font-sans text-xs text-[#e2e8f0] bg-[#0b0f1a] min-h-[calc(100vh-145px)] p-2 relative purchase-register-container" dir="rtl" onKeyDown={handleGlobalKeyDown} tabIndex={0} autoFocus>
      
      {/* ... (Styles & Notification) ... */}
      <style>{`@media print { @page { size: A4; margin: 0; } body { background-color: #fff !important; color: #000 !important; -webkit-print-color-adjust: exact; margin: 0 !important; padding: 0 !important; } #root { background-color: #fff !important; width: 100%; } .print\\:hidden, button, .notification, header, .overlay, footer, nav { display: none !important; } .purchase-register-container { position: relative !important; width: 210mm !important; min-height: 297mm !important; margin: 0 auto !important; padding: 10mm !important; background: #fff !important; color: #000 !important; overflow: visible !important; } div, input, select, textarea, table, th, td { background-color: transparent !important; color: #000 !important; border-color: #000 !important; } input, select, textarea { border: none !important; box-shadow: none !important; padding: 0 !important; font-size: 11px !important; font-weight: 600 !important; width: 100% !important; text-align: right; appearance: none !important; } .print-header { display: flex !important; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px; } .info-grid { display: grid !important; grid-template-columns: repeat(3, 1fr) !important; gap: 10px !important; border: 1px solid #000 !important; padding: 10px !important; margin-bottom: 15px !important; } .info-grid > div { border-bottom: 1px dotted #ccc; padding-bottom: 2px; } .info-grid label { font-weight: bold; margin-bottom: 2px; display: block; font-size: 10px; } table { width: 100% !important; border-collapse: collapse !important; border: 1px solid #000 !important; margin-bottom: 10px !important; table-layout: auto !important; } th { background-color: #e5e5e5 !important; border: 1px solid #000 !important; font-weight: bold !important; padding: 4px !important; text-align: center !important; font-size: 10px !important; } td { border: 1px solid #000 !important; padding: 4px !important; text-align: center !important; font-size: 10px !important; vertical-align: middle !important; } th:nth-child(10), td:nth-child(10) { display: none !important; width: 0 !important; } .summary-section { display: flex !important; justify-content: flex-end; margin-top: 10px; } .summary-box { width: 250px !important; border: 1px solid #000 !important; padding: 5px !important; } .summary-row { display: flex; justify-between; margin-bottom: 2px; } .print-footer { display: flex !important; margin-top: 30px; justify-content: space-around; } ::placeholder { color: transparent !important; } }`}</style>
      
      {notification && (
        <div className="fixed bottom-5 left-5 bg-emerald-600 text-white px-6 py-3 rounded shadow-lg z-50 animate-in slide-in-from-bottom-5 fade-in duration-300 notification">
          {notification}
        </div>
      )}

      {/* Overlays */}
      {overlay.visible && createPortal(
        <div 
          ref={overlayRef}
          className="fixed z-[9999] bg-[#1f2937] border border-blue-500 shadow-2xl max-h-48 overflow-y-auto custom-scrollbar overlay"
          style={{ top: overlay.top, left: overlay.left, width: overlay.width }}
        >
          {overlay.type === 'supplier' && filteredSuppliers.map((s, i) => (
            <div 
              key={i} 
              className={`p-2 cursor-pointer border-b border-gray-700 flex justify-between items-center ${i === overlay.selectedIndex ? 'bg-blue-600 text-white' : 'hover:bg-blue-600/50'}`} 
              onMouseDown={(e) => { e.preventDefault(); selectSupplierFromOverlay(s.name); }}
            >
              <span>{s.name}</span>
              <span className="text-[9px] text-gray-400">{s.phone}</span>
            </div>
          ))}
          {overlay.type === 'product' && (
              <>
                {filteredProducts.map((p, i) => (
                    <div 
                    key={i} 
                    className={`p-2 cursor-pointer border-b border-gray-700 flex justify-between items-center ${i === overlay.selectedIndex ? 'bg-blue-600 text-white' : 'hover:bg-blue-600/50'}`} 
                    onMouseDown={(e) => { e.preventDefault(); selectProductFromOverlay(p); }}
                    >
                    <div className="flex flex-col">
                        <span>{p.name}</span>
                        {p.nameEn && <span className="text-[9px] opacity-70">{p.nameEn}</span>}
                    </div>
                    <span className={i === overlay.selectedIndex ? 'text-blue-100' : 'text-blue-300 font-bold'}>{p.priceMajor}</span>
                    </div>
                ))}
                
                {/* Quick Add Option */}
                {overlay.filterText && (
                    <div 
                        className="p-2 cursor-pointer border-t border-gray-600 bg-blue-900/30 hover:bg-blue-800 text-blue-200 font-bold flex items-center gap-2"
                        onMouseDown={(e) => { 
                            e.preventDefault(); 
                            if(overlay.rowIndex !== undefined) handleOpenQuickAdd(overlay.filterText, overlay.rowIndex); 
                        }}
                    >
                        <Plus size={14} /> إضافة صنف جديد: "{overlay.filterText}"
                    </div>
                )}
              </>
          )}
          {((overlay.type === 'supplier' && filteredSuppliers.length === 0) || 
            (overlay.type === 'product' && filteredProducts.length === 0 && !overlay.filterText)) && (
              <div className="p-2 text-gray-500 text-center">لا توجد نتائج</div>
          )}
        </div>,
        document.body
      )}

      {/* Quick Add Modal (Enhanced) */}
      {quickAddModal.visible && createPortal(
          <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
              <div className="bg-[#1e293b] border border-blue-500 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                  <div className="bg-blue-600 px-6 py-4 flex justify-between items-center">
                      <h3 className="font-black text-white text-lg flex items-center gap-2">
                          <Plus size={20} /> إضافة صنف جديد (سريع)
                      </h3>
                      <button onClick={() => setQuickAddModal({ ...quickAddModal, visible: false })} className="text-white/80 hover:text-white hover:bg-blue-700 p-1 rounded-full transition"><X size={20} /></button>
                  </div>
                  
                  <div className="p-6 grid grid-cols-2 gap-4">
                      {/* Name & En Name */}
                      <div className="col-span-2 md:col-span-1">
                          <label className="text-[10px] text-gray-400 font-bold block mb-1">اسم الصنف (عربي) *</label>
                          <input 
                            ref={quickNameRef}
                            type="text" 
                            value={quickForm.name} 
                            onChange={e => setQuickForm({...quickForm, name: e.target.value})} 
                            className="w-full bg-[#0f172a] border border-slate-600 rounded-lg p-2.5 text-white text-xs font-bold focus:border-blue-500 outline-none" 
                            placeholder="اسم المنتج..."
                          />
                      </div>
                      <div className="col-span-2 md:col-span-1">
                          <label className="text-[10px] text-gray-400 font-bold block mb-1">الاسم (English)</label>
                          <input 
                            type="text" 
                            value={quickForm.nameEn} 
                            onChange={e => setQuickForm({...quickForm, nameEn: e.target.value})} 
                            className="w-full bg-[#0f172a] border border-slate-600 rounded-lg p-2.5 text-white text-xs font-bold focus:border-blue-500 outline-none" 
                            placeholder="Product Name..."
                          />
                      </div>

                      {/* Barcode & Category */}
                      <div className="col-span-2 md:col-span-1">
                          <label className="text-[10px] text-gray-400 font-bold block mb-1">الباركود *</label>
                          <input 
                            type="text" 
                            value={quickForm.code} 
                            onChange={e => setQuickForm({...quickForm, code: e.target.value})} 
                            className="w-full bg-[#0f172a] border border-slate-600 rounded-lg p-2.5 text-white text-xs font-mono tracking-wide focus:border-blue-500 outline-none" 
                          />
                      </div>
                      <div className="col-span-2 md:col-span-1">
                          <label className="text-[10px] text-gray-400 font-bold block mb-1">التصنيف</label>
                          <input 
                            type="text" 
                            value={quickForm.category} 
                            onChange={e => setQuickForm({...quickForm, category: e.target.value})} 
                            className="w-full bg-[#0f172a] border border-slate-600 rounded-lg p-2.5 text-white text-xs font-bold focus:border-blue-500 outline-none" 
                          />
                      </div>

                      {/* Location & Discount */}
                      <div className="col-span-2 md:col-span-1">
                          <label className="text-[10px] text-gray-400 font-bold block mb-1">الموقع / الرف</label>
                          <input 
                            type="text" 
                            value={quickForm.location} 
                            onChange={e => setQuickForm({...quickForm, location: e.target.value})} 
                            className="w-full bg-[#0f172a] border border-slate-600 rounded-lg p-2.5 text-white text-xs font-bold focus:border-blue-500 outline-none" 
                          />
                      </div>
                      <div className="col-span-2 md:col-span-1">
                          <label className="text-[10px] text-gray-400 font-bold block mb-1">خصم المورد (%)</label>
                          <input 
                            type="number" 
                            value={quickForm.supplierDiscount} 
                            onChange={e => setQuickForm({...quickForm, supplierDiscount: parseFloat(e.target.value) || 0})} 
                            className="w-full bg-[#0f172a] border border-slate-600 rounded-lg p-2.5 text-white text-xs font-bold focus:border-blue-500 outline-none" 
                          />
                      </div>

                      {/* Unit Toggle */}
                      <div className="col-span-2 my-2 border-t border-slate-700 pt-2">
                          <label className="flex items-center gap-2 cursor-pointer bg-slate-800/50 p-2 rounded-lg border border-slate-600 hover:border-blue-500 transition">
                              <div className="relative">
                                  <input type="checkbox" className="sr-only peer" checked={quickForm.hasSubUnits} onChange={e => setQuickForm({...quickForm, hasSubUnits: e.target.checked})} />
                                  <div className="w-9 h-5 bg-slate-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                              </div>
                              <span className="text-xs font-bold text-white">يحتوي على وحدات فرعية (تجزئة)</span>
                          </label>
                      </div>

                      {/* Units Row */}
                      <div className="col-span-2 grid grid-cols-3 gap-4">
                          <div>
                              <label className="text-[10px] text-gray-400 font-bold block mb-1">الوحدة الكبرى</label>
                              <input type="text" value={quickForm.majorUnit} onChange={e => setQuickForm({...quickForm, majorUnit: e.target.value})} className="w-full bg-[#0f172a] border border-slate-600 rounded-lg p-2 text-white text-xs focus:border-blue-500 outline-none" />
                          </div>
                          {quickForm.hasSubUnits && (
                              <>
                                  <div>
                                      <label className="text-[10px] text-gray-400 font-bold block mb-1">الوحدة الصغرى</label>
                                      <input type="text" value={quickForm.minorUnit} onChange={e => setQuickForm({...quickForm, minorUnit: e.target.value})} className="w-full bg-[#0f172a] border border-slate-600 rounded-lg p-2 text-white text-xs focus:border-blue-500 outline-none" />
                                  </div>
                                  <div>
                                      <label className="text-[10px] text-gray-400 font-bold block mb-1">معامل التحويل</label>
                                      <input type="number" value={quickForm.factor} onChange={e => setQuickForm({...quickForm, factor: parseFloat(e.target.value) || 1})} className="w-full bg-[#0f172a] border border-slate-600 rounded-lg p-2 text-white text-xs focus:border-blue-500 outline-none font-bold text-center" />
                                  </div>
                              </>
                          )}
                      </div>

                      <div className="col-span-2 border-t border-slate-700 my-2"></div>

                      {/* Pricing */}
                      <div className="col-span-2 md:col-span-1">
                          <label className="text-[10px] text-blue-400 font-bold block mb-1">تكلفة الشراء (للوحدة الكبرى)</label>
                          <input 
                            type="number" 
                            value={quickForm.costMajor} 
                            onChange={e => setQuickForm({...quickForm, costMajor: parseFloat(e.target.value) || 0})} 
                            className="w-full bg-[#0f172a] border border-slate-600 rounded-lg p-3 text-blue-400 text-sm font-black focus:border-blue-500 outline-none" 
                          />
                      </div>
                      <div className="col-span-2 md:col-span-1">
                          <label className="text-[10px] text-emerald-400 font-bold block mb-1">سعر البيع (للوحدة الكبرى)</label>
                          <input 
                            type="number" 
                            value={quickForm.priceMajor} 
                            onChange={e => setQuickForm({...quickForm, priceMajor: parseFloat(e.target.value) || 0})} 
                            className="w-full bg-[#0f172a] border border-slate-600 rounded-lg p-3 text-emerald-400 text-sm font-black focus:border-emerald-500 outline-none" 
                          />
                      </div>
                  </div>

                  <div className="bg-[#0f172a] px-6 py-4 flex justify-end gap-3 border-t border-slate-800">
                      <button onClick={() => setQuickAddModal({ ...quickAddModal, visible: false })} className="px-5 py-2.5 rounded-xl border border-slate-600 text-slate-400 hover:text-white font-bold text-xs transition">إلغاء</button>
                      <button onClick={handleQuickSave} className="px-8 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs shadow-lg shadow-blue-900/20 active:scale-95 transition flex items-center gap-2">
                          <Check size={16} /> حفظ وإضافة للفاتورة
                      </button>
                  </div>
              </div>
          </div>,
          document.body
      )}

      {/* Header Buttons */}
      <header className="bg-[#0f172a] px-4 py-2 flex items-center justify-between border-b border-gray-800 rounded-t mb-2 print:hidden">
        <div className="flex items-center gap-4">
            <div className="bg-red-800 px-2 py-0.5 rounded font-bold text-sm tracking-tighter text-white shadow-[0_0_10px_rgba(153,27,27,0.5)]">NIGHTMARE</div>
            <span className="text-[10px] text-gray-400">نظام المشتريات</span>
        </div>
        <div className="flex gap-2">
            <button 
                type="button"
                onClick={(e) => handleClearInvoice(e)} 
                className="bg-red-900/50 hover:bg-red-800 px-3 py-1 rounded text-[11px] font-bold transition text-red-200 flex items-center gap-1 border border-red-900 active:scale-95 cursor-pointer"
            >
                <Trash2 size={12}/> 
                <span>حذف</span>
            </button>
            <button onClick={() => handleSaveAction('معلق')} className="bg-amber-600 px-3 py-1 rounded text-[11px] font-bold hover:bg-amber-500 transition text-white flex items-center gap-1"><PauseCircle size={12}/> تعليق (F8)</button>
            <button onClick={() => window.print()} className="bg-slate-700 px-3 py-1 rounded text-[11px] font-bold hover:bg-slate-600 transition text-white flex items-center gap-1"><Printer size={12}/> طباعة</button>
            <button onClick={() => handleSaveAction('محول')} className="bg-blue-600 px-4 py-1 rounded text-[11px] font-bold hover:bg-blue-500 transition text-white flex items-center gap-1"><Save size={12}/> حفظ (F10)</button>
        </div>
      </header>

      {/* Invoice Data Form */}
      <div className="info-grid grid grid-cols-6 gap-2 bg-[#161e2e] p-3 rounded border border-gray-800 mb-2 print:border-black print:bg-white print:text-black">
        <div className="space-y-1">
            <label className="text-[10px] text-gray-500 block">رقم الفاتورة</label>
            <input type="text" value={invoiceHeader.number} readOnly className="w-full bg-[#1e293b] border border-[#334155] text-amber-400 font-bold px-2 py-1 rounded cursor-not-allowed outline-none text-xs" />
        </div>
        <div className="space-y-1">
            <label className="text-[10px] text-gray-500 block">التاريخ</label>
            <input 
              type="text" 
              value={invoiceHeader.date} 
              onChange={e => handleDateChange(e.target.value)} 
              onBlur={(e) => handleDateBlur(e.target.value)}
              placeholder="DD/MM/YYYY"
              className="w-full bg-[#161e2e] border border-[#2d3748] text-white px-2 py-1 rounded focus:border-blue-500 outline-none text-xs focus:bg-[#1e293b] font-mono" 
              onFocus={(e) => e.target.select()} 
            />
        </div>
        <div className="space-y-1 relative">
            <label className="text-[10px] text-gray-500 block">المورد</label>
            <input 
              type="text" 
              value={invoiceHeader.supplier}
              onChange={(e) => {
                setInvoiceHeader({...invoiceHeader, supplier: e.target.value});
                const rect = e.target.getBoundingClientRect();
                setOverlay({ visible: true, type: 'supplier', top: rect.bottom + window.scrollY, left: rect.left, width: rect.width, filterText: e.target.value, selectedIndex: 0 });
              }}
              onKeyDown={(e) => handleTableKeyDown(e, 0, 'supplier')} 
              onFocus={(e) => {
                e.target.select();
                const rect = e.target.getBoundingClientRect();
                setOverlay({ visible: true, type: 'supplier', top: rect.bottom + window.scrollY, left: rect.left, width: rect.width, filterText: e.target.value, selectedIndex: 0 });
              }}
              onBlur={() => setTimeout(() => setOverlay(p => ({...p, visible: false})), 200)}
              className="w-full bg-[#161e2e] border border-[#2d3748] text-white px-2 py-1 rounded focus:border-blue-500 outline-none text-xs focus:bg-[#1e293b]" 
              placeholder="ابحث..."
            />
        </div>
        <div className="space-y-1">
            <label className="text-[10px] text-gray-500 block">المخزن</label>
            <select 
                value={invoiceHeader.warehouse}
                onChange={e => setInvoiceHeader({...invoiceHeader, warehouse: e.target.value})}
                className="w-full bg-[#161e2e] border border-[#2d3748] text-white px-2 py-1 rounded focus:border-blue-500 outline-none text-xs"
            >
                <option>الرئيسي</option>
                <option>الفرعي</option>
            </select>
        </div>
        <div className="space-y-1">
            <label className="text-[10px] text-gray-500 block">الدفع</label>
            <select 
                value={invoiceHeader.paymentType}
                onChange={e => setInvoiceHeader({...invoiceHeader, paymentType: e.target.value})}
                className="w-full bg-[#161e2e] border border-[#2d3748] text-white px-2 py-1 rounded focus:border-blue-500 outline-none text-xs"
            >
                <option>نقدي</option>
                <option>آجل</option>
            </select>
        </div>
        <div className="space-y-1">
            <label className="text-[10px] text-gray-500 block">المرجع</label>
            <input type="text" value={invoiceHeader.reference} onChange={e => setInvoiceHeader({...invoiceHeader, reference: e.target.value})} className="w-full bg-[#161e2e] border border-[#2d3748] text-white px-2 py-1 rounded focus:border-blue-500 outline-none text-xs focus:bg-[#1e293b]" onFocus={(e) => e.target.select()} />
        </div>
      </div>

      {/* --- Items Table --- */}
      <div className="overflow-x-auto border border-gray-800 rounded mb-2 print:border-black print:overflow-visible">
        <table className="w-full border-collapse table-fixed" ref={tableRef}>
          <thead>
            <tr>
              <th className="bg-[#1f2937] text-gray-400 border border-[#2d3748] p-1.5 w-8 font-normal print:bg-gray-100 print:text-black print:border-black">#</th>
              <th className={`bg-[#1f2937] text-gray-400 border border-[#2d3748] p-1.5 w-32 font-normal print:bg-gray-100 print:text-black print:border-black ${!printSettings.showCode ? 'print:hidden' : ''}`}>
                  <span className="print:hidden">الباركود</span>
                  <span className="hidden print:inline">{printSettings.showLocation ? 'الباركود/الموقع' : 'الباركود'}</span>
              </th>
              <th className="bg-[#1f2937] text-gray-400 border border-[#2d3748] p-1.5 font-normal print:bg-gray-100 print:text-black print:border-black">الصنف</th>
              <th className={`bg-[#1f2937] text-gray-400 border border-[#2d3748] p-1.5 w-20 font-normal print:bg-gray-100 print:text-black print:border-black ${!printSettings.showUnit ? 'print:hidden' : ''}`}>الوحدة</th>
              <th className="bg-[#1f2937] text-gray-400 border border-[#2d3748] p-1.5 w-20 font-normal print:bg-gray-100 print:text-black print:border-black">الكمية</th>
              <th className="bg-[#1f2937] text-gray-400 border border-[#2d3748] p-1.5 w-24 font-normal print:bg-gray-100 print:text-black print:border-black">السعر</th>
              <th className="bg-[#1f2937] text-gray-400 border border-[#2d3748] p-1.5 w-16 font-normal print:bg-gray-100 print:text-black print:border-black">خصم%</th>
              <th className="bg-[#1f2937] text-gray-400 border border-[#2d3748] p-1.5 w-24 font-normal print:bg-gray-100 print:text-black print:border-black">الصلاحية</th>
              <th className="bg-[#1f2937] text-gray-400 border border-[#2d3748] p-1.5 w-28 font-normal print:bg-gray-100 print:text-black print:border-black">الإجمالي</th>
              <th className="bg-[#1f2937] text-gray-400 border border-[#2d3748] p-1.5 w-10 font-normal print:hidden"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => {
              const expiryStatus = checkExpiryStatus(row);
              return (
              <tr key={row.id} data-id={row.id}>
                <td className="border border-[#2d3748] text-center text-gray-600 bg-gray-900/30 print:border-black print:bg-white print:text-black">{idx + 1}</td>
                <td className={`border border-[#2d3748] p-0 print:border-black ${!printSettings.showCode ? 'print:hidden' : ''}`}>
                    <input 
                        type="text" 
                        className="barcode-input w-full bg-transparent border-none text-white text-center h-8 focus:bg-[#1e293b] outline-none text-xs print:hidden"
                        value={row.barcode}
                        onChange={(e) => updateRow(row.id, 'barcode', e.target.value)}
                        onBlur={(e) => handleBarcodeSearch(row.id, e.target.value)}
                        onKeyDown={(e) => handleTableKeyDown(e, idx, 'barcode')}
                        onFocus={(e) => e.target.select()}
                    />
                    <div className="hidden print:flex flex-col items-center justify-center h-full overflow-hidden">
                        <span className="text-[10px]">{row.barcode}</span>
                        {printSettings.showLocation && <span className="text-[9px] font-bold italic">{row.location || '-'}</span>}
                    </div>
                </td>
                <td className="border border-[#2d3748] p-0 relative print:border-black">
                    <input 
                        type="text" 
                        className="name-input w-full bg-transparent border-none text-white text-right px-2 h-8 focus:bg-[#1e293b] outline-none text-xs print:text-black"
                        value={row.name}
                        placeholder="ابحث..."
                        onChange={(e) => {
                            updateRow(row.id, 'name', e.target.value);
                            const rect = e.target.getBoundingClientRect();
                            setOverlay({ visible: true, type: 'product', top: rect.bottom + window.scrollY, left: rect.left, width: rect.width, rowIndex: idx, filterText: e.target.value, selectedIndex: 0 });
                        }}
                        onFocus={(e) => { e.target.select(); const rect = e.target.getBoundingClientRect(); setOverlay({ visible: true, type: 'product', top: rect.bottom + window.scrollY, left: rect.left, width: rect.width, rowIndex: idx, filterText: e.target.value, selectedIndex: 0 }); }}
                        onBlur={() => setTimeout(() => setOverlay(p => ({...p, visible: false})), 200)}
                        onKeyDown={(e) => handleTableKeyDown(e, idx, 'name')}
                    />
                </td>
                <td className={`border border-[#2d3748] p-0 print:border-black relative ${!printSettings.showUnit ? 'print:hidden' : ''}`}>
                   {row.itemId && inventory.find(i => i.id === row.itemId)?.hasSubUnits ? (
                       <div className="relative h-full w-full">
                           <select className="unit-input w-full bg-transparent border-none text-white text-center h-8 focus:bg-[#1e293b] outline-none text-xs print:text-black appearance-none" value={row.selectedUnitType} onChange={(e) => handleUnitChange(row.id, e.target.value as 'major' | 'minor')} onKeyDown={(e) => handleTableKeyDown(e, idx, 'unit')}>
                               <option value="major">{inventory.find(i => i.id === row.itemId)?.majorUnit}</option>
                               <option value="minor">{inventory.find(i => i.id === row.itemId)?.minorUnit}</option>
                           </select>
                           <ChevronDown size={10} className="absolute left-1 top-2.5 pointer-events-none text-gray-500 print:hidden"/>
                       </div>
                   ) : (
                    <input type="text" className="unit-input w-full bg-transparent border-none text-white text-center h-8 focus:bg-[#1e293b] outline-none text-xs print:text-black" value={row.unit} onChange={(e) => updateRow(row.id, 'unit', e.target.value)} onKeyDown={(e) => handleTableKeyDown(e, idx, 'unit')} onFocus={(e) => e.target.select()} />
                   )}
                </td>
                <td className="border border-[#2d3748] p-0 print:border-black">
                    <input type="number" className="qty-input w-full bg-transparent border-none text-white text-center h-8 focus:bg-[#1e293b] outline-none text-xs print:text-black" value={row.qty} onChange={(e) => updateRow(row.id, 'qty', parseFloat(e.target.value) || 0)} onKeyDown={(e) => handleTableKeyDown(e, idx, 'qty')} onFocus={(e) => e.target.select()} />
                </td>
                <td className="border border-[#2d3748] p-0 print:border-black">
                    <input type="number" className="price-input w-full bg-transparent border-none text-white text-center h-8 focus:bg-[#1e293b] outline-none text-xs print:text-black" value={row.price} onChange={(e) => updateRow(row.id, 'price', parseFloat(e.target.value) || 0)} onKeyDown={(e) => handleTableKeyDown(e, idx, 'price')} onFocus={(e) => e.target.select()} />
                </td>
                <td className="border border-[#2d3748] p-0 print:border-black">
                    <input type="number" className="discount-input w-full bg-transparent border-none text-white text-center h-8 focus:bg-[#1e293b] outline-none text-xs print:text-black" value={row.discount} onChange={(e) => updateRow(row.id, 'discount', parseFloat(e.target.value) || 0)} onKeyDown={(e) => handleTableKeyDown(e, idx, 'discount')} onFocus={(e) => e.target.select()} />
                </td>
                <td className="border border-[#2d3748] p-0 print:border-black relative">
                    <div className="flex items-center h-full w-full relative">
                        <input type="text" className={`expiry-input w-full bg-transparent border-none text-center h-8 focus:bg-[#1e293b] outline-none text-xs print:text-black ${expiryStatus ? expiryStatus.color : 'text-white'}`} value={row.expiry} placeholder="MM/YYYY" onChange={(e) => handleExpiryChange(row.id, e.target.value)} onBlur={(e) => handleExpiryBlur(row.id, e.target.value)} onKeyDown={(e) => handleTableKeyDown(e, idx, 'expiry')} onFocus={(e) => e.target.select()} />
                        {expiryStatus && <div className="absolute left-1 top-1.5 print:hidden group"><AlertTriangle size={14} className={expiryStatus.type === 'error' ? 'text-red-500' : expiryStatus.type === 'warning' ? 'text-amber-500' : 'text-blue-400'} /><div className="absolute bottom-full left-0 mb-1 hidden group-hover:block bg-black text-white text-[10px] p-2 rounded whitespace-nowrap z-50 shadow-xl border border-white/20">{expiryStatus.msg}</div></div>}
                    </div>
                </td>
                <td className="border border-[#2d3748] text-center font-bold text-blue-400 print:border-black print:text-black">
                    {((row.qty * row.price) * (1 - row.discount/100)).toFixed(2)}
                </td>
                <td className="border border-[#2d3748] text-center print:hidden">
                    <button onClick={() => removeRow(row.id)} className="text-red-900 hover:text-red-500 w-full h-full flex items-center justify-center" tabIndex={-1}><X size={12} /></button>
                </td>
              </tr>
            )})}
          </tbody>
        </table>
      </div>
      
      <button onClick={addRow} className="w-full py-1 bg-gray-800/50 text-gray-500 text-[10px] hover:bg-gray-800 transition rounded border border-gray-800 mb-4 print:hidden">+ إضافة سطر (Insert)</button>

      {/* --- Footer Summary --- */}
      <div className="flex items-end gap-4 summary-section">
        <div className={`flex-1 bg-[#161e2e] p-2 rounded border border-gray-800 h-24 ${!printSettings.showNotes ? 'print:hidden' : ''}`}>
            <label className="text-[10px] text-gray-500 block">ملاحظات:</label>
            <textarea className="w-full bg-transparent border-none text-xs outline-none h-16 resize-none text-gray-300 print:text-black"></textarea>
        </div>
        <div className="w-72 bg-[#161e2e] p-2 rounded border border-gray-800 space-y-1 print:bg-white print:border-black print:text-black summary-box">
            <div className="flex justify-between text-gray-400 text-xs print:text-black summary-row">
                <span>الإجمالي قبل الخصم:</span>
                <span className="font-mono">{totals.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-red-400 text-xs border-t border-gray-700 pt-1 print:text-black print:border-black summary-row">
                <span>إجمالي الخصم:</span>
                <span className="font-mono">{totals.totalDiscount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-gray-700 print:border-black summary-row">
                <span className="font-bold text-gray-200 text-sm print:text-black">الصافي النهائي:</span>
                <span className="text-2xl font-bold text-green-500 font-mono print:text-black">{totals.net.toFixed(2)}</span>
            </div>
        </div>
      </div>
    </div>
  );
};
