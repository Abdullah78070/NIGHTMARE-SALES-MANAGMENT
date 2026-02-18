
import React, { useState, useMemo } from 'react';
import { StocktakeSession } from '../types';
import { 
  History, 
  CalendarDays, 
  Search, 
  Hash, 
  ExternalLink,
  Trash2,
  FileSpreadsheet,
  PackageCheck,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Filter,
  ChevronUp
} from 'lucide-react';

interface Props {
  history: StocktakeSession[]; 
  onOpenSession?: (session: StocktakeSession) => void;
  onDeleteSession?: (id: string) => void;
}

export const StocktakeReport: React.FC<Props> = ({ history, onOpenSession, onDeleteSession }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showFilters, setShowFilters] = useState(true);

  // Sort history by ID desc (newest first) and filter
  const filteredHistory = useMemo(() => {
      let filtered = [...history];
      if (searchTerm) {
          const lowerTerm = searchTerm.toLowerCase();
          filtered = filtered.filter(session => 
              session.id.toLowerCase().includes(lowerTerm) || 
              session.date.includes(lowerTerm)
          );
      }
      // Sort by descending ID or Timestamp
      return filtered.sort((a, b) => b.timestamp - a.timestamp);
  }, [history, searchTerm]);

  // Calculate Net Value Color
  const getNetColor = (val: number) => {
      if (val === 0) return 'text-slate-400';
      return val > 0 ? 'text-blue-400' : 'text-red-400';
  };

  return (
    <div className="h-[calc(100vh-140px)] w-full flex flex-col items-center overflow-hidden animate-in fade-in zoom-in-95 duration-300">
      <div className="w-full h-full flex flex-col bg-[#111827] shadow-2xl relative rounded-xl overflow-hidden border border-white/5">
        
        {/* Header - Compact */}
        <div className="sticky top-0 z-30 bg-[#161e2d] border-b border-slate-800 px-4 py-2 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600 rounded-lg shadow-lg shadow-indigo-900/20">
              <History size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white leading-none">سجل محاضر الجرد</h1>
              <p className="text-[10px] text-slate-500 mt-1">سجل متسلسل لجميع عمليات الجرد السابقة</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
              <div className="bg-slate-800/80 px-4 py-1.5 rounded-lg border border-white/10 flex flex-col items-end">
                  <span className="text-[9px] text-gray-400 font-bold uppercase">عدد المحاضر</span>
                  <div className="text-white font-black font-mono leading-none">
                      {filteredHistory.length}
                  </div>
              </div>

              <button 
                onClick={() => setShowFilters(!showFilters)}
                className={`p-1.5 rounded-md transition-all ${showFilters ? 'bg-slate-700 text-slate-300' : 'bg-indigo-600 text-white'}`}
              >
                {showFilters ? <ChevronUp size={16} /> : <Filter size={16} />}
              </button>
          </div>
        </div>

        {/* Search Bar */}
        <div 
          className={`sticky top-[53px] z-20 bg-[#161e2d]/95 backdrop-blur-md border-b border-slate-800 transition-all duration-300 ease-in-out overflow-hidden shrink-0 ${
            showFilters ? 'max-h-[70px] opacity-100 p-3' : 'max-h-0 opacity-0 p-0 border-none'
          }`}
        >
            <div className="max-w-2xl mx-auto relative">
                <input 
                    type="text" 
                    placeholder="بحث برقم المحضر أو التاريخ..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-[#0b0f1a] border border-slate-700 rounded-lg py-2 pr-10 pl-4 text-xs text-white focus:outline-none focus:border-indigo-500 font-bold shadow-inner"
                />
                <Search size={14} className="absolute right-3.5 top-2.5 text-slate-500" />
            </div>
        </div>

        {/* List Content */}
        <div className="flex-1 overflow-auto bg-[#0b111d] scroll-smooth custom-scrollbar">
          <table className="w-full text-right border-collapse min-w-[800px]">
            <thead className="sticky top-0 z-10 bg-[#161e2d] border-b border-slate-700">
              <tr className="text-slate-500 text-[10px] uppercase">
                <th className="px-6 py-3 font-bold">رقم المحضر</th>
                <th className="px-6 py-3 font-bold">تاريخ الجرد</th>
                <th className="px-6 py-3 font-bold text-center">إجمالي الأصناف</th>
                <th className="px-6 py-3 font-bold text-center">المطابق</th>
                <th className="px-6 py-3 font-bold text-center">عجز / زيادة</th>
                <th className="px-6 py-3 font-bold text-center">صافي الفروقات</th>
                <th className="px-6 py-3 font-bold"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/30">
              {filteredHistory.map((session, index) => {
                  const net = session.stats.netValue;
                  const discrepancy = session.stats.shortage + session.stats.surplus;
                  
                  return (
                    <tr 
                      key={session.id}
                      onClick={() => setSelectedIndex(index)}
                      onDoubleClick={() => onOpenSession && onOpenSession(session)}
                      className={`group transition-all duration-150 cursor-pointer relative ${
                        selectedIndex === index ? 'bg-indigo-600/15' : 'hover:bg-slate-800/40'
                      }`}
                    >
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-2">
                          {selectedIndex === index && <div className="absolute right-0 top-1 bottom-1 w-1 bg-indigo-500 rounded-l-full shadow-[0_0_10px_rgba(99,102,241,0.5)]" />}
                          <span className={`font-mono text-xs ${selectedIndex === index ? 'text-indigo-400 font-bold' : 'text-slate-500'}`}>
                            {session.id}
                          </span>
                        </div>
                      </td>
                      <td className={`px-6 py-3 font-mono text-[11px] transition-colors ${selectedIndex === index ? 'text-indigo-300' : 'text-slate-500'}`}>
                        {session.date}
                      </td>
                      <td className="px-6 py-3 text-center">
                        <div className="inline-flex items-center gap-1 bg-slate-800 px-2 py-0.5 rounded text-[10px] text-slate-300 border border-slate-700">
                            <PackageCheck size={10} />
                            {session.totalItems}
                        </div>
                      </td>
                      <td className="px-6 py-3 text-center">
                        <span className="text-emerald-500 font-bold text-xs">{session.stats.matched}</span>
                      </td>
                      <td className="px-6 py-3 text-center">
                        <div className="flex items-center justify-center gap-3 text-[10px]">
                            {session.stats.shortage > 0 && (
                                <span className="text-red-400 flex items-center gap-0.5" title="عجز"><TrendingDown size={10}/> {session.stats.shortage}</span>
                            )}
                            {session.stats.surplus > 0 && (
                                <span className="text-blue-400 flex items-center gap-0.5" title="زيادة"><TrendingUp size={10}/> {session.stats.surplus}</span>
                            )}
                            {discrepancy === 0 && <span className="text-slate-500">-</span>}
                        </div>
                      </td>
                      <td className="px-6 py-3 text-center">
                        <span className={`font-bold text-xs font-mono ${getNetColor(net)}`}>
                          {net > 0 ? '+' : ''}{net.toLocaleString()} EGP
                        </span>
                      </td>
                      <td className="px-6 py-3 text-left flex gap-1 justify-end">
                        <button 
                            onClick={(e) => { e.stopPropagation(); onOpenSession && onOpenSession(session); }}
                            className={`p-1.5 hover:bg-slate-700 rounded transition-colors ${selectedIndex === index ? 'text-indigo-400' : 'text-slate-600'}`}
                            title="عرض التفاصيل"
                        >
                            <ExternalLink size={14} />
                        </button>
                         <button 
                            onClick={(e) => { e.stopPropagation(); onDeleteSession && onDeleteSession(session.id); }}
                            className={`p-1.5 rounded transition-colors text-slate-600 hover:bg-slate-700 hover:text-red-500`}
                            title="حذف السجل"
                        >
                            <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
              })}
              {filteredHistory.length === 0 && (
                  <tr>
                      <td colSpan={7} className="text-center py-10 text-gray-500">لا توجد سجلات جرد محفوظة</td>
                  </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 z-30 bg-[#161e2d] border-t border-slate-800 px-4 py-2 flex justify-between items-center text-[10px] shrink-0">
          <div className="flex gap-4 items-center">
             <span className="text-slate-500">آخر تحديث: {new Date().toLocaleTimeString()}</span>
          </div>
          <div className="flex items-center gap-3">
             <div className="bg-indigo-600/20 text-indigo-400 px-3 py-0.5 rounded-full border border-indigo-500/20 font-bold">
               المختار: {filteredHistory[selectedIndex]?.id || '-'}
             </div>
          </div>
        </div>

      </div>
    </div>
  );
};
