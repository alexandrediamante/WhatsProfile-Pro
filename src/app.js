/**
 * Aplicação Express Principal
 * Configuração de middlewares, CORS, rotas de API e arquivos estáticos da View.
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('./config/config');
const apiRoutes = require('./routes/api');

const app = express();

// Habilita CORS para permitir que sistemas externos em qualquer domínio consumam os endpoints
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve arquivos estáticos da interface web (View)
app.use(express.static(config.paths.viewsDir));

// Serve screenshots diretamente
app.use('/screenshots', express.static(config.paths.screenshotsDir));

// Rotas da API REST
app.use('/api', apiRoutes);

// Fallback para a SPA / página principal da View
app.get('/', (req, res) => {
    res.sendFile(path.join(config.paths.viewsDir, 'index.html'));
});

// Middleware de tratamento para rotas de API não encontradas
app.use('/api', (req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint da API não encontrado.'
    });
});

// Middleware global de tratamento de erros
app.use((err, req, res, next) => {
    console.error('[App Error Handler]', err);
    res.status(err.status || 500).json({
        success: false,
        error: err.message || 'Erro interno no servidor.'
    });
});

module.exports = app;
