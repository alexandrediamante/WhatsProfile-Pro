/**
 * WhatsAppService - Camada Model
 * Gerencia o ciclo de vida do cliente WhatsApp Web, autenticação com LocalAuth,
 * consulta de dados de contato, foto de perfil, atualização de status e captura de tela do painel lateral.
 */

const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const fs = require('fs');
const path = require('path');
const config = require('../config/config');
const PhoneSanitizer = require('./PhoneSanitizer');

class WhatsAppService {
    constructor() {
        this.client = null;
        this.status = 'DISCONNECTED'; // DISCONNECTED, INITIALIZING, QR_READY, AUTHENTICATED, READY
        this.qrCodeRaw = null;
        this.qrCodeDataUrl = null;
        this.authInfo = null;
        this.readyTimestamp = null;
        this.isProcessingAction = false;
        this.ensureDirectories();
    }

    /**
     * Garante a existência dos diretórios necessários.
     */
    ensureDirectories() {
        if (!fs.existsSync(config.paths.sessionsDir)) {
            fs.mkdirSync(config.paths.sessionsDir, { recursive: true });
        }
        if (!fs.existsSync(config.paths.screenshotsDir)) {
            fs.mkdirSync(config.paths.screenshotsDir, { recursive: true });
        }
    }

    /**
     * Inicializa o cliente WhatsApp Web com LocalAuth e Puppeteer configurado.
     */
    async initialize() {
        if (this.client) {
            console.log('[WhatsAppService] Cliente já instanciado. Status atual:', this.status);
            return;
        }

        console.log('[WhatsAppService] Inicializando WhatsApp Web com LocalAuth...');
        this.status = 'INITIALIZING';

        try {
            this.client = new Client({
                authStrategy: new LocalAuth({
                    dataPath: config.paths.sessionsDir,
                    clientId: 'whatsapp-profile-session'
                }),
                puppeteer: {
                    headless: config.puppeteer.headless,
                    executablePath: config.puppeteer.executablePath || undefined,
                    args: config.puppeteer.args,
                    defaultViewport: config.puppeteer.defaultViewport
                }
            });

            this.setupEventHandlers();
            await this.client.initialize();
        } catch (error) {
            console.error('[WhatsAppService] Falha fatal ao inicializar cliente:', error);
            this.status = 'ERROR';
            this.client = null;
            throw error;
        }
    }

    /**
     * Registra os eventos do ciclo de vida do WhatsApp.
     */
    setupEventHandlers() {
        this.client.on('qr', async (qr) => {
            console.log('[WhatsAppService] Novo QR Code gerado.');
            this.qrCodeRaw = qr;
            this.status = 'QR_READY';
            try {
                this.qrCodeDataUrl = await qrcode.toDataURL(qr, {
                    width: 300,
                    margin: 2,
                    color: {
                        dark: '#111827',
                        light: '#ffffff'
                    }
                });
            } catch (err) {
                console.error('[WhatsAppService] Erro ao converter QR Code para DataURL:', err);
            }
        });

        this.client.on('authenticated', () => {
            console.log('[WhatsAppService] Sessão autenticada com sucesso!');
            this.status = 'AUTHENTICATED';
            this.qrCodeRaw = null;
            this.qrCodeDataUrl = null;
        });

        this.client.on('auth_failure', (msg) => {
            console.error('[WhatsAppService] Falha de autenticação:', msg);
            this.status = 'AUTH_FAILURE';
            this.qrCodeRaw = null;
            this.qrCodeDataUrl = null;
        });

        this.client.on('ready', () => {
            console.log('[WhatsAppService] WhatsApp Web totalmente conectado e pronto para uso!');
            this.status = 'READY';
            this.readyTimestamp = new Date().toISOString();
            if (this.client.info) {
                this.authInfo = {
                    pushname: this.client.info.pushname || 'Usuário WhatsApp',
                    wid: this.client.info.wid ? this.client.info.wid._serialized : null,
                    platform: this.client.info.platform || 'WhatsApp Web'
                };
            }
        });

        this.client.on('disconnected', (reason) => {
            console.warn('[WhatsAppService] Cliente desconectado. Motivo:', reason);
            this.status = 'DISCONNECTED';
            this.qrCodeRaw = null;
            this.qrCodeDataUrl = null;
            this.authInfo = null;
            this.readyTimestamp = null;
        });
    }

    /**
     * Retorna o status operacional atual do serviço.
     * @returns {Object}
     */
    getStatus() {
        return {
            status: this.status,
            isConnected: this.status === 'READY',
            hasQrCode: !!this.qrCodeDataUrl,
            readyTimestamp: this.readyTimestamp,
            authInfo: this.authInfo
        };
    }

