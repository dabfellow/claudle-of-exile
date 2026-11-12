const { app, BrowserWindow, protocol, net, dialog, Menu, ipcMain } = require('electron');
const { join, resolve, relative, isAbsolute } = require('node:path');
const { pathToFileURL } = require('node:url');
const { downloadRelease, liveManifest, readEvents } = require('./live-api.cjs');
protocol.registerSchemesAsPrivileged([{ scheme: 'poi-lab', privileges: { standard: true, secure: true, supportFetchAPI: true } }]);
app.setName('Path of Idle Balance Lab');
app.setAppUserModelId('party.dabfellow.pathofidle.balancelab');
app.setPath('userData', join(app.getPath('appData'), 'Path of Idle Balance Lab'));
let window, release;
const fetchLive = (url, options) => net.fetch(url, options);
function requireApp(event) {
  if (event.sender !== window?.webContents || !event.senderFrame?.url.startsWith('poi-lab://app/')) throw new Error('Unavailable outside Balance Lab');
}
async function openLab() {
  window = new BrowserWindow({ width: 1440, height: 1000, minWidth: 850, minHeight: 650, backgroundColor: '#0b1117', title: 'Checking live game — Path of Idle Balance Lab',
    webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true, preload: join(__dirname, 'preload.cjs') },
  });
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', (event, url) => { if (!url.startsWith('poi-lab://app/')) event.preventDefault(); });
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { label: 'File', submenu: [{ label: 'Refresh from live game', click: () => { app.relaunch(); app.exit(); } }, { type: 'separator' }, { role: 'quit' }] },
    { label: 'Edit', submenu: [{ role: 'undo' }, { role: 'redo' }, { type: 'separator' }, { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' }] },
    { label: 'View', submenu: [{ role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' }, { role: 'togglefullscreen' }] },
  ]));
  release = await downloadRelease(join(app.getPath('userData'), 'live-releases'), fetchLive);
  ipcMain.handle('balance-lab:source', event => { requireApp(event); return release.source; });
  ipcMain.handle('balance-lab:verify', async event => {
    requireApp(event);
    const current = await liveManifest(fetchLive);
    if (current.releaseId !== release.manifest.releaseId) throw new Error('The live game has updated. Use File → Refresh from live game before running another simulation.');
    const eventRows = await readEvents(current, fetchLive);
    release.source = { ...release.source, eventRows, checkedAt: new Date().toISOString() };
    return release.source;
  });
  protocol.handle('poi-lab', request => {
    const url = new URL(request.url);
    if (url.host !== 'app') return new Response('Not found', { status: 404 });
    const file = resolve(release.renderer, '.' + decodeURIComponent(url.pathname));
    const rel = relative(release.renderer, file);
    if (rel.startsWith('..') || isAbsolute(rel)) return new Response('Forbidden', { status: 403 });
    return net.fetch(pathToFileURL(file).href);
  });
  await window.loadURL(`poi-lab://app/${release.manifest.entry}`);
}
if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', () => { if (window) { if (window.isMinimized()) window.restore(); window.focus(); } });
  app.whenReady().then(openLab).catch(error => { dialog.showErrorBox('Live game values unavailable', error.message); app.quit(); });
  app.on('window-all-closed', () => app.quit());
}
