
import React, { useState, useMemo } from 'react';
import { InventoryItem, SalesInvoice } from '../types';
import { 
  Printer, 
  Package, 
  AlertCircle, 
  TrendingDown, 
  Filter, 
  ArrowUpDown, 
  FileSpreadsheet, 
  RefreshCw,
  Trash2,
  Calendar,
  BarChart2,
  Calculator,
  Search
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface Props {
  inventory: InventoryItem[];
  salesInvoices: SalesInvoice[];
}

type CalculationBasis = 'daily' | 'weekly' | 'monthly';

export const ShortageReport: React.FC<Props> = ({ inventory, salesInvoices }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [basis, setBasis] = useState<CalculationBasis>('weekly'); // Default based on Weekly Consumption
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  // --- Calculate derived data for report ---
  const reportData = useMemo(() => {
    // 1. Define Time Window (Last 30 Days)
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);

    return inventory.map(item => {
      // 2. Calculate Actual Sales in Window
      let soldQty = 0;
      let lastSaleDate = '';

      salesInvoices.forEach(inv => {
        // Parse date (DD/MM/YYYY)
        const parts = inv.date.split('/');
        if (parts.length === 3) {
            const invDate = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
            
            // Check if invoice contains item and is within 30 days
            if (inv.status !== 'محذوف' && inv.status !== 'مرتجع' && inv.rows) {
                const row = inv.rows.find(r => r.itemId === item.id || r.code === item.code);
                if (row) {
                    // Update Last Sale
                    if (!lastSaleDate || invDate > new Date(lastSaleDate)) {
                        lastSaleDate = invDate.toISOString().split('T')[0];
                    }

                    // Sum Quantity if within 30 days
                    if (invDate >= thirtyDaysAgo) {
                        let qty = row.qty;
                        // Normalize to major unit if needed
                        if (item.hasSubUnits && item.factor > 1 && row.unit !== item.majorUnit) {
                            qty = qty / item.factor;
                        }
                        soldQty += qty;
                    }
                }
            }
        }
      });

      // 3. Calculate Averages
      const avgMonthly = parseFloat(soldQty.toFixed(2));
      const avgWeekly = parseFloat((soldQty / 4).toFixed(2));
      const avgDaily = parseFloat((soldQty / 30).toFixed(2));

      // 4. Determine "Safety Limit" based on selected Basis
      let safetyLimit = 0;
      if (basis === 'daily') safetyLimit = avgDaily;
      else if (basis === 'weekly') safetyLimit = avgWeekly;
      else if (basis === 'monthly') safetyLimit = avgMonthly;

      // Ensure limit is at least 1 if there's any movement, to trigger shortage logic
      if (safetyLimit < 1 && soldQty > 0) safetyLimit = 1; 
      
      // Round limit up to nearest integer for stock comparison
      safetyLimit = Math.ceil(safetyLimit);

      // 5. Determine Status
      let status: 'critical' | 'low' | 'safe' = 'safe';
      if (item.actualStock <= 0) status = 'critical';
      else if (item.actualStock < safetyLimit) status = 'low';

      return {
        ...item,
        avgMonthly,
        avgWeekly,
        avgDaily,
        lastSaleDate: lastSaleDate || '-',
        safetyLimit, // The dynamic limit based on user selection
        status
      };
    });
  }, [inventory, salesInvoices, basis]);

  // --- Filter Logic ---
  const filteredData = useMemo(() => {
    return reportData.filter(item => {
      const matchSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          item.code.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Default view: Show Critical & Low. 
      // If searching, show all matches.
      const isShortage = item.status === 'critical' || item.status === 'low';
      
      return matchSearch && (searchTerm ? true : isShortage); 
    });
  }, [reportData, searchTerm]);

  // --- Sorting Logic ---
  const sortedData = useMemo(() => {
    if (!sortConfig) return filteredData;
    return [...filteredData].sort((a, b) => {
      // @ts-ignore
      if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
      // @ts-ignore
      if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredData, sortConfig]);

  // --- Stats ---
  const stats = useMemo(() => {
    return {
      totalItems: inventory.length,
      critical: reportData.filter(i => i.status === 'critical').length,
      low: reportData.filter(i => i.status === 'low').length,
      safe: reportData.filter(i => i.status === 'safe').length
    };
  }, [reportData, inventory]);

  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const exportExcel = () => {
    const data = sortedData.map(item => ({
        'الكود': item.code,
        'الصنف': item.name,
        'الرصيد الحالي': item.actualStock,
        'حد الطلب (المتوسط)': item.safetyLimit,
        'متوسط يومي': item.avgDaily,
        'متوسط أسبوعي': item.avgWeekly,
        'متوسط شهري': item.avgMonthly,
        'الحالة': item.status === 'critical' ? 'نفاذ تام' : item.status === 'low' ? 'تحت المتوسط' : 'آمن'
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Shortages");
    XLSX.writeFile(wb, `Shortage_Report_${basis}_${new Date().toLocaleDateString('en-GB').replace(/\//g, '-')}.xlsx`);
  };

  const getBasisLabel = () => {
      if (basis === 'daily') return 'المتوسط اليومي';
      if (basis === 'weekly') return 'المتوسط الأسبوعي';
      return 'المتوسط الشهري';
  }

  return (
    <div className="min-h-[calc(100vh-140px)] p-4 font-sans text-xs text-slate-200 animate-in fade-in zoom-in-95 duration-300" dir="rtl">
        
        {/* --- Print Styles --- */}
        <style>{`
            @media print {
                @page { size: landscape; margin: 10mm; }
                body { background-color: white !important; color: black !important; }
                .no-print { display: none !important; }
                .report-container { 
                    background-color: white !important; 
                    box-shadow: none !important; 
                    border: none !important; 
                    max-width: 100% !important;
                }
                .report-table th { background-color: #f3f4f6 !important; color: black !important; border: 1px solid #000 !important; }
                .report-table td { border: 1px solid #000 !important; color: black !important; }
                .critical-row { background-color: #fee2e2 !important; }
                .warning-row { background-color: #fef3c7 !important; }
                .success-row { background-color: transparent !important; }
            }
        `}</style>

        <div className="max-w-6xl mx-auto report-container">
            
            {/* Header */}
            <header className="flex justify-between items-center mb-6 no-print">
                <div>
                    <h1 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
                        <BarChart2 className="text-indigo-500" />
                        نظام إدارة نواقص المخزون الذكي
                    </h1>
                    <p className="text-[10px] text-slate-400">تحليل النواقص بناءً على معدلات البيع الفعلية</p>
                </div>
                <button 
                    onClick={() => window.print()}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition text-xs font-bold shadow-lg shadow-indigo-900/20"
                >
                    <Printer size={14} /> طباعة التقرير
                </button>
            </header>

            {/* Print Header */}
            <div className="hidden print:block mb-6 border-b-2 border-black pb-4">
                <h1 className="text-2xl font-bold text-black text-center">تقرير النواقص المقترح</h1>
                <p className="text-center text-sm mt-1">بناءً على: {getBasisLabel()} | تاريخ: {new Date().toLocaleDateString('en-GB')}</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-[#1e293b] p-4 rounded-xl border border-white/5 shadow-md flex justify-between items-center print:border print:border-gray-300 print:bg-white print:text-black">
                    <div>
                        <p className="text-[9px] text-slate-400 font-bold uppercase mb-1 print:text-gray-600">نواقص حرجة (رصيد 0)</p>
                        <h3 className="text-2xl font-black leading-none text-red-500">{stats.critical}</h3>
                    </div>
                    <div className="p-3 bg-red-500/10 text-red-500 rounded-lg print:hidden"><AlertCircle size={24} /></div>
                </div>
                <div className="bg-[#1e293b] p-4 rounded-xl border border-white/5 shadow-md flex justify-between items-center print:border print:border-gray-300 print:bg-white print:text-black">
                    <div>
                        <p className="text-[9px] text-slate-400 font-bold uppercase mb-1 print:text-gray-600">تحت حد الطلب ({getBasisLabel()})</p>
                        <h3 className="text-2xl font-black leading-none text-amber-500">{stats.low}</h3>
                    </div>
                    <div className="p-3 bg-amber-500/10 text-amber-500 rounded-lg print:hidden"><TrendingDown size={24} /></div>
                </div>
                <div className="bg-[#1e293b] p-4 rounded-xl border border-white/5 shadow-md flex justify-between items-center print:border print:border-gray-300 print:bg-white print:text-black">
                    <div>
                        <p className="text-[9px] text-slate-400 font-bold uppercase mb-1 print:text-gray-600">أرصدة آمنة</p>
                        <h3 className="text-2xl font-black leading-none text-emerald-500">{stats.safe}</h3>
                    </div>
                    <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-lg print:hidden"><Package size={24} /></div>
                </div>
            </div>

            {/* Filter & Settings Bar */}
            <div className="bg-[#1e293b] rounded-t-xl border border-white/5 p-4 flex flex-col md:flex-row gap-4 items-end md:items-center justify-between no-print shadow-lg relative z-10">
                
                <div className="flex flex-col gap-1 w-full md:w-auto">
                    <label className="text-[10px] text-indigo-300 font-bold flex items-center gap-1">
                        <Calculator size={12} />
                        معيار حساب النواقص (حد الطلب)
                    </label>
                    <div className="flex bg-[#0f172a] p-1 rounded-lg border border-slate-700">
                        <button 
                            onClick={() => setBasis('daily')}
                            className={`px-3 py-1.5 rounded-md text-[10px] font-bold transition-all flex-1 ${basis === 'daily' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                        >
                            يومي
                        </button>
                        <button 
                            onClick={() => setBasis('weekly')}
                            className={`px-3 py-1.5 rounded-md text-[10px] font-bold transition-all flex-1 ${basis === 'weekly' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                        >
                            أسبوعي
                        </button>
                        <button 
                            onClick={() => setBasis('monthly')}
                            className={`px-3 py-1.5 rounded-md text-[10px] font-bold transition-all flex-1 ${basis === 'monthly' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                        >
                            شهري
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-2 flex-1 w-full md:w-auto">
                    <div className="relative flex-1">
                        <input 
                            type="text" 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="بحث في النواقص..." 
                            className="w-full px-3 py-2 bg-[#0f172a] border border-slate-700 rounded-lg text-xs outline-none focus:border-indigo-500 text-white pl-8"
                        />
                        <Search size={14} className="absolute left-2.5 top-2.5 text-slate-500" />
                    </div>
                    <button onClick={exportExcel} className="bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 border border-emerald-600/30 px-3 py-2 rounded-lg transition flex items-center gap-2 font-bold">
                        <FileSpreadsheet size={14} /> <span className="hidden sm:inline">Excel</span>
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="bg-[#1e293b] rounded-b-xl border border-white/5 border-t-0 shadow-xl overflow-hidden print:bg-white print:shadow-none print:border-none print:rounded-none">
                <div className="overflow-x-auto">
                    <table className="w-full text-right border-collapse report-table">
                        <thead>
                            <tr className="bg-[#161e2e] text-slate-400 text-[10px] font-bold select-none border-b border-white/5">
                                <th className="px-4 py-3 border-r border-white/5 w-12 text-center">#</th>
                                <th className="px-4 py-3 border-r border-white/5 cursor-pointer hover:bg-white/5 transition-colors" onClick={() => requestSort('code')}>
                                    <div className="flex items-center gap-1">الكود <ArrowUpDown size={10} className="opacity-50" /></div>
                                </th>
                                <th className="px-4 py-3 border-r border-white/5 cursor-pointer hover:bg-white/5 transition-colors" onClick={() => requestSort('name')}>
                                    <div className="flex items-center gap-1">الصنف <ArrowUpDown size={10} className="opacity-50" /></div>
                                </th>
                                <th className="px-4 py-3 text-center border-r border-white/5 cursor-pointer hover:bg-white/5 transition-colors text-white font-extrabold bg-slate-800" onClick={() => requestSort('actualStock')}>
                                    <div className="flex items-center justify-center gap-1">الرصيد الحالي <ArrowUpDown size={10} className="opacity-50" /></div>
                                </th>
                                <th className="px-4 py-3 text-center border-r border-white/5 bg-indigo-900/20 text-indigo-300 border-b-2 border-b-indigo-500">
                                    حد الطلب ({getBasisLabel()})
                                </th>
                                <th className="px-2 py-3 text-center border-r border-white/5 text-slate-500" onClick={() => requestSort('avgDaily')}>يومي</th>
                                <th className="px-2 py-3 text-center border-r border-white/5 text-slate-500" onClick={() => requestSort('avgWeekly')}>أسبوعي</th>
                                <th className="px-2 py-3 text-center border-r border-white/5 text-slate-500" onClick={() => requestSort('avgMonthly')}>شهري</th>
                                <th className="px-4 py-3 border-r border-white/5">الحالة</th>
                                <th className="px-4 py-3 text-center no-print">إجراءات</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-[11px]">
                            {sortedData.map((item, idx) => {
                                const isCritical = item.status === 'critical';
                                const isLow = item.status === 'low';
                                
                                // Styles mapping
                                const rowClass = isCritical ? 'bg-red-500/10 critical-row' : (isLow ? 'bg-amber-500/10 warning-row' : 'hover:bg-white/5 success-row opacity-60');
                                const borderClass = isCritical ? 'border-r-4 border-r-red-500' : (isLow ? 'border-r-4 border-r-amber-500' : 'border-r-4 border-r-emerald-500');
                                const statusText = isCritical ? 'نفاذ تام' : (isLow ? 'يطلب فوراً' : 'متوفر');
                                const statusColor = isCritical ? 'text-red-400 print:text-red-700' : (isLow ? 'text-amber-400 print:text-amber-700' : 'text-emerald-400 print:text-green-700');
                                const statusBg = isCritical ? 'bg-red-500/20 print:bg-transparent' : (isLow ? 'bg-amber-500/20 print:bg-transparent' : 'bg-emerald-500/20 print:bg-transparent');

                                return (
                                    <tr key={item.id} className={`${rowClass} ${borderClass} transition-colors text-slate-300 print:text-black`}>
                                        <td className="px-4 py-2.5 text-center font-mono text-slate-500">{idx + 1}</td>
                                        <td className="px-4 py-2.5 font-mono text-[10px] border-r border-white/5">{item.code}</td>
                                        <td className="px-4 py-2.5 font-bold text-white print:text-black border-r border-white/5">{item.name}</td>
                                        <td className="px-4 py-2.5 text-center font-black text-sm text-white print:text-black bg-white/5 border-r border-white/5">{item.actualStock}</td>
                                        
                                        {/* Dynamic Limit Column */}
                                        <td className="px-4 py-2.5 text-center font-bold text-indigo-300 print:text-black border-r border-white/5 bg-indigo-500/5">
                                            {item.safetyLimit}
                                        </td>

                                        {/* Averages */}
                                        <td className="px-2 py-2.5 text-center text-slate-500 border-r border-white/5">{item.avgDaily}</td>
                                        <td className="px-2 py-2.5 text-center text-slate-500 border-r border-white/5">{item.avgWeekly}</td>
                                        <td className="px-2 py-2.5 text-center text-slate-500 border-r border-white/5">{item.avgMonthly}</td>
                                        
                                        <td className="px-4 py-2.5 border-r border-white/5">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border border-white/5 ${statusColor} ${statusBg} print:border-black`}>
                                                {statusText}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2.5 text-center no-print">
                                            <div className="flex justify-center gap-2">
                                                <button className="text-slate-500 hover:text-indigo-400 transition" title="طلب شراء"><RefreshCw size={14} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                            {sortedData.length === 0 && (
                                <tr>
                                    <td colSpan={10} className="py-12 text-center text-slate-500 italic">
                                        {searchTerm ? 'لا توجد أصناف تطابق البحث' : 'المخزون بحالة جيدة، لا توجد نواقص بناءً على المعيار المحدد'}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            
            <div className="mt-4 p-3 bg-indigo-900/20 border border-indigo-500/20 rounded-lg no-print flex gap-3 items-start">
                <AlertCircle className="text-indigo-400 shrink-0" size={16} />
                <div className="text-[10px] text-slate-400 space-y-1">
                    <p className="font-bold text-indigo-300">كيف يعمل هذا التقرير؟</p>
                    <p>1. يقوم النظام بحساب إجمالي مبيعات كل صنف خلال آخر 30 يوماً.</p>
                    <p>2. يتم استخراج المتوسط (يومي / أسبوعي / شهري).</p>
                    <p>3. يتم مقارنة <strong>الرصيد الحالي</strong> مع <strong>المتوسط المحدد (حد الطلب)</strong>.</p>
                    <p>4. إذا كان الرصيد أقل من المتوسط، يظهر الصنف في القائمة أعلاه للمطالبة بتوفيره.</p>
                </div>
            </div>
        </div>
    </div>
  );
};
