/**
 * Definição das Rotas da API REST
 * Disponibiliza endpoints para consumo interno e por sistemas externos.
 */

const express = require('express');
const router = express.Router();
const WhatsAppController = require('../controllers/WhatsAppController');
const ContactController = require('../controllers/ContactController');

const path = require('path');

// --- Rota de Especificação OpenAPI para Plataformas de IA ---
router.get('/openapi.json', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../../openapi.json'));
});

// --- Rotas de Sessão e Conexão ---
router.get('/status', WhatsAppController.getStatus);
router.get('/qr', WhatsAppController.getQrCode);
router.post('/initialize', WhatsAppController.initialize);
router.post('/logout', WhatsAppController.logout);

// --- Rotas de Gerenciamento de Status do Usuário Conectado (Set user status message) ---
// Suporta tanto GET com query parameter (?message=...) quanto POST com JSON no corpo
router.get('/user/status', WhatsAppController.setUserStatus);
router.post('/user/status', WhatsAppController.setUserStatus);

// --- Rotas de Consulta de Contato (Get contact info, profile pictures & screenshots) ---
// Suporta consumo via GET com path parameter, query parameter ou POST com payload
router.get('/contact/:phone/picture', ContactController.getProfilePicture);
router.get('/contact/:phone', ContactController.getContactInfo);
router.get('/contact', ContactController.getContactInfo);
router.post('/contact', ContactController.getContactInfo);

// --- Rota de Servir Screenshots ---
router.get('/screenshots/:fileName', ContactController.serveScreenshot);

// --- Rotas de Histórico de Consultas ---
router.get('/history', ContactController.getHistory);
router.delete('/history', ContactController.clearHistory);

module.exports = router;
