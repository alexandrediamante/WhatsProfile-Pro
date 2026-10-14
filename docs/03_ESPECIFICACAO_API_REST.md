# 🌐 Módulo 03: Especificação da API REST

> **WhatsProfile Pro** - Software Specification Kit  
> **Camada:** Interface de Comunicação HTTP & Catálogo de Serviços  
> **Porta Oficial:** `1800`  
> **CORS:** Habilitado para qualquer origem (`Access-Control-Allow-Origin: *`)  
> **Interface Interativa:** `http://localhost:1800/api-docs`  
> **Contrato OpenAPI 3.1:** `http://localhost:1800/api/openapi.json`  

---

### 1. Padrões de Comunicação & Estrutura de Resposta

Todos os endpoints REST da aplicação retornam respostas no formato `application/json`, encapsuladas sob um envelope padronizado:

#### 1.1 Resposta de Sucesso (HTTP 200 / 201)
```json
{
  "success": true,
  "data": { ... }
}
```

#### 1.2 Resposta de Erro (HTTP 400 / 404 / 500 / 503)
```json
{
  "success": false,
  "error": "Descrição detalhada e inteligível do erro em português."
}
```

---

### 2. Catálogo Completo de Endpoints

#### 2.1 Conectividade & Sessão do WhatsApp

##### `GET /api/status`
Retorna a saúde da conexão do WhatsApp Web e metadados da conta conectada.

- **Requisição:**
  ```http
  GET /api/status HTTP/1.1
  Host: localhost:1800
  ```
- **Resposta (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "status": "READY",
      "isConnected": true,
      "hasQrCode": false,
      "readyTimestamp": "2026-10-14T02:00:00.000Z",
      "authInfo": {
        "pushname": "Alexandre Diamante",
        "wid": "5565981317876@c.us",
        "platform": "WhatsApp Web"
      }
    }
  }
  ```

---

##### `GET /api/qr`
Recupera o QR Code de autenticação gerado pelo WhatsApp Web.

- **Parâmetros de Query:**
  - `format` (opcional, string): Se definido como `image`, responde com o arquivo binário PNG direto (`image/png`).
- **Resposta Padrão JSON (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "status": "QR_READY",
      "qrCodeDataUrl": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
      "qrCodeRaw": "2@b...==,..."
    }
  }
  ```

---

##### `POST /api/initialize`
Força a reinicialização da instância do cliente WhatsApp e navegador headless.

- **Resposta (200 OK):**
  ```json
  {
    "success": true,
    "message": "Inicialização do WhatsApp iniciada em segundo plano."
  }
  ```

---

##### `POST /api/logout`
Encerra a sessão ativa do WhatsApp Web e destrói o processo do Puppeteer.

- **Resposta (200 OK):**
  ```json
  {
    "success": true,
    "message": "Sessão do WhatsApp encerrada com sucesso."
  }
  ```

---

#### 2.2 Consulta de Perfil & Extração de Dados (Core)

##### `GET /api/contact/:phone`
> *Suporta também `GET /api/contact?phone=...` ou `POST /api/contact` com corpo `{"phone": "..."}`.*

Consulta a existência do número, extrai o perfil cadastral completo, detecta se é Conta Comercial (WhatsApp Business) ou Pessoal, obtém a foto de perfil em alta resolução e captura o print recortado da barra lateral ("Dados do contato").

- **Parâmetros de Entrada:**
  - `:phone` (obrigatório, path/query/body): Número do telefone no formato livre com ou sem DDI (ex: `5565984424000`, `65984424000`, `+55 (65) 98442-4000`).
  - `screenshot` (opcional, boolean, padrão `true`): Se `false`, ignora a captura do print e a navegação no DOM, respondendo instantaneamente em menos de 1 segundo.
- **Exemplo cURL:**
  ```bash
  curl -X GET "http://localhost:1800/api/contact/5565984424000?screenshot=true"
  ```
