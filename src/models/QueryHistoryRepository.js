/**
 * QueryHistoryRepository - Camada Model (Repository)
 * Gerencia a persistência e consulta do histórico de números analisados.
 */

const fs = require('fs');
const path = require('path');

class QueryHistoryRepository {
    constructor(storagePath) {
        this.storagePath = storagePath || path.join(__dirname, '../../data/history.json');
        this.history = [];
        this.ensureStorage();
        this.load();
    }

    ensureStorage() {
        const dir = path.dirname(this.storagePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        if (!fs.existsSync(this.storagePath)) {
            fs.writeFileSync(this.storagePath, JSON.stringify([], null, 2), 'utf-8');
        }
    }

    load() {
        try {
            const data = fs.readFileSync(this.storagePath, 'utf-8');
            this.history = JSON.parse(data) || [];
        } catch (err) {
            console.error('[QueryHistoryRepository] Erro ao carregar histórico:', err.message);
            this.history = [];
        }
    }

    save() {
        try {
            fs.writeFileSync(this.storagePath, JSON.stringify(this.history, null, 2), 'utf-8');
        } catch (err) {
            console.error('[QueryHistoryRepository] Erro ao salvar histórico:', err.message);
        }
    }

    /**
     * Adiciona uma consulta ao histórico.
     * @param {Object} entry
     * @returns {Object}
     */
    add(entry) {
        const record = {
            id: `query_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            timestamp: new Date().toISOString(),
            ...entry
        };

        // Mantém as consultas mais recentes primeiro
        this.history.unshift(record);

        // Limita a 100 itens no histórico para evitar crescimento descontrolado
        if (this.history.length > 100) {
            this.history = this.history.slice(0, 100);
        }

        this.save();
        return record;
    }

    /**
     * Retorna a lista de consultas com paginação e filtro opcional.
     * @param {number} limit
     * @param {string} search
     * @returns {Array}
     */
    getAll(limit = 20, search = '') {
        let results = this.history;
        if (search) {
            const query = search.toLowerCase();
            results = results.filter(item => 
                (item.phone && item.phone.includes(query)) ||
                (item.name && item.name.toLowerCase().includes(query))
            );
        }
        return results.slice(0, limit);
    }

    /**
     * Busca um item específico por ID.
     * @param {string} id
     * @returns {Object|null}
     */
    getById(id) {
        return this.history.find(item => item.id === id) || null;
    }

    /**
     * Limpa o histórico de consultas.
     */
    clear() {
        this.history = [];
        this.save();
    }
}

module.exports = QueryHistoryRepository;
