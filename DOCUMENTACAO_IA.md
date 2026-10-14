# 🤖 Guia de Integração para Plataformas de IA (Agentic Toolkit)

Este guia foi elaborado para que qualquer **Plataforma de IA**, **Agente Autônomo**, **Framework de LLM** (OpenAI Assistants, LangChain, LlamaIndex, Flowise, Dify, CrewAI, Botpress ou n8n) possa interagir com o **WhatsProfile Pro** na porta **1800**.

---

## 🌐 Configuração Base da API

- **URL Base:** `http://localhost:1800`
- **Porta:** `1800`
- **Especificação OpenAPI 3.1 (Swagger JSON):** `http://localhost:1800/api/openapi.json`
- **Protocolo:** HTTP REST (com cabeçalhos CORS liberados para qualquer origem `*`)

> 💡 **Para Plataformas como Flowise, Dify ou n8n:** Basta importar a URL `http://localhost:1800/api/openapi.json` no módulo de *OpenAPI Tools / Custom Actions* para carregar todas as funções automaticamente!

---

## 🛠️ 1. Definição de Ferramentas (OpenAI Function Calling / Tools Schema)

Copie e cole este array no parâmetro `tools` do seu modelo OpenAI (GPT-4o, GPT-4-turbo) ou adaptador compatível:

```json
[
  {
    "type": "function",
    "function": {
      "name": "check_whatsapp_contact",
      "description": "Verifica se um número de telefone está cadastrado no WhatsApp, identifica se é Conta Comercial (WhatsApp Business) ou Pessoal, extrai o nome/razão social, recado (about/status), URL da foto de perfil em alta definição e tira um print recortado da barra lateral 'Dados do contacto'.",
      "parameters": {
        "type": "object",
        "properties": {
          "phone": {
            "type": "string",
            "description": "Número do telefone com ou sem DDI (Ex: 5511999999999 ou 11999999999 ou +55 66 99999-9999)"
          },
          "screenshot": {
            "type": "boolean",
            "description": "Se verdadeiro (padrão), extrai o print da barra lateral direita do WhatsApp Web. Se falso, responde instantaneamente apenas com os dados e foto.",
            "default": true
          }
        },
        "required": ["phone"]
      }
    }
  },
  {
    "type": "function",
    "function": {
      "name": "get_profile_picture",
      "description": "Obtém a URL direta da foto de perfil do WhatsApp em alta resolução.",
      "parameters": {
        "type": "object",
        "properties": {
          "phone": {
            "type": "string",
            "description": "Número de telefone do contato"
          }
        },
        "required": ["phone"]
      }
    }
  },
  {
    "type": "function",
    "function": {
      "name": "set_user_status_message",
      "description": "Altera o recado (About / mensagem de status) exibido no perfil do WhatsApp conectado.",
      "parameters": {
        "type": "object",
        "properties": {
          "statusMessage": {
            "type": "string",
            "description": "Nova mensagem de recado (limite de 139 caracteres)",
            "example": "Em atendimento inteligente via IA"
          }
        },
        "required": ["statusMessage"]
      }
    }
  },
  {
    "type": "function",
    "function": {
      "name": "get_whatsapp_connection_status",
      "description": "Verifica se o servidor do WhatsApp Web está conectado (READY), aguardando leitura de QR Code (QR_READY) ou desconectado.",
      "parameters": {
        "type": "object",
        "properties": {}
      }
    }
  }
]
```

---

## 🧠 2. Prompt de Sistema Recomendado para o Agente de IA

```markdown
Você é um Assistente de Inteligência e Automação de WhatsApp integrado ao WhatsProfile Pro rodando em http://localhost:1800.

Suas capacidades incluem:
1. Validar se números de clientes existem no WhatsApp.
2. Identificar se o contato é pessoa física ou uma empresa (WhatsApp Business).
3. Resgatar a foto de perfil em alta qualidade.
4. Capturar a imagem/print recortado do painel lateral de 'Dados do contacto'.
5. Alterar a mensagem de recado/status do perfil do WhatsApp quando solicitado.

Diretrizes:
- Antes de tentar consultar contatos, você pode verificar se o WhatsApp está online usando `get_whatsapp_connection_status`.
- Sempre que receber um número de telefone com formatação livre (ex: "(11) 98765-4321"), você pode passá-lo diretamente para a ferramenta `check_whatsapp_contact`, pois o backend faz a sanitização e normalização automática.
- Se o usuário solicitar apenas informações textuais rápidas, passe `screenshot: false` para economizar tempo de processamento.
- Quando o print for retornado no campo `data.screenshot.imageUrl`, forneça a URL completa formatada como `http://localhost:1800` + imageUrl para que o usuário possa visualizar ou baixar o print.
```

---

## 🐍 3. Exemplo de Implementação em Python (OpenAI Tool Calling)

```python
import json
import requests
from openai import OpenAI

