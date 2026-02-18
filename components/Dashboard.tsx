
import React, { useMemo, useState, useRef, useEffect } from 'react';
import { InventoryItem, SalesInvoice, PurchaseInvoice, Customer } from '../types';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, DollarSign, FileText, PackageMinus, Wallet, BarChart3, AlertTriangle, Calendar, ChevronUp, ChevronDown } from 'lucide-react';

interface DashboardProps {
    inventory: InventoryItem[];
    salesInvoices: SalesInvoice[];
    purchaseInvoices: PurchaseInvoice[];
    customers: Customer[];
}

export const Dashboard: React.FC<DashboardProps> = ({ inventory, salesInvoices, purchaseInvoices, customers }) => {
  
  // --- CALCULATIONS ---
  
  // 1. Today's Metrics
  const { todaySales, todayCount, todayProfit } = useMemo(() => {
      const todayStr = new Date().toLocaleDateString('en-GB'); // DD/MM/YYYY
      
      const todayInvoices = salesInvoices.filter(inv => 
          inv.date === todayStr && 
          inv.status !== 'محذوف' && 
          inv.status !== 'مرتجع' &&
          inv.status !== 'معلق'
      );
      
      const sales = todayInvoices.reduce((sum, inv) => sum + inv.amount, 0);
      const count = todayInvoices.length;

      let totalCost = 0;
      todayInvoices.forEach(inv => {
          if(inv.rows) {
              inv.rows.forEach(row => {
                  const item = inventory.find(i => i.id === row.itemId || i.code === row.code);
                  if (item) {
                      const avgDiscount = item.averageDiscount || 0;
                      let unitNetCost = item.costMajor * (1 - (avgDiscount / 100));

                      if (item.hasSubUnits && item.factor > 1 && row.unit !== item.majorUnit) {
                          unitNetCost = unitNetCost / item.factor;
                      }
                      
                      totalCost += (unitNetCost * row.qty);
                  }
              });
          }
      });

      const profit = sales - totalCost;

      return { todaySales: sales, todayCount: count, todayProfit: profit };
  }, [salesInvoices, inventory]);

  // 2. Notifications (Low Stock)
  const lowStockItems = useMemo(() => {
      return inventory.filter(i => i.actualStock <= 5 && i.actualStock > 0).slice(0, 10);
  }, [inventory]);

  // 3. Expiry Alerts Calculation (NEW)
  const expiryAlerts = useMemo(() => {
      const today = new Date();
      const threeMonthsLater = new Date();
      threeMonthsLater.setDate(today.getDate() + 90);

      // Helper to parse diverse date formats
      const parseDate = (str: string | undefined) => {
          if (!str) return null;
          const clean = str.trim();
          try {
              if (clean.includes('/')) {
                  const parts = clean.split('/');
                  if (parts.length === 2) { // MM/YY or MM/YYYY
                      let year = parseInt(parts[1]);
                      if (year < 100) year += 2000;
                      // Last day of the month
                      return new Date(year, parseInt(parts[0]), 0); 
                  }
                  if (parts.length === 3) { // DD/MM/YYYY
                      let year = parseInt(parts[2]);
                      if (year < 100) year += 2000;
                      return new Date(year, parseInt(parts[1]) - 1, parseInt(parts[0]));
                  }
              }
          } catch(e) { return null; }
          return null;
      };

      return inventory
        .map(item => {
            if (!item.stocktakeExpiry) return null;
            const expDate = parseDate(item.stocktakeExpiry);
            if (!expDate) return null;

            const daysLeft = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            
            // Filter conditions
            if (daysLeft > 90) return null; // Safe

            return {
                ...item,
                expDate,
                daysLeft,
                status: daysLeft < 0 ? 'expired' : 'near'
            };
        })
        .filter((item): item is NonNullable<typeof item> => item !== null)
        .sort((a, b) => a.daysLeft - b.daysLeft); // Most urgent first

  }, [inventory]);

  // --- Expiry Navigation State ---
  const [selectedExpiryIndex, setSelectedExpiryIndex] = useState(0);
  const expiryListRef = useRef<HTMLDivElement>(null);
  const expiryRowRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Keyboard Handler for Expiry Widget
  const handleExpiryKeyDown = (e: React.KeyboardEvent) => {
      if (expiryAlerts.length === 0) return;

      if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSelectedExpiryIndex(prev => {
              const next = Math.min(prev + 1, expiryAlerts.length - 1);
              scrollToExpiryRow(next);
              return next;
          });
      } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSelectedExpiryIndex(prev => {
              const next = Math.max(prev - 1, 0);
              scrollToExpiryRow(next);
              return next;
          });
      }
  };

  const scrollToExpiryRow = (index: number) => {
      if (expiryRowRefs.current[index]) {
          expiryRowRefs.current[index]?.scrollIntoView({
              behavior: 'smooth',
              block: 'nearest'
          });
      }
  };

  // 4. Chart Data (Last 7 Days Sales)
  const chartData = useMemo(() => {
      const data = [];
      const today = new Date();
      
      for (let i = 6; i >= 0; i--) {
          const d = new Date(today);
          d.setDate(today.getDate() - i);
          const dateStr = d.toLocaleDateString('en-GB'); // DD/MM/YYYY
          
          const daySales = salesInvoices
            .filter(inv => inv.date === dateStr && inv.status === 'مكتمل')
            .reduce((sum, inv) => sum + inv.amount, 0);
            
          data.push({
              name: dateStr.slice(0, 5), // DD/MM
              sales: daySales,
              fullDate: dateStr
          });
      }
      return data;
  }, [salesInvoices]);

  // 5. Other Summaries
  const totalReceivables = useMemo(() => customers.reduce((sum, c) => sum + (c.balance > 0 ? c.balance : 0), 0), [customers]);
  const inventoryValue = useMemo(() => inventory.reduce((sum, i) => sum + (i.actualStock * i.costMajor), 0), [inventory]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900 border border-white/5 p-4 rounded-xl flex items-center justify-between shadow-lg">
              <div>
                  <p className="text-gray-400 text-xs font-bold mb-1">مبيعات اليوم (المحققة)</p>
                  <h3 className="text-2xl font-black text-white">{todaySales.toLocaleString()} <span className="text-xs font-medium text-gray-500">EGP</span></h3>
              </div>
              <div className="p-3 bg-blue-600/20 text-blue-500 rounded-lg">
                  <DollarSign size={24} />
              </div>
          </div>

          <div className="bg-slate-900 border border-white/5 p-4 rounded-xl flex items-center justify-between shadow-lg">
              <div>
                  <p className="text-gray-400 text-xs font-bold mb-1">عدد الفواتير (اليوم)</p>
                  <h3 className="text-2xl font-black text-white">{todayCount}</h3>
              </div>
              <div className="p-3 bg-purple-600/20 text-purple-500 rounded-lg">
                  <FileText size={24} />
              </div>
          </div>

          <div className="bg-slate-900 border border-white/5 p-4 rounded-xl flex items-center justify-between shadow-lg">
              <div>
                  <p className="text-gray-400 text-xs font-bold mb-1">صافي الربح (بعد الخصم)</p>
                  <h3 className={`text-2xl font-black ${todayProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {todayProfit.toLocaleString(undefined, { maximumFractionDigits: 1 })} <span className="text-xs font-medium text-gray-500">EGP</span>
                  </h3>
              </div>
              <div className="p-3 bg-emerald-600/20 text-emerald-500 rounded-lg">
                  <TrendingUp size={24} />
              </div>
          </div>

          <div className="bg-slate-900 border border-white/5 p-4 rounded-xl flex items-center justify-between shadow-lg">
              <div>
                  <p className="text-gray-400 text-xs font-bold mb-1">قيمة المخزون</p>
                  <h3 className="text-xl font-black text-white">{inventoryValue.toLocaleString()} <span className="text-xs font-medium text-gray-500">EGP</span></h3>
              </div>
              <div className="p-3 bg-orange-600/20 text-orange-500 rounded-lg">
                  <Wallet size={24} />
              </div>
          </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Chart Section */}
        <div className="lg:col-span-2 bg-slate-900/80 border border-white/5 p-6 rounded-xl backdrop-blur-sm shadow-xl">
          <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-lg text-white flex items-center gap-2">
                <BarChart3 className="text-blue-500" size={20} />
                مؤشر المبيعات (آخر 7 أيام)
              </h3>
              <div className="bg-slate-800 px-3 py-1 rounded text-[10px] text-gray-400">تحديث تلقائي</div>
          </div>
          
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" tick={{fill: '#64748b', fontSize: 10}} />
                <YAxis stroke="#64748b" tick={{fill: '#64748b', fontSize: 10}} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#fff' }}
                  itemStyle={{ color: '#3b82f6' }}
                  labelStyle={{ color: '#94a3b8', marginBottom: '0.5rem' }}
                />
                <Area type="monotone" dataKey="sales" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right Column (Stacked Widgets) */}
        <div className="space-y-6">
            
            {/* Expiry Alerts Widget (NEW) */}
            <div 
                className="bg-[#1e293b] border border-red-500/20 p-5 rounded-xl shadow-lg relative overflow-hidden focus-within:ring-2 focus-within:ring-red-500/50 outline-none"
                tabIndex={0}
                onKeyDown={handleExpiryKeyDown}
            >
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-white flex items-center gap-2 text-sm">
                        <AlertTriangle className="text-red-500" size={18} />
                        تنبيهات الصلاحية
                    </h3>
                    <div className="flex gap-1">
                        <button onClick={() => setSelectedExpiryIndex(prev => Math.max(0, prev - 1))} className="p-1 hover:bg-white/10 rounded"><ChevronUp size={14} className="text-slate-400"/></button>
                        <button onClick={() => setSelectedExpiryIndex(prev => Math.min(expiryAlerts.length - 1, prev + 1))} className="p-1 hover:bg-white/10 rounded"><ChevronDown size={14} className="text-slate-400"/></button>
                    </div>
                </div>

                <div 
                    ref={expiryListRef}
                    className="max-h-[180px] overflow-y-auto custom-scrollbar space-y-2 pr-1"
                >
                    {expiryAlerts.length === 0 ? (
                        <div className="text-center text-slate-500 text-xs py-10">لا توجد تنبيهات صلاحية</div>
                    ) : (
                        expiryAlerts.map((item, index) => (
                            <div 
                                key={item.id}
                                ref={el => { expiryRowRefs.current[index] = el; }}
                                onClick={() => setSelectedExpiryIndex(index)}
                                className={`flex items-center justify-between p-2.5 rounded-lg border transition-all cursor-pointer ${
                                    selectedExpiryIndex === index 
                                    ? 'bg-slate-700 border-slate-500' 
                                    : 'bg-[#0f172a] border-white/5 hover:border-white/10'
                                }`}
                            >
                                <div className="flex-1 min-w-0">
                                    <h4 className={`text-xs font-bold truncate ${item.status === 'expired' ? 'text-red-400' : 'text-amber-400'}`}>
                                        {item.name}
                                    </h4>
                                    <p className="text-[9px] text-slate-500 flex items-center gap-1 mt-0.5">
                                        <Calendar size={10} />
                                        ينتهي: {item.stocktakeExpiry}
                                    </p>
                                </div>
                                <div className={`text-[10px] font-black px-2 py-1 rounded ${item.status === 'expired' ? 'bg-red-500/20 text-red-500' : 'bg-amber-500/20 text-amber-500'}`}>
                                    {item.daysLeft < 0 ? 'منتهي' : `${item.daysLeft} يوم`}
                                </div>
                            </div>
                        ))
                    )}
                </div>
                {expiryAlerts.length > 0 && <div className="text-[9px] text-slate-500 mt-2 text-center">* استخدم الأسهم للتنقل</div>}
            </div>

            {/* Low Stock Widget */}
            <div className="bg-slate-900/80 border border-white/5 p-5 rounded-xl backdrop-blur-sm flex flex-col shadow-xl">
                <h3 className="font-bold text-white mb-4 flex items-center gap-2 text-sm">
                    <PackageMinus className="text-orange-500" size={18} />
                    نواقص المخزون
                </h3>
                <div className="space-y-3 flex-1 overflow-y-auto custom-scrollbar pr-2 max-h-[180px]">
                    {lowStockItems.length === 0 ? (
                        <div className="text-center text-gray-500 py-10 text-xs">
                            المخزون بحالة جيدة
                        </div>
                    ) : (
                        lowStockItems.map((item) => (
                        <div key={item.id} className="flex gap-3 items-center p-2 hover:bg-white/5 rounded-lg transition-colors cursor-pointer border-b border-white/5 last:border-0 group">
                            <div className="w-6 h-6 rounded-full bg-orange-500/20 text-orange-500 flex items-center justify-center font-bold text-[10px]">
                                {item.actualStock}
                            </div>
                            <div className="flex-1">
                                <h4 className="text-[11px] font-bold text-gray-300 group-hover:text-white transition-colors">{item.name}</h4>
                            </div>
                            <button className="text-[9px] bg-orange-600 hover:bg-orange-500 text-white px-2 py-0.5 rounded transition-colors">
                                طلب
                            </button>
                        </div>
                        ))
                    )}
                </div>
            </div>

        </div>
      </div>
    </div>
  );
};