- **Resposta Completa (200 OK):**
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
        "shortName": null,
        "verifiedName": null,
        "isBusiness": true,
        "isEnterprise": false,
        "isVerified": false,
        "isMyContact": false,
        "isBlocked": false,
        "about": null,
        "accountType": "WhatsApp Business",
        "category": "Compras e varejo",
        "hours": "Aberta 24 horas",
        "website": null,
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
        "base64": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
        "capturedAt": "2026-10-14T02:00:00.000Z"
      }
    }
  }
  ```

- **Resposta para Número Não Cadastrado (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "queryPhone": "5511000000000",
      "cleanPhone": "5511000000000",
      "formattedPhone": "+55 (11) 0000-0000",
      "isRegistered": false,
      "message": "O número informado não possui conta ativa no WhatsApp.",
      "contactInfo": null,
      "profilePicture": null,
      "screenshot": null
    }
  }
  ```

---

##### `GET /api/contact/:phone/picture`
Retorna exclusivamente a foto de perfil do contato em alta definição.

- **Parâmetros de Query:**
  - `redirect` (opcional, boolean): Se `true`, retorna redirecionamento HTTP 302 direto para a URL da CDN da Meta.
- **Resposta JSON (200 OK):**
  ```json
  {
    "success": true,
    "phone": "5565984424000",
    "hasPicture": true,
    "url": "https://pps.whatsapp.net/v/t61.24694-24/..."
  }
  ```

---

#### 2.3 Gerenciamento de Recado (Set User Status Message)

##### `POST /api/user/status` ou `GET /api/user/status`
Atualiza a frase de recado/status exibida no perfil do usuário conectado no WhatsApp.

- **Opção A: Requisição POST (Recomendada para integração):**
  ```http
  POST /api/user/status HTTP/1.1
  Host: localhost:1800
  Content-Type: application/json

  {
    "statusMessage": "Atendimento automatizado com IA ativado"
  }
  ```

- **Opção B: Requisição GET (Ideal para webhooks simples):**
  ```http
  GET /api/user/status?message=Atendimento%20IA HTTP/1.1
  Host: localhost:1800
  ```

- **Resposta (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "success": true,
      "message": "Recado do WhatsApp atualizado com sucesso.",
      "statusMessage": "Atendimento automatizado com IA ativado",
      "updatedAt": "2026-10-14T02:05:00.000Z"
    }
  }
  ```

---

#### 2.4 Servir Imagens & Histórico

##### `GET /api/screenshots/:fileName`
Entrega diretamente o arquivo de imagem PNG do print da barra lateral recortada.

- **Headers de Resposta:** `Content-Type: image/png`

---

##### `GET /api/history`
Retorna as consultas efetuadas recentemente no sistema.

- **Parâmetros de Query:**
  - `limit` (opcional, integer, padrão 20): Quantidade máxima de registros.
  - `search` (opcional, string): Filtragem textual por telefone ou nome.
- **Resposta (200 OK):**
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "query_1728864000000_abc12",
        "timestamp": "2026-10-14T02:00:00.000Z",
        "phone": "5565984424000",
        "name": "Patricia ❤️",
        "isBusiness": true,
        "isRegistered": true,
        "hasPicture": true,
        "hasScreenshot": true,
        "screenshotUrl": "/api/screenshots/perfil_5565984424000_1728864000000.png"
      }
    ]
  }
  ```

##### `DELETE /api/history`
Limpa a lista de histórico mantida em `data/history.json`.

---

### 3. Tabela de Códigos de Status HTTP

| Código | Significado | Situação de Ocorrência |
|---|---|---|
| `200 OK` | Sucesso | Consulta ou operação executada com êxito. |
| `400 Bad Request` | Parâmetros Inválidos | Número de telefone nulo, formato corrompido ou mensagem vazia. |
| `404 Not Found` | Rota Inexistente | Endpoint não mapeado em `/api/*`. |
| `500 Internal Error` | Erro no Servidor | Exceção de E/S ou falha inesperada. |
| `503 Service Unavailable` | Serviço Desconectado | WhatsApp Web desconectado ou aguardando leitura do QR Code. |
