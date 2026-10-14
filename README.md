# 🚀 WhatsProfile Pro - Extrator de Perfil & Captura do WhatsApp Web

Solução completa desenvolvida em **Node.js**, **Express**, **Puppeteer** e **whatsapp-web.js** para automação de WhatsApp Web, validação de números, extração de dados cadastrais, download de fotos em alta resolução, alteração remota de recado e captura precisa do print da barra lateral ("Dados do contacto").

Projetado tanto para uso visual através de um **Dashboard Web Dark Glassmorphism** interativo quanto para consumo via **API REST** por outros sistemas, bots, CRMs e backends externos.

---

## 🌟 Funcionalidades Principais

- ✅ **Get Contact Info:** Validação se o número possui conta ativa no WhatsApp, tipo de conta (**WhatsApp Business** vs. **WhatsApp Pessoal**), nome/razão social, pushname, nome verificado e mensagem de recado (About).
- ✅ **Get Profile Pictures:** Recuperação da URL direta e download da foto de perfil do contato em alta definição.
- ✅ **Set User Status Message:** Atualização da mensagem de recado (status) do perfil conectado no WhatsApp via requisição HTTP (GET ou POST).
- ✅ **Recorte Exato do Painel Lateral (Screenshot):** O script navega até a conversa do número solicitado, aciona a abertura do painel de detalhes do contato no WhatsApp Web e isola a captura exclusivamente sobre a barra lateral direita ("Dados do contacto"), exatamente como exibido na interface oficial.
- ✅ **Persistência de Sessão (LocalAuth):** Você só escaneia o QR Code uma única vez. A sessão fica salva localmente em `sessions/` e reconecta automaticamente em reinicializações do servidor.
- ✅ **Dashboard Web com Visual Premium:** Interface completa com exibição do QR Code em tempo real, formulário de consulta com máscaras e chips rápidos, pré-visualização com zoom e download do print, histórico de consultas e visualizador de JSON formatado com botão "Copiar JSON".
- ✅ **API REST para Sistemas Externos:** Endpoints com CORS habilitado prontos para integração via `curl`, `fetch`, Python, PHP, etc.

---

## 🏗️ Arquitetura do Projeto (MVC Rigoroso)

```
c:\Users\alexandre\Downloads\APP WHATS\
├── src\
│   ├── config\
│   │   └── config.js                  # Configurações do servidor, diretórios e flags do Puppeteer
│   ├── models\
│   │   ├── PhoneSanitizer.js          # Validação, normalização e formatação de números
│   │   ├── QueryHistoryRepository.js  # Persistência do histórico de consultas em JSON
│   │   └── WhatsAppService.js         # Orquestração do WhatsApp Web, Puppeteer e capturas
│   ├── controllers\
│   │   ├── WhatsAppController.js      # Controlador de sessão, QR Code e status do usuário
│   │   └── ContactController.js       # Controlador de consulta de contatos, fotos e screenshots
│   ├── views\
│   │   └── public\
│   │       ├── css\style.css          # Estilização moderna Dark Glassmorphism
│   │       ├── js\app.js              # Lógica do frontend e atualização dinâmica
│   │       └── index.html             # Interface web responsiva
│   ├── routes\
│   │   └── api.js                     # Definição das rotas REST da API
│   └── app.js                         # Configuração do Express, CORS e middlewares
├── tests\
│   ├── unit\
│   │   ├── phoneSanitizer.test.js     # Testes unitários do sanitizador de telefones
│   │   └── historyRepository.test.js  # Testes unitários do repositório de histórico
│   └── e2e\
│       └── api.test.js                # Testes de integração de endpoints (Supertest)
├── server.js                          # Ponto de entrada (Entrypoint)
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

O servidor iniciará em `http://localhost:3000`.

### 3. Conectar ao WhatsApp Web
1. Abra seu navegador em `http://localhost:3000`.
2. A tela exibirá o **QR Code** gerado em tempo real.
3. Abra o **WhatsApp** no seu celular:
   - Vá em **Configurações / Menu** > **Aparelhos Conectados** > **Conectar um aparelho**.
   - Aponte a câmera para o QR Code na tela.
