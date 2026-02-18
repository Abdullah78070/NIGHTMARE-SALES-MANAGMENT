
import React, { useState, useMemo } from 'react';
import { SalesInvoice } from '../types';
import { RotateCcw, Search, ChevronDown, ChevronUp, Package, Calendar, User, FileText } from 'lucide-react';

interface Props {
    invoices: SalesInvoice[];
}

export const SalesReturnsList: React.FC<Props> = ({ invoices }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedRow, setExpandedRow] = useState<string | null>(null);

    const returnsList = useMemo(() => {
        return invoices.filter(inv => 
            inv.status === 'مرتجع' && 
            (inv.id.includes(searchTerm) || inv.customerName.includes(searchTerm))
        );
    }, [invoices, searchTerm]);

    const toggleExpand = (id: string) => {
        setExpandedRow(expandedRow === id ? null : id);
    };

    return (
        <div className="h-[calc(100vh-140px)] flex flex-col font-sans text-slate-200 animate-in fade-in zoom-in-95 duration-300">
            {/* Header */}
            <div className="bg-[#1e293b] p-4 rounded-xl border border-white/5 shadow-xl mb-4 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-3">
                    <div className="bg-red-500/20 p-2.5 rounded-lg text-red-500 border border-red-500/20">
                        <RotateCcw size={24} />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-white">سجل مرتجع المبيعات</h1>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">قائمة الفواتير المرتجعة والأصناف</p>
                    </div>
                </div>
                <div className="relative w-64">
                    <input 
                        type="text" 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="بحث برقم الفاتورة أو العميل..."
                        className="w-full bg-[#0f172a] border border-slate-700 rounded-lg py-2 pr-8 pl-2 text-xs text-white focus:outline-none focus:border-red-500"
                    />
                    <Search size={14} className="absolute right-2.5 top-2.5 text-slate-500" />
                </div>
            </div>

            {/* List */}
            <div className="flex-1 bg-[#1e293b] rounded-xl border border-white/5 shadow-xl overflow-hidden flex flex-col">
                <div className="overflow-y-auto custom-scrollbar flex-1 p-2 space-y-2">
                    {returnsList.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-slate-500 opacity-50 gap-2">
                            <RotateCcw size={40} />
                            <p className="text-sm font-bold">لا توجد عمليات مرتجع مسجلة</p>
                        </div>
                    ) : (
                        returnsList.map(inv => (
                            <div key={inv.id} className="bg-[#0f172a] border border-slate-800 rounded-lg overflow-hidden transition-all duration-200 hover:border-red-500/30">
                                {/* Header Row */}
                                <div 
                                    onClick={() => toggleExpand(inv.id)}
                                    className="p-3 flex items-center justify-between cursor-pointer hover:bg-white/5"
                                >
                                    <div className="flex items-center gap-6">
                                        <div className="flex items-center gap-2 w-24">
                                            <FileText size={14} className="text-red-500" />
                                            <span className="font-mono font-bold text-sm text-white">#{inv.id}</span>
                                        </div>
                                        <div className="flex items-center gap-2 w-32 text-slate-400 text-xs">
                                            <Calendar size={12} />
                                            <span>{inv.date}</span>
                                        </div>
                                        <div className="flex items-center gap-2 w-48 text-slate-300 text-xs font-bold">
                                            <User size={12} />
                                            <span>{inv.customerName}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="text-right">
                                            <span className="text-[10px] text-slate-500 block">إجمالي المرتجع</span>
                                            <span className="font-mono font-black text-red-400 text-sm">{inv.amount.toLocaleString()} EGP</span>
                                        </div>
                                        {expandedRow === inv.id ? <ChevronUp size={16} className="text-slate-500" /> : <ChevronDown size={16} className="text-slate-500" />}
                                    </div>
                                </div>

                                {/* Detailed Items */}
                                {expandedRow === inv.id && (
                                    <div className="bg-[#161e2e] border-t border-slate-800 p-3 animate-in slide-in-from-top-2">
                                        <div className="text-[10px] font-bold text-slate-500 mb-2 flex items-center gap-2">
                                            <Package size={12} /> الأصناف التي تم إرجاعها
                                        </div>
                                        <table className="w-full text-right text-xs">
                                            <thead>
                                                <tr className="text-slate-500 border-b border-slate-700/50">
                                                    <th className="pb-1 pr-2">الصنف</th>
                                                    <th className="pb-1 text-center">الوحدة</th>
                                                    <th className="pb-1 text-center">الكمية</th>
                                                    <th className="pb-1 text-center">السعر</th>
                                                    <th className="pb-1 text-center">الإجمالي</th>
                                                </tr>
                                            </thead>
                                            <tbody className="text-slate-300">
                                                {inv.rows?.map((row, idx) => (
                                                    <tr key={idx} className="border-b border-slate-700/30 last:border-0 hover:bg-white/5">
                                                        <td className="py-2 pr-2">
                                                            <div className="font-bold">{row.name}</div>
                                                            <div className="text-[9px] font-mono text-slate-500">{row.code}</div>
                                                        </td>
                                                        <td className="py-2 text-center">{row.unit}</td>
                                                        <td className="py-2 text-center font-bold text-red-400">{row.qty}</td>
                                                        <td className="py-2 text-center font-mono">{row.price}</td>
                                                        <td className="py-2 text-center font-mono font-bold">{(row.qty * row.price).toLocaleString()}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};
