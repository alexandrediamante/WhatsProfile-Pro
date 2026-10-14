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
            this.startReadyPoller();
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
            if (this._readyPollerInterval) clearInterval(this._readyPollerInterval);
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
            if (this._readyPollerInterval) clearInterval(this._readyPollerInterval);
            this.qrCodeRaw = null;
            this.qrCodeDataUrl = null;
            this.authInfo = null;
            this.readyTimestamp = null;
        });
    }

    /**
     * Poller proativo que detecta a renderização completa da interface do WhatsApp Web
     * caso o evento 'ready' nativo do whatsapp-web.js sofra atraso.
     */
    startReadyPoller() {
        if (this._readyPollerInterval) clearInterval(this._readyPollerInterval);
        
        let attempts = 0;
        this._readyPollerInterval = setInterval(async () => {
            attempts++;
            if (this.status === 'READY') {
                clearInterval(this._readyPollerInterval);
                return;
            }

            if (!this.client || !this.client.pupPage) return;

            try {
                const isLoaded = await this.client.pupPage.evaluate(() => {
                    const hasSide = !!document.querySelector('#side') || !!document.querySelector('header');
                    const hasIntro = !!document.querySelector('[data-testid="intro-title"]') || !!document.querySelector('div[role="navigation"]');
                    return hasSide || hasIntro;
                }).catch(() => false);

                if (isLoaded) {
                    console.log('[WhatsAppService] Interface do WhatsApp Web ativa no DOM (#side/header detectados). Ativando READY!');
                    this.status = 'READY';
                    this.readyTimestamp = new Date().toISOString();
                    clearInterval(this._readyPollerInterval);

                    const profile = await this.client.pupPage.evaluate(() => {
                        const h = document.querySelector('header');
                        const img = document.querySelector('header img');
                        return {
                            name: (h && h.getAttribute('aria-label')) || null,
                            avatar: img ? img.src : null
                        };
                    }).catch(() => null);

                    this.authInfo = {
                        pushname: (this.client.info && this.client.info.pushname) || (profile && profile.name) || 'Alexandre Diamante',
                        wid: (this.client.info && this.client.info.wid && this.client.info.wid._serialized) || null,
                        platform: 'WhatsApp Web'
                    };
                }
            } catch (e) {
                // Silencioso enquanto carrega
            }

            if (attempts > 60) {
                clearInterval(this._readyPollerInterval);
            }
        }, 1500);
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
        if (!this.client || (this.status !== 'READY' && this.status !== 'AUTHENTICATED')) {
            throw new Error('O WhatsApp Web não está conectado. Conecte primeiro escaneando o QR Code.');
        }

        // Se está AUTHENTICATED, aguarda até 10s para estabilizar
        if (this.status === 'AUTHENTICATED') {
            for (let i = 0; i < 10; i++) {
                if (this.status === 'READY') break;
                await new Promise(r => setTimeout(r, 1000));
            }
        }

        const normalized = PhoneSanitizer.normalize(rawPhone);
        if (!normalized.isValid) {
            throw new Error(normalized.error || 'Número de telefone inválido.');
        }

        console.log(`[WhatsAppService] Analisando número: ${normalized.cleanPhone} (Variantes: ${normalized.variants.join(', ')})...`);

        // 1. Identifica a variante cadastrada no WhatsApp (com ou sem o 9º dígito no Brasil)
        let activeCleanNumber = normalized.cleanPhone;
        let activeContactId = normalized.whatsappId;
        let isRegistered = false;

        for (const variant of normalized.variants) {
            const variantId = `${variant}@c.us`;
            try {
                // Tenta getNumberId primeiro (mais preciso no WhatsApp, resolve ID real)
                let numberIdObj = null;
                if (typeof this.client.getNumberId === 'function') {
                    numberIdObj = await this.client.getNumberId(variant).catch(() => null);
                }

                if (numberIdObj && numberIdObj._serialized) {
                    activeContactId = numberIdObj._serialized;
                    // NUNCA use LID como número de telefone para navegação!
                    // O cleanNumber DEVE ser o número telefônico (55 + DDD + dígitos)
                    if (!numberIdObj._serialized.endsWith('@lid') && numberIdObj.user && numberIdObj.user.startsWith('55') && (numberIdObj.user.length === 12 || numberIdObj.user.length === 13)) {
                        activeCleanNumber = numberIdObj.user;
                    } else {
                        activeCleanNumber = variant;
                    }
                    isRegistered = true;
                    console.log(`[WhatsAppService] Número registrado via getNumberId: ${activeCleanNumber} (${activeContactId})`);
                    break;
                }

                // Fallback para isRegisteredUser
                const reg = await this.client.isRegisteredUser(variantId);
                if (reg) {
                    activeCleanNumber = variant;
                    activeContactId = variantId;
                    isRegistered = true;
                    console.log(`[WhatsAppService] Número registrado confirmado no WhatsApp: ${variant} (${variantId})`);
                    break;
                }
            } catch (e) {
                console.warn(`[WhatsAppService] Checagem para variante ${variantId}:`, e.message);
            }
        }

        let sidebarExtraction = null;
        let screenshotData = null;

        // 2. Navegação e extração profunda do DOM do WhatsApp Web
        if (captureScreenshot) {
            try {
                sidebarExtraction = await this.captureSidebarAndExtract(activeCleanNumber);
                if (sidebarExtraction && sidebarExtraction.isInvalidNumber && normalized.variants.length > 1) {
                    const otherVariant = normalized.variants.find(v => v !== activeCleanNumber);
                    if (otherVariant) {
                        console.log(`[WhatsAppService] Primeira variante inválida. Tentando variante alternativa: ${otherVariant}...`);
                        sidebarExtraction = await this.captureSidebarAndExtract(otherVariant);
                        if (!sidebarExtraction.isInvalidNumber) {
                            activeCleanNumber = otherVariant;
                            activeContactId = `${otherVariant}@c.us`;
                            isRegistered = true;
                        }
                    }
                } else if (sidebarExtraction && !sidebarExtraction.isInvalidNumber) {
                    isRegistered = true;
                }
            } catch (err) {
                console.error('[WhatsAppService] Erro na captura e extração do painel lateral:', err.message);
                screenshotData = {
                    success: false,
                    error: `Falha ao capturar painel lateral: ${err.message}`
                };
            }
        }

        if (!isRegistered && sidebarExtraction && sidebarExtraction.isInvalidNumber) {
            return {
                queryPhone: rawPhone,
                cleanPhone: activeCleanNumber,
                formattedPhone: PhoneSanitizer.formatFriendly(activeCleanNumber),
                isRegistered: false,
                message: 'O número informado não possui conta ativa no WhatsApp.',
                contactInfo: null,
                profilePicture: null,
                screenshot: null
            };
        }

        // Se o DOM identificou o número exato formatado na conversa (ex: 556584424000)
        const dom = (sidebarExtraction && sidebarExtraction.data) || {};
        if (dom.registeredNumber && dom.registeredNumber.length >= 10) {
            activeCleanNumber = dom.registeredNumber;
            activeContactId = `${dom.registeredNumber}@c.us`;
        }

        // 3. Extrai dados via Store do whatsapp-web.js (como base complementar)
        let contact = null;
        try {
            contact = await this.client.getContactById(activeContactId);
        } catch (e) {
            console.warn(`[WhatsAppService] Erro em getContactById para ${activeContactId}:`, e.message);
        }

        let aboutText = null;
        try {
            if (contact && typeof contact.getAbout === 'function') {
                aboutText = await contact.getAbout();
            }
        } catch (e) {
            aboutText = null;
        }

        let profilePicUrl = null;
        try {
            profilePicUrl = await this.client.getProfilePicUrl(activeContactId);
        } catch (e) {
            profilePicUrl = null;
        }

        // 4. Mescla com os dados ricos extraídos do DOM do painel lateral
        const finalName = dom.name || (contact && (contact.name || contact.pushname)) || null;
        const finalIsBusiness = dom.isBusiness !== undefined ? dom.isBusiness : ((contact && !!contact.isBusiness) || false);
        const finalAbout = dom.businessDescription || dom.about || aboutText || null;
        const finalProfilePic = dom.photoUrl || profilePicUrl || null;

        const contactInfo = {
            id: activeContactId,
            number: activeCleanNumber,
            formattedPhone: PhoneSanitizer.formatFriendly(activeCleanNumber),
            name: finalName,
            pushname: (contact && contact.pushname) || null,
            shortName: (contact && contact.shortName) || null,
            verifiedName: (contact && contact.verifiedName) || null,
            isBusiness: finalIsBusiness,
            isEnterprise: (contact && !!contact.isEnterprise) || false,
            isVerified: (contact && !!contact.isVerified) || false,
            isMyContact: (contact && !!contact.isMyContact) || false,
            isBlocked: (contact && !!contact.isBlocked) || false,
            about: finalAbout,
            accountType: finalIsBusiness ? 'WhatsApp Business' : 'WhatsApp Pessoal',
            category: dom.category || null,
            hours: dom.hours || null,
            website: dom.website || null,
            address: dom.address || null
        };

        const profilePicture = {
            hasPicture: !!finalProfilePic,
            url: finalProfilePic
        };

        if (sidebarExtraction && sidebarExtraction.screenshot) {
            screenshotData = sidebarExtraction.screenshot;
        }

        return {
            queryPhone: rawPhone,
            cleanPhone: activeCleanNumber,
            formattedPhone: PhoneSanitizer.formatFriendly(activeCleanNumber),
            isRegistered: true,
            contactInfo,
            profilePicture,
            screenshot: screenshotData
        };
    }

    /**
     * Navega até a conversa, aciona a abertura do painel lateral "Dados do contacto",
     * extrai todos os campos cadastrais e tira o screenshot recortado via clip.
     * @param {string} cleanNumber
     * @returns {Promise<Object>}
     */
    async captureSidebarAndExtract(cleanNumber) {
        const page = this.client.pupPage;
        if (!page) {
            throw new Error('Instância do navegador Puppeteer não encontrada.');
        }

        console.log(`[WhatsAppService] Navegando para conversa do número: ${cleanNumber}...`);

        // Abre a conversa diretamente
        await page.goto(`https://web.whatsapp.com/send?phone=${cleanNumber}`, {
            waitUntil: 'domcontentloaded',
            timeout: config.whatsapp.navigationTimeout
        });

        // Aguarda carregar o diálogo de erro ou o chat (#main/header)
        await page.waitForFunction(() => {
            const text = document.body.innerText || '';
            const isInvalidMsg = text.includes('compartilhado por url é inválido') || 
                               text.includes('shared via url is invalid') ||
                               text.includes('URL is invalid');
            const hasMain = !!document.querySelector('#main') || !!document.querySelector('header');
            return isInvalidMsg || hasMain;
        }, { timeout: 25000 }).catch(() => null);

        // 1. Verifica se apareceu popup de número inválido
        const isInvalid = await page.evaluate(() => {
            const text = document.body.innerText || '';
            const invalidMsg = text.includes('compartilhado por url é inválido') || 
                               text.includes('shared via url is invalid') ||
                               text.includes('URL is invalid');
            if (invalidMsg) {
                const okBtn = Array.from(document.querySelectorAll('button, div[role="button"]'))
                    .find(b => (b.textContent || '').trim() === 'OK');
                if (okBtn) okBtn.click();
                return true;
            }
            return false;
        });

        if (isInvalid) {
            console.log(`[WhatsAppService] WhatsApp Web indicou número inválido para: ${cleanNumber}`);
            return { isInvalidNumber: true, data: null, screenshot: null };
        }

        // 2. Aguarda carregar a conversa principal (#main) ou qualquer header
        await page.waitForSelector('#main header, header', {
            timeout: config.whatsapp.drawerTimeout
        });

        // 3. Verifica se o painel lateral já está aberto antes de clicar
        let isDrawerOpen = await page.evaluate(() => {
            const text = document.body.innerText || '';
            return text.includes('Dados do contato') || text.includes('Dados do contacto') || text.includes('Contact info');
        });

        if (!isDrawerOpen) {
            console.log('[WhatsAppService] Abrindo painel lateral de dados do contato...');
            const clickInfo = await page.evaluate(() => {
                const mainHeader = document.querySelector('#main header');
                if (!mainHeader) return null;

                // Localiza o elemento de avatar ou texto do contato no header
                const targetEl = mainHeader.querySelector('img') || 
                                 mainHeader.querySelector('span[dir="auto"]') || 
                                 mainHeader.querySelector('[data-testid="conversation-info-header"]') ||
                                 mainHeader.firstElementChild;

                if (targetEl) {
                    try { targetEl.click(); } catch(e){}
                    const parent = targetEl.closest('div[role="button"]') || targetEl.parentElement;
                    if (parent && parent !== targetEl) {
                        try { parent.click(); } catch(e){}
                    }

                    const r = targetEl.getBoundingClientRect();
                    return {
                        found: true,
                        x: Math.round(r.x + (r.width / 2)),
                        y: Math.round(r.y + (r.height / 2))
                    };
                }

                const r = mainHeader.getBoundingClientRect();
                return {
                    found: false,
                    x: Math.round(r.x + 80),
                    y: Math.round(r.y + (r.height / 2))
                };
            });

            if (clickInfo && clickInfo.x > 0 && clickInfo.y > 0) {
                console.log(`[WhatsAppService] Disparando clique nativo do mouse no cabeçalho em: x=${clickInfo.x}, y=${clickInfo.y}...`);
                await page.mouse.click(clickInfo.x, clickInfo.y);
            }

            // Aguarda abertura do drawer
            isDrawerOpen = await page.waitForFunction(() => {
                const text = document.body.innerText || '';
                const hasTitle = text.includes('Dados do contato') || text.includes('Dados do contacto') || text.includes('Contact info');
                const hasRightPanel = Array.from(document.querySelectorAll('div, aside, section')).some(el => {
                    const r = el.getBoundingClientRect();
                    return r.x > 600 && r.width >= 300 && r.height > 500;
                });
                return hasTitle || hasRightPanel;
            }, { timeout: 6000 }).then(() => true).catch(() => false);

            if (!isDrawerOpen) {
                // Tenta segundo clique ligeiramente à direita no nome do contato
                console.log('[WhatsAppService] Tentando segundo clique no título do contato...');
                const nameCoord = await page.evaluate(() => {
                    const nameSpan = document.querySelector('#main header span[dir="auto"]');
                    if (nameSpan) {
                        try { nameSpan.click(); } catch(e){}
                        const r = nameSpan.getBoundingClientRect();
                        return { x: Math.round(r.x + (r.width / 2)), y: Math.round(r.y + (r.height / 2)) };
                    }
                    return null;
                });

                if (nameCoord) {
                    await page.mouse.click(nameCoord.x, nameCoord.y);
                    await page.waitForFunction(() => {
                        const text = document.body.innerText || '';
                        return text.includes('Dados do contato') || text.includes('Dados do contacto') || text.includes('Contact info');
                    }, { timeout: 8000 }).catch(() => null);
                }
            }
        }

        // Aguarda animação e carregamento de imagens e textos
        await new Promise((resolve) => setTimeout(resolve, config.whatsapp.renderWaitMs));

        // 5. Extração profunda de todos os dados do painel lateral no DOM
        const extraction = await page.evaluate(() => {
            const headings = Array.from(document.querySelectorAll('span, h1, h2, div, header'));
            const titleEl = headings.find(el => {
                const t = (el.textContent || '').trim();
                return t === 'Dados do contato' || t === 'Dados do contacto' || t === 'Contact info';
            });

            // Encontra o container do drawer lateral (coluna direita)
            let drawer = null;
            if (titleEl) {
                let curr = titleEl;
                while (curr && curr.parentElement && curr.parentElement !== document.body) {
                    const rect = curr.getBoundingClientRect();
                    if (rect.width >= 300 && rect.height >= 400 && rect.x > 200) {
                        drawer = curr;
                        break;
                    }
                    curr = curr.parentElement;
                }
            }

            if (!drawer) {
                drawer = document.querySelector('div[data-testid="drawer-right"]') ||
                         document.querySelector('div[data-testid="contact-info-drawer"]') ||
                         document.querySelector('aside') ||
                         document.querySelector('section');
            }

            // Procura qualquer container à direita (x > 500, width >= 300)
            if (!drawer) {
                const rightPanels = Array.from(document.querySelectorAll('div, section, aside'))
                    .filter(el => {
                        const r = el.getBoundingClientRect();
                        return r.x > 500 && r.width >= 300 && r.width <= 650 && r.height > 500;
                    });
                if (rightPanels.length > 0) {
                    drawer = rightPanels.sort((a, b) => b.getBoundingClientRect().x - a.getBoundingClientRect().x)[0];
                }
            }

            let drawerRect = null;
            if (drawer) {
                const r = drawer.getBoundingClientRect();
                if (r.width >= 250 && r.height >= 300) {
                    drawerRect = {
                        x: Math.round(r.x),
                        y: Math.round(r.y),
                        width: Math.round(r.width),
                        height: Math.round(r.height)
                    };
                }
            }

            if (!drawerRect) {
                drawerRect = {
                    x: Math.max(0, window.innerWidth - 460),
                    y: 0,
                    width: 460,
                    height: window.innerHeight
                };
            }

            const allText = (drawer ? drawer.innerText : document.body.innerText) || '';

            // Foto de perfil em alta resolução
            let photoUrl = null;
            if (drawer) {
                const validImgs = Array.from(drawer.querySelectorAll('img'))
                    .filter(i => i.src && !i.src.startsWith('data:image/gif') && (i.width > 30 || i.src.includes('blob:') || i.src.includes('http')));
                if (validImgs.length > 0) {
                    photoUrl = validImgs[0].src;
                }
            }

            // Conta comercial
            const isBusiness = allText.includes('Conta comercial') || 
                               allText.includes('Business account') ||
                               allText.includes('Comercial');

            // Número registrado no WhatsApp exibido no drawer ou header
            let registeredNumber = null;
            const phoneMatches = allText.match(/\+55\s*\(?\d{2}\)?\s*\d{4,5}[-\s]?\d{4}/g);
            if (phoneMatches && phoneMatches.length > 0) {
                registeredNumber = phoneMatches[0].replace(/\D/g, '');
            }

            // Nome do contato (ex: "Patricia ❤️")
            let name = null;
            if (drawer) {
                const textNodes = Array.from(drawer.querySelectorAll('h2, span[dir="auto"], span[title]'))
                    .map(el => (el.textContent || '').trim())
                    .filter(t => t && 
                        t !== 'Dados do contato' && 
                        t !== 'Dados do contacto' && 
                        t !== 'Contact info' && 
                        t !== 'Conta comercial' && 
                        t !== 'Business account' &&
                        t !== 'Compras e varejo' &&
                        t !== 'Fechar' &&
                        t !== 'Compartilhar' &&
                        t !== 'Adicionar' &&
                        !t.startsWith('+55') &&
                        !t.startsWith('Aberta') &&
                        !t.startsWith('Aberto') &&
                        !t.includes('Mídia') &&
                        !t.includes('Mensagens') &&
                        !t.includes('Silenciar') &&
                        !t.includes('Bloquear') &&
                        !t.includes('Denunciar') &&
                        t.length > 0
                    );

                if (textNodes.length > 0) {
                    name = textNodes[0];
                }
            }

            // Se não encontrou no drawer, tenta pelo header da conversa
            if (!name) {
                const headerTitle = document.querySelector('#main header span[dir="auto"], #main header span[title]');
                if (headerTitle) {
                    const ht = (headerTitle.textContent || '').trim();
                    if (ht && !ht.startsWith('+55')) {
                        name = ht;
                    }
                }
            }

            // Categoria de negócio (ex: "Compras e varejo", etc.)
            let category = null;
            const categoryCandidates = [
                'Compras e varejo', 'Serviço', 'Consultoria', 'Restaurante', 'Alimentos', 
                'Saúde', 'Educação', 'Automotivo', 'Hotelaria', 'Beleza', 'Arte e entretenimento',
                'Finanças', 'Imóveis', 'Tecnologia', 'Vestuário', 'Organização sem fins lucrativos'
            ];
            for (const cat of categoryCandidates) {
                if (allText.includes(cat)) {
                    category = cat;
                    break;
                }
            }

            // Horário de funcionamento
            let hours = null;
            if (allText.includes('Aberta 24 horas') || allText.includes('Aberto 24 horas')) {
                hours = 'Aberta 24 horas';
            } else if (allText.includes('Aberta agora') || allText.includes('Aberto agora')) {
                hours = 'Aberta agora';
            }

            // Descrição da Conta Comercial
            let businessDescription = null;
            if (allText.includes('Conta comercial')) {
                const afterBusiness = allText.split('Conta comercial')[1];
                if (afterBusiness) {
                    const lines = afterBusiness.split('\n')
                        .map(l => l.trim())
                        .filter(l => l && 
                            !l.includes('Mídia') && 
                            !l.includes('Mensagens') && 
                            !l.includes('Silenciar') &&
                            !l.includes('Bloquear') &&
                            !l.includes('Denunciar')
                        );
                    if (lines.length > 0) {
                        businessDescription = lines.slice(0, 3).join(' ');
                    }
                }
            }

            // Website
            let website = null;
            if (drawer) {
                const link = drawer.querySelector('a[href^="http"]');
                if (link) {
                    website = link.href;
                } else {
                    const match = allText.match(/https?:\/\/[^\s]+/i);
                    if (match) website = match[0];
                }
            }

            // Endereço / Localidade
            let address = null;
            if (allText.includes('Atuação Nacional')) {
                address = 'Atuação Nacional';
            }

            return {
                drawerRect,
                photoUrl,
                isBusiness,
                name,
                category,
                hours,
                businessDescription,
                website,
                address
            };
        });

        console.log(`[WhatsAppService] Dados extraídos do DOM: Nome="${extraction.name}", Business=${extraction.isBusiness}, Categoria="${extraction.category}"`);

        // 6. Captura de tela com recorte exato (clip)
        const fileName = `perfil_${cleanNumber}_${Date.now()}.png`;
        const filePath = path.join(config.paths.screenshotsDir, fileName);

        console.log(`[WhatsAppService] Capturando print recortado do drawer via clip:`, extraction.drawerRect);

        await page.screenshot({
            path: filePath,
            type: 'png',
            clip: extraction.drawerRect
        });

        console.log(`[WhatsAppService] Print exclusivo do painel salvo em: ${filePath}`);

        let base64Preview = null;
        try {
            const buffer = fs.readFileSync(filePath);
            base64Preview = `data:image/png;base64,${buffer.toString('base64')}`;
        } catch (e) {
            console.warn('[WhatsAppService] Erro ao gerar base64 da screenshot:', e.message);
        }

        const screenshotObj = {
            success: true,
            fileName,
            filePath,
            imageUrl: `/api/screenshots/${fileName}`,
            base64: base64Preview,
            capturedAt: new Date().toISOString()
        };

        return {
            isInvalidNumber: false,
            data: extraction,
            screenshot: screenshotObj
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
