# Integração com Portal da Transparência

Guia para usar a API do Portal da Transparência do Governo Federal no ChatBot.

## 🎯 O Que é o Portal da Transparência?

O [Portal da Transparência](https://portaldatransparencia.gov.br/) é uma iniciativa do Governo Federal para dar publicidade aos gastos realizados pelo poder público, permitindo o acompanhamento e fiscalização pela sociedade.

A API permite consultar programaticamente informações sobre:
- 💰 Despesas e gastos públicos
- 👥 Servidores públicos federais
- 📄 Contratos e licitações
- ✈️ Viagens a serviço
- 🤝 Convênios e parcerias
- ⚖️ Sanções administrativas

---

## 🚀 Setup

### 1. Obter API Key

1. Acesse https://api.portaldatransparencia.gov.br/
2. Clique em "Solicitar Token"
3. Preencha o formulário
4. Copie sua chave de API (formato: `chave-api-dados`)

### 2. Configurar Ambiente

Adicione ao `.env.local`:

```env
PORTAL_TRANSPARENCIA_API_KEY=sua-chave-aqui
```

### 3. Tool Automática no ChatBot

O chatbot já possui uma tool chamada `consultarTransparencia` que é ativada automaticamente quando o usuário faz perguntas relacionadas a transparência governamental.

**Exemplos de perguntas que ativam a tool:**
- "Quanto o Ministério das Relações Exteriores gastou em 2024?"
- "Quais foram as viagens a serviço do MRE no último mês?"
- "Mostre os contratos do Itamaraty"
- "Quantos servidores tem o MRE?"

---

## 📊 Endpoints Disponíveis

### 1. Órgãos SIAFI

Busca códigos e nomes de órgãos federais.

**Exemplo:**
```typescript
import { buscarOrgaosSIAFI } from "@/lib/api/portal-transparencia";

// Buscar por nome
const orgaos = await buscarOrgaosSIAFI({ nome: "Relações Exteriores" });

// Buscar por código
const orgao = await buscarOrgaosSIAFI({ codigo: "35000" });
```

**Códigos Úteis:**
- `35000` - Ministério das Relações Exteriores

### 2. Despesas por Órgão

Consulta gastos de um órgão em um ano específico.

**Exemplo:**
```typescript
import { buscarDespesasPorOrgao } from "@/lib/api/portal-transparencia";

// Despesas do MRE em 2024
const despesas = await buscarDespesasPorOrgao(2024, "35000");
```

**Resposta inclui:**
- Total gasto
- Despesas empenhadas, liquidadas, pagas
- Valores por categoria

### 3. Contratos

Busca contratos federais em um período.

**Exemplo:**
```typescript
import { buscarContratos } from "@/lib/api/portal-transparencia";

// Contratos do MRE em janeiro/2024
const contratos = await buscarContratos(
  "01/01/2024",
  "31/01/2024",
  "35000"
);
```

**Resposta inclui:**
- Número do contrato
- Contratado (CNPJ/Nome)
- Valor
- Objeto do contrato

### 4. Viagens a Serviço

Consulta viagens realizadas por servidores.

**Exemplo:**
```typescript
import { buscarViagens } from "@/lib/api/portal-transparencia";

// Viagens do MRE em dezembro/2024
const viagens = await buscarViagens(
  "01/12/2024",
  "31/12/2024",
  "35000"
);
```

**Resposta inclui:**
- Servidor
- Destino
- Data de ida/volta
- Valor das diárias e passagens

### 5. Licitações

Busca processos licitatórios.

**Exemplo:**
```typescript
import { buscarLicitacoes } from "@/lib/api/portal-transparencia";

const licitacoes = await buscarLicitacoes(
  "01/01/2024",
  "31/12/2024",
  "35000"
);
```

### 6. Servidores por Órgão

Lista servidores de um órgão.

**Exemplo:**
```typescript
import { buscarServidoresPorOrgao } from "@/lib/api/portal-transparencia";

const servidores = await buscarServidoresPorOrgao("35000", 1);
```

---

## 🤖 Como o ChatBot Usa

### Tool: `consultarTransparencia`

O chatbot tem uma tool especial que detecta quando a pergunta do usuário requer consulta ao Portal da Transparência.

**Critérios de ativação:**
- ✅ Pergunta menciona "gasto", "despesa", "custo", "orçamento"
- ✅ Pergunta sobre "contratos", "licitações", "viagens"
- ✅ Pergunta sobre "servidores", "funcionários" de órgão específico
- ✅ Menciona órgão federal (MRE, Itamaraty, etc)

**Quando NÃO usar:**
- ❌ Perguntas sobre legislação (use RAG)
- ❌ Perguntas conceituais
- ❌ Informações que já estão no RAG

### Fluxo de Uso

```
Usuário: "Quanto o MRE gastou em 2024?"
   ↓
ChatBot detecta necessidade de consulta
   ↓
Tool consultarTransparencia ativada
   ↓
Consulta à API do Portal da Transparência
   ↓
Resposta formatada ao usuário
```

---

## 💻 Código da Tool

A tool já está implementada em `/app/(preview)/api/chat/route.ts`:

```typescript
consultarTransparencia: tool({
  description: `Consulta dados do Portal da Transparência do Governo Federal.
    Use APENAS quando o usuário perguntar EXPLICITAMENTE sobre:
    - Gastos/despesas de órgãos federais
    - Contratos governamentais
    - Viagens a serviço
    - Licitações
    - Servidores públicos federais
    NÃO use para perguntas sobre legislação ou conceitos.`,

  inputSchema: z.object({
    tipo: z.enum([
      "despesas",
      "contratos",
      "viagens",
      "licitacoes",
      "servidores",
      "orgaos"
    ]).describe("Tipo de consulta"),

    ano: z.number().optional().describe("Ano de referência"),

    dataInicial: z.string().optional().describe("Data inicial (dd/MM/yyyy)"),

    dataFinal: z.string().optional().describe("Data final (dd/MM/yyyy)"),

    codigoOrgao: z.string().optional().describe("Código SIAFI do órgão (ex: 35000 para MRE)"),

    nomeOrgao: z.string().optional().describe("Nome do órgão para buscar código"),
  }),

  execute: async ({ tipo, ano, dataInicial, dataFinal, codigoOrgao, nomeOrgao }) => {
    // Lógica de consulta
  },
}),
```

---

## 🔍 Casos de Uso Específicos

### Para Oficiais de Chancelaria

#### 1. Consultar Orçamento do MRE

**Pergunta:** "Qual foi o orçamento total do Ministério das Relações Exteriores em 2024?"

**Resposta esperada:**
- Total empenhado
- Total liquidado
- Total pago
- Principais categorias de despesa

#### 2. Viagens de Representação

**Pergunta:** "Quais foram as principais viagens do Itamaraty em dezembro de 2024?"

**Resposta esperada:**
- Lista de viagens
- Destinos
- Servidores
- Valores

#### 3. Contratos de Serviços

**Pergunta:** "Mostre os maiores contratos do MRE no último ano"

**Resposta esperada:**
- Contratos ordenados por valor
- Contratados
- Objetos dos contratos

---

## ⚙️ Configurações Avançadas

### Habilitar/Desabilitar via Dashboard

Adicione uma setting no dashboard:

```sql
INSERT INTO settings (id, key, value, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'portal_transparencia_enabled',
  'true',
  NOW(),
  NOW()
);
```

Depois, no código:

```typescript
const portalEnabled = (await getSetting("portal_transparencia_enabled")) === "true";

const tools: any = {
  addResource: tool({ /* ... */ }),
  getInformation: tool({ /* ... */ }),
};

// Adicionar tool apenas se habilitado
if (portalEnabled) {
  tools.consultarTransparencia = tool({ /* ... */ });
}
```

### Rate Limiting

A API do Portal da Transparência tem limites de requisições. Implemente cache:

```typescript
const transparenciaCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 60; // 1 hora

export async function consultarPortalTransparenciaComCache(options: any) {
  const cacheKey = JSON.stringify(options);

  // Verificar cache
  const cached = transparenciaCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  // Consultar API
  const data = await consultarPortalTransparencia(options);

  // Salvar no cache
  transparenciaCache.set(cacheKey, { data, timestamp: Date.now() });

  return data;
}
```

---

## 🐛 Troubleshooting

### Erro: "API Key não configurada"

✅ Verifique se `PORTAL_TRANSPARENCIA_API_KEY` está no `.env.local`
✅ Reinicie o servidor após adicionar a variável

### Erro: 401 Unauthorized

✅ Confirme que a API key está correta
✅ Verifique se não expirou
✅ Solicite nova chave se necessário

### Erro: 400 Bad Request

✅ Verifique formato de datas (dd/MM/yyyy)
✅ Confirme que o código do órgão existe
✅ Verifique parâmetros obrigatórios

### Respostas vazias

✅ Órgão pode não ter dados para o período
✅ Verifique se o código está correto
✅ Tente período diferente

### Rate Limit excedido

✅ Implemente cache (ver seção acima)
✅ Reduza frequência de chamadas
✅ Entre em contato com suporte da API

---

## 📚 Recursos

- [Portal da Transparência](https://portaldatransparencia.gov.br/)
- [Documentação da API](https://api.portaldatransparencia.gov.br/v3/api-docs)
- [Solicitar Token](https://api.portaldatransparencia.gov.br/)
- [Decreto nº 8.777/2016](http://www.planalto.gov.br/ccivil_03/_ato2015-2018/2016/decreto/d8777.htm)

---

## ⚠️ Avisos Importantes

1. **Uso Responsável:** Use apenas quando necessário para evitar sobrecarregar a API
2. **Cache:** Implemente cache para requisições frequentes
3. **Privacidade:** Dados de servidores são públicos, mas use com responsabilidade
4. **Precisão:** Sempre indique que os dados vêm do Portal da Transparência
5. **Atualização:** Dados podem ter defasagem de alguns dias

---

## ✅ Checklist de Implementação

- [ ] Obter API Key do Portal da Transparência
- [ ] Adicionar `PORTAL_TRANSPARENCIA_API_KEY` ao `.env.local`
- [ ] Testar consulta de órgãos
- [ ] Testar consulta de despesas
- [ ] Testar consulta de viagens
- [ ] Implementar cache (recomendado)
- [ ] Adicionar setting no dashboard
- [ ] Documentar para equipe
- [ ] Testar com perguntas reais
- [ ] Monitorar usage da API

---

## 🎯 Exemplo Completo

```typescript
// Pergunta do usuário
"Quanto o Ministério das Relações Exteriores gastou em viagens em 2024?"

// ChatBot identifica necessidade de consulta
// Tool consultarTransparencia ativada com:
{
  tipo: "viagens",
  dataInicial: "01/01/2024",
  dataFinal: "31/12/2024",
  codigoOrgao: "35000" // MRE
}

// API retorna dados
// ChatBot formata resposta:
"De acordo com o Portal da Transparência, o Ministério das Relações Exteriores
gastou R$ X milhões em viagens a serviço em 2024, com um total de Y viagens realizadas.
As principais destinações foram [lista]."
```

**Fonte sempre citada:** Todos os dados vêm do Portal da Transparência do Governo Federal.