4. Assim que conectar, o status mudará para **"Conectado"** e o formulário de pesquisa estará pronto para uso.

---

## 🔌 Guia de Uso da API REST por Outros Sistemas

Qualquer outro sistema externo pode consumir esta API passando o número de telefone e recebendo as informações em formato JSON estruturado.

### 1. Consultar Contato & Obter Print (Get Contact Info & Screenshot)

**Requisição:**
```http
GET /api/contact/:phone
```
*Suporta também chamada com query parameter:* `GET /api/contact?phone=5511999999999`  
*Ou via POST:* `POST /api/contact` com corpo `{"phone": "5511999999999"}`

**Parâmetros de Query Opcionais:**
- `screenshot=false`: Se desejar apenas os metadados cadastrais sem disparar a captura de tela (resposta em menos de 1 segundo).

**Exemplo cURL:**
```bash
curl -X GET "http://localhost:3000/api/contact/5511999999999"
```

**Exemplo de Resposta JSON:**
```json
{
  "success": true,
  "data": {
    "queryPhone": "5511999999999",
    "cleanPhone": "5511999999999",
    "formattedPhone": "+55 (11) 99999-9999",
    "isRegistered": true,
    "contactInfo": {
      "id": "5511999999999@c.us",
      "number": "5511999999999",
      "formattedPhone": "+55 (11) 99999-9999",
      "name": "Alexandre Tech",
      "pushname": "Alexandre",
      "shortName": "Alexandre",
      "verifiedName": null,
      "isBusiness": true,
      "isEnterprise": false,
      "isVerified": false,
      "isMyContact": false,
      "isBlocked": false,
      "about": "Atendimento automatizado via IA",
      "accountType": "WhatsApp Business"
    },
    "profilePicture": {
      "hasPicture": true,
      "url": "https://pps.whatsapp.net/v/t61.24694-24/..."
    },
    "screenshot": {
      "success": true,
      "fileName": "perfil_5511999999999_1728864000000.png",
      "imageUrl": "/api/screenshots/perfil_5511999999999_1728864000000.png",
      "capturedAt": "2026-10-14T02:00:00.000Z"
    }
  }
}
```

---

### 2. Obter Apenas Foto de Perfil (Get Profile Pictures)

**Requisição:**
```http
GET /api/contact/:phone/picture
```

**Opções:**
- `?redirect=true`: Redireciona diretamente (HTTP 302) para o link da imagem original.

**Exemplo cURL:**
```bash
curl -X GET "http://localhost:3000/api/contact/5511999999999/picture"
```

**Resposta JSON:**
```json
{
  "success": true,
  "phone": "5511999999999",
  "hasPicture": true,
  "url": "https://pps.whatsapp.net/v/t61.24694-24/..."
}
```

---

### 3. Definir Recado do WhatsApp (Set User Status Message)

Permite que outros sistemas atualizem a mensagem de status/recado do perfil conectado no WhatsApp.

**Opção A: Via POST com JSON:**
```bash
curl -X POST "http://localhost:3000/api/user/status" \
  -H "Content-Type: application/json" \
  -d '{"statusMessage": "Em atendimento automático via sistema"}'
```

**Opção B: Via GET (ideal para chamadas simples via webhook ou navegador):**
```bash
curl -X GET "http://localhost:3000/api/user/status?message=Atendimento%20Online"
```

**Resposta JSON:**
```json
{
  "success": true,
  "data": {
    "success": true,
    "message": "Recado do WhatsApp atualizado com sucesso.",
    "statusMessage": "Em atendimento automático via sistema",
    "updatedAt": "2026-10-14T02:05:00.000Z"
  }
}
```

---

### 4. Consultar Status da Conexão

```bash
curl -X GET "http://localhost:3000/api/status"
```

---

## 🧪 Testes Automatizados

O projeto possui uma suíte completa de testes cobrindo testes unitários de lógica de negócio e testes de integração de ponta a ponta dos endpoints HTTP.

Para executar todos os testes:

```bash
npm test
```

Para rodar apenas os testes unitários:
```bash
npm run test:unit
```

Para rodar apenas os testes de integração de API:
```bash
npm run test:e2e
```