    /**
     * Retorna o QR Code atual se disponível.
     * @returns {{ qrCodeDataUrl: string|null, qrCodeRaw: string|null }}
     */
    getQrCode() {
        return {
            qrCodeDataUrl: this.qrCodeDataUrl,
            qrCodeRaw: this.qrCodeRaw,
            status: this.status
        };
    }

    /**
     * Consulta completa dos dados do contato:
     * - Get contact info
     * - Get profile pictures
     * - Captura do print do painel lateral (opcional)
     * @param {string} rawPhone
     * @param {boolean} captureScreenshot
     * @returns {Promise<Object>}
     */
    async getContactDetails(rawPhone, captureScreenshot = true) {
        if (this.status !== 'READY' || !this.client) {
            throw new Error('O WhatsApp Web não está conectado. Conecte primeiro escaneando o QR Code.');
        }

        const normalized = PhoneSanitizer.normalize(rawPhone);
        if (!normalized.isValid) {
            throw new Error(normalized.error || 'Número de telefone inválido.');
        }

        const contactId = normalized.whatsappId;
        const cleanNumber = normalized.cleanPhone;

        console.log(`[WhatsAppService] Analisando número: ${cleanNumber} (${contactId})...`);

        // 1. Verifica se o número é cadastrado no WhatsApp
        let isRegistered = false;
        try {
            isRegistered = await this.client.isRegisteredUser(contactId);
        } catch (e) {
            console.warn(`[WhatsAppService] Erro ao checar isRegisteredUser para ${contactId}:`, e.message);
            // Fallback: se falhar a checagem, tenta prosseguir com o getContact
        }

        if (!isRegistered) {
            return {
                queryPhone: rawPhone,
                cleanPhone: cleanNumber,
                formattedPhone: normalized.formattedPhone,
                isRegistered: false,
                message: 'O número informado não possui conta ativa no WhatsApp.',
                contactInfo: null,
                profilePicture: null,
                screenshot: null
            };
        }

        // 2. Extrai dados do contato (Get contact info)
        let contact = null;
        try {
            contact = await this.client.getContactById(contactId);
        } catch (e) {
            console.warn(`[WhatsAppService] Erro em getContactById para ${contactId}:`, e.message);
        }

        // 3. Obtém o recado/status (About)
        let aboutText = null;
        try {
            if (contact && typeof contact.getAbout === 'function') {
                aboutText = await contact.getAbout();
            }
        } catch (e) {
            aboutText = null;
        }

        // 4. Obtém foto de perfil em alta resolução (Get profile pictures)
        let profilePicUrl = null;
        try {
            profilePicUrl = await this.client.getProfilePicUrl(contactId);
        } catch (e) {
            profilePicUrl = null;
        }

        const contactInfo = {
            id: contactId,
            number: cleanNumber,
            formattedPhone: normalized.formattedPhone,
            name: (contact && contact.name) || null,
            pushname: (contact && contact.pushname) || null,
            shortName: (contact && contact.shortName) || null,
            verifiedName: (contact && contact.verifiedName) || null,
            isBusiness: (contact && !!contact.isBusiness) || false,
            isEnterprise: (contact && !!contact.isEnterprise) || false,
            isVerified: (contact && !!contact.isVerified) || false,
            isMyContact: (contact && !!contact.isMyContact) || false,
            isBlocked: (contact && !!contact.isBlocked) || false,
            about: aboutText,
            accountType: (contact && contact.isBusiness) ? 'WhatsApp Business' : 'WhatsApp Pessoal'
        };

        const profilePicture = {
            hasPicture: !!profilePicUrl,
            url: profilePicUrl || null
        };

        // 5. Captura do print do painel lateral "Dados do contacto"
        let screenshotData = null;
        if (captureScreenshot) {
            try {
                screenshotData = await this.captureSidebarScreenshot(cleanNumber);
            } catch (err) {
                console.error('[WhatsAppService] Erro ao capturar screenshot do painel lateral:', err.message);
                screenshotData = {
                    success: false,
                    error: `Falha ao capturar painel lateral: ${err.message}`
                };
            }
        }

        return {
            queryPhone: rawPhone,
            cleanPhone: cleanNumber,
            formattedPhone: normalized.formattedPhone,
            isRegistered: true,
            contactInfo,
            profilePicture,
            screenshot: screenshotData
        };
    }

