# 💾 Módulo 05: Modelos de Dados & Persistência

> **WhatsProfile Pro** - Software Specification Kit  
> **Camada:** Dicionário de Entidades, Esquemas JSON & Topologia de Disco  
> **Arquivos Relacionados:** [src/models/QueryHistoryRepository.js](file:///c:/Users/alexandre/Downloads/APP%20WHATS/src/models/QueryHistoryRepository.js), [src/config/config.js](file:///c:/Users/alexandre/Downloads/APP%20WHATS/src/config/config.js)  

---

### 1. Dicionário de Entidades de Domínio

O ecossistema manipula 5 entidades estruturadas principais:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                               ContactResponse                               │
├─────────────────────┬──────────────────────┬────────────────────────────────┤
│ ContactInfo         │ ProfilePicture       │ ScreenshotMetadata             │
│ - id: string        │ - hasPicture: bool   │ - success: bool                │
│ - number: string    │ - url: string | null │ - fileName: string             │
│ - name: string      │                      │ - imageUrl: string             │
│ - isBusiness: bool  │                      │ - base64: string (DataURL)     │
│ - category: string  │                      │ - capturedAt: ISO8601 string   │
│ - hours: string     │                      │ - drawerRect: BoundingBox      │
│ - address: string   │                      │                                │
└─────────────────────┴──────────────────────┴────────────────────────────────┘
```

---

### 2. Especificação Detalhada dos Campos

#### 2.1 Entidade `ContactInfo`

| Campo | Tipo | Descrição | Exemplo |
|---|---|---|---|
| `id` | `string` | Identificador serializado no WhatsApp (`@c.us` ou `@lid`). | `"556584424000@c.us"` |
| `number` | `string` | Número numérico limpo com DDI e DDD. | `"5565984424000"` |
| `formattedPhone` | `string` | Telefone formatado para leitura humana no padrão brasileiro. | `"+55 (65) 98442-4000"` |
| `name` | `string \| null` | Nome do contato ou razão social extraída do DOM / agenda. | `"Patricia ❤️"` |
| `pushname` | `string \| null` | Nome público configurado pelo próprio usuário no app móvel. | `"Patricia"` |
| `shortName` | `string \| null` | Primeiro nome ou apelido computado pelo cliente. | `"Patricia"` |
| `verifiedName` | `string \| null` | Nome oficialmente verificado pela Meta (selo verde). | `null` |
| `isBusiness` | `boolean` | Flag booleana: `true` para Conta Comercial, `false` para Pessoal. | `true` |
| `isEnterprise` | `boolean` | Flag booleana indicando se é WhatsApp Cloud API corporativa. | `false` |
| `isVerified` | `boolean` | Flag indicando se a conta possui selo oficial de verificação. | `false` |
| `isMyContact` | `boolean` | Flag indicando se o número está salvo na agenda do chip conectado. | `false` |
| `isBlocked` | `boolean` | Flag indicando se o contato está bloqueado na conta conectada. | `false` |
| `about` | `string \| null` | Mensagem de recado (About) do perfil pessoal ou descrição comercial. | `null` |
| `accountType` | `string` | Representação legível: `"WhatsApp Business"` ou `"WhatsApp Pessoal"`.| `"WhatsApp Business"` |
| `category` | `string \| null` | Segmento comercial identificado no cabeçalho ou Drawer. | `"Compras e varejo"` |
| `hours` | `string \| null` | Horários de expediente (*"Aberta 24 horas"*, *"Aberto agora"*, etc.).| `"Aberta 24 horas"` |
| `website` | `string \| null` | Link externo ou loja virtual catalogada no perfil comercial. | `"https://minhaloja.com"` |
| `address` | `string \| null` | Endereço físico ou raio de atendimento. | `"Atuação Nacional"` |

---

#### 2.2 Entidade `ProfilePicture`

| Campo | Tipo | Descrição | Exemplo |
|---|---|---|---|
| `hasPicture` | `boolean` | Indica se o contato possui foto de perfil pública ou acessível. | `true` |
| `url` | `string \| null` | URL direta de alta resolução hospedada no CDN da Meta (`pps.whatsapp.net`). | `"https://pps.whatsapp.net/v/..."` |

---

#### 2.3 Entidade `ScreenshotMetadata`

| Campo | Tipo | Descrição | Exemplo |
|---|---|---|---|
| `success` | `boolean` | Confirmação se a captura da barra lateral foi concluída com êxito. | `true` |
| `fileName` | `string` | Nome único do arquivo gerado no disco (`perfil_{phone}_{timestamp}.png`). | `"perfil_5565984424000_1728864000000.png"` |
| `filePath` | `string` | Caminho físico absoluto no sistema operacional. | `"C:\\Users\\...\\screenshots\\perfil_....png"` |
| `imageUrl` | `string` | Rota relativa servida pelo Express para download da imagem. | `"/api/screenshots/perfil_....png"` |
| `base64` | `string` | Representação DataURL codificada em Base64 para modelos de IA. | `"data:image/png;base64,iVBORw..."` |
| `capturedAt` | `string` | Carimbo de data/hora no padrão ISO 8601 da captura física do print. | `"2026-10-14T02:00:00.000Z"` |

---

#### 2.4 Entidade `QueryHistory` (Registro de Histórico)

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | `string` | Identificador único (`query_{timestamp}_{hash}`). |
| `timestamp` | `string` | Data/hora da consulta no padrão ISO 8601. |
| `phone` | `string` | Número do telefone pesquisado. |
| `name` | `string \| null` | Nome do contato resgatado. |
| `isBusiness` | `boolean` | Indicador de WhatsApp Business. |
| `isRegistered`| `boolean` | Confirmação de cadastro ativo no WhatsApp. |
| `hasPicture` | `boolean` | Existência de avatar público. |
| `hasScreenshot`| `boolean` | Existência do print do painel lateral. |
| `screenshotUrl`| `string \| null` | URL para download da captura. |

---

### 3. Topologia de Armazenamento Local em Disco

```
c:\Users\alexandre\Downloads\APP WHATS\
├── data/
│   └── history.json                   # Histórico de consultas recentes em formato JSON atômico
├── screenshots/
│   ├── perfil_5565984424000_*.png     # Prints recortados gerados sob demanda
│   └── perfil_5565981317876_*.png
└── sessions/
    └── whatsapp_browser_session/      # Perfil completo do Chromium persistido pelo LocalAuth
        ├── Default/
        │   ├── IndexedDB/             # Chaves de criptografia e cache do WhatsApp Web
        │   ├── Local Storage/         # Tokens de sessão do cliente
        │   └── Cookies
        └── SingletonLock              # Lockfile de controle de concorrência do Chromium
```

---

### 4. Concorrência e Integridade Atômica

1. **Persistência de Histórico (`data/history.json`):**
   - A gravação do histórico é centralizada na classe `QueryHistoryRepository`.
   - Utiliza gravação síncrona com `fs.writeFileSync(..., JSON.stringify(..., null, 2), 'utf-8')`. Isso assegura que o arquivo nunca permaneça corrompido em caso de interrupção repentina do processo.
   - Aplica a regra de negócio FIFO (First-In, First-Out) com corte estrito nos 100 registros mais recentes para evitar consumo excessivo de memória e disco.

2. **Exclusividade do Perfil do Chromium (`sessions/`):**
   - O diretório `sessions/whatsapp_browser_session` contém o arquivo de controle `SingletonLock` criado pelo Chromium.
   - Apenas uma instância do processo do WhatsApp Web pode acessar esse diretório simultaneamente. O `server.js` gerencia o ciclo do Puppeteer como um Singleton, prevenindo conflitos de concorrência.
