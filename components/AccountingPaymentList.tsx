
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { CashPayment } from '../types';
import { 
  Printer, 
  Plus, 
  Search, 
  ArrowUpDown, 
  Wallet, 
  TrendingDown, 
  FileText, 
  Trash2,
  Calendar,
  Filter,
  X,
  Edit
} from 'lucide-react';

interface Props {
  payments: CashPayment[];
  onDelete: (id: string) => void;
  onEdit?: (payment: CashPayment) => void;
  onNavigateAdd: () => void;
}

export const AccountingPaymentList: React.FC<Props> = ({ payments, onDelete, onEdit, onNavigateAdd }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: keyof CashPayment; direction: 'asc' | 'desc' } | null>({ key: 'timestamp', direction: 'desc' });
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const tableRef = useRef<HTMLDivElement>(null);

  // --- Filtering & Sorting ---
  const filteredData = useMemo(() => {
    let data = [...payments];

    // Filter
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      data = data.filter(r => 
        r.id.toLowerCase().includes(lower) || 
        r.receiver.toLowerCase().includes(lower) ||
        r.amount.toString().includes(lower)
      );
    }
    if (dateFilter) {
        const parts = dateFilter.split('-'); // YYYY-MM-DD
        if (parts.length === 3) {
            const formattedFilter = `${parts[2]}/${parts[1]}/${parts[0]}`; // DD/MM/YYYY
            data = data.filter(r => r.date === formattedFilter);
        }
    }

    // Sort
    if (sortConfig) {
      data.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];
        
        if (aValue === undefined || bValue === undefined) return 0;

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return data;
  }, [payments, searchTerm, dateFilter, sortConfig]);

  // --- Stats ---
  const stats = useMemo(() => {
    const today = new Date().toLocaleDateString('en-GB');
    return {
        totalToday: payments.filter(r => r.date === today).reduce((sum, r) => sum + r.amount, 0),
        count: payments.length,
        maxPayment: Math.max(...payments.map(r => r.amount), 0)
    };
  }, [payments]);

  // --- Handlers ---
  const handleSort = (key: keyof CashPayment) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Keyboard Navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (filteredData.length === 0) return;
        
        const currentIndex = selectedId ? filteredData.findIndex(r => r.id === selectedId) : -1;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            const nextIndex = Math.min(currentIndex + 1, filteredData.length - 1);
            setSelectedId(filteredData[nextIndex].id);
            document.getElementById(`row-${filteredData[nextIndex].id}`)?.scrollIntoView({ block: 'nearest' });
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            const prevIndex = Math.max(currentIndex - 1, 0);
            setSelectedId(filteredData[prevIndex].id);
            document.getElementById(`row-${filteredData[prevIndex].id}`)?.scrollIntoView({ block: 'nearest' });
        } else if (e.key === 'Enter') {
            if (selectedId && onEdit) {
                const item = filteredData.find(r => r.id === selectedId);
                if (item) onEdit(item);
            }
        } else if (e.key === 'Delete') {
            if (selectedId) {
                if(window.confirm('هل أنت متأكد من حذف هذا السند؟')) onDelete(selectedId);
            }
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filteredData, selectedId, onDelete, onEdit]);

  // Set initial selection
  useEffect(() => {
      if (!selectedId && filteredData.length > 0) {
          setSelectedId(filteredData[0].id);
      }
  }, [filteredData.length]);

  return (
    <div className="min-h-[calc(100vh-140px)] p-4 font-sans text-slate-200 animate-in fade-in zoom-in-95 duration-300" dir="rtl">
        
        {/* --- Print Styles --- */}
        <style>{`
            @media print {
                @page { size: landscape; margin: 10mm; }
                body { background-color: white !important; color: black !important; }
                .no-print { display: none !important; }
                .print-header { display: block !important; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px; }
                .print-table th { background-color: #f3f4f6 !important; color: black !important; border: 1px solid #000 !important; }
                .print-table td { border: 1px solid #000 !important; color: black !important; }
                .bg-\\[\\#1e293b\\], .bg-\\[\\#0f172a\\] { background-color: transparent !important; border: none !important; box-shadow: none !important; }
            }
        `}</style>

        <div className="max-w-7xl mx-auto">
            
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 no-print bg-[#1e293b] p-4 rounded-2xl border border-white/5 shadow-lg">
                <div className="flex items-center gap-3">
                    <div className="bg-orange-600/20 p-3 rounded-xl border border-orange-500/20 text-orange-500">
                        <Wallet size={24} />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-white">سندات دفع نقدية</h1>
                        <p className="text-[11px] text-slate-400 font-bold">سجل كامل لجميع المدفوعات والمصروفات</p>
                    </div>
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                    <button onClick={onNavigateAdd} className="flex-1 md:flex-none bg-orange-600 hover:bg-orange-500 text-white px-5 py-2.5 rounded-xl flex items-center justify-center gap-2 text-sm font-bold transition shadow-lg shadow-orange-900/20 active:scale-95">
                        <Plus size={16} />
                        سند جديد
                    </button>
                    <button onClick={() => window.print()} className="bg-slate-800 border border-slate-700 text-slate-300 px-4 py-2.5 rounded-xl hover:bg-slate-700 transition flex items-center gap-2 text-sm font-bold">
                        <Printer size={16} />
                        <span className="hidden sm:inline">طباعة القائمة</span>
                    </button>
                </div>
            </div>

            {/* Print Header */}
            <div className="hidden print-header">
                <h1 className="text-2xl font-bold text-center">تقرير سندات الصرف</h1>
                <p className="text-center text-sm mt-1">تاريخ الطباعة: {new Date().toLocaleDateString('ar-EG')}</p>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 no-print">
                <div className="bg-[#1e293b] p-4 rounded-xl border border-white/5 shadow-md flex items-center justify-between">
                    <div>
                        <p className="text-slate-400 text-[10px] font-bold uppercase mb-1">إجمالي المدفوع اليوم</p>
                        <div className="flex items-baseline gap-1">
                            <h2 className="text-2xl font-black text-white">{stats.totalToday.toLocaleString()}</h2>
                            <span className="text-[10px] text-slate-500 font-bold">EGP</span>
                        </div>
                    </div>
                    <div className="p-2 bg-orange-500/10 rounded-lg text-orange-500"><TrendingDown size={20} /></div>
                </div>
                <div className="bg-[#1e293b] p-4 rounded-xl border border-white/5 shadow-md border-r-4 border-r-orange-600 flex items-center justify-between">
                    <div>
                        <p className="text-slate-400 text-[10px] font-bold uppercase mb-1">عدد السندات</p>
                        <h2 className="text-2xl font-black text-white">{stats.count}</h2>
                    </div>
                    <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500"><FileText size={20} /></div>
                </div>
                <div className="bg-[#1e293b] p-4 rounded-xl border border-white/5 shadow-md flex items-center justify-between">
                    <div>
                        <p className="text-slate-400 text-[10px] font-bold uppercase mb-1">أكبر عملية دفع</p>
                        <div className="flex items-baseline gap-1">
                            <h2 className="text-2xl font-black text-blue-400">{stats.maxPayment.toLocaleString()}</h2>
                            <span className="text-[10px] text-slate-500 font-bold">EGP</span>
                        </div>
                    </div>
                    <div className="p-2 bg-purple-500/10 rounded-lg text-purple-500"><Wallet size={20} /></div>
                </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="bg-[#1e293b] p-3 rounded-xl border border-white/5 shadow-md mb-4 no-print flex flex-wrap gap-3 items-center sticky top-0 z-10 backdrop-blur-md bg-opacity-90">
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute right-3 top-2.5 text-slate-500" size={16} />
                    <input 
                        type="text" 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="بحث سريع (رقم السند، المدفوع له، المبلغ)..." 
                        className="w-full pr-10 pl-3 py-2 bg-[#0f172a] border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-orange-500 transition font-bold"
                    />
                </div>
                <div className="flex items-center gap-2 bg-[#0f172a] border border-slate-700 rounded-lg px-2 py-1.5">
                    <Calendar size={14} className="text-slate-500" />
                    <input 
                        type="date" 
                        value={dateFilter}
                        onChange={(e) => setDateFilter(e.target.value)}
                        className="bg-transparent text-white text-xs outline-none w-28 font-mono"
                    />
                </div>
                {(searchTerm || dateFilter) && (
                    <button onClick={() => { setSearchTerm(''); setDateFilter(''); }} className="text-red-400 hover:text-red-300 p-2 hover:bg-white/5 rounded-lg transition" title="مسح الفلاتر">
                        <X size={16} />
                    </button>
                )}
            </div>

            {/* Payments Table */}
            <div className="bg-[#1e293b] rounded-xl border border-white/5 shadow-2xl overflow-hidden flex flex-col min-h-[400px]">
                <div className="flex-1 overflow-x-auto" ref={tableRef}>
                    <table className="w-full text-right border-collapse print-table">
                        <thead>
                            <tr className="bg-[#161e2e] text-slate-400 text-[10px] font-bold uppercase tracking-wider border-b border-white/5">
                                <th className="px-6 py-4 cursor-pointer hover:text-white transition-colors group" onClick={() => handleSort('id')}>
                                    <div className="flex items-center gap-1">رقم السند <ArrowUpDown size={10} className="opacity-0 group-hover:opacity-100" /></div>
                                </th>
                                <th className="px-6 py-4 cursor-pointer hover:text-white transition-colors group" onClick={() => handleSort('date')}>
                                    <div className="flex items-center gap-1">التاريخ <ArrowUpDown size={10} className="opacity-0 group-hover:opacity-100" /></div>
                                </th>
                                <th className="px-6 py-4 cursor-pointer hover:text-white transition-colors group" onClick={() => handleSort('receiver')}>
                                    <div className="flex items-center gap-1">المدفوع له <ArrowUpDown size={10} className="opacity-0 group-hover:opacity-100" /></div>
                                </th>
                                <th className="px-6 py-4">البيان</th>
                                <th className="px-6 py-4 text-center cursor-pointer hover:text-white transition-colors group" onClick={() => handleSort('amount')}>
                                    <div className="flex items-center justify-center gap-1">المبلغ <ArrowUpDown size={10} className="opacity-0 group-hover:opacity-100" /></div>
                                </th>
                                <th className="px-6 py-4 text-center no-print">إجراءات</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-xs text-slate-300">
                            {filteredData.map((item) => (
                                <tr 
                                    key={item.id} 
                                    id={`row-${item.id}`}
                                    onClick={() => setSelectedId(item.id)}
                                    onDoubleClick={() => onEdit && onEdit(item)}
                                    className={`transition-all duration-150 cursor-pointer group ${selectedId === item.id ? 'bg-orange-600/10 border-l-4 border-l-orange-500' : 'hover:bg-[#0f172a] border-l-4 border-l-transparent'}`}
                                >
                                    <td className="px-6 py-3 font-mono font-bold text-slate-400 group-hover:text-white">{item.id}</td>
                                    <td className="px-6 py-3 font-mono">{item.date}</td>
                                    <td className="px-6 py-3 font-bold text-white">{item.receiver}</td>
                                    <td className="px-6 py-3 text-slate-400 truncate max-w-[200px]">{item.description}</td>
                                    <td className="px-6 py-3 text-center">
                                        <span className="font-black text-orange-400 bg-orange-500/10 px-3 py-1 rounded-lg border border-orange-500/20 font-mono">
                                            {item.amount.toLocaleString(undefined, {minimumFractionDigits: 2})}
                                        </span>
                                    </td>
                                    <td className="px-6 py-3 no-print">
                                        <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button className="text-blue-400 hover:bg-blue-500/20 p-2 rounded-lg transition-colors" title="طباعة">
                                                <Printer size={14} />
                                            </button>
                                            <button onClick={(e) => { e.stopPropagation(); if(onEdit) onEdit(item); }} className="text-orange-400 hover:bg-orange-500/20 p-2 rounded-lg transition-colors" title="تعديل">
                                                <Edit size={14} />
                                            </button>
                                            <button onClick={(e) => { e.stopPropagation(); onDelete(item.id); }} className="text-red-400 hover:bg-red-500/20 p-2 rounded-lg transition-colors" title="حذف">
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredData.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="py-12 text-center text-slate-500">
                                        <div className="flex flex-col items-center gap-2">
                                            <Filter size={32} strokeWidth={1.5} />
                                            <p>لا توجد سندات مطابقة للبحث</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
  );
};
