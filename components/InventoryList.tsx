
import React, { useState, useEffect, useRef } from 'react';
import { InventoryItem } from '../types';
import { Printer, Download, Settings, ChevronLeft, ChevronRight, Search, Upload, Plus, Edit, Trash2, X, Save } from 'lucide-react';
import * as XLSX from 'xlsx';

interface Props {
  items: InventoryItem[];
  onImport: (newItems: InventoryItem[]) => void;
  onEdit?: (updatedItem: InventoryItem) => void;
  onDelete?: (id: string) => void;
  onNavigateAdd?: () => void; // Used for the top "Add New" button
  onAdd?: (item: InventoryItem) => void; // Used for the quick modal add
}

export const InventoryList: React.FC<Props> = ({ items, onImport, onEdit, onDelete, onNavigateAdd, onAdd }) => {
  const [columns, setColumns] = useState([
    { id: 'index', label: '#', visible: true, width: '50px' },
    { id: 'name', label: 'اسم الصنف', visible: true, width: '200px' },
    { id: 'nameEn', label: 'الاسم (En)', visible: true, width: '150px' },
    { id: 'category', label: 'التصنيف', visible: true, width: '100px' },
    { id: 'count', label: 'الرصيد', visible: true, width: '80px' },
    { id: 'price', label: 'السعر (ك)', visible: true, width: '80px' },
    { id: 'cost', label: 'التكلفة (ك)', visible: false, width: '80px' },
    { id: 'averageDiscount', label: 'متوسط الخصم', visible: true, width: '100px' },
    { id: 'unitBig', label: 'وحدة كبرى', visible: true, width: '100px' },
    { id: 'unitSmall', label: 'وحدة صغرى', visible: true, width: '100px' },
    { id: 'factor', label: 'التحويل', visible: true, width: '80px' },
    { id: 'barcode', label: 'الباركود', visible: true, width: '120px' }
  ]);

  const [rowsPerPage, setRowsPerPage] = useState<number | 'all'>(20);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCell, setSelectedCell] = useState({ row: 0, col: 0 });
  const [showColMenu, setShowColMenu] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Context Menu State
  const [contextMenu, setContextMenu] = useState<{ visible: boolean; x: number; y: number; item: InventoryItem | null }>({
    visible: false, x: 0, y: 0, item: null
  });

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'edit' | 'add'>('edit');
  const [formData, setFormData] = useState<Partial<InventoryItem>>({});

  const tableContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Close Context Menu on Click
  useEffect(() => {
    const handleClick = () => setContextMenu({ ...contextMenu, visible: false });
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, [contextMenu]);

  // Filter Items
  const filteredItems = items.filter(i => 
    i.name.includes(searchTerm) || i.code.includes(searchTerm) || (i.nameEn && i.nameEn.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Pagination Logic
  const totalRows = filteredItems.length;
  const totalPages = rowsPerPage === 'all' ? 1 : Math.ceil(totalRows / rowsPerPage);
  const startIndex = rowsPerPage === 'all' ? 0 : (currentPage - 1) * rowsPerPage;
  const endIndex = rowsPerPage === 'all' ? totalRows : Math.min(startIndex + rowsPerPage, totalRows);
  const currentRows = filteredItems.slice(startIndex, endIndex);

  // Active Columns
  const activeCols = columns.filter(c => c.visible);

  // Handlers
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Arrow Key Navigation
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      e.preventDefault();
      setSelectedCell(prev => {
        let { row, col } = prev;
        if (e.key === 'ArrowUp' && row > 0) row--;
        if (e.key === 'ArrowDown' && row < currentRows.length - 1) row++;
        if (e.key === 'ArrowLeft' && col < activeCols.length - 1) col++; // RTL logic
        if (e.key === 'ArrowRight' && col > 0) col--; // RTL logic
        return { row, col };
      });
    }
  };

  const toggleColumn = (id: string) => {
    setColumns(prev => prev.map(c => c.id === id ? { ...c, visible: !c.visible } : c));
  };

  const exportToExcel = () => {
    if (!XLSX) {
        alert('مكتبة التصدير غير محملة');
        return;
    }
    
    const data = filteredItems.map((item, idx) => ({
        '#': idx + 1,
        'الباركود': item.code,
        'اسم الصنف': item.name,
        'الاسم (En)': item.nameEn || '',
        'التصنيف': item.category,
        'الوحدة الكبرى': item.majorUnit,
        'الوحدة الصغرى': item.minorUnit || '-',
        'معامل التحويل': item.factor,
        'سعر البيع': item.priceMajor,
        'التكلفة': item.costMajor,
        'متوسط الخصم': item.averageDiscount || 0,
        'الرصيد الحالي': item.actualStock
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inventory");
    XLSX.writeFile(wb, "Inventory_List.xlsx");
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!XLSX) {
        alert('مكتبة Excel غير محملة');
        return;
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        if (data && data.length > 0) {
            const uniqueNewItems: InventoryItem[] = [];
            let skippedCount = 0;

            const existingCodes = new Set(items.map(i => i.code));
            const existingNames = new Set(items.map(i => i.name));
            const batchCodes = new Set<string>();
            const batchNames = new Set<string>();

            data.forEach((row: any, idx: number) => {
                const code = String(row['الباركود'] || row['Barcode'] || row['code'] || ('GEN-' + Date.now() + idx)).trim();
                const name = String(row['اسم الصنف'] || row['Name'] || row['name'] || 'صنف غير معروف').trim();

                if (existingCodes.has(code) || existingNames.has(name) || batchCodes.has(code) || batchNames.has(name)) {
                    skippedCount++;
                    return; 
                }

                batchCodes.add(code);
                batchNames.add(name);

                const discountVal = Number(row['الخصم'] || row['Discount'] || 0);

                const newItem: InventoryItem = {
                    id: Date.now().toString() + idx,
                    code: code,
                    name: name,
                    nameEn: String(row['الاسم (En)'] || row['NameEn'] || ''),
                    category: String(row['التصنيف'] || row['Category'] || 'عام'),
                    location: row['الموقع'] || row['Location'] || '',
                    hasSubUnits: !!(row['الوحدة الصغرى'] || row['MinorUnit']),
                    majorUnit: row['الوحدة الكبرى'] || row['MajorUnit'] || 'قطعة',
                    minorUnit: row['الوحدة الصغرى'] || row['MinorUnit'] || '',
                    factor: Number(row['معامل التحويل'] || row['Factor'] || 1),
                    priceMajor: Number(row['سعر البيع'] || row['Price'] || 0),
                    priceMinor: 0,
                    costMajor: Number(row['التكلفة'] || row['Cost'] || 0),
                    supplierDiscount: discountVal,
                    averageDiscount: discountVal, // Init
                    systemStock: Number(row['الرصيد'] || row['Stock'] || 0),
                    actualStock: Number(row['الرصيد'] || row['Stock'] || 0),
                    lastUpdated: new Date().toISOString().split('T')[0]
                };

                if (newItem.hasSubUnits && newItem.factor > 0) {
                    newItem.priceMinor = newItem.priceMajor / newItem.factor;
                } else {
                    newItem.priceMinor = newItem.priceMajor;
                }

                uniqueNewItems.push(newItem);
            });

            if (uniqueNewItems.length > 0) {
                onImport(uniqueNewItems);
                alert(`تم استيراد ${uniqueNewItems.length} صنف جديد.\nتم تجاهل ${skippedCount} صنف لوجود تكرار في الاسم أو الباركود.`);
            } else {
                alert(`لم يتم استيراد أي أصناف. جميع البيانات الموجودة في الملف مسجلة مسبقاً (${skippedCount} مكرر).`);
            }
        }
        if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsBinaryString(file);
  };

  // --- Context Menu Handlers ---
  const handleContextMenu = (e: React.MouseEvent, item: InventoryItem) => {
    e.preventDefault();
    setContextMenu({
      visible: true,
      x: e.pageX,
      y: e.pageY,
      item
    });
  };

  const handleEditClick = () => {
    if (contextMenu.item) {
      setFormData({ ...contextMenu.item });
      setModalMode('edit');
      setShowModal(true);
    }
  };

  const handleDeleteClick = () => {
    if (!contextMenu.item) return;

    if (contextMenu.item.actualStock > 0 || contextMenu.item.systemStock > 0) {
        alert(`عفواً، لا يمكن حذف الصنف "${contextMenu.item.name}" لأن لديه رصيد حالي (${contextMenu.item.actualStock}).\nيجب تصفية الرصيد أولاً.`);
        setContextMenu({ ...contextMenu, visible: false });
        return;
    }

    if (onDelete) {
        onDelete(contextMenu.item.id);
    }
    setContextMenu({ ...contextMenu, visible: false });
  };

  // Handle Main "Add New" Button
  const handleMainAddClick = () => {
      if (onNavigateAdd) {
          onNavigateAdd();
      } else {
          // Fallback to modal if no navigation provided
          setFormData({
            code: '', name: '', nameEn: '', category: 'عام', location: '',
            hasSubUnits: false, majorUnit: 'قطعة', factor: 1,
            priceMajor: 0, costMajor: 0, supplierDiscount: 0, averageDiscount: 0,
            actualStock: 0
          });
          setModalMode('add');
          setShowModal(true);
      }
  };

  const handleModalSave = () => {
      if (!formData.name || !formData.code) {
          alert('يرجى التأكد من اسم الصنف والباركود');
          return;
      }

      const itemToSave = {
          ...formData,
          priceMinor: formData.hasSubUnits && (formData.factor || 1) > 0 
            ? (formData.priceMajor || 0) / (formData.factor || 1) 
            : (formData.priceMajor || 0),
          lastUpdated: new Date().toISOString().split('T')[0]
      } as InventoryItem;

      if (modalMode === 'edit' && onEdit) {
          onEdit(itemToSave);
      } else if (modalMode === 'add' && onAdd) {
          if (items.some(i => i.code === itemToSave.code || i.name === itemToSave.name)) {
              alert('عذراً، هذا الصنف مسجل مسبقاً (الاسم أو الباركود)');
              return;
          }
          if (!itemToSave.averageDiscount) itemToSave.averageDiscount = itemToSave.supplierDiscount || 0;
          onAdd({ ...itemToSave, id: Date.now().toString() });
      }

      setShowModal(false);
  };

  const renderCell = (colId: string, item: InventoryItem, index: number) => {
      switch(colId) {
          case 'index': return startIndex + index + 1;
          case 'name': return item.name;
          case 'nameEn': return item.nameEn || '-';
          case 'category': return item.category;
          case 'count': return item.actualStock;
          case 'price': return item.priceMajor.toLocaleString();
          case 'cost': return item.costMajor.toLocaleString();
          case 'averageDiscount': return (item.averageDiscount || 0).toFixed(2) + '%';
          case 'unitBig': return item.majorUnit;
          case 'unitSmall': return item.minorUnit || '-';
          case 'factor': return item.factor;
          case 'barcode': return item.code;
          default: return '';
      }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] animate-in fade-in zoom-in-95 duration-300" onKeyDown={handleKeyDown} tabIndex={0}>
      
      <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".xlsx, .xls" className="hidden" />

      {/* Header & Toolbar */}
      <div className="flex flex-col md:flex-row justify-between items-end mb-4 gap-4 no-print px-1">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <span className="text-blue-500">📦</span>
            قائمة الأصناف المكثفة
          </h1>
          <p className="text-xs text-gray-400 mt-1">اضغط بزر الفأرة الأيمن على الصنف للخيارات الإضافية</p>
        </div>

        <div className="flex gap-2">
            <button onClick={handleMainAddClick} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-2 border border-blue-400/30">
                <Plus size={14} />
                إضافة صنف جديد
            </button>
            <button onClick={handleImportClick} className="bg-emerald-700 border border-emerald-600/50 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-2">
                <Upload size={14} />
                استيراد Excel
            </button>
            <button onClick={exportToExcel} className="bg-slate-800 border border-white/10 hover:bg-slate-700 text-gray-200 px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-2">
                <Download size={14} />
                تصدير Excel
            </button>
        </div>
      </div>

      {/* Control Bar */}
      <div className="bg-slate-900 p-3 rounded-xl shadow-lg border border-white/5 mb-4 flex items-center justify-between no-print backdrop-blur-md relative z-30">
        <div className="flex items-center gap-4">
            
            <div className="relative">
                <input 
                    type="text" 
                    value={searchTerm}
                    onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                    placeholder="بحث سريع..." 
                    className="bg-slate-950 border border-slate-700 rounded-md pl-2 pr-8 py-1 text-xs text-white focus:outline-none focus:border-blue-500 w-48"
                />
                <Search size={12} className="absolute right-2.5 top-2 text-gray-500" />
            </div>

            <select 
                value={rowsPerPage} 
                onChange={(e) => { setRowsPerPage(e.target.value === 'all' ? 'all' : Number(e.target.value)); setCurrentPage(1); }} 
                className="bg-slate-950 border border-slate-700 rounded-md px-2 py-1 text-xs text-gray-300 outline-none cursor-pointer"
            >
                <option value={10}>10 صفوف</option>
                <option value={20}>20 صفاً</option>
                <option value={50}>50 صفاً</option>
                <option value="all">الكل</option>
            </select>

            <div className="relative">
                <button 
                    onClick={() => setShowColMenu(!showColMenu)} 
                    className={`text-xs font-bold flex items-center gap-1 transition px-2 py-1 rounded hover:bg-white/5 ${showColMenu ? 'text-blue-400' : 'text-gray-400'}`}
                >
                    <Settings size={14} />
                    <span>الأعمدة</span>
                </button>
                
                {showColMenu && (
                    <div className="absolute top-full right-0 mt-2 w-56 bg-slate-800 border border-slate-600 rounded-lg shadow-2xl z-50 p-2 animate-in fade-in zoom-in-95">
                        <div className="text-[10px] text-gray-500 font-bold mb-2 px-1">تحديد الأعمدة الظاهرة</div>
                        <div className="flex flex-col gap-1 max-h-60 overflow-y-auto custom-scrollbar">
                            {columns.map(col => (
                                <label key={col.id} className="flex items-center gap-2 cursor-pointer p-2 hover:bg-slate-700 rounded-md text-xs transition-colors">
                                    <input 
                                        type="checkbox" 
                                        checked={col.visible} 
                                        onChange={() => toggleColumn(col.id)}
                                        className="accent-blue-600 w-4 h-4 rounded border-gray-600 bg-slate-700"
                                    />
                                    <span className="text-gray-200">{col.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>

        <div className="text-[10px] text-gray-500 uppercase font-bold">
            إجمالي الأصناف: <span className="text-gray-200">{filteredItems.length}</span>
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-slate-900 rounded-lg shadow-inner overflow-hidden border border-white/5 flex-1 relative z-0" ref={tableContainerRef}>
        <div className="absolute inset-0 overflow-auto custom-scrollbar">
            <table className="w-full border-collapse table-fixed text-right">
                <thead className="sticky top-0 z-10">
                    <tr className="bg-slate-950 text-gray-400 text-xs border-b border-white/10 shadow-sm">
                        {activeCols.map(col => (
                            <th key={col.id} style={{ width: col.width }} className="p-3 font-bold whitespace-nowrap overflow-hidden text-ellipsis">
                                {col.label}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/5 bg-slate-900/50">
                    {currentRows.map((item, rowIdx) => (
                        <tr 
                            key={item.id} 
                            className={`transition-colors cursor-context-menu ${rowIdx === selectedCell.row ? 'bg-slate-800' : 'hover:bg-slate-800/30'}`}
                            onContextMenu={(e) => handleContextMenu(e, item)}
                        >
                            {activeCols.map((col, colIdx) => (
                                <td 
                                    key={col.id} 
                                    className={`p-2 text-xs text-gray-300 border-l border-white/5 whitespace-nowrap overflow-hidden text-ellipsis
                                        ${rowIdx === selectedCell.row && colIdx === selectedCell.col ? 'bg-blue-600 text-white font-bold ring-2 ring-inset ring-blue-400' : ''}
                                    `}
                                    onClick={() => setSelectedCell({ row: rowIdx, col: colIdx })}
                                >
                                    {renderCell(col.id, item, rowIdx)}
                                </td>
                            ))}
                        </tr>
                    ))}
                    {currentRows.length === 0 && (
                        <tr>
                            <td colSpan={activeCols.length} className="p-8 text-center text-gray-500 text-sm">لا توجد بيانات للعرض</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="mt-4 flex justify-between items-center no-print px-2 bg-slate-900/50 p-2 rounded-lg border border-white/5">
        <button 
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
            disabled={currentPage === 1}
            className="flex items-center gap-1 text-xs font-bold text-gray-400 hover:text-white disabled:opacity-30 transition-colors px-3 py-1 rounded hover:bg-white/5"
        >
            <ChevronRight size={14} />
            السابق
        </button>
        
        <span className="text-[10px] font-bold text-gray-500 font-mono">
            صفحة <span className="text-blue-400">{currentPage}</span> من {totalPages}
        </span>
        
        <button 
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
            disabled={currentPage === totalPages || totalPages === 0}
            className="flex items-center gap-1 text-xs font-bold text-gray-400 hover:text-white disabled:opacity-30 transition-colors px-3 py-1 rounded hover:bg-white/5"
        >
            التالي
            <ChevronLeft size={14} />
        </button>
      </div>

      {/* Context Menu */}
      {contextMenu.visible && (
        <div 
          className="fixed z-50 bg-[#1e293b] border border-slate-600 rounded-lg shadow-2xl overflow-hidden py-1 w-48 text-right animate-in fade-in zoom-in-95 duration-100"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
            <button onClick={handleEditClick} className="w-full px-4 py-2 text-sm text-gray-200 hover:bg-blue-600 hover:text-white flex items-center gap-2 transition-colors">
                <Edit size={14} />
                تعديل الصنف
            </button>
            <div className="border-t border-slate-700 my-1"></div>
            <button onClick={handleDeleteClick} className="w-full px-4 py-2 text-sm text-red-400 hover:bg-red-900/50 hover:text-red-300 flex items-center gap-2 transition-colors">
                <Trash2 size={14} />
                حذف الصنف
            </button>
        </div>
      )}

      {/* Edit/Add Modal (Fallback if not navigating) */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-[#0f172a] border border-slate-700 rounded-xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="bg-[#1e293b] p-4 flex justify-between items-center border-b border-slate-700">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        {modalMode === 'edit' ? <Edit className="text-blue-500" /> : <Plus className="text-emerald-500" />}
                        {modalMode === 'edit' ? `تعديل: ${formData.name}` : 'إضافة صنف جديد'}
                    </h2>
                    <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white"><X size={20} /></button>
                </div>
                
                <div className="p-6 grid grid-cols-2 gap-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
                    {/* ... (Fields remain the same as previous implementation) ... */}
                    <div className="col-span-2 md:col-span-1">
                        <label className="text-xs text-gray-500 block mb-1">اسم الصنف (عربي)</label>
                        <input type="text" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-[#1e293b] border border-slate-600 text-white rounded p-2 text-sm outline-none focus:border-blue-500" />
                    </div>
                     <div className="col-span-2 md:col-span-1">
                        <label className="text-xs text-gray-500 block mb-1">اسم الصنف (إنجليزي)</label>
                        <input type="text" value={formData.nameEn || ''} onChange={e => setFormData({...formData, nameEn: e.target.value})} className="w-full bg-[#1e293b] border border-slate-600 text-white rounded p-2 text-sm outline-none focus:border-blue-500" />
                    </div>
                    <div>
                        <label className="text-xs text-gray-500 block mb-1">الباركود</label>
                        <input type="text" value={formData.code || ''} onChange={e => setFormData({...formData, code: e.target.value})} className="w-full bg-[#1e293b] border border-slate-600 text-white rounded p-2 text-sm outline-none focus:border-blue-500 font-mono" />
                    </div>
                    <div>
                        <label className="text-xs text-gray-500 block mb-1">التصنيف</label>
                        <input type="text" value={formData.category || ''} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full bg-[#1e293b] border border-slate-600 text-white rounded p-2 text-sm outline-none focus:border-blue-500" />
                    </div>
                    <div className="col-span-2 border-t border-slate-800 my-2"></div>
                    <div>
                        <label className="text-xs text-gray-500 block mb-1">سعر البيع</label>
                        <input type="number" value={formData.priceMajor || ''} onChange={e => setFormData({...formData, priceMajor: parseFloat(e.target.value)})} className="w-full bg-[#1e293b] border border-slate-600 text-white rounded p-2 text-sm outline-none focus:border-blue-500" />
                    </div>
                    <div>
                        <label className="text-xs text-gray-500 block mb-1">التكلفة (قبل الخصم)</label>
                        <input type="number" value={formData.costMajor || ''} onChange={e => setFormData({...formData, costMajor: parseFloat(e.target.value)})} className="w-full bg-[#1e293b] border border-slate-600 text-white rounded p-2 text-sm outline-none focus:border-blue-500" />
                    </div>
                    <div>
                        <label className="text-xs text-gray-500 block mb-1">خصم المورد (الافتراضي %)</label>
                        <input type="number" value={formData.supplierDiscount || ''} onChange={e => setFormData({...formData, supplierDiscount: parseFloat(e.target.value)})} className="w-full bg-[#1e293b] border border-slate-600 text-white rounded p-2 text-sm outline-none focus:border-blue-500" />
                    </div>
                    <div>
                        <label className="text-xs text-gray-500 block mb-1">متوسط الخصم الحالي (%)</label>
                        <input type="number" value={formData.averageDiscount || ''} onChange={e => setFormData({...formData, averageDiscount: parseFloat(e.target.value)})} className="w-full bg-[#1e293b] border border-slate-600 text-emerald-400 font-bold rounded p-2 text-sm outline-none focus:border-blue-500" />
                    </div>
                    <div>
                        <label className="text-xs text-gray-500 block mb-1">الرصيد الحالي</label>
                        <input type="number" value={formData.actualStock || ''} onChange={e => setFormData({...formData, actualStock: parseFloat(e.target.value)})} className="w-full bg-[#1e293b] border border-slate-600 text-white rounded p-2 text-sm outline-none focus:border-blue-500" />
                    </div>
                    <div className="col-span-2 border-t border-slate-800 my-2"></div>
                    <div className="flex items-center gap-2 col-span-2 mb-2">
                        <input type="checkbox" checked={formData.hasSubUnits || false} onChange={e => setFormData({...formData, hasSubUnits: e.target.checked})} className="accent-blue-500 w-4 h-4" />
                        <label className="text-sm text-gray-300">له وحدات فرعية (تجزئة)</label>
                    </div>
                    {formData.hasSubUnits && (
                        <>
                            <div>
                                <label className="text-xs text-gray-500 block mb-1">الوحدة الكبرى</label>
                                <input type="text" value={formData.majorUnit || ''} onChange={e => setFormData({...formData, majorUnit: e.target.value})} className="w-full bg-[#1e293b] border border-slate-600 text-white rounded p-2 text-sm outline-none focus:border-blue-500" />
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 block mb-1">الوحدة الصغرى</label>
                                <input type="text" value={formData.minorUnit || ''} onChange={e => setFormData({...formData, minorUnit: e.target.value})} className="w-full bg-[#1e293b] border border-slate-600 text-white rounded p-2 text-sm outline-none focus:border-blue-500" />
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 block mb-1">معامل التحويل</label>
                                <input type="number" value={formData.factor || ''} onChange={e => setFormData({...formData, factor: parseFloat(e.target.value)})} className="w-full bg-[#1e293b] border border-slate-600 text-white rounded p-2 text-sm outline-none focus:border-blue-500" />
                            </div>
                        </>
                    )}
                </div>

                <div className="p-4 border-t border-slate-700 bg-[#161e2e] flex justify-end gap-2">
                    <button onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-400 hover:text-white text-sm">إلغاء</button>
                    <button onClick={handleModalSave} className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold text-sm flex items-center gap-2">
                        <Save size={16} />
                        حفظ
                    </button>
                </div>
            </div>
        </div>
      )}

    </div>
  );
};
