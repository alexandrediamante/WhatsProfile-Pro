/**
 * Configuração central da aplicação WhatsApp Profile Checker
 * Define parâmetros do servidor HTTP, caminhos de persistência e opções do Puppeteer.
 */

const path = require('path');
require('dotenv').config();

const ROOT_DIR = path.resolve(__dirname, '../../');
const SESSIONS_DIR = path.join(ROOT_DIR, 'sessions', 'whatsapp_browser_session');
const SCREENSHOTS_DIR = path.join(ROOT_DIR, 'screenshots');

const config = {
    server: {
        port: parseInt(process.env.PORT, 10) || 1800,
        host: process.env.HOST || '0.0.0.0'
    },
    paths: {
        rootDir: ROOT_DIR,
        sessionsDir: SESSIONS_DIR,
        screenshotsDir: SCREENSHOTS_DIR,
        viewsDir: path.join(ROOT_DIR, 'src', 'views', 'public')
    },
    puppeteer: {
        headless: process.env.HEADLESS === 'true' ? 'new' : (process.env.HEADLESS === 'false' ? false : 'new'),
        executablePath: process.env.CHROME_BIN || null,
        defaultViewport: {
            width: 1440,
            height: 900
        },
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--window-size=1440,900',
            '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'
        ]
    },
    whatsapp: {
        webUrl: 'https://web.whatsapp.com',
        navigationTimeout: 60000,
        drawerTimeout: 15000,
        renderWaitMs: 2500
    }
};

module.exports = config;
