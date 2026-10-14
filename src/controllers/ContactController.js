/**
 * ContactController - Camada Controller
 * Orquestra as requisições de consulta de dados de contato, foto de perfil,
 * captura de print do painel lateral e histórico de consultas.
 */

const path = require('path');
const fs = require('fs');
const whatsAppService = require('../models/WhatsAppService');
const QueryHistoryRepository = require('../models/QueryHistoryRepository');
const config = require('../config/config');

const historyRepo = new QueryHistoryRepository();

class ContactController {
    /**
     * Consulta os dados do contato no WhatsApp:
     * - Get contact info
     * - Get profile pictures
     * - Captura recortada do painel lateral direito ("Dados do contacto")
     * 
     * Suporta GET /api/contact/:phone, GET /api/contact?phone=... e POST /api/contact
     */
    static async getContactInfo(req, res) {
        try {
            const rawPhone = req.params.phone || req.query.phone || (req.body && req.body.phone);
            const captureScreenshot = req.query.screenshot !== 'false' && req.query.screenshot !== '0';

            if (!rawPhone) {
                return res.status(400).json({
                    success: false,
                    error: 'Parâmetro número de telefone obrigatório. Envie na URL (/api/contact/:phone), como query (?phone=...) ou no body JSON.'
                });
            }

            console.log(`[ContactController] Recebida consulta para o número: ${rawPhone}`);

            const result = await whatsAppService.getContactDetails(rawPhone, captureScreenshot);

            // Grava no repositório de histórico para visualização no dashboard
            try {
                historyRepo.add({
                    phone: result.cleanPhone || rawPhone,
                    formattedPhone: result.formattedPhone,
                    name: result.contactInfo ? (result.contactInfo.name || result.contactInfo.pushname || 'Sem nome') : null,
                    isRegistered: result.isRegistered,
                    accountType: result.contactInfo ? result.contactInfo.accountType : null,
                    profilePicUrl: result.profilePicture ? result.profilePicture.url : null,
                    screenshotUrl: result.screenshot ? result.screenshot.imageUrl : null
                });
            } catch (histErr) {
                console.warn('[ContactController] Aviso ao gravar histórico:', histErr.message);
            }

            return res.status(200).json({
                success: true,
                data: result
            });
        } catch (error) {
            console.error('[ContactController] Erro ao consultar contato:', error);
            const isNotConnected = error.message.includes('não está conectado');
            return res.status(isNotConnected ? 503 : 500).json({
                success: false,
                error: error.message || 'Erro ao processar a consulta do contato.'
            });
        }
    }

    /**
     * Retorna exclusivamente a foto de perfil do contato.
     * GET /api/contact/:phone/picture
     */
    static async getProfilePicture(req, res) {
        try {
            const rawPhone = req.params.phone || req.query.phone;
            if (!rawPhone) {
                return res.status(400).json({
                    success: false,
                    error: 'Número de telefone é obrigatório.'
                });
            }

            const result = await whatsAppService.getContactDetails(rawPhone, false);

            if (!result.isRegistered) {
                return res.status(404).json({
                    success: false,
                    error: 'Número não está cadastrado no WhatsApp.'
                });
            }

            const pictureUrl = result.profilePicture && result.profilePicture.url;

            // Se o cliente solicitar redirecionamento direto para a imagem (?redirect=true)
            if (req.query.redirect === 'true') {
                if (!pictureUrl) {
                    return res.status(404).send('Foto de perfil não disponível ou privada.');
                }
                return res.redirect(pictureUrl);
            }

            return res.status(200).json({
                success: true,
                phone: result.cleanPhone,
                hasPicture: !!pictureUrl,
                url: pictureUrl || null
            });
        } catch (error) {
            console.error('[ContactController] Erro ao buscar foto de perfil:', error);
            return res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Serve a imagem de screenshot capturada.
     * GET /api/screenshots/:fileName
     */
    static async serveScreenshot(req, res) {
        try {
            const { fileName } = req.params;
            // Previne Directory Traversal
            const sanitizedFileName = path.basename(fileName);
            const filePath = path.join(config.paths.screenshotsDir, sanitizedFileName);

            if (!fs.existsSync(filePath)) {
                return res.status(404).json({
                    success: false,
                    error: 'Arquivo de screenshot não encontrado.'
                });
            }

            res.setHeader('Content-Type', 'image/png');
            res.setHeader('Cache-Control', 'public, max-age=86400');
            return res.sendFile(filePath);
        } catch (error) {
            console.error('[ContactController] Erro ao servir screenshot:', error);
            return res.status(500).json({
                success: false,
                error: 'Erro interno ao servir arquivo.'
            });
        }
    }

    /**
     * Retorna a lista de consultas recentes do histórico.
     * GET /api/history
     */
    static async getHistory(req, res) {
        try {
            const limit = parseInt(req.query.limit, 10) || 30;
            const search = req.query.search || '';
            const history = historyRepo.getAll(limit, search);
            return res.status(200).json({
                success: true,
                total: history.length,
                data: history
            });
        } catch (error) {
            console.error('[ContactController] Erro ao buscar histórico:', error);
            return res.status(500).json({
                success: false,
                error: 'Erro ao consultar histórico.'
            });
        }
    }

    /**
     * Limpa o histórico de consultas.
     * DELETE /api/history
     */
    static async clearHistory(req, res) {
        try {
            historyRepo.clear();
            return res.status(200).json({
                success: true,
                message: 'Histórico de consultas limpo com sucesso.'
            });
        } catch (error) {
            console.error('[ContactController] Erro ao limpar histórico:', error);
            return res.status(500).json({
                success: false,
                error: 'Erro ao limpar histórico.'
            });
        }
    }
}

module.exports = ContactController;
