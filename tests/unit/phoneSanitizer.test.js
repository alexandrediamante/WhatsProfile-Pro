/**
 * Testes Unitários: PhoneSanitizer
 */

const PhoneSanitizer = require('../../src/models/PhoneSanitizer');

describe('PhoneSanitizer Model', () => {
    describe('clean()', () => {
        test('deve remover todos os caracteres não numéricos', () => {
            expect(PhoneSanitizer.clean('+55 (11) 98765-4321')).toBe('5511987654321');
            expect(PhoneSanitizer.clean('  55-66-9999-8888 ')).toBe('556699998888');
            expect(PhoneSanitizer.clean('')).toBe('');
            expect(PhoneSanitizer.clean(null)).toBe('');
            expect(PhoneSanitizer.clean(undefined)).toBe('');
        });
    });

    describe('normalize()', () => {
        test('deve adicionar DDI 55 para números de celular brasileiros de 11 dígitos sem DDI', () => {
            const res = PhoneSanitizer.normalize('11987654321');
            expect(res.isValid).toBe(true);
            expect(res.cleanPhone).toBe('5511987654321');
            expect(res.whatsappId).toBe('5511987654321@c.us');
            expect(res.formattedPhone).toBe('+55 (11) 98765-4321');
        });

        test('deve adicionar DDI 55 para números fixos brasileiros de 10 dígitos sem DDI', () => {
            const res = PhoneSanitizer.normalize('1133334444');
            expect(res.isValid).toBe(true);
            expect(res.cleanPhone).toBe('551133334444');
            expect(res.whatsappId).toBe('551133334444@c.us');
            expect(res.formattedPhone).toBe('+55 (11) 3333-4444');
        });

        test('deve manter o DDI quando já fornecido com 55', () => {
            const res = PhoneSanitizer.normalize('5566999999999');
            expect(res.isValid).toBe(true);
            expect(res.cleanPhone).toBe('5566999999999');
            expect(res.whatsappId).toBe('5566999999999@c.us');
            expect(res.formattedPhone).toBe('+55 (66) 99999-9999');
        });

        test('deve suportar números internacionais', () => {
            const res = PhoneSanitizer.normalize('+1 (415) 555-2671');
            expect(res.isValid).toBe(true);
            expect(res.cleanPhone).toBe('14155552671');
            expect(res.whatsappId).toBe('14155552671@c.us');
            expect(res.formattedPhone).toBe('+14155552671');
        });

        test('deve invalidar entradas com menos de 8 dígitos', () => {
            const res = PhoneSanitizer.normalize('12345');
            expect(res.isValid).toBe(false);
            expect(res.error).toBeDefined();
        });

        test('deve invalidar entradas nulas ou vazias', () => {
            const res = PhoneSanitizer.normalize('');
            expect(res.isValid).toBe(false);
            expect(res.cleanPhone).toBe('');
        });
    });

    describe('formatFriendly()', () => {
        test('deve formatar corretamente números celulares com DDI 55', () => {
            expect(PhoneSanitizer.formatFriendly('5511999998888')).toBe('+55 (11) 99999-8888');
        });

        test('deve formatar corretamente números fixos com DDI 55', () => {
            expect(PhoneSanitizer.formatFriendly('551133332222')).toBe('+55 (11) 3333-2222');
        });

        test('deve retornar prefixo + para números genéricos', () => {
            expect(PhoneSanitizer.formatFriendly('14155552671')).toBe('+14155552671');
        });
    });
});
