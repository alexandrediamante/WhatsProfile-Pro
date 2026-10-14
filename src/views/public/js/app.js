/**
 * WhatsProfile Pro - Frontend Application Logic
 * Gerenciamento de status em tempo real, consulta de contatos, captura de prints,
 * atualização de status e consumo da API REST.
 */

document.addEventListener('DOMContentLoaded', () => {
    // Referências do DOM - Header & Status
    const statusPill = document.getElementById('statusPill');
    const statusText = document.getElementById('statusText');
    const statusDot = statusPill.querySelector('.status-dot');
    const btnRefreshStatus = document.getElementById('btnRefreshStatus');
    const btnLogout = document.getElementById('btnLogout');

    // Banner de QR Code
    const qrContainer = document.getElementById('qrContainer');
    const qrImageWrapper = document.getElementById('qrImageWrapper');

    // Abas de Navegação
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    // Formulário de Consulta de Perfil
    const formCheckProfile = document.getElementById('formCheckProfile');
    const inputPhone = document.getElementById('inputPhone');
    const toggleScreenshot = document.getElementById('toggleScreenshot');
    const btnSubmitSearch = document.getElementById('btnSubmitSearch');
    const loadingState = document.getElementById('loadingState');
    const loadingTitle = document.getElementById('loadingTitle');
    const loadingSubtitle = document.getElementById('loadingSubtitle');
    const errorAlert = document.getElementById('errorAlert');
    const errorMessage = document.getElementById('errorMessage');

    // Resultados
    const resultsContainer = document.getElementById('resultsContainer');
    const badgeAccountType = document.getElementById('badgeAccountType');
    const contactAvatar = document.getElementById('contactAvatar');
    const contactName = document.getElementById('contactName');
    const contactFormattedPhone = document.getElementById('contactFormattedPhone');
    const contactWid = document.getElementById('contactWid');
    const contactAbout = document.getElementById('contactAbout');
    const contactPushname = document.getElementById('contactPushname');
    const contactVerifiedName = document.getElementById('contactVerifiedName');
    const contactRegistrationStatus = document.getElementById('contactRegistrationStatus');
    const contactPicLink = document.getElementById('contactPicLink');

    // Campos de Conta Comercial
    const contactCategoryRow = document.getElementById('contactCategoryRow');
    const contactCategory = document.getElementById('contactCategory');
    const contactHoursRow = document.getElementById('contactHoursRow');
    const contactHours = document.getElementById('contactHours');
    const contactWebsiteRow = document.getElementById('contactWebsiteRow');
    const contactWebsite = document.getElementById('contactWebsite');
    const contactAddressRow = document.getElementById('contactAddressRow');
    const contactAddress = document.getElementById('contactAddress');

    const screenshotImage = document.getElementById('screenshotImage');
    const btnDownloadScreenshot = document.getElementById('btnDownloadScreenshot');
    const btnZoomScreenshot = document.getElementById('btnZoomScreenshot');
    const screenshotTimestamp = document.getElementById('screenshotTimestamp');

    const jsonViewer = document.getElementById('jsonViewer');
    const btnCopyJson = document.getElementById('btnCopyJson');

    // Formulário de Atualização de Recado (Set Status)
    const formSetStatus = document.getElementById('formSetStatus');
    const inputStatusMessage = document.getElementById('inputStatusMessage');
    const charCount = document.getElementById('charCount');
    const btnSubmitStatus = document.getElementById('btnSubmitStatus');
    const statusSuccessAlert = document.getElementById('statusSuccessAlert');
    const statusSuccessMessage = document.getElementById('statusSuccessMessage');

    // Histórico
    const historyTableBody = document.getElementById('historyTableBody');
    const btnClearHistory = document.getElementById('btnClearHistory');

    // Modal de Zoom
    const imageModal = document.getElementById('imageModal');
    const modalImage = document.getElementById('modalImage');
    const modalClose = document.getElementById('modalClose');
    const modalBackdrop = document.getElementById('modalBackdrop');

    // Estado da aplicação
    let isConnected = false;
    let pollInterval = null;
    let lastResultJson = null;

    // --- 1. GERENCIAMENTO DE ABAS ---
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTabId = button.getAttribute('data-tab');

            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));

            button.classList.add('active');
            const targetContent = document.getElementById(targetTabId);
            if (targetContent) {
                targetContent.classList.add('active');
            }

            if (targetTabId === 'tab-history') {
                loadHistory();
            }
        });
    });

    // Chips de números de exemplo
    document.querySelectorAll('.btn-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            inputPhone.value = chip.getAttribute('data-phone');
            inputPhone.focus();
        });
    });

    // --- 2. VERIFICAÇÃO DE STATUS & QR CODE ---
    async function checkStatus() {
        try {
            const response = await fetch('/api/status');
            const result = await response.json();

            if (result.success) {
                const data = result.data;
                isConnected = data.isConnected;

                updateStatusUI(data);

                if (!isConnected) {
                    await fetchQrCode();
                } else {
                    qrContainer.style.display = 'none';
                    btnLogout.style.display = 'inline-flex';
                }
            }
        } catch (err) {
            console.error('Erro ao consultar status:', err);
            statusText.textContent = 'Servidor Indisponível';
            statusDot.className = 'status-dot disconnected';
        }
    }

    function updateStatusUI(data) {
        statusDot.className = 'status-dot';

        switch (data.status) {
            case 'READY':
                statusText.textContent = data.authInfo ? `Conectado: ${data.authInfo.pushname}` : 'WhatsApp Conectado';
                statusDot.classList.add('connected');
                break;
            case 'AUTHENTICATED':
                statusText.textContent = 'Autenticado, sincronizando...';
                statusDot.classList.add('connecting');
                break;
            case 'QR_READY':
                statusText.textContent = 'Aguardando Leitura do QR Code';
                statusDot.classList.add('connecting', 'pulsing');
                break;
            case 'INITIALIZING':
                statusText.textContent = 'Iniciando WhatsApp Web...';
                statusDot.classList.add('connecting', 'pulsing');
                break;
            default:
                statusText.textContent = 'Desconectado';
                statusDot.classList.add('disconnected');
                btnLogout.style.display = 'none';
                break;
        }
    }

    async function fetchQrCode() {
        try {
            const response = await fetch('/api/qr');
            const result = await response.json();

            if (result.success && result.data && result.data.qrCodeDataUrl) {
                qrContainer.style.display = 'block';
                qrImageWrapper.innerHTML = `
                    <img src="${result.data.qrCodeDataUrl}" alt="QR Code WhatsApp Web">
                `;
            } else {
                qrContainer.style.display = 'block';
                qrImageWrapper.innerHTML = `
                    <div class="loader-orbit" style="width: 38px; height: 38px;"></div>
                    <p class="text-muted" style="margin-top: 1rem; font-size: 0.85rem;">Gerando QR Code...</p>
                `;
            }
        } catch (err) {
            console.error('Erro ao buscar QR Code:', err);
        }
    }

    btnRefreshStatus.addEventListener('click', checkStatus);

    btnLogout.addEventListener('click', async () => {
        if (!confirm('Deseja realmente desconectar o WhatsApp Web?')) return;
        try {
            await fetch('/api/logout', { method: 'POST' });
            checkStatus();
        } catch (e) {
            alert('Erro ao desconectar: ' + e.message);
        }
    });

    // Inicia polling de status a cada 4 segundos
    checkStatus();
    pollInterval = setInterval(checkStatus, 4000);

    // --- 3. FORMULÁRIO DE CONSULTA DE CONTATO ---
    formCheckProfile.addEventListener('submit', async (e) => {
        e.preventDefault();

        const phone = inputPhone.value.trim();
        const captureScreenshot = toggleScreenshot.checked;

        if (!phone) {
            showError('Por favor, informe um número de telefone válido.');
            return;
        }

        // Reseta estados
        hideError();
        resultsContainer.style.display = 'none';
        loadingState.style.display = 'flex';
        btnSubmitSearch.disabled = true;

        loadingTitle.textContent = 'Iniciando verificação no WhatsApp Web...';
        loadingSubtitle.textContent = 'Validando número e buscando dados cadastrais.';

        // Feedback de progresso progressivo
        const progressSteps = [
            { title: 'Conectando à conversa...', subtitle: 'Acessando https://web.whatsapp.com/send...' },
            { title: 'Abrindo painel lateral...', subtitle: 'Clicando no cabeçalho para isolar os Dados do Contacto.' },
            { title: 'Capturando print em alta resolução...', subtitle: 'Isolando o elemento exato do painel lateral.' }
        ];

        let stepIndex = 0;
        const progressTimer = setInterval(() => {
            if (stepIndex < progressSteps.length) {
                loadingTitle.textContent = progressSteps[stepIndex].title;
                loadingSubtitle.textContent = progressSteps[stepIndex].subtitle;
                stepIndex++;
            }
        }, 3000);

        try {
            const url = `/api/contact/${encodeURIComponent(phone)}?screenshot=${captureScreenshot}`;
            const response = await fetch(url, { method: 'GET' });
            const result = await response.json();

            clearInterval(progressTimer);
            loadingState.style.display = 'none';
            btnSubmitSearch.disabled = false;

            if (!response.ok || !result.success) {
                showError(result.error || 'Erro ao realizar consulta.');
                return;
            }

            renderResults(result.data);
            loadHistory(); // Atualiza a tabela de histórico

        } catch (err) {
            clearInterval(progressTimer);
            loadingState.style.display = 'none';
            btnSubmitSearch.disabled = false;
            showError('Falha de conexão com a API: ' + err.message);
        }
    });

    function renderResults(data) {
        lastResultJson = data;
        resultsContainer.style.display = 'flex';

        // Rolagem suave até os resultados
        resultsContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });

        if (!data.isRegistered) {
            showError(`O número informado (${data.cleanPhone}) NÃO possui conta no WhatsApp.`);
            resultsContainer.style.display = 'none';
            return;
        }

        const info = data.contactInfo || {};
        const pic = data.profilePicture || {};
        const print = data.screenshot || {};

        // 1. Dados do contato
        contactName.textContent = info.shortName || info.name || info.pushname || 'Sem nome registrado';
        contactFormattedPhone.textContent = data.formattedPhone || data.cleanPhone;
        contactWid.textContent = info.id || '-';
        contactPushname.textContent = info.pushname || '-';
        contactVerifiedName.textContent = info.verifiedName || 'Não verificado';
        contactAbout.textContent = info.about ? `"${info.about}"` : 'Nenhum recado disponível ou privado';

        // Badge Tipo de Conta
        if (info.isBusiness) {
            badgeAccountType.textContent = 'WhatsApp Business 💼';
            badgeAccountType.className = 'badge badge-primary';
        } else {
            badgeAccountType.textContent = 'WhatsApp Pessoal 👤';
            badgeAccountType.className = 'badge badge-secondary';
        }

        // Informações adicionais de Conta Comercial
        if (info.category) {
            contactCategory.textContent = info.category;
            contactCategoryRow.style.display = 'flex';
        } else {
            contactCategoryRow.style.display = 'none';
        }

        if (info.hours) {
            contactHours.textContent = info.hours;
            contactHoursRow.style.display = 'flex';
        } else {
            contactHoursRow.style.display = 'none';
        }

        if (info.website) {
            contactWebsite.textContent = info.website;
            contactWebsite.href = info.website.startsWith('http') ? info.website : `https://${info.website}`;
            contactWebsiteRow.style.display = 'flex';
        } else {
            contactWebsiteRow.style.display = 'none';
        }

        if (info.address) {
            contactAddress.textContent = info.address;
            contactAddressRow.style.display = 'flex';
        } else {
            contactAddressRow.style.display = 'none';
        }

        // Foto de Perfil
        const isValidPic = pic.url && !pic.url.startsWith('data:image/gif');
        if (isValidPic) {
            contactAvatar.src = pic.url;
            contactPicLink.href = pic.url;
            contactPicLink.style.display = 'inline-block';
        } else if (print && print.imageUrl) {
            contactAvatar.src = print.imageUrl;
            contactPicLink.href = print.imageUrl;
            contactPicLink.style.display = 'inline-block';
        } else {
            contactAvatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(contactName.textContent)}&background=25D366&color=fff`;
            contactPicLink.style.display = 'none';
        }

        // 2. Screenshot do painel lateral
        if (print && print.imageUrl) {
            screenshotImage.src = print.imageUrl;
            btnDownloadScreenshot.href = print.imageUrl;
            screenshotTimestamp.textContent = `Capturado em: ${new Date(print.capturedAt).toLocaleString('pt-BR')}`;
            document.querySelector('.screenshot-card').style.display = 'block';
        } else {
            document.querySelector('.screenshot-card').style.display = 'none';
        }

        // 3. Renderiza o JSON
        jsonViewer.textContent = JSON.stringify({ success: true, data }, null, 2);
    }

    function showError(msg) {
        errorMessage.textContent = msg;
        errorAlert.style.display = 'flex';
    }

    function hideError() {
        errorAlert.style.display = 'none';
    }

    // Copiar JSON
    btnCopyJson.addEventListener('click', () => {
        if (!lastResultJson) return;
        const text = JSON.stringify({ success: true, data: lastResultJson }, null, 2);
        navigator.clipboard.writeText(text).then(() => {
            const originalText = btnCopyJson.innerHTML;
            btnCopyJson.innerHTML = `<span>Copiado! ✓</span>`;
            setTimeout(() => {
                btnCopyJson.innerHTML = originalText;
            }, 2000);
        });
    });

    // Zoom da Imagem
    btnZoomScreenshot.addEventListener('click', () => {
        if (screenshotImage.src) {
            modalImage.src = screenshotImage.src;
            imageModal.classList.add('active');
        }
    });

    modalClose.addEventListener('click', () => imageModal.classList.remove('active'));
    modalBackdrop.addEventListener('click', () => imageModal.classList.remove('active'));

    // --- 4. DEFINIR RECADO / STATUS ---
    inputStatusMessage.addEventListener('input', () => {
        charCount.textContent = inputStatusMessage.value.length;
    });

    formSetStatus.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newStatus = inputStatusMessage.value.trim();

        if (!newStatus) return;

        btnSubmitStatus.disabled = true;
        statusSuccessAlert.style.display = 'none';

        try {
            const response = await fetch('/api/user/status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ statusMessage: newStatus })
            });

            const result = await response.json();
            btnSubmitStatus.disabled = false;

            if (result.success) {
                statusSuccessAlert.style.display = 'flex';
                statusSuccessMessage.textContent = `Recado alterado para: "${result.data.statusMessage}"`;
            } else {
                alert('Erro ao atualizar recado: ' + (result.error || 'Falha'));
            }
        } catch (err) {
            btnSubmitStatus.disabled = false;
            alert('Falha na requisição: ' + err.message);
        }
    });

    // --- 5. CARREGAR HISTÓRICO ---
    async function loadHistory() {
        try {
            const response = await fetch('/api/history');
            const result = await response.json();

            if (!result.success || !result.data || result.data.length === 0) {
                historyTableBody.innerHTML = `
                    <tr>
                        <td colspan="7" class="text-center text-muted" style="padding: 2rem;">Nenhuma consulta realizada até o momento.</td>
                    </tr>
                `;
                return;
            }

            historyTableBody.innerHTML = result.data.map(item => `
                <tr>
                    <td>${new Date(item.timestamp).toLocaleString('pt-BR')}</td>
                    <td><strong>${item.formattedPhone || item.phone}</strong></td>
                    <td>${item.name || '-'}</td>
                    <td>
                        <span class="badge ${item.accountType === 'WhatsApp Business' ? 'badge-primary' : 'badge-secondary'}">
                            ${item.accountType || (item.isRegistered ? 'Ativo' : 'Inativo')}
                        </span>
                    </td>
                    <td>
                        ${item.profilePicUrl ? `<img src="${item.profilePicUrl}" class="table-thumb" alt="Avatar">` : '-'}
                    </td>
                    <td>
                        ${item.screenshotUrl ? `<a href="${item.screenshotUrl}" target="_blank" class="detail-link">Ver Print ↗</a>` : '-'}
                    </td>
                    <td>
                        <button class="btn btn-sm btn-outline" onclick="consultarNumero('${item.phone}')">Consultar</button>
                    </td>
                </tr>
            `).join('');

        } catch (e) {
            console.error('Erro ao carregar histórico:', e);
        }
    }

    window.consultarNumero = (phone) => {
        inputPhone.value = phone;
        document.querySelector('[data-tab="tab-search"]').click();
        formCheckProfile.dispatchEvent(new Event('submit'));
    };

    btnClearHistory.addEventListener('click', async () => {
        if (!confirm('Deseja limpar todo o histórico de consultas?')) return;
        try {
            await fetch('/api/history', { method: 'DELETE' });
            loadHistory();
        } catch (e) {
            alert('Erro ao limpar histórico: ' + e.message);
        }
    });
});
