# 🚀 WhatsProfile Pro - Extrator de Perfil & Captura do WhatsApp Web

Solução corporativa autônoma desenvolvida em **Node.js**, **Express**, **Puppeteer** e **whatsapp-web.js** para automação de WhatsApp Web, validação de números, extração de dados cadastrais, download de fotos em alta resolução, alteração remota de recado e captura precisa do print da barra lateral ("Dados do contato" / "Dados do contacto").

Projetado tanto para uso visual através de um **Dashboard Web Dark Glassmorphism** interativo quanto para consumo via **API REST** e **Ferramentas de IA (OpenAI, LangChain, Flowise, Dify, n8n)** na porta oficial **1800**.

---

## 📚 Software Specification Kit (SpecKit)

A documentação arquitetural e técnica completa do sistema está organizada na pasta [`docs/`](file:///c:/Users/alexandre/Downloads/APP%20WHATS/docs/SPECKIT.md):

- 📑 [**SPECKIT.md (Índice Master)**](file:///c:/Users/alexandre/Downloads/APP%20WHATS/docs/SPECKIT.md): Sumário executivo, matriz de rastreabilidade de requisitos e visão geral.
- 🏛️ [**01_ARQUITETURA_E_SISTEMA.md**](file:///c:/Users/alexandre/Downloads/APP%20WHATS/docs/01_ARQUITETURA_E_SISTEMA.md): Padrão Clean MVC, ciclo de vida do WhatsApp Web, persistência LocalAuth e poller de recuperação de estado.
- 🔬 [**02_MOTOR_DE_EXTRACAO_E_DOM.md**](file:///c:/Users/alexandre/Downloads/APP%20WHATS/docs/02_MOTOR_DE_EXTRACAO_E_DOM.md): Heurísticas do 9º dígito brasileiro, resolução de LID (`@lid`), cliques físicos de coordenadas e recorte sem erros de largura.
- 🌐 [**03_ESPECIFICACAO_API_REST.md**](file:///c:/Users/alexandre/Downloads/APP%20WHATS/docs/03_ESPECIFICACAO_API_REST.md): Catálogo completo de rotas HTTP, parâmetros de query, contratos JSON e Swagger UI.
- 🤖 [**04_INTEGRACAO_AGENTES_IA.md**](file:///c:/Users/alexandre/Downloads/APP%20WHATS/docs/04_INTEGRACAO_AGENTES_IA.md): OpenAI Function Calling, exemplos em Python (LangChain, LangGraph), nós para n8n/Flowise e visão multimodal.
- 💾 [**05_MODELOS_DADOS_E_PERSISTENCIA.md**](file:///c:/Users/alexandre/Downloads/APP%20WHATS/docs/05_MODELOS_DADOS_E_PERSISTENCIA.md): Dicionário de dados, entidades de domínio, schemas JSON e topologia em disco.
- 🚀 [**06_GUIA_DE_TESTES_E_IMPLANTACAO.md**](file:///c:/Users/alexandre/Downloads/APP%20WHATS/docs/06_GUIA_DE_TESTES_E_IMPLANTACAO.md): Matriz de testes de QA (26 testes automatizados), guias de deploy (PM2, Docker, Windows Service) e troubleshooting.

---

## 🌟 Funcionalidades Principais

- ✅ **Get Contact Info:** Validação se o número possui conta ativa no WhatsApp, tipo de conta (**WhatsApp Business** vs. **WhatsApp Pessoal**), nome/razão social, pushname, nome verificado, categoria, horários, endereço e mensagem de recado (About).
- ✅ **Get Profile Pictures:** Recuperação da URL direta e download da foto de perfil do contato em alta definição.
- ✅ **Set User Status Message:** Atualização da mensagem de recado (status) do perfil conectado no WhatsApp via requisição HTTP (GET ou POST).
- ✅ **Recorte Exato do Painel Lateral (Screenshot):** O script navega até a conversa do número solicitado, aciona a abertura do painel de detalhes do contato no WhatsApp Web e isola a captura exclusivamente sobre a barra lateral direita ("Dados do contacto"), exatamente como exibido na interface oficial.
- ✅ **Persistência de Sessão (LocalAuth):** Você só escaneia o QR Code uma única vez. A sessão fica salva localmente em `sessions/` e reconecta automaticamente em reinicializações do servidor.
- ✅ **Dashboard Web com Visual Dark Glassmorphism:** Interface completa com exibição do QR Code em tempo real, formulário de consulta com máscaras e chips rápidos, pré-visualização com zoom e download do print, histórico de consultas e visualizador de JSON formatado com botão "Copiar JSON".
- ✅ **API REST & OpenAPI 3.1 para Agentes de IA:** Endpoints com CORS habilitado prontos para integração via `curl`, Python, PHP, Flowise, Dify, n8n ou OpenAI Function Calling.
- ✅ **Documentação Interativa Swagger UI:** Interface gráfica Swagger integrada na rota `/api-docs`.

---

## 🏗️ Arquitetura do Projeto (MVC Rigoroso)

```
c:\Users\alexandre\Downloads\APP WHATS\
├── docs/                              # Software Specification Kit (SpecKit)
│   ├── SPECKIT.md
│   ├── 01_ARQUITETURA_E_SISTEMA.md
│   ├── 02_MOTOR_DE_EXTRACAO_E_DOM.md
│   ├── 03_ESPECIFICACAO_API_REST.md
│   ├── 04_INTEGRACAO_AGENTES_IA.md
│   ├── 05_MODELOS_DADOS_E_PERSISTENCIA.md
│   └── 06_GUIA_DE_TESTES_E_IMPLANTACAO.md
├── src/
│   ├── config/
│   │   └── config.js                  # Configurações do servidor, portas, diretórios e flags do Puppeteer
│   ├── models/
│   │   ├── PhoneSanitizer.js          # Validação, normalização e heurísticas do 9º dígito no Brasil
│   │   ├── QueryHistoryRepository.js  # Persistência atômica do histórico de consultas em JSON
│   │   └── WhatsAppService.js         # Orquestração do WhatsApp Web, Puppeteer, extração do DOM e capturas
│   ├── controllers/
│   │   ├── WhatsAppController.js      # Controlador de sessão, QR Code e status do usuário
│   │   └── ContactController.js       # Controlador de consulta de contatos, fotos e screenshots
│   ├── views/
│   │   └── public/
│   │       ├── css/style.css          # Estilização moderna Dark Glassmorphism
│   │       ├── js/app.js              # Lógica do frontend e atualização dinâmica
│   │       └── index.html             # Interface web responsiva
│   ├── routes/
│   │   └── api.js                     # Definição das rotas REST da API
│   └── app.js                         # Configuração do Express, CORS, Swagger e middlewares
├── tests/
│   ├── unit/
│   │   ├── phoneSanitizer.test.js     # Testes unitários do sanitizador de telefones (14 testes)
│   │   └── historyRepository.test.js  # Testes unitários do repositório de histórico (7 testes)
│   └── e2e/
│       └── api.test.js                # Testes de integração de endpoints com Supertest (5 testes)
├── server.js                          # Ponto de entrada (Entrypoint na porta 1800)
├── openapi.json                       # Especificação OpenAPI 3.1 para Swagger e IAs
├── package.json
└── README.md
```

---

## ⚡ Como Instalar e Rodar

### 1. Pré-requisitos
- **Node.js** LTS (versão 18 ou superior)
- **npm**

### 2. Iniciar a Aplicação
No diretório do projeto, execute:

```bash
npm start
```

O servidor iniciará na porta **1800**:
- **Dashboard Web:** `http://localhost:1800`
- **Documentação Swagger UI:** `http://localhost:1800/api-docs`
- **Especificação OpenAPI 3.1:** `http://localhost:1800/api/openapi.json`

### 3. Conectar ao WhatsApp Web
1. Abra seu navegador em `http://localhost:1800`.
2. A tela exibirá o **QR Code** gerado em tempo real.
3. Abra o **WhatsApp** no seu celular:
   - Vá em **Configurações / Menu** > **Aparelhos Conectados** > **Conectar um aparelho**.
   - Aponte a câmera para o QR Code na tela.
4. Assim que conectar, o status mudará para **"Conectado"** e o formulário de pesquisa estará pronto para uso.

---

## 🔌 Guia Rápido da API REST

### 1. Consultar Contato & Obter Print da Barra Lateral

```bash
curl -X GET "http://localhost:1800/api/contact/5565984424000"
```

*Nota:* Para obter resposta instantânea em menos de 1 segundo sem gerar print:
```bash
curl -X GET "http://localhost:1800/api/contact/5565984424000?screenshot=false"
```

**Exemplo de Resposta JSON:**
```json
{
  "success": true,
  "data": {
    "queryPhone": "5565984424000",
    "cleanPhone": "5565984424000",
    "formattedPhone": "+55 (65) 98442-4000",
    "isRegistered": true,
    "contactInfo": {
      "id": "556584424000@c.us",
      "number": "5565984424000",
      "formattedPhone": "+55 (65) 98442-4000",
      "name": "Patricia ❤️",
      "pushname": "Patricia",
      "isBusiness": true,
      "accountType": "WhatsApp Business",
      "category": "Compras e varejo",
      "hours": "Aberta 24 horas",
      "address": "Atuação Nacional"
    },
    "profilePicture": {
      "hasPicture": true,
      "url": "https://pps.whatsapp.net/v/t61.24694-24/..."
    },
    "screenshot": {
      "success": true,
      "fileName": "perfil_5565984424000_1728864000000.png",
      "imageUrl": "/api/screenshots/perfil_5565984424000_1728864000000.png",
      "capturedAt": "2026-10-14T02:00:00.000Z"
    }
  }
}
```

---

### 2. Obter Apenas Foto de Perfil

```bash
curl -X GET "http://localhost:1800/api/contact/5565984424000/picture"
```

---

### 3. Definir Recado do WhatsApp (Set User Status Message)

**Via POST:**
```bash
curl -X POST "http://localhost:1800/api/user/status" \
  -H "Content-Type: application/json" \
  -d '{"statusMessage": "Em atendimento automático via IA"}'
```

**Via GET (ideal para Webhooks rápidos):**
```bash
curl -X GET "http://localhost:1800/api/user/status?message=Atendimento%20Online"
```

---

### 4. Consultar Status da Conexão

```bash
curl -X GET "http://localhost:1800/api/status"
```

---

## 🧪 Testes Automatizados

O projeto possui uma suíte com 26 testes automatizados cobrindo lógica de domínio e integração HTTP.

```bash
npm test
```