client = OpenAI()
BASE_URL = "http://localhost:1800"

def call_tool(name, args):
    if name == "check_whatsapp_contact":
        phone = args.get("phone")
        screenshot = args.get("screenshot", True)
        res = requests.get(f"{BASE_URL}/api/contact/{phone}", params={"screenshot": str(screenshot).lower()})
        return res.json()
    
    elif name == "get_profile_picture":
        phone = args.get("phone")
        res = requests.get(f"{BASE_URL}/api/contact/{phone}/picture")
        return res.json()
        
    elif name == "set_user_status_message":
        msg = args.get("statusMessage")
        res = requests.post(f"{BASE_URL}/api/user/status", json={"statusMessage": msg})
        return res.json()
        
    elif name == "get_whatsapp_connection_status":
        res = requests.get(f"{BASE_URL}/api/status")
        return res.json()

# Exemplo de consulta direta
def verificar_numero(telefone: str):
    resposta = requests.get(f"{BASE_URL}/api/contact/{telefone}")
    dados = resposta.json()
    
    if dados.get("success"):
        info = dados["data"]["contactInfo"]
        foto = dados["data"]["profilePicture"]
        print_tela = dados["data"]["screenshot"]
        
        print(f"Nome: {info['name'] or info['pushname']}")
        print(f"Tipo: {info['accountType']}")
        print(f"Recado: {info['about']}")
        print(f"Foto: {foto['url']}")
        if print_tela:
            print(f"Print Lateral: {BASE_URL}{print_tela['imageUrl']}")
    else:
        print("Erro:", dados.get("error"))

if __name__ == "__main__":
    verificar_numero("5511999999999")
```

---

## 💻 4. Exemplo em LangChain (Python)

```python
from langchain.tools import tool
import requests

BASE_URL = "http://localhost:1800"

@tool
def check_whatsapp_contact(phone: str, screenshot: bool = True) -> dict:
    """Consulta dados de um contato no WhatsApp, foto e print do painel lateral."""
    res = requests.get(f"{BASE_URL}/api/contact/{phone}", params={"screenshot": str(screenshot).lower()})
    return res.json()

@tool
def update_whatsapp_status(message: str) -> dict:
    """Atualiza o recado (status message) do perfil conectado no WhatsApp."""
    res = requests.post(f"{BASE_URL}/api/user/status", json={"statusMessage": message})
    return res.json()

tools = [check_whatsapp_contact, update_whatsapp_status]
```

---

## 👁️ 5. Análise de Imagem do Print por Modelos Multimodais (Vision)

O endpoint `/api/contact/:phone` retorna o print em dois formatos ideais para IA:
1. **URL Local**: `data.screenshot.imageUrl` (ex: `/api/screenshots/perfil_5511999999999_1728860000.png`)
2. **Base64 Direto**: `data.screenshot.base64` (ex: `data:image/png;base64,iVBORw0KGgo...`)

Você pode injetar o `base64` diretamente no payload de modelos com visão computacional (GPT-4o, Claude 3.5 Sonnet, Gemini Flash) para que a IA leia e interprete o print da barra lateral:

```python
messages = [
    {
        "role": "user",
        "content": [
            {"type": "text", "text": "Analise o print lateral deste perfil comercial do WhatsApp e resuma as informações:"},
            {
                "type": "image_url",
                "image_url": {
                    "url": resultado_da_api["data"]["screenshot"]["base64"]
                }
            }
        ]
    }
]
```

---

## 📊 6. Tabela de Endpoints

| Método | Endpoint | Descrição |
|---|---|---|
| `GET` | `/api/status` | Estado da conexão do WhatsApp e conta pareada |
| `GET` | `/api/qr` | QR Code em Base64 ou PNG (`?format=image`) |
| `GET` | `/api/contact/:phone` | Consulta completa de perfil + foto + print |
| `GET` | `/api/contact/:phone/picture` | Obtenção da URL da foto de perfil |
| `POST` | `/api/user/status` | Define novo recado via corpo JSON |
| `GET` | `/api/user/status?message=...` | Define novo recado via URL GET |
| `GET` | `/api/screenshots/:fileName` | Serve a imagem do print em PNG |
| `GET` | `/api/history` | Histórico das consultas recentes |
| `GET` | `/api/openapi.json` | Especificação completa OpenAPI 3.1 |
