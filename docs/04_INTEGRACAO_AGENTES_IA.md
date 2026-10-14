# 🤖 Módulo 04: Integração com Agentes de IA & LLMs

> **WhatsProfile Pro** - Software Specification Kit  
> **Camada:** Agentic AI Framework, Function Calling, LangChain, LangGraph & Multimodal Vision  
> **URL Base da API:** `http://localhost:1800`  
> **Catálogo de Tools OpenAPI 3.1:** `http://localhost:1800/api/openapi.json`  

---

### 1. Visão Geral da Arquitetura para IAs

O WhatsProfile Pro foi projetado para atuar como um **Agentic Tool Hub**. Através de seus contratos HTTP desacoplados, qualquer Large Language Model (GPT-4o, Claude 3.5 Sonnet, Gemini Flash, Llama 3) ou framework de orquestração pode:
1. Validar a base de clientes ou leads em tempo real antes de disparar automações.
2. Identificar se um lead é Pessoa Física ou Jurídica (**WhatsApp Business**).
3. Resgatar a foto de perfil para enriquecer cadastros no CRM.
4. Ler visualmente o print da barra lateral através de **Modelos com Visão Computacional (Vision)**.
5. Atualizar o recado/status institucional do número da empresa dinamicamente.

---

### 2. Definição Formal de Ferramentas (OpenAI Function Calling / Tools)

Copie e cole este array no parâmetro `tools` do cliente OpenAI:

```json
[
  {
    "type": "function",
    "function": {
      "name": "check_whatsapp_contact",
      "description": "Valida se um número de telefone possui conta no WhatsApp, identifica se é Conta Comercial (WhatsApp Business) ou Pessoal, extrai nome/razão social, recado (about), categoria, horários, endereço, foto em alta resolução e captura o print lateral 'Dados do contato'.",
      "parameters": {
        "type": "object",
        "properties": {
          "phone": {
            "type": "string",
            "description": "Número do telefone com ou sem DDI (Ex: 5565984424000, 11987654321 ou +55 65 98442-4000). O backend aplica sanitização automática."
          },
          "screenshot": {
            "type": "boolean",
            "description": "Se verdadeiro (padrão), realiza a captura visual recortada da barra lateral. Se falso, responde instantaneamente apenas com dados e foto.",
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
      "description": "Obtém exclusivamente a URL direta da foto de perfil em alta definição do contato no WhatsApp.",
      "parameters": {
        "type": "object",
        "properties": {
          "phone": {
            "type": "string",
            "description": "Número de telefone do contato a ser consultado."
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
      "description": "Altera o recado (mensagem de status pública) do perfil do WhatsApp conectado.",
      "parameters": {
        "type": "object",
        "properties": {
          "statusMessage": {
            "type": "string",
            "description": "Nova frase de status para o perfil (máximo 139 caracteres)."
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
      "description": "Checa o estado operacional do WhatsApp Web (READY, QR_READY, DISCONNECTED) e dados da conta pareada.",
      "parameters": {
        "type": "object",
        "properties": {}
      }
    }
  }
]
```

---

### 3. Implementação Prática em Python: OpenAI SDK (Tool Calling Loop)

O script abaixo demonstra a execução de um loop autônomo completo com `gpt-4o`:

