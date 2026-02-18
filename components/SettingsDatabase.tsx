
import React, { useRef, useState } from 'react';
import { Database, Download, Upload, FileSpreadsheet, Save, RefreshCw, AlertTriangle, CheckCircle, FileJson, PlusCircle, FolderOpen, PenLine, Trash2, HardDrive, Laptop, FileType } from 'lucide-react';
import * as XLSX from 'xlsx';
import { InventoryItem, SalesInvoice, PurchaseInvoice, CompanyInfo } from '../types';

interface Props {
  data: {
    inventory: InventoryItem[];
    salesInvoices: SalesInvoice[];
    purchaseInvoices: PurchaseInvoice[];
    companyInfo: CompanyInfo;
  };
  onRestore: (data: any) => void;
  onReset: (dbName: string) => void;
  onRename: (newName: string) => void;
  dbList: string[];
  activeDb: string;
  onSwitchDb: (dbName: string) => void;
  onDeleteDb: (dbName: string) => void;
  currentPath?: string;
  onConnectFile?: (type: 'json' | 'excel' | 'sqlite', mode: 'open' | 'create') => void;
  onExportSQLite?: () => void;
  onImportSQLite?: () => void;
}

export const SettingsDatabase: React.FC<Props> = ({ 
    data, onRestore, onReset, onRename, 
    dbList, activeDb, onSwitchDb, onDeleteDb,
    currentPath, onConnectFile, onExportSQLite, onImportSQLite
}) => {
  const jsonInputRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<{type: 'success'|'error', text: string} | null>(null);
  const [isRenaming, setIsRenaming] = useState(false);
  const [tempDbName, setTempDbName] = useState(activeDb);

  const showMsg = (type: 'success'|'error', text: string) => {
      setMsg({ type, text });
      setTimeout(() => setMsg(null), 4000);
  };

  // --- JSON Export (Backup) ---
  const handleExportJSON = () => {
    const dataStr = JSON.stringify(data, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const safeName = (activeDb || 'Backup').replace(/[^a-z0-9\u0600-\u06FF]/gi, '_');
    link.download = `${safeName}_${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showMsg('success', 'تم حفظ نسخة من قاعدة البيانات بنجاح');
  };

  // --- JSON Import ---
  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (json.inventory || json.salesInvoices) {
            onRestore(json);
            showMsg('success', 'تم تحميل البيانات إلى القاعدة الحالية');
        } else {
            showMsg('error', 'ملف غير صالح: البيانات غير مكتملة');
        }
      } catch (err) {
        showMsg('error', 'خطأ في قراءة الملف');
      }
    };
    reader.readAsText(file);
    if(jsonInputRef.current) jsonInputRef.current.value = '';
  };

  // --- Excel Export ---
  const handleExportExcel = () => {
    if (!XLSX) { showMsg('error', 'مكتبة Excel غير متوفرة'); return; }
    const wb = XLSX.utils.book_new();
    // Inventory
    const invData = data.inventory.map(i => ({
        'Code': i.code, 'Name': i.name, 'NameEn': i.nameEn, 'Category': i.category,
        'Stock': i.actualStock, 'Price': i.priceMajor, 'Cost': i.costMajor
    }));
    const wsInv = XLSX.utils.json_to_sheet(invData);
    XLSX.utils.book_append_sheet(wb, wsInv, "Inventory");
    // Sales
    const salesData = data.salesInvoices.map(s => ({
        'ID': s.id, 'Date': s.date, 'Customer': s.customerName, 
        'Amount': s.amount, 'Status': s.status
    }));
    const wsSales = XLSX.utils.json_to_sheet(salesData);
    XLSX.utils.book_append_sheet(wb, wsSales, "Sales");

    XLSX.writeFile(wb, `Data_Export_${activeDb}_${new Date().toISOString().slice(0,10)}.xlsx`);
    showMsg('success', 'تم تصدير ملف اكسيل بنجاح');
  };

  // --- Create New Database ---
  const handleCreateNew = () => {
      const name = prompt('أدخل اسم قاعدة البيانات الجديدة (بالانجليزية يفضل):');
      if (name && name.trim()) {
          onReset(name.trim()); 
          showMsg('success', `تم إنشاء قاعدة بيانات: ${name}`);
      }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Database className="text-blue-500 w-8 h-8" />
        <div>
          <h2 className="text-2xl font-bold text-white">إدارة قواعد البيانات</h2>
          <p className="text-gray-400 text-sm">التحكم في ملفات البيانات، النسخ الاحتياطي، واتصال الملفات</p>
        </div>
      </div>

      {/* Notification */}
      {msg && (
          <div className={`p-4 rounded-lg flex items-center gap-3 ${msg.type === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
              {msg.type === 'success' ? <CheckCircle size={20}/> : <AlertTriangle size={20}/>}
              <span>{msg.text}</span>
          </div>
      )}

      {/* --- Local File Connection --- */}
      <div className="bg-gradient-to-r from-emerald-900/30 to-slate-900 border border-emerald-500/30 p-6 rounded-xl relative overflow-hidden shadow-2xl">
         <div className="absolute top-0 right-0 w-1 h-full bg-emerald-500"></div>
         <div className="flex flex-col gap-4">
             <div className="flex items-center gap-3">
                 <Laptop className="text-emerald-400" size={24} />
                 <h3 className="font-bold text-white text-lg">العمل على ملف محلي (Local Device)</h3>
             </div>
             <p className="text-sm text-gray-400">
                 يمكنك اختيار ملف على جهازك ليكون هو قاعدة البيانات. سيتم حفظ جميع العمليات عليه مباشرة.
             </p>
             
             {currentPath ? (
                 <div className="bg-emerald-950/50 border border-emerald-500/50 p-4 rounded-lg flex items-center justify-between">
                     <div>
                         <div className="text-xs text-emerald-400 font-bold mb-1">متصل حالياً بـ:</div>
                         <div className="text-white font-mono dir-ltr truncate max-w-xl" dir="ltr">{currentPath}</div>
                     </div>
                     <CheckCircle className="text-emerald-500" />
                 </div>
             ) : (
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                     <div className="space-y-2">
                         <div className="text-xs text-gray-500 font-bold mb-1">ملفات Excel</div>
                         <button onClick={() => onConnectFile && onConnectFile('excel', 'create')} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white p-2 rounded text-sm font-bold flex items-center justify-center gap-2 transition mb-2">
                             <PlusCircle size={14} /> إنشاء ملف جديد
                         </button>
                         <button onClick={() => onConnectFile && onConnectFile('excel', 'open')} className="w-full bg-slate-800 hover:bg-slate-700 text-white p-2 rounded text-sm font-bold flex items-center justify-center gap-2 border border-emerald-500/30 transition">
                             <FolderOpen size={14} /> فتح ملف موجود
                         </button>
                     </div>
                     <div className="space-y-2">
                         <div className="text-xs text-gray-500 font-bold mb-1">ملفات JSON</div>
                         <button onClick={() => onConnectFile && onConnectFile('json', 'create')} className="w-full bg-orange-600 hover:bg-orange-500 text-white p-2 rounded text-sm font-bold flex items-center justify-center gap-2 transition mb-2">
                             <PlusCircle size={14} /> إنشاء ملف جديد
                         </button>
                         <button onClick={() => onConnectFile && onConnectFile('json', 'open')} className="w-full bg-slate-800 hover:bg-slate-700 text-white p-2 rounded text-sm font-bold flex items-center justify-center gap-2 border border-orange-500/30 transition">
                             <FolderOpen size={14} /> فتح ملف موجود
                         </button>
                     </div>
                 </div>
             )}
         </div>
      </div>

      {/* Database Switcher Panel */}
      <div className="bg-slate-900 border border-blue-500/30 p-6 rounded-xl relative overflow-hidden shadow-xl">
          <div className="absolute top-0 right-0 w-1 h-full bg-blue-500"></div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
              <Database className="text-blue-400" size={20} />
              قواعد البيانات في المتصفح
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {dbList.map(db => (
                  <div key={db} onClick={() => onSwitchDb(db)} className={`relative p-4 rounded-xl border cursor-pointer transition-all ${activeDb === db && !currentPath ? 'bg-blue-600/10 border-blue-500 ring-1 ring-blue-500/50' : 'bg-slate-950/50 border-white/5 hover:border-blue-500/30 hover:bg-slate-900'}`}>
                      <div className="flex items-center gap-3">
                          <Database size={20} className={activeDb === db && !currentPath ? 'text-blue-400' : 'text-gray-600'} />
                          <div className={`font-bold text-sm ${activeDb === db && !currentPath ? 'text-white' : 'text-gray-400'}`}>{db}</div>
                      </div>
                  </div>
              ))}
          </div>
      </div>

      {/* --- Import/Export Actions --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* JSON */}
          <div className="bg-slate-900 border border-white/5 p-6 rounded-xl space-y-4">
              <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                  <FileJson className="text-orange-400" size={20} />
                  <h3 className="font-bold text-white text-sm">JSON (Backup)</h3>
              </div>
              <button onClick={handleExportJSON} className="w-full bg-slate-950 hover:bg-slate-800 text-white p-3 rounded border border-white/5 flex items-center justify-between text-xs font-bold transition">
                  <span>حفظ نسخة احتياطية</span> <Download size={14} />
              </button>
              <div className="relative">
                 <input type="file" accept=".json" ref={jsonInputRef} onChange={handleImportJSON} className="absolute inset-0 w-full opacity-0 cursor-pointer" />
                 <button className="w-full bg-slate-950 hover:bg-slate-800 text-white p-3 rounded border border-white/5 flex items-center justify-between text-xs font-bold transition">
                    <span>استعادة نسخة</span> <Upload size={14} />
                 </button>
              </div>
          </div>

          {/* Excel */}
          <div className="bg-slate-900 border border-white/5 p-6 rounded-xl space-y-4">
              <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                  <FileSpreadsheet className="text-emerald-400" size={20} />
                  <h3 className="font-bold text-white text-sm">Excel</h3>
              </div>
              <button onClick={handleExportExcel} className="w-full bg-slate-950 hover:bg-slate-800 text-white p-3 rounded border border-white/5 flex items-center justify-between text-xs font-bold transition">
                  <span>تصدير تقارير</span> <Download size={14} />
              </button>
          </div>

          {/* SQLite (NEW) */}
          <div className="bg-slate-900 border border-white/5 p-6 rounded-xl space-y-4">
              <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                  <FileType className="text-blue-400" size={20} />
                  <h3 className="font-bold text-white text-sm">SQLite</h3>
              </div>
              <button onClick={onExportSQLite} className="w-full bg-slate-950 hover:bg-slate-800 text-white p-3 rounded border border-white/5 flex items-center justify-between text-xs font-bold transition">
                  <span>تصدير قاعدة بيانات (.db)</span> <Download size={14} />
              </button>
              <button onClick={onImportSQLite} className="w-full bg-slate-950 hover:bg-slate-800 text-white p-3 rounded border border-white/5 flex items-center justify-between text-xs font-bold transition">
                  <span>استيراد قاعدة بيانات</span> <Upload size={14} />
              </button>
          </div>
      </div>
    </div>
  );
};
