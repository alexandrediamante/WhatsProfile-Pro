/**
 * Testes Unitários: QueryHistoryRepository
 */

const fs = require('fs');
const path = require('path');
const QueryHistoryRepository = require('../../src/models/QueryHistoryRepository');

describe('QueryHistoryRepository Model', () => {
    const testStoragePath = path.join(__dirname, 'test_history.json');
    let repo;

    beforeEach(() => {
        if (fs.existsSync(testStoragePath)) {
            fs.unlinkSync(testStoragePath);
        }
        repo = new QueryHistoryRepository(testStoragePath);
    });

    afterEach(() => {
        if (fs.existsSync(testStoragePath)) {
            fs.unlinkSync(testStoragePath);
        }
    });

    test('deve inicializar com histórico vazio', () => {
        expect(repo.getAll()).toEqual([]);
    });

    test('deve adicionar um novo registro com id e timestamp', () => {
        const entry = repo.add({
            phone: '5511999998888',
            name: 'Alexandre',
            accountType: 'WhatsApp Business'
        });

        expect(entry.id).toBeDefined();
        expect(entry.timestamp).toBeDefined();
        expect(entry.phone).toBe('5511999998888');

        const all = repo.getAll();
        expect(all.length).toBe(1);
        expect(all[0].name).toBe('Alexandre');
    });

    test('deve filtrar registros por termo de busca', () => {
        repo.add({ phone: '5511999991111', name: 'Maria Silva' });
        repo.add({ phone: '5566999992222', name: 'João Souza' });

        const searchResultPhone = repo.getAll(10, '5566');
        expect(searchResultPhone.length).toBe(1);
        expect(searchResultPhone[0].name).toBe('João Souza');

        const searchResultName = repo.getAll(10, 'maria');
        expect(searchResultName.length).toBe(1);
        expect(searchResultName[0].phone).toBe('5511999991111');
    });

    test('deve respeitar o limite de paginação', () => {
        for (let i = 0; i < 15; i++) {
            repo.add({ phone: `551199999000${i}`, name: `Contato ${i}` });
        }

        const limited = repo.getAll(5);
        expect(limited.length).toBe(5);
    });

    test('deve limpar todo o histórico quando clear() for chamado', () => {
        repo.add({ phone: '5511999998888', name: 'Teste' });
        expect(repo.getAll().length).toBe(1);

        repo.clear();
        expect(repo.getAll().length).toBe(0);
    });
});
