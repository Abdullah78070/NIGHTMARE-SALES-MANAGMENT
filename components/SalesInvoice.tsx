
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  Printer, 
  Eye, 
  Save, 
  PauseCircle, 
  Trash2, 
  User, 
  Hash, 
  Calendar,
  Search,
  ChevronDown,
  Plus,
  Percent,
  PlusCircle
} from 'lucide-react';
import { InventoryItem, SalesInvoice as SalesInvoiceType, SalesRow, CompanyInfo, Customer } from '../types';

interface Props {
  inventory: InventoryItem[];
  customers: Customer[]; // Add customers prop
  companyInfo?: CompanyInfo;
  onSave?: (data: SalesInvoiceType) => void;
  initialInvoice?: SalesInvoiceType | null;
  nextId?: number;
  onCancel?: () => void;
  isEditMode?: boolean; // New prop for auto-ID logic
}

interface OverlayState {
  visible: boolean;
  type: 'product' | 'customer';
  top: number;
  left: number;
  width: number;
  rowIndex?: number;
  filterText: string;
  selectedIndex: number;
}

// --- Helper: Date Formatter DD/MM/YYYY ---
const getTodayDate = () => {
  const d = new Date();
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

export const SalesInvoice: React.FC<Props> = ({ inventory, customers, companyInfo, onSave, initialInvoice, nextId = 1, onCancel, isEditMode = false }) => {
  // --- Header State ---
  const [invoiceHeader, setInvoiceHeader] = useState({
    number: nextId,
    date: getTodayDate(),
    customer: '',
    type: 'cash' as 'cash' | 'credit' | 'delivery',
  });

  // --- Rows State ---
  const [items, setItems] = useState<SalesRow[]>([
    { id: Date.now(), code: '', name: '', unit: 'قطعة', qty: 1, price: 0, discount: 0 }
  ]);

  // --- Adjustments State (Discount & Extra) ---
  const [adjustment, setAdjustment] = useState({
      discountType: 'value' as 'value' | 'percent',
      discountValue: 0,
      extraVal: 0
  });

  // --- Overlay State (For Search) ---
  const [overlay, setOverlay] = useState<OverlayState>({
    visible: false, type: 'product', top: 0, left: 0, width: 0, filterText: '', selectedIndex: 0
  });

  // Refs
  const tableRef = useRef<HTMLTableElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const barcodeLock = useRef(false); 

  // --- Print Settings ---
  const printSettings = companyInfo?.printSettings || {
    showCode: true,
    showLocation: false,
    showUnit: true,
    showNotes: true,
    showFooterSignatures: true
  };

  // --- Initialize Data ---
  useEffect(() => {
    if (initialInvoice) {
        setInvoiceHeader({
            number: parseInt(initialInvoice.id) || 0,
            date: initialInvoice.date,
            customer: initialInvoice.customerName,
            type: (initialInvoice.paymentType === 'نقدي' ? 'cash' : initialInvoice.paymentType === 'آجل' ? 'credit' : 'delivery'),
        });
        
        if (initialInvoice.rows && initialInvoice.rows.length > 0) {
            setItems(initialInvoice.rows);
        } else {
            setItems([{ id: Date.now(), code: '', name: '', unit: 'قطعة', qty: 1, price: 0, discount: 0 }]);
        }

        setAdjustment({
            discountType: initialInvoice.discountType || 'value',
            discountValue: initialInvoice.discountValue || 0,
            extraVal: initialInvoice.extraValue || 0
        });
    } else {
        // Reset
        setInvoiceHeader({
            number: nextId,
            date: getTodayDate(),
            customer: '',
            type: 'cash',
        });
        setItems([{ id: Date.now(), code: '', name: '', unit: 'قطعة', qty: 1, price: 0, discount: 0 }]);
        setAdjustment({ discountType: 'value', discountValue: 0, extraVal: 0 });
    }
  }, [initialInvoice, nextId]);

  // --- Auto-Update ID Logic ---
  useEffect(() => {
      if (!isEditMode) {
          setInvoiceHeader(prev => ({ ...prev, number: nextId }));
      }
  }, [nextId, isEditMode]);

  // --- Filtered Lists for Overlay ---
  const filteredProducts = useMemo(() => 
    inventory.filter(p => 
      p.name.includes(overlay.filterText) || 
      (p.nameEn && p.nameEn.toLowerCase().includes(overlay.filterText.toLowerCase()))
    ), 
  [overlay.filterText, inventory]);

  // Filter customers from props
  const filteredCustomers = useMemo(() => 
    customers.filter(c => 
        c.name.toLowerCase().includes(overlay.filterText.toLowerCase()) || 
        c.phone.includes(overlay.filterText) ||
        c.code.toLowerCase().includes(overlay.filterText.toLowerCase())
    ),
  [overlay.filterText, customers]);

  // --- Calculations ---
  const totals = useMemo(() => {
    let subtotal = 0;
    items.forEach(item => {
      subtotal += item.qty * item.price;
    });

    let discountAmount = 0;
    if (adjustment.discountType === 'percent') {
        discountAmount = subtotal * (adjustment.discountValue / 100);
    } else {
        discountAmount = adjustment.discountValue;
    }

    const net = subtotal - discountAmount + adjustment.extraVal;

    return { subtotal, discountAmount, net };
  }, [items, adjustment]);

  // Reset selected index when filter changes
  useEffect(() => {
    setOverlay(prev => ({ ...prev, selectedIndex: 0 }));
  }, [overlay.filterText]);


  // --- Handlers ---
  const addRow = () => {
    setItems(prev => [...prev, { id: Date.now(), code: '', name: '', unit: 'قطعة', qty: 1, price: 0, discount: 0 }]);
  };

  const removeRow = (id: number) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    } else {
       setItems([{ id: Date.now(), code: '', name: '', unit: 'قطعة', qty: 1, price: 0, discount: 0 }]);
    }
  };

  const updateRow = (id: number, field: keyof SalesRow, value: any) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const handleClear = () => {
      if (onCancel) onCancel();
      setItems([{ id: Date.now(), code: '', name: '', unit: 'قطعة', qty: 1, price: 0, discount: 0 }]);
      setInvoiceHeader(prev => ({ ...prev, customer: '', type: 'cash' }));
  };

  const handleSaveAction = (status: 'مكتمل' | 'معلق' = 'مكتمل') => {
      if (items.length === 0 || (items.length === 1 && !items[0].name)) {
          alert('الفاتورة فارغة!');
          return;
      }

      // --- STOCK VALIDATION ---
      for (const row of items) {
          if (row.qty <= 0) {
              alert(`خطأ: لا يمكن بيع كمية صفرية أو سالبة في السطر: ${row.name}`);
              return;
          }

          const product = inventory.find(i => i.id === row.itemId || i.code === row.code);
          if (product) {
              if (row.qty > product.actualStock) {
                  alert(`عذراً، الرصيد غير كافي للصنف: ${product.name}\nالمطلوب: ${row.qty}\nالمتوفر: ${product.actualStock}`);
                  return; // Stop Save
              }
          }
      }

      if (onSave) {
          const invoice: SalesInvoiceType = {
              id: invoiceHeader.number.toString(),
              date: invoiceHeader.date,
              customerName: invoiceHeader.customer || 'عميل نقدي',
              amount: totals.net,
              status: status,
              paymentType: invoiceHeader.type === 'cash' ? 'نقدي' : invoiceHeader.type === 'credit' ? 'آجل' : 'توصيل',
              rows: items,
              discountValue: adjustment.discountValue,
              discountType: adjustment.discountType,
              extraValue: adjustment.extraVal
          };
          onSave(invoice);
          
          if (!initialInvoice) {
              // Reset for next invoice if not editing
              setInvoiceHeader(prev => ({ ...prev, number: prev.number + 1, customer: '', type: 'cash' }));
              setItems([{ id: Date.now(), code: '', name: '', unit: 'قطعة', qty: 1, price: 0, discount: 0 }]);
              setAdjustment({ discountType: 'value', discountValue: 0, extraVal: 0 });
          }
          alert(`تم حفظ الفاتورة رقم ${invoiceHeader.number} بنجاح`);
      }
  };

  // --- Product Selection Helper ---
  const selectProduct = (rowId: number, product: InventoryItem) => {
      setItems(prev => prev.map(item => {
          if (item.id === rowId) {
              return {
                  ...item,
                  itemId: product.id,
                  code: product.code,
                  name: product.name,
                  unit: product.majorUnit,
                  price: product.priceMajor, // Selling Price
                  qty: 1,
                  location: product.location 
              };
          }
          return item;
      }));

      // Close overlay if open
      setOverlay(prev => ({ ...prev, visible: false }));

      // Focus next field (Qty)
      setTimeout(() => {
        const rowEl = tableRef.current?.querySelector(`tr[data-id="${rowId}"]`);
        (rowEl?.querySelector('.qty-input') as HTMLInputElement)?.focus();
      }, 50);
  };

  // --- Search Logic ---
  const handleBarcodeSearch = (id: number, barcode: string) => {
    if (barcodeLock.current) return;
    if (!barcode) return;
    
    const product = inventory.find(p => p.code === barcode);
    if (product) {
        selectProduct(id, product);
    }
  };

  const selectProductFromOverlay = (product: InventoryItem) => {
    if (overlay.rowIndex !== undefined) {
        const rowId = items[overlay.rowIndex].id;
        selectProduct(rowId, product);
    }
  };

  const selectCustomerFromOverlay = (customer: Customer) => {
      setInvoiceHeader(prev => ({ ...prev, customer: customer.name }));
      setOverlay(prev => ({ ...prev, visible: false }));
      // Focus on first row code after selecting customer
      setTimeout(() => {
        const firstRowInput = tableRef.current?.querySelector('.code-input') as HTMLInputElement;
        firstRowInput?.focus();
      }, 50);
  };

  // --- Smart Date Formatter ---
  const handleDateBlur = (val: string) => {
    const clean = val.replace(/\D/g, '');
    if (clean.length === 6) {
        const dd = clean.substring(0, 2);
        const mm = clean.substring(2, 4);
        const yy = clean.substring(4, 6);
        setInvoiceHeader(prev => ({...prev, date: `${dd}/${mm}/20${yy}`}));
    } else if (clean.length === 8) {
        const dd = clean.substring(0, 2);
        const mm = clean.substring(2, 4);
        const yyyy = clean.substring(4, 8);
        setInvoiceHeader(prev => ({...prev, date: `${dd}/${mm}/${yyyy}`}));
    }
  };

  // --- Keyboard Handling ---
  
  const handleHeaderKeyDown = (e: React.KeyboardEvent) => {
    if (overlay.visible && overlay.type === 'customer') {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setOverlay(prev => ({ ...prev, selectedIndex: Math.min(prev.selectedIndex + 1, filteredCustomers.length - 1) }));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setOverlay(prev => ({ ...prev, selectedIndex: Math.max(prev.selectedIndex - 1, 0) }));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredCustomers[overlay.selectedIndex]) {
          selectCustomerFromOverlay(filteredCustomers[overlay.selectedIndex]);
        }
      } else if (e.key === 'Escape') {
        setOverlay(prev => ({ ...prev, visible: false }));
      }
    }
  };

  const handleTableKeyDown = (e: React.KeyboardEvent, rowIndex: number, colName: string) => {
    if (overlay.visible && overlay.type === 'product') {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            const max = filteredProducts.length;
            setOverlay(prev => ({ ...prev, selectedIndex: Math.min(prev.selectedIndex + 1, max - 1) }));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setOverlay(prev => ({ ...prev, selectedIndex: Math.max(prev.selectedIndex - 1, 0) }));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (filteredProducts[overlay.selectedIndex]) {
                selectProductFromOverlay(filteredProducts[overlay.selectedIndex]);
            }
        } else if (e.key === 'Escape') {
            setOverlay(prev => ({ ...prev, visible: false }));
        }
        return;
    }

    if (e.key === 'Enter') {
        e.preventDefault();
        
        if (colName === 'code') {
            const inputVal = (e.target as HTMLInputElement).value;
            const product = inventory.find(p => p.code === inputVal);
            
            if (product) {
                barcodeLock.current = true;
                selectProduct(items[rowIndex].id, product);
                setTimeout(() => { barcodeLock.current = false; }, 200);
                return;
            }
        }

        const columns = ['code', 'name', 'unit', 'qty', 'price']; 
        const currentIdx = columns.indexOf(colName);
        
        if (currentIdx < columns.length - 1) {
            const nextCol = columns[currentIdx + 1];
            const cell = tableRef.current?.querySelector(`tr[data-id="${items[rowIndex].id}"] .${nextCol}-input`) as HTMLInputElement;
            cell?.focus();
        } else {
            if (rowIndex < items.length - 1) {
                const nextRowId = items[rowIndex + 1].id;
                const cell = tableRef.current?.querySelector(`tr[data-id="${nextRowId}"] .code-input`) as HTMLInputElement;
                cell?.focus();
            } else {
                addRow();
                setTimeout(() => {
                    const lastRow = tableRef.current?.rows[tableRef.current.rows.length - 1];
                    (lastRow?.querySelector('.code-input') as HTMLInputElement)?.focus();
                }, 50);
            }
        }
    }
  };

  return (
    <div className="min-h-[calc(100vh-100px)] bg-[#0b0f1a] p-2 md:p-4 font-sans text-xs text-slate-200 animate-in fade-in zoom-in-95 duration-300 sales-invoice-container" dir="rtl">
      
      {/* ... (Existing Print Styles) ... */}
      <style>{`
        @media print {
          @page { size: A4; margin: 0; }
          body { 
            background-color: #fff !important; 
            color: #000 !important; 
            -webkit-print-color-adjust: exact;
            margin: 0 !important;
            padding: 0 !important;
          }
          #root { background-color: #fff !important; width: 100%; }
          .print\\:hidden, button, .notification, header, .overlay, footer, nav, .hide-on-print { display: none !important; }
          .sales-invoice-container {
             position: relative !important;
             width: 210mm !important;
             min-height: 297mm !important;
             margin: 0 auto !important;
             padding: 10mm !important;
             background: #fff !important;
             color: #000 !important;
             overflow: visible !important;
          }
          div, input, select, textarea, table, th, td {
            background-color: transparent !important;
            color: #000 !important;
            border-color: #000 !important;
            box-shadow: none !important;
          }
          input, select, textarea {
            border: none !important;
            padding: 0 !important;
            font-size: 11px !important;
            font-weight: 600 !important;
            width: 100% !important;
            appearance: none !important;
          }
          .print-header { 
            display: flex !important; 
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 20px;
            border-bottom: 2px solid #000;
            padding-bottom: 10px;
          }
          .invoice-details-print {
            display: grid !important;
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 10px !important;
            margin-bottom: 15px !important;
            border: 1px solid #000 !important;
            padding: 10px !important;
          }
          .invoice-details-print label { font-weight: bold; font-size: 10px; display: block; }
          table { width: 100% !important; border-collapse: collapse !important; border: 1px solid #000 !important; margin-bottom: 10px !important; table-layout: auto !important; }
          th { background-color: #e5e5e5 !important; border: 1px solid #000 !important; font-weight: bold !important; padding: 4px !important; text-align: center !important; font-size: 10px !important; }
          td { border: 1px solid #000 !important; padding: 4px !important; text-align: center !important; font-size: 10px !important; vertical-align: middle !important; }
          .totals-print {
             display: flex !important;
             justify-content: flex-end;
             margin-top: 10px;
          }
          .totals-box {
             width: 250px !important;
             border: 1px solid #000 !important;
             padding: 5px !important;
          }
          .total-row { display: flex; justify-between; margin-bottom: 2px; font-size: 11px; }
          .print-footer { display: flex !important; margin-top: 40px; justify-content: space-between; padding: 0 50px; }
          .signature-box { text-align: center; width: 150px; }
          .signature-line { border-top: 1px solid #000; margin-top: 40px; }
          ::placeholder { color: transparent !important; }
        }
      `}</style>

      {/* --- Search Overlay using Portal --- */}
      {overlay.visible && createPortal(
        <div 
          ref={overlayRef}
          className="fixed z-[9999] bg-[#1f2937] border border-blue-500 shadow-2xl max-h-48 overflow-y-auto custom-scrollbar print:hidden"
          style={{ top: overlay.top, left: overlay.left, width: overlay.width }}
        >
          {/* Customer List */}
          {overlay.type === 'customer' && filteredCustomers.map((c, i) => (
             <div 
               key={c.id} 
               className={`p-2 cursor-pointer border-b border-gray-700 ${i === overlay.selectedIndex ? 'bg-blue-600 text-white' : 'hover:bg-blue-600/50'}`} 
               onMouseDown={(e) => { e.preventDefault(); selectCustomerFromOverlay(c); }}
             >
               {c.name} <span className="text-[9px] text-gray-400">({c.phone})</span>
             </div>
          ))}

          {/* Product List */}
          {overlay.type === 'product' && filteredProducts.map((p, i) => (
             <div 
               key={p.id} 
               className={`p-2 cursor-pointer border-b border-gray-700 flex justify-between items-center ${i === overlay.selectedIndex ? 'bg-blue-600 text-white' : 'hover:bg-blue-600/50'}`} 
               onMouseDown={(e) => { e.preventDefault(); selectProductFromOverlay(p); }}
             >
               <div className="flex flex-col">
                  <span>{p.name}</span>
                  {p.nameEn && <span className="text-[9px] opacity-70">{p.nameEn}</span>}
               </div>
               <div className="flex flex-col items-end">
                   <span className={i === overlay.selectedIndex ? 'text-blue-100' : 'text-blue-300 font-bold'}>{p.priceMajor}</span>
                   <span className="text-[9px] opacity-70">رصيد: {p.actualStock}</span>
               </div>
             </div>
          ))}

          {((overlay.type === 'customer' && filteredCustomers.length === 0) || 
            (overlay.type === 'product' && filteredProducts.length === 0)) && (
              <div className="p-2 text-gray-500 text-center">لا توجد نتائج</div>
          )}
        </div>,
        document.body
      )}

      {/* --- Print Header --- */}
      <div className="hidden print-header">
         <div className="text-right w-1/3">
            <h1 className="text-2xl font-bold mb-1">فاتورة مبيعات</h1>
            <div className="border border-black px-2 py-1 inline-block mt-2 font-bold text-sm">
               رقم: {invoiceHeader.number}
            </div>
            <div className="mt-1 text-xs">نوع الفاتورة: {invoiceHeader.type === 'cash' ? 'نقدي' : invoiceHeader.type === 'credit' ? 'آجل' : 'توصيل'}</div>
         </div>
         <div className="text-center w-1/3 flex justify-center items-start">
             {companyInfo?.logo && (
                 <img src={companyInfo.logo} alt="Logo" className="max-h-24 object-contain" />
             )}
         </div>
         <div className="text-left w-1/3" dir="ltr">
            <h2 className="text-xl font-bold mb-1">{companyInfo?.name || 'Company Name'}</h2>
            <p className="text-xs mb-0.5">{companyInfo?.address}</p>
            <p className="text-xs font-mono">{companyInfo?.phone}</p>
         </div>
      </div>

      {/* Header Buttons Section - Compact */}
      <div className="max-w-[1400px] mx-auto bg-[#161e2e] border border-slate-800 rounded-t-lg p-2 flex flex-wrap gap-2 mb-2 shadow-lg print:hidden">
        <button onClick={() => window.print()} className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded text-[11px] font-bold transition-colors shadow-[0_0_10px_rgba(37,99,235,0.2)]">
          <Printer size={14} />
          <span>طباعة (Ctrl+P)</span>
        </button>
        <button onClick={() => window.print()} className="flex items-center gap-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 px-4 py-1.5 rounded text-[11px] font-bold transition-colors border border-slate-600">
          <Eye size={14} />
          <span>معاينة</span>
        </button>
        <button onClick={() => handleSaveAction('مكتمل')} className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-1.5 rounded text-[11px] font-bold transition-colors shadow-[0_0_10px_rgba(5,150,105,0.2)]">
          <Save size={14} />
          <span>حفظ وترحيل (F10)</span>
        </button>
        <button onClick={() => handleSaveAction('معلق')} className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-500 text-white px-4 py-1.5 rounded text-[11px] font-bold transition-colors shadow-[0_0_10px_rgba(217,119,6,0.2)]">
          <PauseCircle size={14} />
          <span>تعليق (F8)</span>
        </button>
        <div className="flex-1"></div>
        <button onClick={handleClear} className="flex items-center gap-1.5 bg-red-900/50 hover:bg-red-800 text-red-200 border border-red-900/50 px-4 py-1.5 rounded text-[11px] font-bold transition-colors">
          <Trash2 size={14} />
          <span>مسح الفاتورة</span>
        </button>
      </div>

      {/* Invoice Details Section */}
      <div className="max-w-[1400px] mx-auto bg-[#161e2e] border border-slate-800 p-4 rounded-b-lg mb-2 shadow-xl print:bg-white print:border-black print:p-0">
        
        {/* Screen Layout */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 print:hidden">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
              <Hash size={12} className="text-blue-500" /> كود العميل
            </label>
            <div className="relative">
                <input type="text" className="w-full bg-[#0b0f1a] border border-slate-700 rounded p-2 text-xs focus:border-blue-500 outline-none text-white font-mono" placeholder="001" />
                <Search size={12} className="absolute left-2 top-2.5 text-slate-600" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
              <User size={12} className="text-blue-500" /> اسم العميل
            </label>
            <input 
                type="text" 
                value={invoiceHeader.customer}
                onChange={(e) => {
                  setInvoiceHeader({...invoiceHeader, customer: e.target.value});
                  const rect = e.target.getBoundingClientRect();
                  setOverlay({ 
                    visible: true, 
                    type: 'customer', 
                    top: rect.bottom + window.scrollY, 
                    left: rect.left, 
                    width: rect.width, 
                    rowIndex: 0, 
                    filterText: e.target.value, 
                    selectedIndex: 0 
                  });
                }}
                onFocus={(e) => {
                  e.target.select();
                  const rect = e.target.getBoundingClientRect();
                  setOverlay({ 
                    visible: true, 
                    type: 'customer', 
                    top: rect.bottom + window.scrollY, 
                    left: rect.left, 
                    width: rect.width, 
                    rowIndex: 0, 
                    filterText: e.target.value, 
                    selectedIndex: 0 
                  });
                }}
                onBlur={() => setTimeout(() => setOverlay(prev => ({...prev, visible: false})), 200)}
                onKeyDown={handleHeaderKeyDown}
                className="w-full bg-[#0b0f1a] border border-slate-700 rounded p-2 text-xs focus:border-blue-500 outline-none text-white" 
                placeholder="ابحث عن عميل..." 
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
              <Hash size={12} className="text-blue-500" /> رقم الفاتورة
            </label>
            <input 
              type="text" 
              className="w-full bg-[#1e293b] border border-slate-700 rounded p-2 text-xs focus:ring-1 focus:ring-blue-500 outline-none font-mono text-blue-400 font-bold text-center cursor-not-allowed" 
              value={invoiceHeader.number} 
              readOnly 
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
              <Calendar size={12} className="text-blue-500" /> التاريخ
            </label>
            <input 
                type="text" 
                value={invoiceHeader.date}
                onChange={(e) => setInvoiceHeader({...invoiceHeader, date: e.target.value})}
                onBlur={(e) => handleDateBlur(e.target.value)}
                placeholder="DD/MM/YYYY"
                className="w-full bg-[#0b0f1a] border border-slate-700 rounded p-2 text-xs focus:border-blue-500 outline-none text-white font-mono" 
            />
          </div>
        </div>

        {/* ... (Print Layout and Rest of the Component remains similar but utilizing the new handleSaveAction) ... */}
        
        {/* Invoice Type & Discounts Section (Screen Only) */}
        <div className="flex flex-col md:flex-row gap-2 print:hidden">
            
            {/* Type */}
            <div className="bg-[#0b0f1a]/50 p-2 rounded border border-slate-800 flex items-center gap-4 flex-1">
                <span className="font-bold text-slate-400 text-[10px] ml-1 bg-slate-800 px-2 py-0.5 rounded">نوع الفاتورة:</span>
                
                <label className={`flex items-center gap-1 cursor-pointer px-2 py-1 rounded transition-colors ${invoiceHeader.type === 'cash' ? 'bg-blue-500/10 border border-blue-500/30' : 'hover:bg-white/5'}`}>
                    <input type="radio" name="type" checked={invoiceHeader.type === 'cash'} onChange={() => setInvoiceHeader({...invoiceHeader, type: 'cash'})} className="appearance-none w-3 h-3 rounded-full border border-slate-500 checked:bg-blue-500 checked:border-blue-500" />
                    <span className={`text-xs ${invoiceHeader.type === 'cash' ? 'font-bold text-blue-400' : 'text-slate-500'}`}>نقدى</span>
                </label>

                <label className={`flex items-center gap-1 cursor-pointer px-2 py-1 rounded transition-colors ${invoiceHeader.type === 'credit' ? 'bg-blue-500/10 border border-blue-500/30' : 'hover:bg-white/5'}`}>
                    <input type="radio" name="type" checked={invoiceHeader.type === 'credit'} onChange={() => setInvoiceHeader({...invoiceHeader, type: 'credit'})} className="appearance-none w-3 h-3 rounded-full border border-slate-500 checked:bg-blue-500 checked:border-blue-500" />
                    <span className={`text-xs ${invoiceHeader.type === 'credit' ? 'font-bold text-blue-400' : 'text-slate-500'}`}>آجل</span>
                </label>

                <label className={`flex items-center gap-1 cursor-pointer px-2 py-1 rounded transition-colors ${invoiceHeader.type === 'delivery' ? 'bg-blue-500/10 border border-blue-500/30' : 'hover:bg-white/5'}`}>
                    <input type="radio" name="type" checked={invoiceHeader.type === 'delivery'} onChange={() => setInvoiceHeader({...invoiceHeader, type: 'delivery'})} className="appearance-none w-3 h-3 rounded-full border border-slate-500 checked:bg-blue-500 checked:border-blue-500" />
                    <span className={`text-xs ${invoiceHeader.type === 'delivery' ? 'font-bold text-blue-400' : 'text-slate-500'}`}>توصيل</span>
                </label>
            </div>

            {/* Adjustments (Discount & Extra) */}
            <div className="bg-[#0b0f1a]/50 p-2 rounded border border-slate-800 flex items-center gap-3">
                 {/* Discount */}
                 <div className="flex items-center gap-1 bg-slate-900/80 p-1 rounded border border-slate-700">
                    <button 
                        onClick={() => setAdjustment(prev => ({...prev, discountType: prev.discountType === 'percent' ? 'value' : 'percent'}))}
                        className="w-6 h-6 flex items-center justify-center rounded bg-slate-800 border border-slate-600 text-orange-400 hover:bg-slate-700 transition"
                        title="تغيير نوع الخصم (نسبة / قيمة)"
                    >
                        {adjustment.discountType === 'percent' ? <Percent size={10} /> : <span className="text-[9px] font-bold">123</span>}
                    </button>
                    <input 
                        type="number"
                        value={adjustment.discountValue}
                        onChange={e => setAdjustment(prev => ({...prev, discountValue: parseFloat(e.target.value) || 0}))}
                        className="w-16 bg-transparent text-center text-xs text-orange-400 outline-none font-mono font-bold"
                        placeholder="خصم..."
                        onFocus={(e) => e.target.select()}
                    />
                    <span className="text-[10px] text-slate-500 px-1 border-r border-slate-700">خصم</span>
                 </div>

                 {/* Extra Fee */}
                 <div className="flex items-center gap-1 bg-slate-900/80 p-1 rounded border border-slate-700">
                    <div className="w-6 h-6 flex items-center justify-center rounded bg-slate-800 border border-slate-600 text-blue-400">
                        <PlusCircle size={10} />
                    </div>
                    <input 
                        type="number"
                        value={adjustment.extraVal}
                        onChange={e => setAdjustment(prev => ({...prev, extraVal: parseFloat(e.target.value) || 0}))}
                        className="w-16 bg-transparent text-center text-xs text-blue-400 outline-none font-mono font-bold"
                        placeholder="إضافي..."
                        onFocus={(e) => e.target.select()}
                    />
                    <span className="text-[10px] text-slate-500 px-1 border-r border-slate-700">إضافي</span>
                 </div>
            </div>
        </div>
      </div>

      {/* Excel-like Items Table */}
      <div className="max-w-[1400px] mx-auto overflow-hidden border border-slate-800 rounded-lg shadow-inner bg-[#0b111d] print:border-black print:bg-white print:overflow-visible">
        <div className="overflow-x-auto custom-scrollbar print:overflow-visible">
            <table className="w-full text-right border-collapse" ref={tableRef}>
            <thead>
                <tr className="bg-[#161e2d] border-b border-slate-700 text-slate-400 text-[10px] font-bold uppercase tracking-wider print:bg-gray-100 print:text-black print:border-black">
                <th className="p-2 border-l border-slate-700 w-10 text-center print:border-black">#</th>
                <th className={`p-2 border-l border-slate-700 w-40 print:border-black ${!printSettings.showCode ? 'print:hidden' : ''}`}>
                    <span className="print:hidden">كود الصنف</span>
                    <span className="hidden print:inline">
                      {printSettings.showLocation ? 'الكود / الموقع' : 'كود الصنف'}
                    </span>
                </th>
                <th className="p-2 border-l border-slate-700 print:border-black">اسم الصنف</th>
                <th className={`p-2 border-l border-slate-700 w-24 text-center print:border-black ${!printSettings.showUnit ? 'print:hidden' : ''}`}>الوحدة</th>
                <th className="p-2 border-l border-slate-700 w-24 text-center print:border-black">الكمية</th>
                <th className="p-2 border-l border-slate-700 w-32 text-center print:border-black">السعر</th>
                <th className="p-2 border-l border-slate-700 w-32 text-center print:border-black">الإجمالي</th>
                <th className="p-2 w-10 text-center print:hidden"></th>
                </tr>
            </thead>
            <tbody>
                {items.map((item, index) => (
                <tr key={item.id} data-id={item.id} className="border-b border-slate-800 hover:bg-slate-800/40 transition-colors group print:border-black print:hover:bg-transparent">
                    <td className="p-1 border-l border-slate-800 text-center text-slate-600 text-[10px] bg-[#0f172a] print:bg-white print:text-black print:border-black">{index + 1}</td>
                    
                    <td className={`p-0 border-l border-slate-800 relative print:border-black ${!printSettings.showCode ? 'print:hidden' : ''}`}>
                        <input 
                            type="text" 
                            className="code-input w-full h-8 px-2 text-xs bg-transparent text-white focus:bg-[#1e293b] focus:outline-none focus:ring-1 focus:ring-blue-500/50 transition-all font-mono placeholder:text-slate-700 print:hidden" 
                            placeholder="scan..."
                            value={item.code}
                            onChange={(e) => updateRow(item.id, 'code', e.target.value)}
                            onBlur={(e) => handleBarcodeSearch(item.id, e.target.value)}
                            onKeyDown={(e) => handleTableKeyDown(e, index, 'code')}
                            onFocus={(e) => e.target.select()}
                        />
                        <div className="hidden print:flex flex-col text-center text-black text-[10px] font-bold p-1">
                             <span>{item.code}</span>
                             {printSettings.showLocation && (
                                <span className="text-[9px] font-normal italic">{item.location || '-'}</span>
                             )}
                        </div>
                    </td>

                    <td className="p-0 border-l border-slate-800 relative print:border-black">
                         <input 
                            type="text" 
                            className="name-input w-full h-8 px-2 text-xs bg-transparent text-white focus:bg-[#1e293b] focus:outline-none focus:ring-1 focus:ring-blue-500/50 transition-all placeholder:text-slate-700 print:text-black" 
                            placeholder="بحث بالاسم..."
                            value={item.name}
                            onChange={(e) => {
                                updateRow(item.id, 'name', e.target.value);
                                const rect = e.target.getBoundingClientRect();
                                setOverlay({
                                    visible: true,
                                    type: 'product',
                                    top: rect.bottom + window.scrollY,
                                    left: rect.left,
                                    width: rect.width,
                                    rowIndex: index,
                                    filterText: e.target.value,
                                    selectedIndex: 0
                                });
                            }}
                            onFocus={(e) => {
                                e.target.select();
                                const rect = e.target.getBoundingClientRect();
                                setOverlay({
                                    visible: true,
                                    type: 'product',
                                    top: rect.bottom + window.scrollY,
                                    left: rect.left,
                                    width: rect.width,
                                    rowIndex: index,
                                    filterText: e.target.value,
                                    selectedIndex: 0
                                });
                            }}
                            onBlur={() => setTimeout(() => setOverlay(prev => ({...prev, visible: false})), 200)}
                            onKeyDown={(e) => handleTableKeyDown(e, index, 'name')}
                        />
                    </td>

                    <td className={`p-0 border-l border-slate-800 print:border-black ${!printSettings.showUnit ? 'print:hidden' : ''}`}>
                        <div className="relative h-8">
                            <select 
                                className="unit-input w-full h-full bg-transparent text-xs text-slate-300 focus:bg-[#1e293b] focus:outline-none appearance-none text-center cursor-pointer print:text-black"
                                value={item.unit}
                                onChange={(e) => updateRow(item.id, 'unit', e.target.value)}
                                onKeyDown={(e) => handleTableKeyDown(e, index, 'unit')}
                            >
                                <option>قطعة</option>
                                <option>كرتونة</option>
                                <option>كيلو</option>
                                <option>علبة</option>
                            </select>
                        </div>
                    </td>

                    <td className="p-0 border-l border-slate-800 print:border-black">
                         <input 
                            type="number" 
                            className="qty-input w-full h-8 px-1 text-xs text-center bg-transparent text-white focus:bg-[#1e293b] focus:outline-none focus:ring-1 focus:ring-blue-500/50 transition-all font-bold print:text-black" 
                            value={item.qty}
                            onChange={(e) => updateRow(item.id, 'qty', parseFloat(e.target.value) || 0)}
                            onKeyDown={(e) => handleTableKeyDown(e, index, 'qty')}
                            onFocus={(e) => e.target.select()}
                        />
                    </td>

                    <td className="p-0 border-l border-slate-800 print:border-black">
                         <input 
                            type="number" 
                            className="price-input w-full h-8 px-1 text-xs text-center bg-transparent text-white focus:bg-[#1e293b] focus:outline-none focus:ring-1 focus:ring-blue-500/50 transition-all font-mono print:text-black" 
                            value={item.price}
                            onChange={(e) => updateRow(item.id, 'price', parseFloat(e.target.value) || 0)}
                            onKeyDown={(e) => handleTableKeyDown(e, index, 'price')}
                            onFocus={(e) => e.target.select()}
                        />
                    </td>

                    <td className="p-1 border-l border-slate-800 text-center font-bold text-emerald-400 text-xs font-mono bg-[#0f172a]/30 print:bg-white print:text-black print:border-black">
                        {(item.qty * item.price).toFixed(2)}
                    </td>

                    <td className="p-1 text-center print:hidden">
                    <button 
                        onClick={() => removeRow(item.id)}
                        className="text-slate-600 hover:text-red-500 p-1.5 transition-colors rounded hover:bg-slate-800"
                        tabIndex={-1}
                    >
                        <Trash2 size={12} />
                    </button>
                    </td>
                </tr>
                ))}
            </tbody>
            </table>
        </div>
      </div>
      
      {/* Add Row Button */}
      <div className="max-w-[1400px] mx-auto mt-1 print:hidden">
        <button 
            onClick={addRow}
            className="flex items-center gap-1.5 text-blue-400 hover:text-blue-300 hover:bg-blue-900/20 px-3 py-1.5 rounded transition-colors text-[11px] font-bold border border-transparent hover:border-blue-900/50"
        >
            <Plus size={14} />
            إضافة سطر جديد (Insert)
        </button>
      </div>

      {/* Totals Section */}
      <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row justify-between items-end pt-4 mt-2 border-t border-slate-800 gap-4 totals-print">
        
        <div className={`w-full md:w-1/2 space-y-1 ${!printSettings.showNotes ? 'print:hidden' : ''}`}>
          <label className="text-[10px] font-bold text-slate-500 block">ملاحظات الفاتورة</label>
          <textarea className="w-full bg-[#161e2e] border border-slate-700 rounded p-2 h-20 text-xs outline-none focus:border-blue-500 text-slate-300 placeholder:text-slate-600 resize-none" placeholder="اكتب أي ملاحظات إضافية هنا..."></textarea>
        </div>
        
        <div className="w-full md:w-80 bg-[#161e2e] p-4 rounded-lg border border-slate-700 shadow-xl print:bg-white print:border-black print:text-black totals-box">
          <div className="flex justify-between items-center text-xs text-slate-400 mb-2 total-row print:text-black">
            <span>الإجمالي:</span>
            <span className="font-mono font-bold text-white text-sm print:text-black">{totals.subtotal.toFixed(2)}</span>
          </div>
          
          <div className="flex justify-between items-center text-xs text-slate-400 mb-2 total-row print:text-black">
            <span>الخصم ({adjustment.discountType === 'percent' ? '%' : 'قيمة'}):</span>
            <span className="font-mono text-orange-400 print:text-black">{totals.discountAmount.toFixed(2)}</span>
          </div>

          <div className="flex justify-between items-center text-xs text-slate-400 mb-2 total-row print:text-black">
            <span>قيمة مضافة:</span>
            <span className="font-mono text-blue-400 print:text-black">{adjustment.extraVal.toFixed(2)}</span>
          </div>

          <div className="w-full border-t border-slate-700 my-2 print:border-black"></div>
          <div className="flex justify-between items-center text-lg font-bold total-row">
            <span className="text-white text-sm print:text-black">الصافي النهائي:</span>
            <span className="font-mono text-emerald-400 text-xl print:text-black">{(totals.net).toFixed(2)}</span>
          </div>
          <div className="text-[9px] text-slate-600 text-center mt-2 font-mono print:hidden">EGP Currency</div>
        </div>
      </div>

      {printSettings.showFooterSignatures && (
        <div className="hidden print-footer">
            <div className="signature-box"><div className="font-bold text-sm mb-12">المستلم</div><div className="signature-line"></div></div>
            <div className="signature-box"><div className="font-bold text-sm mb-12">البائع</div><div className="signature-line"></div></div>
        </div>
      )}
    </div>
  );
};
