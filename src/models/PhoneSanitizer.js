/**
 * PhoneSanitizer - Camada Model
 * Responsável pela validação, limpeza e normalização de números de telefone para a API do WhatsApp.
 */

class PhoneSanitizer {
    /**
     * Remove todos os caracteres não numéricos.
     * @param {string|number} phone
     * @returns {string}
     */
    static clean(phone) {
        if (!phone) return '';
        return String(phone).replace(/\D/g, '');
    }

    /**
     * Valida e normaliza o número para o formato aceito pelo WhatsApp.
     * Adiciona o DDI 55 (Brasil) caso seja omitido em números brasileiros válidos (10 ou 11 dígitos).
     * @param {string|number} rawPhone
     * @returns {{ isValid: boolean, cleanPhone: string, whatsappId: string, formattedPhone: string, error?: string }}
     */
    static normalize(rawPhone) {
        const cleaned = this.clean(rawPhone);

        if (!cleaned || cleaned.length < 8) {
            return {
                isValid: false,
                cleanPhone: '',
                whatsappId: '',
                formattedPhone: '',
                error: 'Número de telefone inválido ou muito curto.'
            };
        }

        let phoneWithCountry = cleaned;
        const hasPlusPrefix = String(rawPhone || '').trim().startsWith('+');

        // Se o usuário não enviou '+' e não começa com '55':
        // Identifica números brasileiros típicos:
        // - Celular: 11 dígitos, terceiro dígito é 9 (ex: 11987654321)
        // - Fixo: 10 dígitos, terceiro dígito é 2, 3, 4 ou 5 (ex: 1133334444)
        if (!hasPlusPrefix && !cleaned.startsWith('55')) {
            if (cleaned.length === 11 && cleaned[2] === '9') {
                phoneWithCountry = `55${cleaned}`;
            } else if (cleaned.length === 10 && ['2', '3', '4', '5'].includes(cleaned[2])) {
                phoneWithCountry = `55${cleaned}`;
            }
        }

        // WhatsApp ID padrão (@c.us para contatos individuais)
        const whatsappId = `${phoneWithCountry}@c.us`;

        // Formatação amigável para exibição
        const formattedPhone = this.formatFriendly(phoneWithCountry);

        return {
            isValid: true,
            cleanPhone: phoneWithCountry,
            whatsappId,
            formattedPhone
        };
    }

    /**
     * Formata o número para exibição amigável.
     * @param {string} digits
     * @returns {string}
     */
    static formatFriendly(digits) {
        if (!digits) return '';

        // Formato Brasil com DDI 55: +55 (DD) 9XXXX-XXXX
        if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) {
            const ddd = digits.substring(2, 4);
            const rest = digits.substring(4);
            if (rest.length === 9) {
                return `+55 (${ddd}) ${rest.substring(0, 5)}-${rest.substring(5)}`;
            } else if (rest.length === 8) {
                return `+55 (${ddd}) ${rest.substring(0, 4)}-${rest.substring(4)}`;
            }
        }

        // Formato internacional genérico
        return `+${digits}`;
    }
}

module.exports = PhoneSanitizer;
