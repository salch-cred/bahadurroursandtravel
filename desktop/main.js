// Bahadur Billing: a desktop window onto the billing pages of the live site.
// Bills live in the same online database as the website admin, so nothing is stored on this PC
// except the sign-in, which stays in the app's own profile.
const path = require('node:path');
const { app, BrowserWindow, Menu, dialog, session, shell } = require('electron');

// A local test server can be used only when running from source, never in the installed app.
const SITE = (!app.isPackaged && process.env.BILLING_URL) || 'https://bahadurtours.com';
const HOME = `${SITE}/invoices-admin`;
const BILLING_PAGE = /^\/(billing|invoices-admin|customers-admin|finance-admin|reports-admin|settings-admin|paid-bill)(\.html)?$/;
const OUTSIDE_APP = new Set(['https:', 'mailto:', 'tel:']);
const ABORTED = -3;

app.userAgentFallback = `${app.userAgentFallback} BahadurBilling/${app.getVersion()}`;

let win = null;

const parse = (url) => { try { return new URL(url); } catch { return null; } };
const isSite = (url) => url?.origin === new URL(SITE).origin;
const isBillingPage = (url) => isSite(url) && BILLING_PAGE.test(url.pathname);

function openOutside(url) {
  if (url && OUTSIDE_APP.has(url.protocol)) shell.openExternal(url.href);
}

function guard(contents) {
  contents.on('will-navigate', (event, target) => {
    const url = parse(target);
    if (url?.protocol === 'file:' || isBillingPage(url)) return;
    event.preventDefault();
    // Signing out and the logo lead to the website dashboard, which is not part of this app
    if (isSite(url) && /^\/admin(\.html)?$/.test(url.pathname)) contents.loadURL(HOME);
    else if (!isSite(url)) openOutside(url);
  });

  contents.setWindowOpenHandler(({ url: target }) => {
    const url = parse(target);
    if (isBillingPage(url)) return { action: 'allow', overrideBrowserWindowOptions: { width: 1000, height: 900, autoHideMenuBar: true } };
    if (!isSite(url)) openOutside(url);
    return { action: 'deny' };
  });

  // The billing page warns before leaving unsaved work; without this the window would just refuse to close.
  contents.on('will-prevent-unload', (event) => {
    const owner = BrowserWindow.fromWebContents(contents);
    const choice = dialog.showMessageBoxSync(owner, {
      type: 'warning', buttons: ['Leave without saving', 'Stay'], defaultId: 1, cancelId: 1,
      message: 'This bill has changes that are not saved.', detail: 'Stay on the page and press Save to keep them.',
    });
    if (choice === 0) event.preventDefault();
  });

  contents.on('did-fail-load', (_event, code, _description, target, isMainFrame) => {
    if (!isMainFrame || code === ABORTED || target.startsWith('file:')) return;
    contents.loadFile(path.join(__dirname, 'offline.html'), { query: { next: target } });
  });

  contents.on('context-menu', (_event, params) => {
    if (!params.isEditable && !params.selectionText) return;
    const items = params.isEditable ? [{ role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { type: 'separator' }, { role: 'selectAll' }] : [{ role: 'copy' }];
    Menu.buildFromTemplate(items).popup();
  });
}

function buildMenu() {
  const go = (page) => () => win?.loadURL(`${SITE}/${page}`);
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { label: 'File', submenu: [
      { label: 'New invoice', accelerator: 'Ctrl+N', click: go('billing') },
      { label: 'All invoices', accelerator: 'Ctrl+L', click: go('invoices-admin') },
      { type: 'separator' },
      { role: 'quit', label: 'Exit' },
    ] },
    { role: 'editMenu' },
    { label: 'View', submenu: [{ role: 'reload' }, { type: 'separator' }, { role: 'zoomIn' }, { role: 'zoomOut' }, { role: 'resetZoom' }, { type: 'separator' }, { role: 'togglefullscreen' }] },
  ]));
}

function createWindow() {
  win = new BrowserWindow({
    width: 1360, height: 860, minWidth: 900, minHeight: 600, show: false,
    title: 'Bahadur Billing', backgroundColor: '#ffffff',
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  win.on('page-title-updated', (event) => event.preventDefault());
  win.once('ready-to-show', () => { win.maximize(); win.show(); });
  win.on('closed', () => { win = null; });
  win.loadURL(HOME);
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
  app.on('web-contents-created', (_event, contents) => guard(contents));
  app.whenReady().then(() => {
    session.defaultSession.setPermissionRequestHandler((_contents, permission, allow) => allow(permission === 'clipboard-sanitized-write'));
    buildMenu();
    createWindow();
  });
  app.on('window-all-closed', () => app.quit());
}