    /**
     * Captura o print recortado do painel lateral direito ("Dados do contacto").
     * @param {string} cleanNumber
     * @returns {Promise<Object>}
     */
    async captureSidebarScreenshot(cleanNumber) {
        const page = this.client.pupPage;
        if (!page) {
            throw new Error('Instância do navegador Puppeteer não encontrada.');
        }

        console.log(`[WhatsAppService] Navegando para conversa do número: ${cleanNumber}...`);

        // Abre a conversa diretamente
        await page.goto(`https://web.whatsapp.com/send?phone=${cleanNumber}`, {
            waitUntil: 'networkidle2',
            timeout: config.whatsapp.navigationTimeout
        });

        // Aguarda carregar o cabeçalho da conversa
        await page.waitForSelector('header', {
            timeout: config.whatsapp.drawerTimeout
        });

        // Clica no cabeçalho para disparar a abertura do painel lateral de dados do contato
        console.log('[WhatsAppService] Clicando no cabeçalho para abrir painel lateral...');
        await page.click('header');

        // Aguarda o painel lateral carregar completamente
        // Tenta seletores modernos do WhatsApp Web para o drawer lateral direito
        const drawerSelectors = [
            'div[data-testid="drawer-right"]',
            'div[data-testid="contact-info-drawer"]',
            'div[data-testid="chat-info-drawer"]',
            'section',
            'aside'
        ];

        let targetElement = null;
        for (const selector of drawerSelectors) {
            try {
                targetElement = await page.waitForSelector(selector, { timeout: 3000 });
                if (targetElement) {
                    console.log(`[WhatsAppService] Elemento do painel lateral encontrado via: ${selector}`);
                    break;
                }
            } catch (e) {
                // Tenta o próximo seletor
            }
        }

        // Aguarda tempo configurado para garantir renderização de imagem e fontes
        await new Promise((resolve) => setTimeout(resolve, config.whatsapp.renderWaitMs));

        const fileName = `perfil_${cleanNumber}_${Date.now()}.png`;
        const filePath = path.join(config.paths.screenshotsDir, fileName);

        if (targetElement) {
            // Tira print exclusivo do elemento lateral
            await targetElement.screenshot({
                path: filePath,
                type: 'png'
            });
            console.log(`[WhatsAppService] Print exclusivo do painel salvo em: ${filePath}`);
        } else {
            // Se nenhum container específico for isolado, tira da página
            console.warn('[WhatsAppService] Seletor lateral isolado não encontrado. Realizando captura alternativa.');
            await page.screenshot({
                path: filePath,
                fullPage: false
            });
        }

        // Lê o arquivo para converter em base64 se necessário
        let base64Preview = null;
        try {
            const buffer = fs.readFileSync(filePath);
            base64Preview = `data:image/png;base64,${buffer.toString('base64')}`;
        } catch (e) {
            console.warn('[WhatsAppService] Erro ao gerar base64 da screenshot:', e.message);
        }

        return {
            success: true,
            fileName,
            filePath,
            imageUrl: `/api/screenshots/${fileName}`,
            base64: base64Preview,
            capturedAt: new Date().toISOString()
        };
    }

    /**
     * Atualiza o recado/status do usuário conectado (Set user status message).
     * @param {string} newStatusMessage
     * @returns {Promise<Object>}
     */
    async setUserStatusMessage(newStatusMessage) {
        if (this.status !== 'READY' || !this.client) {
            throw new Error('O WhatsApp Web não está conectado. Conecte primeiro escaneando o QR Code.');
        }

        if (!newStatusMessage || typeof newStatusMessage !== 'string' || !newStatusMessage.trim()) {
            throw new Error('A mensagem de status não pode ser vazia.');
        }

        const trimmed = newStatusMessage.trim();
        console.log(`[WhatsAppService] Atualizando status do usuário para: "${trimmed}"...`);

        try {
            await this.client.setStatus(trimmed);
            return {
                success: true,
                message: 'Recado do WhatsApp atualizado com sucesso.',
                statusMessage: trimmed,
                updatedAt: new Date().toISOString()
            };
        } catch (error) {
            console.error('[WhatsAppService] Erro ao atualizar status do usuário:', error);
            throw new Error(`Falha ao definir status no WhatsApp: ${error.message}`);
        }
    }

    /**
     * Encerra a sessão e desconecta o cliente.
     */
    async destroy() {
        if (this.client) {
            console.log('[WhatsAppService] Encerrando sessão do WhatsApp...');
            try {
                await this.client.destroy();
            } catch (e) {
                console.warn('[WhatsAppService] Erro ao destruir cliente:', e.message);
            }
            this.client = null;
            this.status = 'DISCONNECTED';
            this.qrCodeRaw = null;
            this.qrCodeDataUrl = null;
            this.authInfo = null;
            this.readyTimestamp = null;
        }
    }
}

// Padrão Singleton para manter a mesma instância e conexão ativa
const whatsAppServiceInstance = new WhatsAppService();
module.exports = whatsAppServiceInstance;
