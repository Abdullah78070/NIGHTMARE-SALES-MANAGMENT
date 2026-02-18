
const { app, BrowserWindow, globalShortcut, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 768,
    title: "NIGHTMARE Sales System",
    backgroundColor: '#05070a',
    webPreferences: {
      nodeIntegration: false, // Security best practice
      contextIsolation: true, // Security best practice
      preload: path.join(__dirname, 'preload.js')
    },
    autoHideMenuBar: true, 
    icon: path.join(__dirname, '../public/icon.png')
  });

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.setMenu(null);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// --- IPC Handlers for File System ---

// 1. Open File Dialog
ipcMain.handle('dialog:openFile', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [
      { name: 'Supported Files', extensions: ['json', 'xlsx', 'db', 'sqlite'] },
      { name: 'JSON', extensions: ['json'] },
      { name: 'Excel', extensions: ['xlsx'] },
      { name: 'SQLite Database', extensions: ['db', 'sqlite'] }
    ]
  });
  if (canceled) {
    return null;
  } else {
    return filePaths[0];
  }
});

// 2. Save File Dialog (Create New)
ipcMain.handle('dialog:saveFile', async (_, defaultName) => {
  const { canceled, filePath } = await dialog.showSaveDialog({
    defaultPath: defaultName,
    filters: [
      { name: 'JSON Database', extensions: ['json'] },
      { name: 'Excel Database', extensions: ['xlsx'] },
      { name: 'SQLite Database', extensions: ['db', 'sqlite'] }
    ]
  });
  if (canceled) {
    return null;
  } else {
    return filePath;
  }
});

// 3. Read File
ipcMain.handle('fs:readFile', async (_, filePath) => {
  try {
    const ext = path.extname(filePath).toLowerCase();
    
    // If SQLite, don't read as file string, return path metadata so frontend calls importSQLite
    if (ext === '.db' || ext === '.sqlite') {
         return { success: true, data: '', ext: ext };
    }

    // Return base64 for safe transport of binary (Excel) or text (JSON)
    const content = fs.readFileSync(filePath);
    return { 
      success: true, 
      data: content.toString('base64'), 
      ext: ext 
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// 4. Write File
ipcMain.handle('fs:writeFile', async (_, { filePath, data, isBase64 }) => {
  try {
    const buffer = isBase64 ? Buffer.from(data, 'base64') : data;
    fs.writeFileSync(filePath, buffer);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// --- SQLite Handlers ---

function getSQLite() {
    try {
        return require('better-sqlite3');
    } catch (e) {
        return null;
    }
}

ipcMain.handle('sqlite:export', async (_, { filePath, data }) => {
    const Database = getSQLite();
    if (!Database) return { success: false, error: 'Module "better-sqlite3" not found. Please run npm install better-sqlite3' };

    try {
        // Create/Overwrite DB
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        const db = new Database(filePath);

        // 1. Inventory Table
        db.exec(`
            CREATE TABLE IF NOT EXISTS inventory (
                id TEXT PRIMARY KEY, code TEXT, name TEXT, nameEn TEXT, category TEXT,
                location TEXT, hasSubUnits INTEGER, majorUnit TEXT, minorUnit TEXT,
                factor REAL, priceMajor REAL, priceMinor REAL, costMajor REAL,
                supplierDiscount REAL, systemStock REAL, actualStock REAL, lastUpdated TEXT
            )
        `);
        const insertInv = db.prepare(`
            INSERT INTO inventory VALUES (
                @id, @code, @name, @nameEn, @category, @location, @hasSubUnits,
                @majorUnit, @minorUnit, @factor, @priceMajor, @priceMinor, @costMajor,
                @supplierDiscount, @systemStock, @actualStock, @lastUpdated
            )
        `);
        const  insertManyInv = db.transaction((items) => {
            for (const item of items) insertInv.run({ ...item, hasSubUnits: item.hasSubUnits ? 1 : 0 });
        });
        insertManyInv(data.inventory);

        // 2. Sales Table
        db.exec(`
            CREATE TABLE IF NOT EXISTS sales (
                id TEXT PRIMARY KEY, customerName TEXT, amount REAL, date TEXT,
                status TEXT, paymentType TEXT, discountValue REAL, discountType TEXT,
                extraValue REAL, rows_json TEXT
            )
        `);
        const insertSale = db.prepare(`
            INSERT INTO sales VALUES (
                @id, @customerName, @amount, @date, @status, @paymentType,
                @discountValue, @discountType, @extraValue, @rows_json
            )
        `);
        const insertManySales = db.transaction((invoices) => {
            for (const inv of invoices) {
                insertSale.run({ 
                    ...inv, 
                    rows_json: JSON.stringify(inv.rows || []) 
                });
            }
        });
        insertManySales(data.salesInvoices);

        // 3. Purchases Table
        db.exec(`
            CREATE TABLE IF NOT EXISTS purchases (
                id TEXT PRIMARY KEY, vendor TEXT, amount REAL, date TEXT,
                status TEXT, warehouse TEXT, paymentType TEXT, reference TEXT,
                rows_json TEXT
            )
        `);
        const insertPurchase = db.prepare(`
            INSERT INTO purchases VALUES (
                @id, @vendor, @amount, @date, @status, @warehouse,
                @paymentType, @reference, @rows_json
            )
        `);
        const insertManyPurchases = db.transaction((invoices) => {
            for (const inv of invoices) {
                insertPurchase.run({ 
                    ...inv, 
                    rows_json: JSON.stringify(inv.rows || []) 
                });
            }
        });
        insertManyPurchases(data.purchaseInvoices);

        // 4. Company & Units
        db.exec(`CREATE TABLE IF NOT EXISTS metadata (key TEXT PRIMARY KEY, value TEXT)`);
        const insertMeta = db.prepare('INSERT OR REPLACE INTO metadata VALUES (?, ?)');
        insertMeta.run('company', JSON.stringify(data.companyInfo));
        insertMeta.run('units', JSON.stringify(data.units));

        db.close();
        return { success: true };
    } catch (err) {
        return { success: false, error: err.message };
    }
});

ipcMain.handle('sqlite:import', async (_, filePath) => {
    const Database = getSQLite();
    if (!Database) return { success: false, error: 'Module "better-sqlite3" not found.' };

    try {
        const db = new Database(filePath, { readonly: true });
        
        // Read Inventory
        const inventory = db.prepare('SELECT * FROM inventory').all().map(i => ({
            ...i, hasSubUnits: i.hasSubUnits === 1
        }));

        // Read Sales
        const salesInvoices = db.prepare('SELECT * FROM sales').all().map(s => ({
            ...s, rows: JSON.parse(s.rows_json)
        }));

        // Read Purchases
        const purchaseInvoices = db.prepare('SELECT * FROM purchases').all().map(p => ({
            ...p, rows: JSON.parse(p.rows_json)
        }));

        // Read Metadata
        const metaRows = db.prepare('SELECT * FROM metadata').all();
        let companyInfo = {};
        let units = [];
        
        metaRows.forEach(row => {
            if (row.key === 'company') companyInfo = JSON.parse(row.value);
            if (row.key === 'units') units = JSON.parse(row.value);
        });

        db.close();

        return { 
            success: true, 
            data: { inventory, salesInvoices, purchaseInvoices, companyInfo, units }
        };

    } catch (err) {
        return { success: false, error: err.message };
    }
});

app.on('ready', () => {
  createWindow();
  
  if (process.env.NODE_ENV !== 'development') {
    globalShortcut.register('CommandOrControl+R', () => {});
    globalShortcut.register('F5', () => {});
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
