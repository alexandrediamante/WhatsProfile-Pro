/**
 * Testes de Integração / Endpoints da API REST (Supertest)
 */

const request = require('supertest');
const app = require('../../src/app');

describe('API REST Endpoints', () => {
    describe('GET /api/status', () => {
        test('deve responder status 200 e a estrutura de status da conexão', async () => {
            const res = await request(app).get('/api/status');
            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toBeDefined();
            expect(res.body.data.status).toBeDefined();
            expect(typeof res.body.data.isConnected).toBe('boolean');
        });
    });

    describe('GET /api/qr', () => {
        test('deve responder 200 com a estrutura do QR Code', async () => {
            const res = await request(app).get('/api/qr');
            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toBeDefined();
            expect('qrCodeDataUrl' in res.body.data).toBe(true);
        });
    });

    describe('GET /api/contact (Validação de Parâmetros)', () => {
        test('deve retornar status 400 se nenhum telefone for fornecido', async () => {
            const res = await request(app).get('/api/contact');
            expect(res.statusCode).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.error).toContain('obrigatório');
        });
    });

    describe('POST /api/user/status (Validação de Parâmetros)', () => {
        test('deve retornar status 400 se o corpo não contiver mensagem de status', async () => {
            const res = await request(app)
                .post('/api/user/status')
                .send({});
            expect(res.statusCode).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.error).toBeDefined();
        });

        test('deve retornar status 400 se a mensagem de status for vazia', async () => {
            const res = await request(app)
                .post('/api/user/status')
                .send({ statusMessage: '   ' });
            expect(res.statusCode).toBe(400);
            expect(res.body.success).toBe(false);
        });
    });

    describe('GET /api/user/status (Suporte a GET para sistemas externos)', () => {
        test('deve retornar status 400 se chamado sem parâmetro message', async () => {
            const res = await request(app).get('/api/user/status');
            expect(res.statusCode).toBe(400);
            expect(res.body.success).toBe(false);
        });
    });

    describe('GET /api/history', () => {
        test('deve retornar status 200 e um array de histórico', async () => {
            const res = await request(app).get('/api/history');
            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(Array.isArray(res.body.data)).toBe(true);
        });
    });

    describe('GET /api/screenshots/:fileName (Tratamento de Arquivos)', () => {
        test('deve retornar 404 para screenshot inexistente', async () => {
            const res = await request(app).get('/api/screenshots/arquivo_inexistente_123.png');
            expect(res.statusCode).toBe(404);
            expect(res.body.success).toBe(false);
        });
    });

    describe('GET / (Interface Web HTML)', () => {
        test('deve servir o arquivo index.html da View com status 200', async () => {
            const res = await request(app).get('/');
            expect(res.statusCode).toBe(200);
            expect(res.headers['content-type']).toContain('text/html');
            expect(res.text).toContain('WhatsProfile');
        });
    });

    describe('GET /api/rota-inexistente', () => {
        test('deve retornar 404 em JSON com mensagem de erro padronizada', async () => {
            const res = await request(app).get('/api/rota-inexistente');
            expect(res.statusCode).toBe(404);
            expect(res.body.success).toBe(false);
            expect(res.body.error).toContain('não encontrado');
        });
    });
});
