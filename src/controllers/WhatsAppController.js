/**
 * WhatsAppController - Camada Controller
 * Orquestra as requisições de estado de conexão, obtenção do QR Code,
 * reinicialização e atualização de recado do usuário (Set user status message).
 */

const whatsAppService = require('../models/WhatsAppService');

class WhatsAppController {
    /**
     * Retorna o status atual de conexão do WhatsApp Web.
     * GET /api/status
     */
    static async getStatus(req, res) {
        try {
            const status = whatsAppService.getStatus();
            return res.status(200).json({
                success: true,
                data: status
            });
        } catch (error) {
            console.error('[WhatsAppController] Erro ao obter status:', error);
            return res.status(500).json({
                success: false,
                error: 'Erro interno ao consultar status da conexão.'
            });
        }
    }

    /**
     * Retorna o QR Code para pareamento.
     * GET /api/qr
     */
    static async getQrCode(req, res) {
        try {
            const qrData = whatsAppService.getQrCode();

            // Permite retorno direto como imagem PNG se requisitado via query param ?format=image
            if (req.query.format === 'image' && qrData.qrCodeDataUrl) {
                const base64Data = qrData.qrCodeDataUrl.replace(/^data:image\/png;base64,/, '');
                const imgBuffer = Buffer.from(base64Data, 'base64');
                res.writeHead(200, {
                    'Content-Type': 'image/png',
                    'Content-Length': imgBuffer.length
                });
                return res.end(imgBuffer);
            }

            return res.status(200).json({
                success: true,
                data: qrData
            });
        } catch (error) {
            console.error('[WhatsAppController] Erro ao obter QR Code:', error);
            return res.status(500).json({
                success: false,
                error: 'Erro interno ao buscar QR Code.'
            });
        }
    }

    /**
     * Dispara a inicialização do WhatsApp Web caso esteja desconectado.
     * POST /api/initialize
     */
    static async initialize(req, res) {
        try {
            if (whatsAppService.status === 'READY') {
                return res.status(200).json({
                    success: true,
                    message: 'WhatsApp Web já está conectado e pronto.'
                });
            }

            // Inicia em background para não travar a resposta HTTP
            whatsAppService.initialize().catch((err) => {
                console.error('[WhatsAppController] Falha em background na inicialização:', err);
            });

            return res.status(202).json({
                success: true,
                message: 'Inicialização do WhatsApp Web disparada com sucesso.',
                currentStatus: whatsAppService.status
            });
        } catch (error) {
            console.error('[WhatsAppController] Erro ao disparar inicialização:', error);
            return res.status(500).json({
                success: false,
                error: 'Erro ao inicializar WhatsApp Web.'
            });
        }
    }

    /**
     * Atualiza o recado/status do perfil do usuário conectado no WhatsApp.
     * Suporta POST (body { status: '...' } ou { statusMessage: '...' })
     * e GET (/api/user/status?message=... ou ?status=...) para facilitar integrações externas.
     * POST /api/user/status & GET /api/user/status
     */
    static async setUserStatus(req, res) {
        try {
            const body = req.body || {};
            const query = req.query || {};
            const message = body.statusMessage || body.status || query.message || query.status;

            if (!message || !String(message).trim()) {
                return res.status(400).json({
                    success: false,
                    error: 'Parâmetro de mensagem de status ausente ou vazio. Envie "statusMessage" no body ou "message" na query.'
                });
            }

            const result = await whatsAppService.setUserStatusMessage(String(message).trim());

            return res.status(200).json({
                success: true,
                data: result
            });
        } catch (error) {
            console.error('[WhatsAppController] Erro ao definir status do usuário:', error);
            const statusCode = error.message.includes('não está conectado') ? 503 : 400;
            return res.status(statusCode).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Encerra e desconecta a sessão.
     * POST /api/logout
     */
    static async logout(req, res) {
        try {
            await whatsAppService.destroy();
            return res.status(200).json({
                success: true,
                message: 'Sessão encerrada com sucesso.'
            });
        } catch (error) {
            console.error('[WhatsAppController] Erro ao encerrar sessão:', error);
            return res.status(500).json({
                success: false,
                error: 'Erro ao desconectar sessão.'
            });
        }
    }
}

module.exports = WhatsAppController;
