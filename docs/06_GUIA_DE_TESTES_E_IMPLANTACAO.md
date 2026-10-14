# 🚀 Módulo 06: Guia de Testes & Implantação em Produção

> **WhatsProfile Pro** - Software Specification Kit  
> **Camada:** Engenharia de QA, Automação de Testes e Estratégias de Deploy  
> **Porta de Operação:** `1800`  
> **Framework de Testes:** Jest & Supertest  

---

### 1. Matriz e Cobertura de Testes Automatizados

O sistema conta com uma suíte de testes de alta confiabilidade, organizada em camadas unitárias e de ponta a ponta (E2E), totalizando **26 testes automatizados**:

```
tests/
├── unit/
│   ├── phoneSanitizer.test.js       # 14 testes (limpeza, normalização, 9º dígito e variantes)
│   └── historyRepository.test.js    # 7 testes (operações CRUD, persistência atômica e limite FIFO de 100 itens)
└── e2e/
    └── api.test.js                  # 5 testes (validação de endpoints HTTP Express com Supertest)
```

#### 1.1 Comandos de Execução dos Testes

```bash
# Executa a suíte completa de testes (26 testes)
npm test

# Executa exclusivamente os testes unitários da camada Model
npm run test:unit

# Executa exclusivamente os testes de integração dos endpoints HTTP
npm run test:e2e
```

*Nota Técnica:* O script `npm test` executa `jest --runInBand --detectOpenHandles --forceExit`, assegurando que conexões de rede ou temporizadores pendentes sejam finalizados de forma determinística sem travar pipelines de CI/CD.

---

### 2. Guia de Configuração de Ambiente (`.env`)

O comportamento do sistema é parametrizado via arquivo `.env` na raiz do projeto:

```properties
# Porta HTTP do servidor Express (Padrão Oficial: 1800)
PORT=1800

# Interface de rede para binding (0.0.0.0 permite acesso em rede local / contêineres)
HOST=0.0.0.0

# Modo de execução do Puppeteer ('new' para headless moderno, 'false' para exibir janela gráfica do Chrome)
HEADLESS=new

# Caminho opcional para binário específico do Chrome/Chromium no sistema operacional
# CHROME_BIN=C:\Program Files\Google\Chrome\Application\chrome.exe
```

---

### 3. Estratégias de Implantação em Produção

#### 3.1 Opção 1: Gerenciamento de Processo com PM2 (Recomendado para VPS / Servidores Dedicados)

O **PM2** gerencia o processo Node.js em background, garantindo auto-reinicialização em caso de falhas ou reinício do servidor:

1. **Instalação Global do PM2:**
   ```bash
   npm install -g pm2
   ```

2. **Criação do Arquivo de Configuração (`ecosystem.config.js`):**
   ```javascript
   module.exports = {
     apps: [
       {
         name: 'whatsprofile-pro',
         script: 'server.js',
         instances: 1, // DEVE ser 1 devido ao SingletonLock do Chromium
         autorestart: true,
         watch: false,
         max_memory_restart: '1G',
         env: {
           PORT: 1800,
           NODE_ENV: 'production',
           HEADLESS: 'new'
         }
       }
     ]
   };
   ```

3. **Comandos de Inicialização:**
   ```bash
   pm2 start ecosystem.config.js
   pm2 save
   pm2 startup
   ```

---

#### 3.2 Opção 2: Implantação em Contêiner Docker

Para implantações conteinerizadas em Linux/Kubernetes, utilize um `Dockerfile` configurado com as dependências gráficas e fontes do Chromium:

```dockerfile
FROM node:20-bullseye-slim

# Instala dependências do Chromium headless no Debian
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdrm2 \
    libgbm1 \
    libnss3 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    xdg-utils \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

ENV CHROME_BIN=/usr/bin/chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PORT=1800

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

# Volumes para persistência de sessão e fotos
VOLUME ["/app/sessions", "/app/screenshots", "/app/data"]

EXPOSE 1800

CMD ["node", "server.js"]
```

**Execução via Docker CLI:**
```bash
docker build -t whatsprofile-pro:1.0 .
docker run -d -p 1800:1800 \
  -v $(pwd)/sessions:/app/sessions \
  -v $(pwd)/screenshots:/app/screenshots \
  -v $(pwd)/data:/app/data \
  --name whatsprofile whatsprofile-pro:1.0
```

---

#### 3.3 Opção 3: Execução como Serviço Nativo do Windows (Windows Service)

Para servidores Windows Server sem necessidade de login interativo de usuário:
1. Instale o pacote `node-windows`:
   ```bash
   npm install -g node-windows
   ```
2. Crie o instalador de serviço `install-service.js`:
   ```javascript
   const Service = require('node-windows').Service;
   const svc = new Service({
     name: 'WhatsProfile Pro Service',
     description: 'Serviço de Extração e Automação do WhatsApp Web na porta 1800',
     script: require('path').join(__dirname, 'server.js')
   });
   svc.on('install', () => svc.start());
   svc.install();
   ```
3. Execute no terminal com privilégios de Administrador:
   ```bash
   node install-service.js
   ```

---

### 4. Matriz de Resolução de Problemas (Troubleshooting)

| Sintoma | Causa Raiz Provável | Solução Operacional |
|---|---|---|
| `EADDRINUSE: address already in use :::1800` | Outro processo está ocupando a porta 1800. | Localize o PID (`netstat -ano \| findstr 1800`) e encerre o processo anterior antes de reiniciar. |
| Status travado em `QR_READY` | O celular não realizou a leitura do QR Code. | Acesse `http://localhost:1800/` e aponte a câmera do aplicativo WhatsApp em *Aparelhos Conectados*. |
| `Error: Node has 0 width` na captura | Tentativa de captura via `element.screenshot()`. | O sistema já utiliza `page.screenshot({ clip: drawerRect })`. Caso ocorra em customizações, recompile mantendo o algoritmo de recorte retangular. |
| Resposta `isRegistered: false` para número existente | Variação do 9º dígito no Brasil. | O `PhoneSanitizer` testa automaticamente ambas as variantes (8 e 9 dígitos). Verifique se o DDI e DDD informados estão corretos. |
| Popup *"Número compartilhado por url é inválido"* | Injeção acidental de LID (`@lid`) na URL de navegação. | O sistema filtra automaticamente LIDs mantendo o `activeCleanNumber`. Certifique-se de que o input não é um hash sintético. |
