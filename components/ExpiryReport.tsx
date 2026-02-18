
import React, { useState, useMemo } from 'react';
import { 
  AlertTriangle, 
  Settings2, 
  Search, 
  Calendar,
  CheckCircle2,
  AlertOctagon,
  Layers,
  History,
  Package,
  Store,
  HelpCircle,
  Filter,
  ArrowDownCircle,
  Download
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { InventoryItem, PurchaseInvoice, SalesInvoice } from '../types';

interface Props {
  inventory: InventoryItem[];
  purchaseInvoices: PurchaseInvoice[];
  salesInvoices?: SalesInvoice[]; // Added Sales to calculate real batch depletion
}

// Helper types
type ExpiryStatus = 'expired' | 'near' | 'safe' | 'unknown';

interface BatchInfo {
    id: string;
    source: string;
    sourceType: 'invoice' | 'stocktake';
    dateStr: string;
    dateObj: Date | null; // Allow null for invalid dates
    quantity: number; // Remaining Quantity after FIFO deduction
    originalQuantity: number; // Original Qty
    daysLeft: number;
    status: ExpiryStatus;
}

interface ItemReportData extends InventoryItem {
    batches: BatchInfo[];
    overallStatus: ExpiryStatus;
    totalExpiring: number;
    nearestDate: string | null;
    nearestDays: number;
}

export const ExpiryReport: React.FC<Props> = ({ inventory, purchaseInvoices, salesInvoices = [] }) => {
  const [searchTerm, setSearchTerm] = useState('');
  // Added 'alerts' filter to show both expired and near items
  const [activeFilter, setActiveFilter] = useState<'all' | 'alerts' | 'expired' | 'near' | 'safe' | 'unknown'>('alerts'); 
  const [alertDays, setAlertDays] = useState(90); // Default 3 months

  // --- 1. Robust Date Parser ---
  const parseDate = (input: string | undefined): Date | null => {
      if (!input) return null;
      const str = input.toString().trim();
      if (!str) return null;

      try {
          // Try ISO format YYYY-MM-DD
          if (str.includes('-')) {
              const d = new Date(str);
              return isNaN(d.getTime()) ? null : d;
          }

          const parts = str.split(/[\/\.]/); // Split by / or .
          
          // Format: D/M/YYYY or DD/MM/YYYY
          if (parts.length === 3) {
              const day = parseInt(parts[0]);
              const month = parseInt(parts[1]);
              let year = parseInt(parts[2]);
              
              // Handle short year (e.g., 24 -> 2024)
              if (year < 100) year += 2000;

              const d = new Date(year, month - 1, day);
              return isNaN(d.getTime()) ? null : d;
          }
          
          // Format: MM/YYYY or M/YYYY
          if (parts.length === 2) {
              const month = parseInt(parts[0]);
              let year = parseInt(parts[1]);
              if (year < 100) year += 2000;
              // Return last day of month
              return new Date(year, month, 0);
          }
      } catch (e) {
          console.error("Date parse error", str, e);
          return null;
      }
      return null;
  };

  const calculateDaysLeft = (date: Date | null) => {
      if (!date) return 9999;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const target = new Date(date);
      target.setHours(23, 59, 59, 999); // End of target day
      const diffTime = target.getTime() - today.getTime();
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // --- 2. Data Processing (Memoized with FIFO) ---
  const processedItems = useMemo(() => {
      // Step A: Index Purchase Invoices by Item ID/Code
      const invoiceMap = new Map<string, BatchInfo[]>();
      
      purchaseInvoices.forEach(inv => {
          if (inv.status === 'محذوف' || !inv.rows) return;
          inv.rows.forEach(row => {
              if (!row.expiry) return; // Ignore rows without expiry
              
              const dateObj = parseDate(row.expiry);
              const daysLeft = calculateDaysLeft(dateObj);
              
              let status: ExpiryStatus = 'safe';
              if (!dateObj) status = 'unknown';
              else if (daysLeft < 0) status = 'expired';
              else if (daysLeft <= alertDays) status = 'near';

              const batch: BatchInfo = {
                  id: `INV-${inv.id}-${row.id}`,
                  source: `فاتورة #${inv.id} (${inv.vendor})`,
                  sourceType: 'invoice',
                  dateStr: row.expiry,
                  dateObj,
                  quantity: row.qty, // Will be reduced later
                  originalQuantity: row.qty,
                  daysLeft,
                  status
              };

              // Map by ID
              if (row.itemId) {
                  if (!invoiceMap.has(row.itemId)) invoiceMap.set(row.itemId, []);
                  invoiceMap.get(row.itemId)?.push(batch);
              }
              // Map by Code (Barcode) as fallback
              if (row.barcode) {
                  if (!invoiceMap.has(row.barcode)) invoiceMap.set(row.barcode, []);
                  invoiceMap.get(row.barcode)?.push(batch);
              }
          });
      });

      // Step B: Build Inventory Report
      return inventory.map(item => {
          // --- Calculate Total Sales for this Item (FIFO Source) ---
          let totalSold = 0;
          if (salesInvoices) {
              salesInvoices.forEach(sale => {
                  if (sale.status === 'محذوف' || !sale.rows) return;
                  sale.rows.forEach(row => {
                      if (row.itemId === item.id || row.code === item.code) {
                          let qty = row.qty;
                          // If Return invoice, it adds back to stock (negative sale)
                          // But wait, the system usually creates a separate Invoice for Returns.
                          // If sales invoice status is 'مرتجع', it means items returned.
                          // The `salesInvoices` state includes returns. 
                          // A return should technically be added back to the *latest* valid batch or create a new batch?
                          // For simplicity in this logic: We subtract returns from total sold.
                          if (sale.status === 'مرتجع') {
                              qty = -qty;
                          }
                          
                          // Handle Unit Conversion if sold in minor unit but batches are major
                          // (Assuming Purchase Batches are usually in Major Units or normalized)
                          if (item.hasSubUnits && item.factor > 1 && row.unit !== item.majorUnit) {
                              qty = qty / item.factor;
                          }
                          totalSold += qty;
                      }
                  });
              });
          }

          let batches: BatchInfo[] = [];

          // 1. Add Stocktake Batch (Current known expiry)
          if (item.stocktakeExpiry) {
              const dateObj = parseDate(item.stocktakeExpiry);
              const daysLeft = calculateDaysLeft(dateObj);
              let status: ExpiryStatus = 'safe';
              if (!dateObj) status = 'unknown';
              else if (daysLeft < 0) status = 'expired';
              else if (daysLeft <= alertDays) status = 'near';

              batches.push({
                  id: `ST-${item.id}`,
                  source: 'الرصيد الحالي (المخزن)',
                  sourceType: 'stocktake',
                  dateStr: item.stocktakeExpiry,
                  dateObj,
                  quantity: item.actualStock,
                  originalQuantity: item.actualStock,
                  daysLeft,
                  status
              });
          }

          // 2. Add History Batches from Invoices
          const invBatchesById = invoiceMap.get(item.id) || [];
          const invBatchesByCode = invoiceMap.get(item.code) || [];
          
          // Merge and deduplicate based on unique batch ID
          const allInvBatches = [...invBatchesById, ...invBatchesByCode];
          const uniqueBatches = new Map();
          
          // Add Stocktake first (priority)
          batches.forEach(b => uniqueBatches.set(b.id, b));
          // Add Invoices (history)
          allInvBatches.forEach(b => {
              uniqueBatches.set(b.id, b);
          });

          // 3. FIFO Logic Implementation
          // Sort batches by Date ASC (Oldest First)
          // EXCEPTION: Stocktake batches are usually "What is actually there", replacing old history.
          // But here we merge them. Let's rely on sorted date.
          let finalBatches = Array.from(uniqueBatches.values())
              .sort((a, b) => a.daysLeft - b.daysLeft); 

          // Apply Depletion (Sales deduction)
          // We deduct `totalSold` from the oldest VALID batches.
          // If a batch is EXPIRED, we skip it (assuming we don't sell expired goods), so it remains in list.
          let remainingSalesToDeduct = totalSold;

          finalBatches = finalBatches.map(batch => {
              // If batch is expired, skip deduction (it stays as waste/expired stock)
              if (batch.status === 'expired') {
                  return batch;
              }

              // If batch is valid, deduct sales
              if (remainingSalesToDeduct > 0) {
                  const deduction = Math.min(batch.quantity, remainingSalesToDeduct);
                  const newQty = batch.quantity - deduction;
                  remainingSalesToDeduct -= deduction;
                  return { ...batch, quantity: newQty };
              }

              return batch;
          }).filter(b => b.quantity > 0.001); // Filter out empty batches

          // 4. Determine Overall Status & Count Expiring Quantity
          let overallStatus: ExpiryStatus = 'unknown';
          let nearestDate: string | null = null;
          let nearestDays = 9999;
          let totalExpiring = 0;

          if (finalBatches.length > 0) {
              const validBatches = finalBatches.filter(b => b.dateObj !== null);
              
              if (validBatches.length > 0) {
                  // Find the nearest relevant batch (could be expired or near)
                  const worstBatch = validBatches[0]; 
                  overallStatus = worstBatch.status;
                  nearestDate = worstBatch.dateStr;
                  nearestDays = worstBatch.daysLeft;

                  // Sum quantities ONLY for batches that are expired or near
                  totalExpiring = validBatches
                      .filter(b => b.status === 'expired' || b.status === 'near')
                      .reduce((sum, b) => sum + b.quantity, 0);
              } else {
                  overallStatus = 'unknown';
              }
          } else {
              overallStatus = 'unknown';
          }
          
          return {
              ...item,
              batches: finalBatches,
              overallStatus,
              nearestDate,
              nearestDays,
              totalExpiring
          };
      });

  }, [inventory, purchaseInvoices, salesInvoices, alertDays]);

  // --- 3. Filtering Logic ---
  const filteredData = useMemo(() => {
      return processedItems.filter(item => {
          // Search Filter
          const searchMatch = !searchTerm || 
              item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
              item.code.includes(searchTerm);
          
          if (!searchMatch) return false;

          // Status Filter
          if (activeFilter === 'all') return true;
          
          // Special filter: "Alerts" = Expired + Near
          if (activeFilter === 'alerts') {
              return item.overallStatus === 'expired' || item.overallStatus === 'near';
          }

          return item.overallStatus === activeFilter;
      }).sort((a, b) => a.nearestDays - b.nearestDays);
  }, [processedItems, searchTerm, activeFilter]);

  // --- 4. Stats Calculation ---
  const stats = useMemo(() => ({
      expired: processedItems.filter(i => i.overallStatus === 'expired').length,
      near: processedItems.filter(i => i.overallStatus === 'near').length,
      safe: processedItems.filter(i => i.overallStatus === 'safe').length,
      unknown: processedItems.filter(i => i.overallStatus === 'unknown').length,
      total: processedItems.length,
      alerts: processedItems.filter(i => i.overallStatus === 'expired' || i.overallStatus === 'near').length
  }), [processedItems]);

  // --- 5. Export to Excel (VERTICAL DETAILED) ---
  const handleExportExcel = () => {
      if (!XLSX) {
          alert('مكتبة التصدير غير متوفرة');
          return;
      }

      const dataToExport: any[] = [];

      filteredData.forEach(item => {
          // Determine which batches to show based on the active filter
          let batchesToShow: BatchInfo[] = [];

          if (activeFilter === 'expired') {
              batchesToShow = item.batches.filter(b => b.status === 'expired');
          } else if (activeFilter === 'near') {
              batchesToShow = item.batches.filter(b => b.status === 'near');
          } else if (activeFilter === 'alerts') {
              batchesToShow = item.batches.filter(b => b.status === 'expired' || b.status === 'near');
          } else if (activeFilter === 'safe') {
              batchesToShow = item.batches.filter(b => b.status === 'safe');
          } else {
              // 'all' or 'unknown' - show all known batches
              batchesToShow = item.batches;
          }

          if (batchesToShow.length > 0) {
              // Create a separate row for each batch
              batchesToShow.forEach(batch => {
                  dataToExport.push({
                      'كود الصنف': item.code,
                      'اسم الصنف': item.name,
                      'الرصيد الكلي (بالمخزن)': item.actualStock, // Informational
                      'تاريخ الصلاحية': batch.dateStr,
                      'الكمية المتأثرة (التشغيلة)': batch.quantity, // Specific qty for this date
                      'الحالة': getStatusLabel(batch.status),
                      'الأيام المتبقية': batch.daysLeft,
                      'المصدر': batch.source
                  });
              });
          } else if (activeFilter === 'all' && item.batches.length === 0) {
              // If showing "All" and no expiry info exists, show one row for the item anyway
              dataToExport.push({
                  'كود الصنف': item.code,
                  'اسم الصنف': item.name,
                  'الرصيد الكلي (بالمخزن)': item.actualStock,
                  'تاريخ الصلاحية': 'غير محدد',
                  'الكمية المتأثرة (التشغيلة)': item.actualStock,
                  'الحالة': 'غير محدد',
                  'الأيام المتبقية': '-',
                  'المصدر': '-'
              });
          }
      });

      if (dataToExport.length === 0) {
          alert('لا توجد بيانات للتصدير حسب الفلتر الحالي');
          return;
      }

      const ws = XLSX.utils.json_to_sheet(dataToExport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Expiry Details");
      
      // Auto-width columns roughly
      const wscols = [
          {wch: 15}, // Code
          {wch: 30}, // Name
          {wch: 15}, // Total Stock
          {wch: 15}, // Expiry Date
          {wch: 20}, // Batch Qty
          {wch: 15}, // Status
          {wch: 10}, // Days
          {wch: 30}  // Source
      ];
      ws['!cols'] = wscols;

      const fileName = `Expiry_Report_Detailed_${activeFilter}_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
  };

  // Helper for UI
  const getStatusColor = (status: ExpiryStatus) => {
      switch(status) {
          case 'expired': return 'text-red-500 bg-red-500/10 border-red-500/20';
          case 'near': return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
          case 'safe': return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
          default: return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
      }
  };

  const getStatusLabel = (status: ExpiryStatus) => {
      switch(status) {
          case 'expired': return 'منتهي الصلاحية';
          case 'near': return 'يوشك على الانتهاء';
          case 'safe': return 'صلاحية سارية';
          default: return 'غير محدد / لا يوجد تاريخ';
      }
  };

  return (
    <div className="min-h-[calc(100vh-140px)] p-4 font-sans text-right animate-in fade-in zoom-in-95 duration-300 text-slate-200" dir="rtl">
      
      {/* Header Stats Bar */}
      <div className="bg-[#1e293b] border border-white/5 rounded-2xl p-4 shadow-xl mb-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              
              <div className="flex items-center gap-3">
                  <div className="bg-indigo-600/20 p-3 rounded-xl border border-indigo-500/20 text-indigo-400">
                      <History size={24} />
                  </div>
                  <div>
                      <h1 className="text-xl font-black text-white">مراقبة الصلاحية</h1>
                      <p className="text-[11px] text-slate-400 font-bold">حساب استهلاك الكميات بالأقدمية (FIFO)</p>
                  </div>
              </div>

              {/* Alert Slider */}
              <div className="flex items-center gap-3 bg-[#0f172a] p-2 px-4 rounded-xl border border-slate-700">
                  <span className="text-[10px] text-slate-400 font-bold whitespace-nowrap">تنبيه قبل:</span>
                  <input 
                      type="range" 
                      min="1" max="365" 
                      value={alertDays}
                      onChange={(e) => setAlertDays(parseInt(e.target.value))}
                      className="w-24 md:w-32 accent-indigo-500 h-1.5 bg-slate-700 rounded-lg cursor-pointer"
                  />
                  <span className="text-xs font-black text-indigo-400 w-12 text-center">{alertDays} يوم</span>
              </div>

          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-6">
              {/* ALERTS ONLY FILTER */}
              <button onClick={() => setActiveFilter('alerts')} className={`p-3 rounded-xl border flex flex-col items-center justify-center transition-all ${activeFilter === 'alerts' ? 'bg-gradient-to-br from-red-900/40 to-amber-900/40 border-amber-500 shadow-lg shadow-amber-900/20 scale-105' : 'bg-[#0f172a] border-slate-700 hover:bg-white/5'}`}>
                  <span className="text-2xl font-black text-white">{stats.alerts}</span>
                  <span className="text-[10px] text-amber-300 font-bold uppercase flex items-center gap-1"><AlertTriangle size={10} /> تنبيهات ومخاطر</span>
              </button>

              <button onClick={() => setActiveFilter('expired')} className={`p-3 rounded-xl border flex flex-col items-center justify-center transition-all ${activeFilter === 'expired' ? 'bg-red-500/20 border-red-500' : 'bg-[#0f172a] border-slate-700 hover:bg-white/5'}`}>
                  <span className="text-2xl font-black text-red-500">{stats.expired}</span>
                  <span className="text-[10px] text-red-300 font-bold uppercase">منتهي</span>
              </button>
              <button onClick={() => setActiveFilter('near')} className={`p-3 rounded-xl border flex flex-col items-center justify-center transition-all ${activeFilter === 'near' ? 'bg-amber-500/20 border-amber-500' : 'bg-[#0f172a] border-slate-700 hover:bg-white/5'}`}>
                  <span className="text-2xl font-black text-amber-500">{stats.near}</span>
                  <span className="text-[10px] text-amber-300 font-bold uppercase">قريب الانتهاء</span>
              </button>
              <button onClick={() => setActiveFilter('safe')} className={`p-3 rounded-xl border flex flex-col items-center justify-center transition-all ${activeFilter === 'safe' ? 'bg-emerald-500/20 border-emerald-500' : 'bg-[#0f172a] border-slate-700 hover:bg-white/5'}`}>
                  <span className="text-2xl font-black text-emerald-500">{stats.safe}</span>
                  <span className="text-[10px] text-emerald-300 font-bold uppercase">آمن</span>
              </button>
              <button onClick={() => setActiveFilter('all')} className={`p-3 rounded-xl border flex flex-col items-center justify-center transition-all col-span-2 md:col-span-1 ${activeFilter === 'all' ? 'bg-blue-600/20 border-blue-500' : 'bg-[#0f172a] border-slate-700 hover:bg-white/5'}`}>
                  <span className="text-2xl font-black text-white">{stats.total}</span>
                  <span className="text-[10px] text-slate-400 font-bold uppercase">الكل</span>
              </button>
          </div>
      </div>

      {/* Filter Input & Actions */}
      <div className="mb-4 flex gap-2">
          <div className="relative flex-1">
            <input 
                type="text" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="ابحث باسم الصنف أو الكود..."
                className="w-full bg-[#1e293b] border border-white/10 rounded-xl py-3 pr-10 pl-4 text-sm text-white focus:outline-none focus:border-indigo-500 font-bold shadow-lg"
            />
            <Search className="absolute right-3 top-3.5 text-slate-500" size={18} />
          </div>
          
          <button 
            onClick={handleExportExcel}
            className="bg-emerald-700 hover:bg-emerald-600 text-white px-4 rounded-xl font-bold text-xs flex items-center gap-2 shadow-lg transition-all border border-emerald-500/30"
            title="تصدير تفصيلي (كل تاريخ في سطر)"
          >
            <Download size={16} />
            <span className="hidden md:inline">تصدير Excel</span>
          </button>
      </div>

      {/* Main List */}
      <div className="space-y-4">
          {filteredData.length === 0 ? (
              <div className="text-center py-20 bg-[#1e293b] rounded-2xl border border-white/5">
                  <Package size={48} className="mx-auto text-slate-600 mb-4" />
                  <p className="text-slate-400 font-bold">لا توجد أصناف تطابق الفلتر المحدد</p>
                  <button onClick={() => setActiveFilter('all')} className="mt-4 text-indigo-400 text-xs font-bold hover:underline">عرض جميع الأصناف</button>
              </div>
          ) : (
              filteredData.map(item => (
                  <div key={item.id} className={`bg-[#1e293b] rounded-xl border overflow-hidden transition-all shadow-md ${item.overallStatus === 'expired' ? 'border-red-500/50 shadow-red-900/10' : item.overallStatus === 'near' ? 'border-amber-500/50 shadow-amber-900/10' : 'border-white/5'}`}>
                      
                      {/* Item Summary Row */}
                      <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0f172a]/50">
                          <div className="flex items-center gap-4 flex-1">
                              <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg shrink-0 ${getStatusColor(item.overallStatus)} border`}>
                                  {item.overallStatus === 'expired' ? <AlertOctagon /> : item.overallStatus === 'near' ? <AlertTriangle /> : item.overallStatus === 'safe' ? <CheckCircle2 /> : <HelpCircle />}
                              </div>
                              <div className="flex-1">
                                  <h3 className="font-bold text-white text-lg flex items-center gap-3">
                                      {item.name}
                                      {/* Highlight Total Expiring Quantity */}
                                      {item.totalExpiring > 0 && (
                                          <span className="text-xs bg-red-600 text-white px-3 py-1 rounded-full animate-pulse shadow-lg flex items-center gap-1">
                                              <ArrowDownCircle size={12} />
                                              الكمية المتأثرة: {item.totalExpiring}
                                          </span>
                                      )}
                                  </h3>
                                  <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                                      <span className="font-mono bg-slate-800 px-2 rounded">{item.code}</span>
                                      <span className="text-indigo-400 font-bold">الرصيد الكلي بالمخزن: {item.actualStock} {item.majorUnit}</span>
                                  </div>
                              </div>
                          </div>

                          <div className="flex items-center gap-4">
                              {item.nearestDate && (
                                  <div className="text-center md:text-right">
                                      <span className="text-[10px] text-slate-500 block font-bold">أقرب تاريخ انتهاء</span>
                                      <span className={`font-mono font-black text-lg ${item.nearestDays < 0 ? 'text-red-500' : 'text-white'}`}>{item.nearestDate}</span>
                                      <span className="text-[10px] text-slate-400 block">
                                          {item.nearestDays < 0 ? `انتهى منذ ${Math.abs(item.nearestDays)} يوم` : `باقي ${item.nearestDays} يوم`}
                                      </span>
                                  </div>
                              )}
                              <div className={`px-3 py-1 rounded text-xs font-bold border ${getStatusColor(item.overallStatus)}`}>
                                  {getStatusLabel(item.overallStatus)}
                              </div>
                          </div>
                      </div>

                      {/* Batches Table (Only if batches exist) */}
                      {item.batches.length > 0 ? (
                          <div className="border-t border-white/5">
                              <table className="w-full text-right text-xs">
                                  <thead className="bg-[#111827] text-slate-500 font-bold">
                                      <tr>
                                          <th className="p-3 w-1/3">المصدر</th>
                                          <th className="p-3 text-center">تاريخ الانتهاء</th>
                                          <th className="p-3 text-center">الكمية المتبقية</th>
                                          <th className="p-3 text-center">الحالة</th>
                                      </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-800/50">
                                      {item.batches.map(batch => (
                                          <tr key={batch.id} className={`hover:bg-white/5 ${batch.status !== 'safe' ? 'bg-red-500/5' : ''}`}>
                                              <td className="p-3 text-slate-300 flex items-center gap-2">
                                                  {batch.sourceType === 'invoice' ? <Store size={12} className="text-blue-400"/> : <Layers size={12} className="text-amber-400"/>}
                                                  {batch.source}
                                              </td>
                                              <td className="p-3 text-center font-mono font-bold text-white">{batch.dateStr}</td>
                                              <td className={`p-3 text-center font-black ${batch.status !== 'safe' ? 'text-red-400 text-sm' : 'text-indigo-300'} bg-slate-800/30`}>
                                                  {batch.quantity.toFixed(2)}
                                              </td>
                                              <td className="p-3 text-center">
                                                  <span className={`text-[10px] font-bold ${batch.status === 'expired' ? 'text-red-500' : batch.status === 'near' ? 'text-amber-500' : 'text-emerald-500'}`}>
                                                      {batch.daysLeft < 0 ? 'منتهي' : `${batch.daysLeft} يوم`}
                                                  </span>
                                              </td>
                                          </tr>
                                      ))}
                                  </tbody>
                              </table>
                          </div>
                      ) : (
                          <div className="p-3 text-center text-slate-500 text-xs italic border-t border-white/5">
                              لا توجد تواريخ صلاحية مسجلة لهذا الصنف في المشتريات أو الجرد.
                          </div>
                      )}
                  </div>
              ))
          )}
      </div>

    </div>
  );
};