```python
import os
import json
import requests
from openai import OpenAI

client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))
API_BASE = "http://localhost:1800"

def execute_tool(name: str, args: dict) -> dict:
    """Executa a chamada HTTP correspondente à ferramenta solicitada pelo LLM."""
    if name == "check_whatsapp_contact":
        phone = args.get("phone")
        screenshot = args.get("screenshot", True)
        res = requests.get(f"{API_BASE}/api/contact/{phone}", params={"screenshot": str(screenshot).lower()})
        return res.json()
    
    elif name == "get_profile_picture":
        phone = args.get("phone")
        res = requests.get(f"{API_BASE}/api/contact/{phone}/picture")
        return res.json()
        
    elif name == "set_user_status_message":
        res = requests.post(f"{API_BASE}/api/user/status", json=args)
        return res.json()
        
    elif name == "get_whatsapp_connection_status":
        res = requests.get(f"{API_BASE}/api/status")
        return res.json()
        
    return {"error": f"Ferramenta desconhecida: {name}"}

def run_agent(user_prompt: str):
    tools = [...] # Insira o array JSON do tópico 2 aqui
    messages = [
        {
            "role": "system",
            "content": (
                "Você é um Especialista em Inteligência e Automação de WhatsApp integrado ao WhatsProfile Pro na porta 1800. "
                "Responda sempre em Português do Brasil com clareza técnica. Ao consultar contatos, informe nome, "
                "categoria, status de cadastro e se é WhatsApp Business."
            )
        },
        {"role": "user", "content": user_prompt}
    ]

    response = client.chat.completions.create(
        model="gpt-4o",
        messages=messages,
        tools=tools,
        tool_choice="auto"
    )

    msg = response.choices[0].message
    if msg.tool_calls:
        messages.append(msg)
        for tool_call in msg.tool_calls:
            fn_name = tool_call.function.name
            fn_args = json.loads(tool_call.function.arguments)
            print(f"🤖 Agente invocando: {fn_name}({fn_args})")
            
            tool_result = execute_tool(fn_name, fn_args)
            messages.append({
                "role": "tool",
                "tool_call_id": tool_call.id,
                "content": json.dumps(tool_result, ensure_ascii=False)
            })

        # Resposta final sintetizada após a execução das ferramentas
        final_response = client.chat.completions.create(
            model="gpt-4o",
            messages=messages
        )
        print("\n💬 Resposta do Agente:\n", final_response.choices[0].message.content)
    else:
        print("\n💬 Resposta Direta:\n", msg.content)

if __name__ == "__main__":
    run_agent("Verifique os dados cadastrais da empresa no WhatsApp do número 55 65 98442-4000")
```

---

### 4. Integração com LangChain & LangGraph (Python)

```python
from langchain.tools import tool
import requests

API_BASE = "http://localhost:1800"

@tool
def check_whatsapp_contact(phone: str, screenshot: bool = True) -> dict:
    """Verifica cadastro no WhatsApp, extrai perfil, foto e print da barra lateral."""
    response = requests.get(f"{API_BASE}/api/contact/{phone}", params={"screenshot": str(screenshot).lower()})
    return response.json()

@tool
def update_whatsapp_status(status_message: str) -> dict:
    """Atualiza o recado (status público) da conta do WhatsApp conectada."""
    response = requests.post(f"{API_BASE}/api/user/status", json={"statusMessage": status_message})
    return response.json()

tools = [check_whatsapp_contact, update_whatsapp_status]
```

---

### 5. Análise de Imagem do Print por Modelos Multimodais (Vision)

O endpoint `/api/contact/:phone` retorna o campo `data.screenshot.base64`, que contém a imagem em formato `data:image/png;base64,...`. Essa representação pode ser injetada diretamente no payload de modelos de visão (como GPT-4o, Claude 3.5 Sonnet ou Gemini 1.5 Pro) para leitura não estruturada de catálogos e informações visuais:

```python
import requests
from openai import OpenAI

client = OpenAI()

def analisar_print_lateral(telefone: str):
    # 1. Consulta a API na porta 1800
    res = requests.get(f"http://localhost:1800/api/contact/{telefone}")
    data = res.json().get("data", {})
    
    screenshot_info = data.get("screenshot")
    if not screenshot_info or not screenshot_info.get("base64"):
        print("Nenhum print capturado para este contato.")
        return

    # 2. Envia a imagem para o GPT-4o Vision
    prompt_visao = [
        {
            "role": "user",
            "content": [
                {
                    "type": "text", 
                    "text": "Analise o print lateral deste perfil comercial do WhatsApp. Identifique ofertas visíveis, produtos em destaque ou informações adicionais:"
                },
                {
                    "type": "image_url",
                    "image_url": {
                        "url": screenshot_info["base64"]
                    }
                }
            ]
        }
    ]

    resposta_visao = client.chat.completions.create(
        model="gpt-4o",
        messages=prompt_visao,
        max_tokens=500
    )

    print("\n🔍 Parecer da Análise Visual:\n", resposta_visao.choices[0].message.content)
```

---

### 6. Plataformas No-Code / Low-Code (n8n, Dify, Flowise)

Para conectar o WhatsProfile Pro a plataformas visuais de fluxo:
1. **Importação OpenAPI 3.1 Automática:**
   - No **Dify** ou **Flowise**, crie uma nova *Custom Tool* e selecione a opção **Import from OpenAPI URL**.
   - Aponte para: `http://localhost:1800/api/openapi.json`.
   - Todas as ações (`checkWhatsAppContact`, `getProfilePicture`, `setUserStatusMessage`, etc.) serão geradas e tipadas imediatamente.
2. **Integração no n8n (HTTP Request Node):**
   - **Method:** `GET`
   - **URL:** `http://localhost:1800/api/contact/={{ $json.phone }}`
   - **Response Format:** `JSON`
