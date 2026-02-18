
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  ShoppingCart,
  Filter,
  ChevronUp,
  Calendar,
  Hash,
  User,
  Settings2,
  ExternalLink,
  Trash2,
  XCircle,
  Truck,
  DollarSign
} from 'lucide-react';
import { SalesInvoice } from '../types';

interface Props {
    invoices: SalesInvoice[];
    onOpenInvoice?: (invoice: SalesInvoice) => void;
    onDelete?: (id: string) => void;
    initialSelectedId?: string;
}

export const SalesList: React.FC<Props> = ({ invoices, onOpenInvoice, onDelete, initialSelectedId }) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showFilters, setShowFilters] = useState(true);
  
  // --- Filter States ---
  const [idFrom, setIdFrom] = useState('');
  const [idTo, setIdTo] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [filterCustomer, setFilterCustomer] = useState('الكل');
  // Default to 'مكتمل' to show actual sales by default
  const [filterStatus, setFilterStatus] = useState('مكتمل');

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef<(HTMLTableRowElement | null)[]>([]);
  
  // Mock Customers for filter dropdown (In real app, pass from props)
  const customers = ['الكل', "عميل نقدي", "سوبر ماركت الحمد", "بقالة الأمانة", "مطعم البركة", "شركة الفتح للتجارة"];
  
  const formatDate = (day: number, month: number, year: number) => {
    const d = day.toString().padStart(2, '0');
    const m = month.toString().padStart(2, '0');
    return `${d}/${m}/${year}`;
  };

  // --- Helper: Parse Invoice Date (DD/MM/YYYY) to Date Object ---
  const parseInvoiceDate = (dateStr: string) => {
    if (!dateStr) return null;
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const d = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      const y = parseInt(parts[2], 10);
      if (!isNaN(d) && !isNaN(m) && !isNaN(y)) {
         return new Date(y, m - 1, d);
      }
    }
    return null;
  };

  // --- Filtering Logic ---
  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
        // 1. ID Range
        if (idFrom && parseInt(inv.id) < parseInt(idFrom)) return false;
        if (idTo && parseInt(inv.id) > parseInt(idTo)) return false;

        // 2. Date Range
        const invDate = parseInvoiceDate(inv.date);
        
        if (dateFrom && invDate) {
            const from = parseInvoiceDate(dateFrom);
            if (from) {
                from.setHours(0,0,0,0);
                invDate.setHours(0,0,0,0);
                if (invDate < from) return false;
            }
        }
        
        if (dateTo && invDate) {
            const to = parseInvoiceDate(dateTo);
            if (to) {
                to.setHours(0,0,0,0);
                invDate.setHours(0,0,0,0);
                if (invDate > to) return false;
            }
        }

        // 3. Customer
        if (filterCustomer !== 'الكل' && inv.customerName !== filterCustomer) return false;

        // 4. Status
        if (filterStatus !== 'الكل' && inv.status !== filterStatus) return false;

        return true;
    });
  }, [invoices, idFrom, idTo, dateFrom, dateTo, filterCustomer, filterStatus]);

  // --- Calculate Total of Filtered View ---
  const totalFilteredAmount = useMemo(() => {
      return filteredInvoices.reduce((sum, inv) => sum + inv.amount, 0);
  }, [filteredInvoices]);

  // Set initial selected index on mount based on previous selection
  useEffect(() => {
    if (initialSelectedId && invoices.length > 0) {
        const index = invoices.findIndex(inv => inv.id === initialSelectedId);
        if (index !== -1) {
            setSelectedIndex(index);
        }
    }
  }, []); // Run once on mount

  // Reset selection if list changes/filters change to avoid out of bounds
  useEffect(() => {
      if (selectedIndex >= filteredInvoices.length && filteredInvoices.length > 0) {
          setSelectedIndex(filteredInvoices.length - 1);
      } else if (filteredInvoices.length === 0) {
          setSelectedIndex(0);
      }
  }, [filteredInvoices.length]);

  // Auto-scroll logic
  useEffect(() => {
    if (rowRefs.current[selectedIndex]) {
      rowRefs.current[selectedIndex]?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest'
      });
    }
  }, [selectedIndex]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle keys if items exist
      if (filteredInvoices.length === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev < filteredInvoices.length - 1 ? prev + 1 : prev));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : prev));
      } else if (e.key === 'Enter') {
          e.preventDefault();
          if (filteredInvoices[selectedIndex] && onOpenInvoice) {
              onOpenInvoice(filteredInvoices[selectedIndex]);
          }
      } else if (e.key === 'Delete') {
          e.preventDefault();
          const target = filteredInvoices[selectedIndex];
          if (target && onDelete && target.status !== 'محذوف') {
              onDelete(target.id);
          }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filteredInvoices, selectedIndex, onOpenInvoice, onDelete]);

  // --- Clear Filters ---
  const clearFilters = () => {
    setIdFrom(''); setIdTo('');
    setDateFrom(''); setDateTo('');
    setFilterCustomer('الكل');
    setFilterStatus('الكل'); // Reset to show all if cleared
  };

  const getStatusColor = (status: string) => {
      switch(status) {
          case 'مكتمل': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_8px_rgba(16,185,129,0.1)]';
          case 'معلق': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
          case 'مرتجع': return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
          case 'محذوف': return 'bg-red-500/10 text-red-500 border-red-500/20';
          default: return 'bg-slate-500/10 text-slate-400';
      }
  };

  const getPaymentIcon = (type: string) => {
      switch(type) {
          case 'توصيل': return <Truck size={12} className="text-amber-400" />;
          case 'آجل': return <Calendar size={12} className="text-blue-400" />;
          default: return null;
      }
  };

  // --- Smart Date Formatter ---
  const handleDateBlur = (val: string, setter: (v: string) => void) => {
    const clean = val.replace(/\D/g, '');
    if (clean.length === 6) {
        // ddmmyy -> dd/mm/20yy
        const dd = clean.substring(0, 2);
        const mm = clean.substring(2, 4);
        const yy = clean.substring(4, 6);
        setter(`${dd}/${mm}/20${yy}`);
    } else if (clean.length === 8) {
        // ddmmyyyy -> dd/mm/yyyy
        const dd = clean.substring(0, 2);
        const mm = clean.substring(2, 4);
        const yyyy = clean.substring(4, 8);
        setter(`${dd}/${mm}/${yyyy}`);
    }
  };

  return (
    <div className="h-[calc(100vh-140px)] w-full flex flex-col items-center overflow-hidden animate-in fade-in zoom-in-95 duration-300">
      <div className="w-full h-full flex flex-col bg-[#111827] shadow-2xl relative rounded-xl overflow-hidden border border-white/5">
        
        {/* Header - Compact - Z-Index lowered to 30 */}
        <div className="sticky top-0 z-30 bg-[#161e2d] border-b border-slate-800 px-4 py-2 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-600 rounded-lg shadow-lg shadow-emerald-900/20">
              <ShoppingCart size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white leading-none">سجل المبيعات الفعلية</h1>
              <p className="text-[10px] text-emerald-400 mt-1 font-bold">يعرض الفواتير المكتملة افتراضياً</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
              <div className="bg-slate-800/80 px-4 py-1.5 rounded-lg border border-white/10 flex flex-col items-end">
                  <span className="text-[9px] text-gray-400 font-bold uppercase">إجمالي المبيعات (الظاهرة)</span>
                  <div className="flex items-center gap-1 text-emerald-400 font-black font-mono leading-none">
                      {totalFilteredAmount.toLocaleString()} <span className="text-[9px]">EGP</span>
                  </div>
              </div>

              <button 
                onClick={() => setShowFilters(!showFilters)}
                className={`p-1.5 rounded-md transition-all ${showFilters ? 'bg-slate-700 text-slate-300' : 'bg-emerald-600 text-white'}`}
              >
                {showFilters ? <ChevronUp size={16} /> : <Filter size={16} />}
              </button>
          </div>
        </div>

        {/* Filters Section - Ultra Compact - Z-Index lowered to 20 */}
        <div 
          className={`sticky top-[53px] z-20 bg-[#161e2d]/95 backdrop-blur-md border-b border-slate-800 transition-all duration-300 ease-in-out overflow-hidden shrink-0 ${
            showFilters ? 'max-h-[140px] opacity-100 p-3' : 'max-h-0 opacity-0 p-0 border-none'
          }`}
        >
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 max-w-5xl mx-auto">
            
            {/* رقم الفاتورة */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 flex items-center gap-1 uppercase">
                <Hash size={12} className="text-emerald-500" /> نطاق الفاتورة
              </label>
              <div className="flex items-center gap-1">
                <input 
                    type="number" 
                    value={idFrom} 
                    onChange={e => setIdFrom(e.target.value)}
                    placeholder="من" 
                    className="w-full bg-[#0b0f1a] border border-slate-700 rounded px-2 py-1 text-xs outline-none focus:border-emerald-500 transition-colors text-white" 
                />
                <span className="text-slate-600 text-[10px]">إلى</span>
                <input 
                    type="number" 
                    value={idTo} 
                    onChange={e => setIdTo(e.target.value)}
                    placeholder="إلى" 
                    className="w-full bg-[#0b0f1a] border border-slate-700 rounded px-2 py-1 text-xs outline-none focus:border-emerald-500 transition-colors text-white" 
                />
              </div>
            </div>

            {/* التاريخ */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 flex items-center gap-1 uppercase">
                <Calendar size={12} className="text-emerald-500" /> الفترة الزمنية
              </label>
              <div className="flex items-center gap-1">
                <input 
                    type="text" 
                    value={dateFrom}
                    onChange={e => setDateFrom(e.target.value)}
                    onBlur={e => handleDateBlur(e.target.value, setDateFrom)}
                    placeholder="DD/MM/YYYY"
                    className="w-full bg-[#0b0f1a] border border-slate-700 rounded px-1 py-1 text-[10px] text-white outline-none focus:border-emerald-500 transition-colors font-mono text-center" 
                />
                <span className="text-slate-600 text-[10px]">↔</span>
                <input 
                    type="text" 
                    value={dateTo}
                    onChange={e => setDateTo(e.target.value)}
                    onBlur={e => handleDateBlur(e.target.value, setDateTo)}
                    placeholder="DD/MM/YYYY"
                    className="w-full bg-[#0b0f1a] border border-slate-700 rounded px-1 py-1 text-[10px] text-white outline-none focus:border-emerald-500 transition-colors font-mono text-center" 
                />
              </div>
            </div>

            {/* العميل */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 flex items-center gap-1 uppercase">
                <User size={12} className="text-emerald-500" /> العميل
              </label>
              <select 
                value={filterCustomer}
                onChange={e => setFilterCustomer(e.target.value)}
                className="w-full bg-[#0b0f1a] border border-slate-700 rounded px-2 py-1 text-xs text-white outline-none cursor-pointer"
              >
                {customers.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>

            {/* الحالة */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 flex items-center gap-1 uppercase">
                <Settings2 size={12} className="text-emerald-500" /> الحالة
              </label>
              <div className="flex gap-2">
                <select 
                    value={filterStatus}
                    onChange={e => setFilterStatus(e.target.value)}
                    className="flex-1 bg-[#0b0f1a] border border-slate-700 rounded px-2 py-1 text-xs text-white outline-none cursor-pointer"
                >
                  <option value="الكل">الكل</option>
                  <option value="مكتمل">مكتمل (مباع)</option>
                  <option value="معلق">معلق</option>
                  <option value="مرتجع">مرتجع</option>
                  <option value="محذوف">محذوف</option>
                </select>
                <button 
                    onClick={clearFilters}
                    className="bg-slate-700 hover:bg-red-900/50 text-slate-300 hover:text-red-300 px-3 py-1 rounded text-xs font-bold transition-all active:scale-95 border border-slate-600"
                    title="مسح الفلاتر وعرض الكل"
                >
                  <XCircle size={14} />
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* Table Content */}
        <div 
          ref={scrollContainerRef}
          className="flex-1 overflow-auto bg-[#0b111d] scroll-smooth custom-scrollbar"
        >
          <table className="w-full text-right border-collapse min-w-[700px]">
            {/* Table Header - Z-Index lowered to 10 */}
            <thead className="sticky top-0 z-10 bg-[#161e2d] border-b border-slate-700">
              <tr className="text-slate-500 text-[10px] uppercase">
                <th className="px-6 py-3 font-bold">المعرف</th>
                <th className="px-6 py-3 font-bold">تاريخ البيع</th>
                <th className="px-6 py-3 font-bold">اسم العميل</th>
                <th className="px-6 py-3 font-bold text-center">نوع الدفع</th>
                <th className="px-6 py-3 font-bold text-center">القيمة الإجمالية</th>
                <th className="px-6 py-3 font-bold text-center">حالة الفاتورة</th>
                <th className="px-6 py-3 font-bold"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/30">
              {filteredInvoices.map((inv, index) => (
                <tr 
                  key={inv.id}
                  ref={el => { rowRefs.current[index] = el; }}
                  onClick={() => setSelectedIndex(index)}
                  onDoubleClick={() => onOpenInvoice && onOpenInvoice(inv)}
                  className={`group transition-all duration-150 cursor-pointer relative ${
                    selectedIndex === index ? 'bg-emerald-600/15' : 'hover:bg-slate-800/40'
                  }`}
                >
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-2">
                      {selectedIndex === index && <div className="absolute right-0 top-1 bottom-1 w-1 bg-emerald-500 rounded-l-full shadow-[0_0_10px_rgba(16,185,129,0.5)]" />}
                      <span className={`font-mono text-xs ${selectedIndex === index ? 'text-emerald-400 font-bold' : 'text-slate-500'}`}>
                        #{inv.id}
                      </span>
                    </div>
                  </td>
                  <td className={`px-6 py-3 font-mono text-[11px] transition-colors ${selectedIndex === index ? 'text-emerald-300' : 'text-slate-500'}`}>
                    {inv.date}
                  </td>
                  <td className={`px-6 py-3 text-xs font-medium transition-colors ${selectedIndex === index ? 'text-white' : 'text-slate-300'}`}>
                    {inv.customerName}
                  </td>
                  <td className="px-6 py-3 text-center text-xs">
                     <div className="flex items-center justify-center gap-1 text-slate-400">
                        {getPaymentIcon(inv.paymentType)}
                        <span>{inv.paymentType}</span>
                     </div>
                  </td>
                  <td className="px-6 py-3 text-center">
                    <span className={`font-bold text-xs ${selectedIndex === index ? 'text-white' : 'text-slate-300'}`}>
                      {inv.amount.toLocaleString()} 
                    </span>
                    <span className="text-[9px] text-slate-500 mr-1 italic">EGP</span>
                  </td>
                  <td className="px-6 py-3 text-center">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-bold border transition-all ${getStatusColor(inv.status)}`}>
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-left flex gap-1 justify-end">
                    <button 
                        onClick={(e) => { e.stopPropagation(); onOpenInvoice && onOpenInvoice(inv); }}
                        className={`p-1.5 hover:bg-slate-700 rounded transition-colors ${selectedIndex === index ? 'text-emerald-400' : 'text-slate-600'}`}
                        title="فتح الفاتورة"
                    >
                        <ExternalLink size={14} />
                    </button>
                     <button 
                        onClick={(e) => { 
                            e.stopPropagation(); 
                            if (inv.status === 'محذوف') return; // Only block if already deleted
                            onDelete && onDelete(inv.id); 
                        }}
                        className={`p-1.5 rounded transition-colors ${
                            inv.status === 'محذوف'
                            ? 'text-slate-700 cursor-not-allowed opacity-50' 
                            : selectedIndex === index ? 'text-red-400 hover:bg-slate-700 hover:text-red-500' : 'text-slate-600 hover:bg-slate-700 hover:text-red-500'
                        }`}
                        title={inv.status === 'محذوف' ? 'الفاتورة محذوفة بالفعل' : 'حذف الفاتورة'}
                    >
                        <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredInvoices.length === 0 && (
                  <tr>
                      <td colSpan={7} className="text-center py-10 text-gray-500">لا توجد مبيعات تطابق الفلترة</td>
                  </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Bar - Z-Index lowered to 30 */}
        <div className="sticky bottom-0 z-30 bg-[#161e2d] border-t border-slate-800 px-4 py-2 flex justify-between items-center text-[10px] shrink-0">
          <div className="flex gap-4 items-center">
            <div className="flex items-center gap-2 px-2 py-0.5 bg-slate-800/50 rounded border border-slate-700">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-slate-400 font-medium">نقطة بيع: الرئيسية</span>
            </div>
            <span className="hidden sm:block text-slate-600 italic">التاريخ المعتمد: {formatDate(new Date().getDate(), new Date().getMonth()+1, new Date().getFullYear())}</span>
          </div>
          
          <div className="flex items-center gap-3">
             <div className="bg-emerald-600/20 text-emerald-400 px-3 py-0.5 rounded-full border border-emerald-500/20 font-bold">
               المختار: {filteredInvoices[selectedIndex]?.id || '-'}
             </div>
             <div className="text-slate-500">
               {filteredInvoices.length > 0 ? selectedIndex + 1 : 0} / {filteredInvoices.length}
             </div>
          </div>
        </div>

      </div>
    </div>
  );
};
