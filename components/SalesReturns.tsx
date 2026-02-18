
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { InventoryItem, CompanyInfo, SalesInvoice, SalesRow } from '../types';
import { Printer, Save, Search, ArrowLeft, RotateCcw, AlertTriangle, FileText, User, Calendar, CheckCircle2 } from 'lucide-react';

interface Props {
  inventory: InventoryItem[];
  salesInvoices: SalesInvoice[];
  companyInfo: CompanyInfo;
  onSave?: (returnInvoice: SalesInvoice) => void;
  onCancel?: () => void;
}

interface WorkingReturnRow extends SalesRow {
    currentReturnQty: number;
}

export const SalesReturns: React.FC<Props> = ({ inventory, salesInvoices, companyInfo, onSave, onCancel }) => {
  // --- State ---
  const [invoiceNo, setInvoiceNo] = useState('');
  const [returnDate, setReturnDate] = useState(new Date().toISOString().split('T')[0]);
  const [originalInvoice, setOriginalInvoice] = useState<SalesInvoice | null>(null);
  const [workingRows, setWorkingRows] = useState<WorkingReturnRow[]>([]);
  const [focusedRowIndex, setFocusedRowIndex] = useState<number>(-1);

  // Refs
  const invoiceInputRef = useRef<HTMLInputElement>(null);

  // --- Search Logic ---
  useEffect(() => {
      const found = salesInvoices.find(inv => inv.id === invoiceNo.trim());
      if (found) {
          setOriginalInvoice(found);
          // Default to today for return transaction
          setReturnDate(new Date().toISOString().split('T')[0]); 
          
          if (found.rows) {
              setWorkingRows(found.rows.map(r => ({ ...r, currentReturnQty: 0 })));
          } else {
              setWorkingRows([]);
          }
          // Focus first row input automatically
          setTimeout(() => {
             const firstInput = document.getElementById('return-qty-0');
             if (firstInput) (firstInput as HTMLInputElement).focus();
          }, 100);
      } else {
          setOriginalInvoice(null);
          setWorkingRows([]);
      }
  }, [invoiceNo, salesInvoices]);

  // --- Handlers ---
  const handleQtyChange = (rowId: number, val: string) => {
      const qty = parseFloat(val);
      setWorkingRows(prev => prev.map(row => {
          if (row.id === rowId) {
              const safeQty = isNaN(qty) ? 0 : Math.min(Math.max(0, qty), row.qty);
              return { ...row, currentReturnQty: safeQty };
          }
          return row;
      }));
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
          e.preventDefault();
          const nextInput = document.getElementById(`return-qty-${index + 1}`) as HTMLInputElement;
          if (nextInput) {
              nextInput.focus();
              nextInput.select();
              setFocusedRowIndex(index + 1);
          }
      } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          const prevInput = document.getElementById(`return-qty-${index - 1}`) as HTMLInputElement;
          if (prevInput) {
              prevInput.focus();
              prevInput.select();
              setFocusedRowIndex(index - 1);
          }
      }
  };

  const handleSave = () => {
      const itemsToReturn = workingRows.filter(r => r.currentReturnQty > 0);
      
      if (itemsToReturn.length === 0) {
          alert('يرجى تحديد كمية مرتجعة لصنف واحد على الأقل.');
          return;
      }

      if (window.confirm(`تأكيد حفظ مرتجع لـ ${itemsToReturn.length} أصناف بقيمة إجمالية ${totals.grandTotal.toLocaleString()}؟`)) {
          if (onSave && originalInvoice) {
              // Create new Return Invoice object
              const returnInvoice: SalesInvoice = {
                  id: `RET-${originalInvoice.id}-${Date.now().toString().slice(-4)}`,
                  date: returnDate,
                  customerName: originalInvoice.customerName,
                  amount: totals.grandTotal,
                  status: 'مرتجع',
                  paymentType: originalInvoice.paymentType,
                  rows: itemsToReturn.map(r => ({
                      ...r,
                      qty: r.currentReturnQty // Use the returned quantity
                  }))
              };
              
              onSave(returnInvoice);
              alert('تم حفظ عملية المرتجع بنجاح وتحديث المخزون.');
          }
      }
  };

  // --- Calculations ---
  const totals = useMemo(() => {
      let subtotal = 0;
      workingRows.forEach(row => {
          if (row.currentReturnQty > 0) {
              subtotal += row.currentReturnQty * row.price;
          }
      });
      const tax = 0; 
      const grandTotal = subtotal + tax;
      return { subtotal, tax, grandTotal, itemsCount: workingRows.filter(r => r.currentReturnQty > 0).length };
  }, [workingRows]);

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] animate-in fade-in zoom-in-95 duration-300 font-sans text-slate-200 p-2 gap-4">
        
        {/* --- Header & Search Section --- */}
        <div className="bg-[#1e293b] border border-white/5 rounded-2xl p-4 shadow-xl shrink-0 flex flex-col md:flex-row items-center justify-between gap-4">
            
            <div className="flex items-center gap-4 w-full md:w-auto">
                <div className="bg-red-500/20 p-3 rounded-xl text-red-500 border border-red-500/30">
                    <RotateCcw size={24} />
                </div>
                <div>
                    <h1 className="text-xl font-black text-white tracking-wide">مرتجع مبيعات</h1>
                    <p className="text-[10px] text-slate-400 font-medium">إدخال الكميات المرتجعة بناءً على رقم الفاتورة</p>
                </div>
            </div>

            <div className="flex-1 w-full md:w-auto flex items-center justify-center gap-4">
                {/* Invoice Search Input */}
                <div className="relative w-full max-w-xs group">
                    <label className="text-[9px] font-bold text-slate-500 absolute -top-3 right-1 bg-[#0b0f1a] px-1 group-focus-within:text-blue-500 transition-colors">رقم الفاتورة الأصلية</label>
                    <input 
                        ref={invoiceInputRef}
                        type="text" 
                        value={invoiceNo}
                        onChange={e => setInvoiceNo(e.target.value)}
                        className="w-full bg-[#0b0f1a] border border-slate-600 rounded-xl px-4 py-2.5 text-center font-mono font-bold text-lg text-white focus:border-blue-500 outline-none transition-all shadow-inner"
                        placeholder="Scan or Type..."
                        autoFocus
                    />
                    <Search className="absolute left-3 top-3 text-slate-600" size={18} />
                    {originalInvoice && <CheckCircle2 className="absolute right-3 top-3 text-emerald-500 animate-in zoom-in" size={18} />}
                </div>

                {/* Date Input */}
                <div className="relative w-40 group hidden md:block">
                    <label className="text-[9px] font-bold text-slate-500 absolute -top-3 right-1 bg-[#0b0f1a] px-1">تاريخ المرتجع</label>
                    <input 
                        type="date"
                        value={returnDate}
                        onChange={e => setReturnDate(e.target.value)}
                        className="w-full bg-[#0b0f1a] border border-slate-600 rounded-xl px-3 py-2.5 text-xs text-white focus:border-blue-500 outline-none transition-all text-center font-bold"
                    />
                </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 w-full md:w-auto justify-end">
                <button onClick={onCancel} className="px-4 py-2 rounded-xl border border-slate-600 text-slate-400 hover:text-white hover:bg-slate-700 font-bold text-xs transition-all flex items-center gap-2">
                    <ArrowLeft size={16} /> إلغاء
                </button>
            </div>
        </div>

        {/* --- Customer Info Bar (If Found) --- */}
        {originalInvoice && (
            <div className="bg-blue-900/10 border border-blue-500/20 rounded-xl p-3 flex items-center justify-between text-xs shrink-0 animate-in slide-in-from-top-2">
                <div className="flex gap-6">
                    <div className="flex items-center gap-2 text-blue-300 font-bold">
                        <User size={14} />
                        <span className="text-slate-400 font-normal">العميل:</span>
                        <span className="text-white text-sm">{originalInvoice.customerName}</span>
                    </div>
                    <div className="flex items-center gap-2 text-blue-300 font-bold">
                        <Calendar size={14} />
                        <span className="text-slate-400 font-normal">تاريخ البيع:</span>
                        <span className="text-white font-mono">{originalInvoice.date}</span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <FileText size={14} className="text-emerald-500" />
                    <span className="text-slate-400">إجمالي الفاتورة:</span>
                    <span className="text-emerald-400 font-mono font-black text-sm">{originalInvoice.amount.toLocaleString()}</span>
                </div>
            </div>
        )}

        {/* --- Main List (Table) --- */}
        <div className="bg-[#1e293b] border border-white/5 rounded-2xl flex-1 overflow-hidden shadow-2xl relative flex flex-col">
            <div className="overflow-auto custom-scrollbar flex-1 p-1">
                {!originalInvoice ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-600 gap-4 opacity-50">
                        <Search size={64} strokeWidth={1} />
                        <p className="text-sm font-bold">يرجى إدخال رقم فاتورة صحيح لعرض الأصناف</p>
                    </div>
                ) : (
                    <table className="w-full text-right border-collapse">
                        <thead className="sticky top-0 bg-[#161e2e] text-slate-400 text-[10px] uppercase font-bold shadow-md z-10">
                            <tr>
                                <th className="p-3 w-12 text-center">#</th>
                                <th className="p-3">الصنف</th>
                                <th className="p-3 w-24 text-center">الوحدة</th>
                                <th className="p-3 w-28 text-center">السعر</th>
                                <th className="p-3 w-28 text-center text-blue-400">المباع</th>
                                <th className="p-3 w-32 text-center bg-red-500/10 text-red-400 border-x border-red-500/10">المرتجع</th>
                                <th className="p-3 w-32 text-center">القيمة</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800 text-xs">
                            {workingRows.map((row, idx) => {
                                const refundValue = row.currentReturnQty * row.price;
                                const isReturning = row.currentReturnQty > 0;
                                const isFocused = focusedRowIndex === idx;
                                return (
                                    <tr 
                                        key={row.id} 
                                        className={`transition-all duration-200 ${isReturning ? 'bg-red-500/5' : isFocused ? 'bg-white/5' : 'hover:bg-white/5'}`}
                                    >
                                        <td className="p-3 text-center text-slate-500 font-mono">{idx + 1}</td>
                                        <td className="p-3">
                                            <div className="font-bold text-white mb-0.5">{row.name}</div>
                                            <div className="text-[9px] text-slate-500 font-mono">{row.code}</div>
                                        </td>
                                        <td className="p-3 text-center text-slate-400">{row.unit}</td>
                                        <td className="p-3 text-center font-mono text-slate-300">{row.price.toLocaleString()}</td>
                                        <td className="p-3 text-center font-black font-mono text-blue-400 bg-blue-500/5 rounded">{row.qty}</td>
                                        
                                        <td className="p-2 text-center bg-red-500/5 border-x border-red-500/10 relative">
                                            <input 
                                                id={`return-qty-${idx}`}
                                                type="number" 
                                                min="0"
                                                max={row.qty}
                                                value={row.currentReturnQty > 0 ? row.currentReturnQty : ''}
                                                onChange={(e) => handleQtyChange(row.id, e.target.value)}
                                                onKeyDown={(e) => handleInputKeyDown(e, idx)}
                                                onFocus={(e) => { e.target.select(); setFocusedRowIndex(idx); }}
                                                placeholder="0"
                                                className={`w-20 bg-[#0f172a] border rounded-lg py-1.5 text-center font-black outline-none focus:ring-2 focus:ring-red-500 transition-all text-sm
                                                    ${isReturning ? 'border-red-500 text-red-400' : 'border-slate-700 text-slate-500'}
                                                `}
                                            />
                                        </td>
                                        
                                        <td className="p-3 text-center font-mono font-bold text-white">
                                            {refundValue > 0 ? refundValue.toLocaleString() : '-'}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>
        </div>

        {/* --- Compact Footer Summary --- */}
        <div className="bg-[#0f172a] rounded-2xl border border-white/5 p-3 flex items-center justify-between shadow-2xl shrink-0">
            <div className="flex gap-4 md:gap-8 overflow-x-auto">
                <div className="flex flex-col">
                    <span className="text-[9px] text-slate-500 font-bold uppercase mb-0.5">عدد الأصناف</span>
                    <span className="text-white font-black font-mono text-lg leading-none">{totals.itemsCount}</span>
                </div>
                <div className="w-px bg-white/10 h-8"></div>
                <div className="flex flex-col">
                    <span className="text-[9px] text-slate-500 font-bold uppercase mb-0.5">الإجمالي (قبل الضريبة)</span>
                    <span className="text-slate-300 font-bold font-mono text-lg leading-none">{totals.subtotal.toLocaleString()}</span>
                </div>
                {totals.tax > 0 && (
                    <>
                        <div className="w-px bg-white/10 h-8"></div>
                        <div className="flex flex-col">
                            <span className="text-[9px] text-slate-500 font-bold uppercase mb-0.5">الضريبة المستردة</span>
                            <span className="text-orange-400 font-bold font-mono text-lg leading-none">{totals.tax.toLocaleString()}</span>
                        </div>
                    </>
                )}
            </div>

            <div className="flex items-center gap-4">
                <div className="text-right hidden md:block">
                    <span className="text-[10px] text-red-400 font-bold uppercase block">صافي قيمة المرتجع</span>
                    <div className="text-2xl font-black text-white font-mono tracking-tight leading-none">
                        {totals.grandTotal.toLocaleString()} <span className="text-[10px] font-sans text-slate-500">EGP</span>
                    </div>
                </div>
                <button 
                    onClick={handleSave}
                    disabled={totals.itemsCount === 0}
                    className="bg-red-600 hover:bg-red-500 disabled:bg-slate-700 disabled:text-slate-500 text-white px-6 py-3 rounded-xl font-bold text-sm shadow-lg shadow-red-900/20 transition-all active:scale-95 flex items-center gap-2"
                >
                    <Save size={18} />
                    <span className="hidden md:inline">حفظ المرتجع</span>
                </button>
            </div>
        </div>

    </div>
  );
};
