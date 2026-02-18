
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  FileText, 
  Hash, 
  Package, 
  Layers, 
  CheckCircle2,
  Calendar,
  Barcode,
  ChevronDown,
  RotateCcw
} from 'lucide-react';
import { SalesInvoice } from '../types';

interface Props {
    invoices: SalesInvoice[];
    onReturnItem?: (invoiceId: string, itemCode: string, qty: number) => void;
}

export const DetailedSalesList: React.FC<Props> = ({ invoices, onReturnItem }) => {
  // Extract unique items for search from Real Data
  const allUniqueItems = useMemo(() => {
    const itemsMap = new Map();
    invoices.forEach(inv => {
      if (inv.rows) {
          inv.rows.forEach(item => {
            if (!itemsMap.has(item.code)) {
              itemsMap.set(item.code, { code: item.code, name: item.name });
            }
          });
      }
    });
    return Array.from(itemsMap.values());
  }, [invoices]);

  const [searchInvoice, setSearchInvoice] = useState('');
  const [searchItem, setSearchItem] = useState('');
  const [showItemDropdown, setShowItemDropdown] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  
  // Track return inputs: { "invoiceId-itemCode": qty }
  const [returnInputs, setReturnInputs] = useState<Record<string, number>>({});

  const dropdownRef = useRef<HTMLDivElement>(null);
  const itemsListRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const invoiceRefs = useRef<(HTMLDivElement | null)[]>([]);
  
  // Filter items for dropdown
  const filteredItemsForDropdown = useMemo(() => {
    if (!searchItem) return allUniqueItems;
    return allUniqueItems.filter((item: any) => 
      item.name.toLowerCase().includes(searchItem.toLowerCase()) || 
      item.code.toLowerCase().includes(searchItem.toLowerCase())
    );
  }, [searchItem, allUniqueItems]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowItemDropdown(false);
        setFocusedIndex(-1);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard navigation for Search Dropdown
  const handleDropdownKeyDown = (e: React.KeyboardEvent) => {
    if (!showItemDropdown) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIndex(prev => (prev < filteredItemsForDropdown.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex(prev => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Enter') {
      if (focusedIndex >= 0 && focusedIndex < filteredItemsForDropdown.length) {
        selectItem(filteredItemsForDropdown[focusedIndex]);
      }
    } else if (e.key === 'Escape') {
      setShowItemDropdown(false);
      setFocusedIndex(-1);
    }
  };

  const selectItem = (item: any) => {
    setSearchItem(item.name);
    setShowItemDropdown(false);
    setFocusedIndex(-1);
  };

  // Confirm changes on Enter
  const handleInputCommit = (invoiceId: string, itemCode: string, itemName: string, originalQty: number) => {
    const key = `${invoiceId}-${itemCode}`;
    const returnQty = returnInputs[key] || 0;

    if (returnQty <= 0) return;
    if (returnQty > originalQty) {
        alert('خطأ: الكمية المرتجعة أكبر من الكمية الأصلية');
        return;
    }

    const confirmMsg = `تأكيد عملية المرتجع\n\nرقم الفاتورة: ${invoiceId}\nالصنف: ${itemName}\nالكمية المرتجعة: ${returnQty}\n\nهل أنت متأكد من حفظ التغييرات؟`;
    
    if (window.confirm(confirmMsg)) {
        if (onReturnItem) {
            onReturnItem(invoiceId, itemCode, returnQty);
            // Clear input after return
            setReturnInputs(prev => ({ ...prev, [key]: 0 }));
        }
    }
  };

  // Filter Logic (Real Data)
  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      // Exclude already returned/deleted invoices from the *list view* generally, 
      // but "Complete" invoices are what we want to detail.
      if (inv.status === 'محذوف' || inv.status === 'مرتجع') return false; 

      const matchInvoice = !searchInvoice || inv.id.toLowerCase().includes(searchInvoice.toLowerCase());
      const matchItem = !searchItem || 
        (inv.rows && inv.rows.some(item => 
          item.name.toLowerCase().includes(searchItem.toLowerCase()) || 
          item.code.toLowerCase().includes(searchItem.toLowerCase())
        ));
      
      // Parse Date DD/MM/YYYY
      const parts = inv.date.split('/');
      let invDate = new Date();
      if (parts.length === 3) {
          invDate = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
      }

      const matchFrom = !dateFrom || invDate >= new Date(dateFrom);
      const matchTo = !dateTo || invDate <= new Date(dateTo);
      
      return matchInvoice && matchItem && matchFrom && matchTo;
    });
  }, [searchInvoice, searchItem, dateFrom, dateTo, invoices]);

  // Keep selection valid when filtering
  useEffect(() => {
      if (filteredInvoices.length === 0) {
          setSelectedIndex(-1);
      } else if (selectedIndex >= filteredInvoices.length || selectedIndex < 0) {
          setSelectedIndex(0);
      }
  }, [filteredInvoices.length]);

  // Auto-scroll to selected invoice
  useEffect(() => {
    if (selectedIndex >= 0 && invoiceRefs.current[selectedIndex]) {
      invoiceRefs.current[selectedIndex]?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [selectedIndex]);

  // Container Level Key Down Handler
  const handleContainerKeyDown = (e: React.KeyboardEvent) => {
    const target = e.target as HTMLElement;
    // Don't interfere if user is typing in an input
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
      return; 
    }

    if (filteredInvoices.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, filteredInvoices.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    }
  };

  const currentInvoice = filteredInvoices[selectedIndex];

  const totals = useMemo(() => {
    if (!currentInvoice || !currentInvoice.rows) return { subtotal: 0, finalTotal: 0, itemsCount: 0 };
    let subtotal = 0;
    currentInvoice.rows.forEach(item => {
      subtotal += item.qty * item.price;
    });
    return { subtotal, finalTotal: currentInvoice.amount, itemsCount: currentInvoice.rows.length };
  }, [currentInvoice]);

  return (
    <div 
      ref={containerRef}
      onKeyDown={handleContainerKeyDown}
      tabIndex={0}
      className="min-h-[calc(100vh-140px)] bg-[#0b0f1a] p-2 md:p-4 font-sans text-xs select-none flex flex-col animate-in fade-in zoom-in-95 duration-300 outline-none" 
      dir="rtl"
    >
      <div className="max-w-7xl mx-auto space-y-2 w-full flex-1 flex flex-col">
        
        {/* Search & Filter Bar */}
        <div className="bg-[#1e293b] rounded-lg border border-slate-800 p-2 flex items-center gap-4 shrink-0 shadow-lg">
          
          {/* Invoice ID */}
          <div className="flex flex-1 items-center gap-2 bg-[#0f172a] border border-slate-700 rounded px-3 py-1.5 focus-within:border-blue-500 transition-colors">
            <Hash size={14} className="text-blue-500" />
            <input 
              type="text" 
              value={searchInvoice}
              onChange={(e) => setSearchInvoice(e.target.value)}
              placeholder="رقم الفاتورة..." 
              className="flex-1 bg-transparent outline-none text-xs font-bold text-slate-200 placeholder:text-slate-600"
            />
          </div>

          {/* Item Search (Dropdown) */}
          <div className="flex-[1.5] relative" ref={dropdownRef}>
            <div 
              className="flex items-center gap-2 bg-[#0f172a] border border-slate-700 rounded px-3 py-1.5 cursor-text focus-within:border-blue-500 transition-colors"
            >
              <Barcode size={14} className="text-blue-500" />
              <input 
                type="text" 
                value={searchItem}
                onChange={(e) => {
                  setSearchItem(e.target.value);
                  setShowItemDropdown(true);
                  setFocusedIndex(-1);
                }}
                onFocus={() => setShowItemDropdown(true)}
                onKeyDown={handleDropdownKeyDown}
                placeholder="اسم الصنف أو الباركود..." 
                className="flex-1 bg-transparent outline-none text-xs font-bold text-slate-200 placeholder:text-slate-600"
              />
              <ChevronDown size={12} className={`text-slate-500 transition-transform ${showItemDropdown ? 'rotate-180' : ''}`} />
            </div>

            {showItemDropdown && (
              <div 
                ref={itemsListRef}
                className="absolute top-full right-0 left-0 mt-1 bg-[#1e293b] border border-slate-700 rounded-lg shadow-2xl z-[100] max-h-56 overflow-y-auto custom-scrollbar overflow-x-hidden"
              >
                {filteredItemsForDropdown.length > 0 ? (
                  filteredItemsForDropdown.map((item: any, index: number) => (
                    <div 
                      key={item.code}
                      onMouseEnter={() => setFocusedIndex(index)}
                      onClick={() => selectItem(item)}
                      className={`p-2 cursor-pointer border-b border-slate-800 last:border-0 flex justify-between items-center transition-colors ${
                        focusedIndex === index ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 text-slate-300'
                      }`}
                    >
                      <div className="flex flex-col">
                        <span className={`font-bold text-xs ${focusedIndex === index ? 'text-white' : 'text-slate-200'}`}>{item.name}</span>
                        <span className={`text-[10px] font-mono ${focusedIndex === index ? 'text-blue-200' : 'text-slate-500'}`}>{item.code}</span>
                      </div>
                      {focusedIndex === index && <CheckCircle2 size={14} className="text-white" />}
                    </div>
                  ))
                ) : (
                  <div className="p-3 text-center text-slate-500 font-bold italic text-xs">لا توجد نتائج</div>
                )}
              </div>
            )}
          </div>

          {/* Date Range */}
          <div className="flex items-center gap-2 bg-[#0f172a] border border-slate-700 rounded px-3 py-1.5">
            <Calendar size={14} className="text-blue-500" />
            <div className="flex items-center gap-2">
              <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="bg-transparent outline-none text-[10px] font-bold text-slate-300 w-[90px] date-input-rtl focus:text-white" />
              <div className="h-4 w-px bg-slate-700"></div>
              <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="bg-transparent outline-none text-[10px] font-bold text-slate-300 w-[90px] date-input-rtl focus:text-white" />
            </div>
          </div>
        </div>

        {/* Invoice Summary List (Top) */}
        <div className="bg-[#1e293b] rounded-lg border border-slate-800 overflow-hidden flex flex-col h-[200px] shrink-0 shadow-lg">
          <div className="bg-[#0f172a] p-2 px-4 text-slate-300 flex justify-between items-center shrink-0 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Layers size={14} className="text-blue-500" />
              <span className="font-bold text-xs">قائمة الفواتير</span>
            </div>
            <span className="text-[10px] bg-slate-800 px-2 rounded-full">{filteredInvoices.length} فاتورة</span>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {filteredInvoices.map((inv, index) => (
              <div 
                key={inv.id}
                ref={(el) => { invoiceRefs.current[index] = el; }}
                onClick={() => setSelectedIndex(index)}
                className={`cursor-pointer border-b border-slate-800 p-2 flex items-center justify-between transition-all ${
                  selectedIndex === index ? 'bg-blue-600/10 border-r-[4px] border-r-blue-500' : 'hover:bg-[#0f172a]'
                }`}
              >
                <div className="flex items-center gap-4 flex-1">
                  <FileText size={16} className={selectedIndex === index ? 'text-blue-400' : 'text-slate-600'} />
                  <div className="grid grid-cols-3 gap-4 flex-1 items-center">
                    <div className="flex flex-col">
                      <span className="text-[9px] text-slate-500 font-bold leading-none mb-0.5">رقم الفاتورة</span>
                      <span className={`font-mono font-bold text-xs ${selectedIndex === index ? 'text-blue-300' : 'text-slate-300'}`}>{inv.id}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[9px] text-slate-500 font-bold leading-none mb-0.5">العميل</span>
                      <span className="truncate max-w-[150px] text-[11px] font-bold text-slate-300">{inv.customerName}</span>
                    </div>
                    <div className="flex flex-col text-left">
                      <span className="text-[9px] text-slate-500 font-bold leading-none mb-0.5">التاريخ</span>
                      <span className="text-slate-400 text-[10px] font-bold font-mono">{inv.date}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 px-2 font-black text-emerald-400 text-sm font-mono">
                   {inv.amount.toLocaleString()} <span className="text-[9px] text-slate-600">EGP</span>
                </div>
              </div>
            ))}
            {filteredInvoices.length === 0 && (
                <div className="flex h-full items-center justify-center text-slate-600 text-xs">لا توجد فواتير مطابقة للبحث</div>
            )}
          </div>
        </div>

        {/* Invoice Items Details (Bottom) */}
        <div className="bg-[#1e293b] rounded-lg border border-slate-800 overflow-hidden flex flex-col flex-1 shadow-lg">
          {currentInvoice ? (
            <>
              <div className="bg-[#0f172a] p-2 px-4 border-b border-slate-800 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2 font-bold text-slate-300 text-xs">
                  <Package size={14} className="text-blue-500" />
                  تفاصيل الأصناف: <span className="text-blue-400 font-mono font-black tracking-wide">{currentInvoice.id}</span>
                </div>
                <span className="text-[10px] text-slate-500 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">{currentInvoice.paymentType}</span>
              </div>
              
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                <table className="w-full text-right border-collapse text-[11px]">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-[#111827] text-slate-400 font-bold border-b border-slate-700">
                      <th className="p-2 w-12 text-center border-l border-slate-800">#</th>
                      <th className="p-2 border-l border-slate-800">الكود</th>
                      <th className="p-2 border-l border-slate-800">اسم الصنف</th>
                      <th className="p-2 text-center border-l border-slate-800 w-24">الكمية</th>
                      <th className="p-2 text-center border-l border-slate-800 bg-red-900/10 text-red-400 w-24">تسجيل مرتجع</th>
                      <th className="p-2 text-center border-l border-slate-800 w-24">السعر</th>
                      <th className="p-2 text-center w-32">الإجمالي</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {currentInvoice.rows?.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/50 transition-colors group">
                        <td className="p-2 text-center text-slate-500 border-l border-slate-800 font-bold">{idx + 1}</td>
                        <td className="p-2 font-mono border-l border-slate-800 text-slate-400">{item.code}</td>
                        <td className="p-2 font-bold border-l border-slate-800 text-slate-200">{item.name}</td>
                        <td className="p-2 text-center font-black text-slate-200 border-l border-slate-800 text-xs">{item.qty}</td>
                        <td className="p-1 px-2 border-l border-slate-800 bg-red-900/10 text-center relative group-hover:bg-red-900/20 transition-colors">
                          <input 
                            type="number"
                            min="0"
                            max={item.qty}
                            value={returnInputs[`${currentInvoice.id}-${item.code}`] || ''}
                            onChange={(e) => {
                                const val = parseFloat(e.target.value);
                                setReturnInputs(prev => ({ ...prev, [`${currentInvoice.id}-${item.code}`]: val }));
                            }}
                            onKeyDown={(e) => {
                                if(e.key === 'Enter') {
                                    handleInputCommit(currentInvoice.id, item.code, item.name, item.qty);
                                }
                            }}
                            className="w-16 bg-[#0f172a] border border-red-900/30 rounded text-center font-black text-red-400 outline-none focus:border-red-500 text-xs py-1 transition-colors"
                            placeholder="0"
                          />
                          <div className="absolute right-0 top-0 h-full flex items-center justify-center opacity-0 group-hover:opacity-100 pr-1 pointer-events-none">
                              <RotateCcw size={10} className="text-red-500" />
                          </div>
                        </td>
                        <td className="p-2 text-center border-l border-slate-800 font-mono text-slate-400">{item.price.toFixed(2)}</td>
                        <td className="p-2 text-center font-black text-blue-400 font-mono text-xs">
                          {(item.qty * item.price).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals Bar */}
              <div className="p-3 bg-[#0f172a] text-slate-200 flex justify-between items-center shrink-0 border-t border-slate-800">
                <div className="flex gap-6">
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">عدد الأصناف</span>
                        <span className="font-black text-white text-xs bg-slate-800 px-2 py-0.5 rounded">{totals.itemsCount}</span>
                    </div>
                </div>
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2 text-left">
                        <span className="text-[10px] text-slate-500 font-bold uppercase">إجمالي الفاتورة:</span>
                        <span className="font-bold text-slate-300 text-xs font-mono">{totals.subtotal.toFixed(2)}</span>
                    </div>
                    <div className="bg-blue-600 rounded-lg px-4 py-2 flex items-center gap-3 shadow-lg shadow-blue-900/30 ml-2">
                        <span className="text-[10px] font-bold text-blue-100 uppercase">الصافي النهائي</span>
                        <span className="text-sm font-black font-mono leading-none text-white">
                            {totals.finalTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                    </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center bg-[#1e293b] text-slate-600 font-bold text-sm gap-2">
              <Package size={40} className="opacity-20" />
              <span>يرجى اختيار فاتورة لعرض التفاصيل وتسجيل المرتجعات</span>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #0f172a; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #475569; }
        .date-input-rtl { direction: rtl; font-family: monospace; color-scheme: dark; }
        input[type=number]::-webkit-inner-spin-button, 
        input[type=number]::-webkit-outer-spin-button { 
          -webkit-appearance: none; margin: 0; 
        }
      `}</style>
    </div>
  );
};
