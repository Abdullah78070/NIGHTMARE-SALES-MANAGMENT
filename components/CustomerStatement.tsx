
import React, { useState, useMemo } from 'react';
import { Customer, SalesInvoice, CompanyInfo } from '../types';
import { 
  Printer, 
  Search, 
  Calendar, 
  User, 
  TrendingDown, 
  TrendingUp, 
  Wallet,
  FileText,
  AlertCircle
} from 'lucide-react';

interface Props {
  customers: Customer[];
  salesInvoices: SalesInvoice[];
  companyInfo: CompanyInfo;
}

interface StatementRow {
  date: string;
  dateObj: Date; // For sorting
  type: 'invoice' | 'return' | 'payment' | 'opening';
  ref: string;
  description: string;
  debit: number; // مدين (عليه) -> فواتير
  credit: number; // دائن (له) -> سداد أو مرتجع
  balance: number;
}

export const CustomerStatement: React.FC<Props> = ({ customers, salesInvoices, companyInfo }) => {
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | ''>('');
  
  // Default dates: First day of current month to today
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  
  // Format YYYY-MM-DD for input fields
  const [dateFrom, setDateFrom] = useState(firstDay.toISOString().split('T')[0]);
  const [dateTo, setDateTo] = useState(today.toISOString().split('T')[0]);

  const selectedCustomer = useMemo(() => 
    customers.find(c => c.id === Number(selectedCustomerId)), 
  [customers, selectedCustomerId]);

  // --- Statement Calculation Logic ---
  const statementData = useMemo(() => {
    // FIX: Ensure default object has 'opening' and 'closing' to prevent undefined errors
    if (!selectedCustomer) return { rows: [], summary: { debit: 0, credit: 0, opening: 0, closing: 0 } };

    // Parse Filter Dates
    const startObj = new Date(dateFrom);
    startObj.setHours(0, 0, 0, 0);
    
    const endObj = new Date(dateTo);
    endObj.setHours(23, 59, 59, 999);

    // 1. Collect ALL transactions for this customer from SalesInvoices
    let allTransactions: StatementRow[] = [];

    salesInvoices.forEach(inv => {
        // Filter by Customer Name & Exclude Deleted
        if (inv.customerName !== selectedCustomer.name || inv.status === 'محذوف') return;

        // Parse Invoice Date (DD/MM/YYYY)
        const parts = inv.date.split('/');
        if (parts.length !== 3) return;
        const invDate = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));

        // --- Logic for Debit/Credit ---
        // Debit (مدين/عليه): The value of goods taken.
        // Credit (دائن/له): The value paid or returned.

        // Case A: Sales Invoice (Completed)
        if (inv.status === 'مكتمل' || inv.status === 'معلق') {
            // 1. Record the Sale (Debit)
            allTransactions.push({
                date: inv.date,
                dateObj: invDate,
                type: 'invoice',
                ref: `#${inv.id}`,
                description: `فاتورة مبيعات - ${inv.paymentType}`,
                debit: inv.amount,
                credit: 0,
                balance: 0 
            });

            // 2. If Cash (نقدي), Record immediate Payment (Credit)
            // This ensures Cash invoices don't increase the final Debt balance
            if (inv.paymentType === 'نقدي') {
                allTransactions.push({
                    date: inv.date,
                    dateObj: invDate, // Same time
                    type: 'payment',
                    ref: `PAY-${inv.id}`,
                    description: `سداد نقدي (فوري) - فاتورة #${inv.id}`,
                    debit: 0,
                    credit: inv.amount,
                    balance: 0
                });
            }
        }
        
        // Case B: Return Invoice (مرتجع)
        else if (inv.status === 'مرتجع') {
            // Returns act as Credit (reducing debt)
            allTransactions.push({
                date: inv.date,
                dateObj: invDate,
                type: 'return',
                ref: `#${inv.id}`,
                description: `مرتجع مبيعات`,
                debit: 0,
                credit: inv.amount,
                balance: 0
            });
        }
    });

    // Sort Chronologically
    allTransactions.sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());

    // 2. Process into "Opening Balance" + "Filtered Rows"
    const visibleRows: StatementRow[] = [];
    let runningBalance = 0;
    
    // Accumulators for Summary
    let totalDebitRange = 0;
    let totalCreditRange = 0;

    // A. Calculate Opening Balance (Everything BEFORE start date)
    let openingBalance = 0;
    
    // We assume initial balance from customer card acts as a starting point 
    // IF we treated the system as non-zero start. 
    // BUT for a transaction-based statement, we usually calculate from t=0 if we have full history.
    // Let's assume calculated from transactions is the source of truth for the statement.
    
    for (const trans of allTransactions) {
        if (trans.dateObj < startObj) {
            openingBalance += (trans.debit - trans.credit);
        } else if (trans.dateObj <= endObj) {
            // It is within range
            // Calculate running balance based on previous state
            const prevBalance = visibleRows.length === 0 ? openingBalance : runningBalance;
            runningBalance = prevBalance + trans.debit - trans.credit;

            visibleRows.push({
                ...trans,
                balance: runningBalance
            });

            totalDebitRange += trans.debit;
            totalCreditRange += trans.credit;
        }
    }

    // B. Prepend Opening Balance Row
    const finalRows = [
        {
            date: dateFrom.split('-').reverse().join('/'),
            dateObj: startObj,
            type: 'opening',
            ref: '-',
            description: 'رصيد سابق / افتتاحي',
            debit: openingBalance > 0 ? openingBalance : 0,
            credit: openingBalance < 0 ? Math.abs(openingBalance) : 0,
            balance: openingBalance
        } as StatementRow,
        ...visibleRows
    ];

    // C. Final Summary (Opening + Range Activity)
    const summary = {
        debit: totalDebitRange,
        credit: totalCreditRange,
        opening: openingBalance,
        closing: openingBalance + totalDebitRange - totalCreditRange
    };

    return { rows: finalRows, summary };

  }, [selectedCustomer, salesInvoices, dateFrom, dateTo]);

  return (
    <div className="min-h-[calc(100vh-140px)] p-4 animate-in fade-in zoom-in-95 duration-300 font-sans" dir="rtl">
        
        {/* --- Print Styles --- */}
        <style>{`
            @media print {
                @page { size: A4; margin: 10mm; }
                body { background-color: white !important; color: black !important; }
                .no-print { display: none !important; }
                .print-only { display: block !important; }
                .statement-container { 
                    background-color: white !important; 
                    color: black !important; 
                    box-shadow: none !important;
                    border: none !important;
                    max-width: 100% !important;
                    padding: 0 !important;
                }
                .statement-header { background-color: transparent !important; color: black !important; border-bottom: 2px solid #000 !important; }
                .statement-table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 10px; }
                .statement-table th { background-color: #f3f4f6 !important; color: black !important; border: 1px solid #000 !important; padding: 5px; }
                .statement-table td { border: 1px solid #000 !important; color: black !important; padding: 5px; }
                .summary-card { border: 1px solid #000 !important; background-color: white !important; color: black !important; }
                
                /* Hide scrollbars in print */
                ::-webkit-scrollbar { display: none; }
            }
            .print-only { display: none; }
        `}</style>

        <div className="max-w-6xl mx-auto statement-container bg-[#1e293b] rounded-2xl border border-white/5 shadow-2xl overflow-hidden min-h-[800px]">
            
            {/* Header (Screen) */}
            <div className="p-6 bg-[#0f172a] border-b border-white/5 flex justify-between items-center no-print">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-blue-600 rounded-xl shadow-lg shadow-blue-900/20">
                        <FileText size={24} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-white">كشف حساب عميل تفصيلي</h1>
                        <p className="text-xs text-slate-400 font-bold">يستند إلى سجل الفواتير والمرتفعات المسجلة</p>
                    </div>
                </div>
                <button 
                    onClick={() => window.print()}
                    className="bg-white text-slate-900 px-6 py-2.5 rounded-xl font-bold text-xs hover:bg-blue-50 transition shadow-lg flex items-center gap-2"
                >
                    <Printer size={16} />
                    طباعة الكشف
                </button>
            </div>

            {/* Print Header */}
            <div className="print-only p-8 pb-4">
                <div className="flex justify-between items-start border-b-2 border-black pb-6 mb-6">
                    <div className="text-right">
                        <h2 className="text-2xl font-bold mb-1">{companyInfo.name}</h2>
                        <p className="text-sm text-gray-600">{companyInfo.address}</p>
                        <p className="text-sm text-gray-600 font-mono">{companyInfo.phone}</p>
                    </div>
                    <div className="text-left">
                        <h1 className="text-3xl font-black text-gray-900 mb-2">كشف حساب</h1>
                        <div className="text-sm font-bold text-gray-500">تاريخ الطباعة: <span className="font-mono text-black">{new Date().toLocaleDateString('en-GB')}</span></div>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-8 mb-6">
                    <div className="border border-black p-4 rounded bg-gray-50 text-right">
                        <p className="text-xs text-gray-500 mb-1 font-bold">بيانات العميل</p>
                        <h3 className="font-bold text-lg">{selectedCustomer?.name || '---'}</h3>
                        <p className="text-sm font-mono">{selectedCustomer?.phone}</p>
                    </div>
                    <div className="border border-black p-4 rounded bg-gray-50 text-left">
                        <p className="text-xs text-gray-500 mb-1 font-bold">الفترة الزمنية</p>
                        <div className="flex items-center justify-end gap-2 font-bold font-mono">
                            <span>{dateFrom}</span> <span className="text-gray-400">-></span> <span>{dateTo}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Controls (Screen) */}
            <div className="p-6 bg-[#1e293b] border-b border-white/5 no-print">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div className="md:col-span-1">
                        <label className="text-[10px] font-bold text-slate-400 mb-1.5 block">اختر العميل</label>
                        <div className="relative">
                            <select 
                                value={selectedCustomerId}
                                onChange={(e) => setSelectedCustomerId(Number(e.target.value))}
                                className="w-full bg-[#0f172a] border border-slate-600 rounded-xl px-4 py-2.5 text-xs text-white focus:border-blue-500 outline-none appearance-none cursor-pointer font-bold"
                            >
                                <option value="">-- اختر --</option>
                                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                            <User className="absolute left-3 top-2.5 text-slate-500 pointer-events-none" size={16} />
                        </div>
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-slate-400 mb-1.5 block">من تاريخ</label>
                        <div className="relative">
                            <input 
                                type="date" 
                                value={dateFrom}
                                onChange={(e) => setDateFrom(e.target.value)}
                                className="w-full bg-[#0f172a] border border-slate-600 rounded-xl px-4 py-2.5 text-xs text-white focus:border-blue-500 outline-none font-mono" 
                            />
                            <Calendar className="absolute left-3 top-2.5 text-slate-500 pointer-events-none" size={16} />
                        </div>
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-slate-400 mb-1.5 block">إلى تاريخ</label>
                        <div className="relative">
                            <input 
                                type="date" 
                                value={dateTo}
                                onChange={(e) => setDateTo(e.target.value)}
                                className="w-full bg-[#0f172a] border border-slate-600 rounded-xl px-4 py-2.5 text-xs text-white focus:border-blue-500 outline-none font-mono" 
                            />
                            <Calendar className="absolute left-3 top-2.5 text-slate-500 pointer-events-none" size={16} />
                        </div>
                    </div>
                    <div>
                        <div className="bg-slate-800 text-slate-400 rounded-xl px-4 py-2 text-[10px] border border-slate-700 flex items-center gap-2 h-[38px]">
                            <AlertCircle size={14} className="text-blue-500" />
                            <span>يتم التحديث تلقائياً</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="p-6 grid grid-cols-4 gap-4">
                <div className="bg-[#0f172a] border-r-4 border-amber-500 p-4 rounded-xl shadow-md summary-card">
                    <p className="text-[10px] text-slate-400 font-bold uppercase mb-1 flex items-center gap-1">
                        <Wallet size={14} className="text-amber-500" /> رصيد افتتاحي (سابق)
                    </p>
                    <h3 className="text-lg font-black text-white font-mono tracking-tight">{statementData.summary.opening.toLocaleString()} <span className="text-[10px] text-slate-500">EGP</span></h3>
                </div>
                <div className="bg-[#0f172a] border-r-4 border-blue-500 p-4 rounded-xl shadow-md summary-card">
                    <p className="text-[10px] text-slate-400 font-bold uppercase mb-1 flex items-center gap-1">
                        <TrendingDown size={14} className="text-blue-500" /> حركات مدينة (فواتير)
                    </p>
                    <h3 className="text-lg font-black text-blue-400 font-mono tracking-tight">{statementData.summary.debit.toLocaleString()} <span className="text-[10px] text-slate-500">EGP</span></h3>
                </div>
                <div className="bg-[#0f172a] border-r-4 border-emerald-500 p-4 rounded-xl shadow-md summary-card">
                    <p className="text-[10px] text-slate-400 font-bold uppercase mb-1 flex items-center gap-1">
                        <TrendingUp size={14} className="text-emerald-500" /> حركات دائنة (سداد)
                    </p>
                    <h3 className="text-lg font-black text-emerald-400 font-mono tracking-tight">{statementData.summary.credit.toLocaleString()} <span className="text-[10px] text-slate-500">EGP</span></h3>
                </div>
                <div className="bg-[#0f172a] border-r-4 border-red-500 p-4 rounded-xl shadow-md summary-card bg-gradient-to-l from-red-900/10 to-transparent">
                    <p className="text-[10px] text-slate-400 font-bold uppercase mb-1 flex items-center gap-1">
                        <Wallet size={14} className="text-red-500" /> رصيد ختامي
                    </p>
                    <h3 className="text-xl font-black text-white font-mono tracking-tight">{statementData.summary.closing.toLocaleString()} <span className="text-[10px] text-slate-500">EGP</span></h3>
                </div>
            </div>

            {/* Table */}
            <div className="p-6 pt-0">
                <div className="bg-[#0f172a] rounded-xl overflow-hidden border border-white/5 summary-card">
                    <table className="w-full text-right border-collapse statement-table">
                        <thead>
                            <tr className="bg-[#161e2e] text-slate-400 text-[10px] font-bold uppercase">
                                <th className="p-4 w-28 font-mono">التاريخ</th>
                                <th className="p-4 w-24">النوع</th>
                                <th className="p-4">البيان / التفاصيل</th>
                                <th className="p-4 w-28 font-mono">المرجع</th>
                                <th className="p-4 w-28 text-center text-blue-400">مدين (+)</th>
                                <th className="p-4 w-28 text-center text-emerald-400">دائن (-)</th>
                                <th className="p-4 w-32 text-center text-white bg-slate-800/50">الرصيد</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800 text-xs">
                            {statementData.rows.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="p-12 text-center text-slate-500 italic">
                                        {selectedCustomerId ? 'لا توجد حركات في هذه الفترة' : 'يرجى اختيار عميل لعرض كشف الحساب'}
                                    </td>
                                </tr>
                            ) : (
                                statementData.rows.map((row, idx) => (
                                    <tr key={idx} className={`hover:bg-white/5 transition-colors ${row.type === 'opening' ? 'bg-amber-500/5' : ''}`}>
                                        <td className="p-4 font-mono text-slate-300 border-l border-slate-800/50">{row.date}</td>
                                        <td className="p-4 border-l border-slate-800/50">
                                            {row.type === 'invoice' && <span className="text-blue-400 font-bold">فاتورة</span>}
                                            {row.type === 'return' && <span className="text-orange-400 font-bold">مرتجع</span>}
                                            {row.type === 'payment' && <span className="text-emerald-400 font-bold">سداد</span>}
                                            {row.type === 'opening' && <span className="text-amber-400 font-bold">افتتاحي</span>}
                                        </td>
                                        <td className="p-4 font-bold text-white border-l border-slate-800/50">
                                            {row.description}
                                        </td>
                                        <td className="p-4 font-mono text-slate-500 border-l border-slate-800/50">{row.ref}</td>
                                        <td className="p-4 text-center font-mono font-bold text-blue-300 border-l border-slate-800/50">{row.debit > 0 ? row.debit.toLocaleString() : '-'}</td>
                                        <td className="p-4 text-center font-mono font-bold text-emerald-300 border-l border-slate-800/50">{row.credit > 0 ? row.credit.toLocaleString() : '-'}</td>
                                        <td className={`p-4 text-center font-mono font-black border-r border-slate-800 ${row.balance < 0 ? 'text-emerald-400' : 'text-white'}`}>
                                            {row.balance.toLocaleString()}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Print Footer */}
            <div className="print-only px-8 py-10 mt-auto">
                <div className="flex justify-between items-start text-sm">
                    <div className="text-center">
                        <p className="font-bold mb-10 text-black">المحاسب المسؤول</p>
                        <div className="border-t border-dotted border-gray-500 w-40 mx-auto"></div>
                    </div>
                    <div className="text-center">
                        <p className="font-bold mb-10 text-gray-400">ختم المؤسسة</p>
                        <div className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-full mx-auto flex items-center justify-center text-[10px] text-gray-300">ختم</div>
                    </div>
                    <div className="text-center">
                        <p className="font-bold mb-10 text-black">اعتماد العميل</p>
                        <div className="border-t border-dotted border-gray-500 w-40 mx-auto"></div>
                    </div>
                </div>
            </div>

        </div>
    </div>
  );
};
