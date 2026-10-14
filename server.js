/**
 * Ponto de entrada do Servidor (Entrypoint)
 * Inicializa o servidor HTTP Express e o serviço do WhatsApp Web.
 */

const app = require('./src/app');
const config = require('./src/config/config');
const whatsAppService = require('./src/models/WhatsAppService');

const server = app.listen(config.server.port, config.server.host, () => {
    console.log('================================================================');
    console.log('🚀 WHATSAPP PROFILE CHECKER & SIDEBAR EXTRACTOR API');
    console.log('================================================================');
    console.log(`📡 Servidor ativo em: http://localhost:${config.server.port}`);
    console.log(`🌐 Acessível externamente em: http://${config.server.host}:${config.server.port}`);
    console.log(`📑 Documentação da API: http://localhost:${config.server.port}/#api-docs`);
    console.log('================================================================');

    // Inicia o serviço do WhatsApp Web em segundo plano
    console.log('[Startup] Iniciando inicialização do WhatsApp Web...');
    whatsAppService.initialize().catch((err) => {
        console.error('[Startup] Falha inicial ao conectar WhatsApp Web:', err.message);
        console.log('[Startup] Você pode tentar reconectar pela interface web em http://localhost:' + config.server.port);
    });
});

// Encerramento gracioso do servidor
const gracefulShutdown = async (signal) => {
    console.log(`\n[Shutdown] Recebido sinal ${signal}. Encerrando servidor e Puppeteer com segurança...`);
    try {
        await whatsAppService.destroy();
    } catch (e) {
        console.error('[Shutdown] Erro ao destruir cliente:', e.message);
    }
    server.close(() => {
        console.log('[Shutdown] Servidor HTTP finalizado.');
        process.exit(0);
    });
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

module.exports = server;
