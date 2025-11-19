# 📚 Documentação do ChatBot para Oficiais de Chancelaria

Bem-vindo à documentação completa do sistema! Esta pasta contém todos os guias e manuais necessários para configurar, usar e manter o ChatBot.

---

## 📖 Índice Rápido

### 🚀 Começando

1. [**Setup Guide**](setup/SETUP_GUIDE.md) ⭐ **COMECE AQUI**
   - Instalação passo a passo
   - Configuração do Supabase
   - Criação do primeiro admin
   - Checklist completo

### 👨‍💼 Administração

2. [**Admin Dashboard**](admin/ADMIN_DASHBOARD.md)
   - Como usar o dashboard
   - Gerenciar prompts
   - Upload de documentos RAG
   - Visualizar e exportar logs
   - Configurar modelos

### 🎯 Guias de Uso

3. [**Prompt Oficial de Chancelaria**](guides/PROMPT_OFICIAL_CHANCELARIA.md)
   - Prompt especializado para Oficiais
   - Enfatiza distinção: Oficiais ≠ Diplomatas
   - Exemplos de interações
   - Como configurar no dashboard

4. [**OpenRouter Guide**](guides/OPENROUTER_GUIDE.md)
   - Integração com OpenRouter
   - Acesso a múltiplos modelos
   - Comparação de preços
   - Configuração avançada

5. [**Gemini Integration**](guides/GEMINI_INTEGRATION.md)
   - Google Gemini 2.5 (Pro, Flash, Flash-Lite)
   - Thinking Mode para raciocínio complexo
   - Google Search integration
   - Configuração e uso

6. [**Optimization Recommendations**](guides/OPTIMIZATION_RECOMMENDATIONS.md)
   - RAG avançado (Hybrid Search)
   - Row Level Security
   - Reranking e telemetria
   - Best practices

### 🔌 APIs Externas

7. [**Portal da Transparência**](api/PORTAL_TRANSPARENCIA_GUIDE.md)
   - Consulta gastos governamentais
   - Pesquisa contratos e licitações
   - Viagens a serviço
   - Setup e troubleshooting

---

## 🗺️ Estrutura da Documentação

```
docs/
├── README.md                          # Este arquivo
├── admin/
│   └── ADMIN_DASHBOARD.md            # Guia do dashboard
├── setup/
│   └── SETUP_GUIDE.md                # Setup inicial
├── guides/
│   ├── PROMPT_OFICIAL_CHANCELARIA.md # Prompt especializado
│   ├── OPENROUTER_GUIDE.md           # OpenRouter
│   ├── GEMINI_INTEGRATION.md         # Google Gemini
│   └── OPTIMIZATION_RECOMMENDATIONS.md # Otimizações
└── api/
    └── PORTAL_TRANSPARENCIA_GUIDE.md  # Portal API
```

---

## 📋 Guias por Persona

### 👨‍💻 Desenvolvedor

**Ordem recomendada:**
1. [Setup Guide](setup/SETUP_GUIDE.md) - Configuração inicial
2. [Optimization Recommendations](guides/OPTIMIZATION_RECOMMENDATIONS.md) - Melhorias
3. [Gemini Integration](guides/GEMINI_INTEGRATION.md) - Modelos avançados
4. [Portal da Transparência](api/PORTAL_TRANSPARENCIA_GUIDE.md) - API externa

### 👨‍💼 Administrador do Sistema

**Ordem recomendada:**
1. [Setup Guide](setup/SETUP_GUIDE.md) - Instalação
2. [Admin Dashboard](admin/ADMIN_DASHBOARD.md) - Gerenciamento
3. [Prompt Oficial de Chancelaria](guides/PROMPT_OFICIAL_CHANCELARIA.md) - Configuração
4. [OpenRouter Guide](guides/OPENROUTER_GUIDE.md) - Modelos

### 👥 Oficial de Chancelaria (Usuário Final)

**Leitura recomendada:**
1. [Prompt Oficial de Chancelaria](guides/PROMPT_OFICIAL_CHANCELARIA.md) - Entender o ChatBot
2. [Portal da Transparência](api/PORTAL_TRANSPARENCIA_GUIDE.md) - O que pode consultar

---

## 🎯 Guias por Tarefa

### Configuração Inicial
- ✅ [Setup Guide](setup/SETUP_GUIDE.md) - Passo a passo completo
- ✅ [Admin Dashboard](admin/ADMIN_DASHBOARD.md) - Criar primeiro admin

### Configurar Prompt
- ✅ [Prompt Oficial de Chancelaria](guides/PROMPT_OFICIAL_CHANCELARIA.md)
- ✅ [Admin Dashboard](admin/ADMIN_DASHBOARD.md) - Aba System Prompt

### Adicionar Legislações
- ✅ [Admin Dashboard](admin/ADMIN_DASHBOARD.md) - Aba RAG Files
- ✅ [Optimization Recommendations](guides/OPTIMIZATION_RECOMMENDATIONS.md) - Chunking

### Escolher Modelo
- ✅ [OpenRouter Guide](guides/OPENROUTER_GUIDE.md) - Comparação
- ✅ [Gemini Integration](guides/GEMINI_INTEGRATION.md) - Google Gemini
- ✅ [Admin Dashboard](admin/ADMIN_DASHBOARD.md) - Aba Settings

### Ver Logs e Exportar
- ✅ [Admin Dashboard](admin/ADMIN_DASHBOARD.md) - Aba Chat Logs

### Consultar Portal da Transparência
- ✅ [Portal da Transparência](api/PORTAL_TRANSPARENCIA_GUIDE.md) - Setup e uso

### Otimizar Performance
- ✅ [Optimization Recommendations](guides/OPTIMIZATION_RECOMMENDATIONS.md) - Tudo

---

## 🔍 Pesquisa Rápida

### Como fazer X?

| Tarefa | Documento |
|--------|-----------|
| Instalar e configurar | [Setup Guide](setup/SETUP_GUIDE.md) |
| Criar admin | [Setup Guide](setup/SETUP_GUIDE.md) → Passo 3 |
| Mudar o prompt | [Admin Dashboard](admin/ADMIN_DASHBOARD.md) → Aba System Prompt |
| Adicionar legislação | [Admin Dashboard](admin/ADMIN_DASHBOARD.md) → Aba RAG Files |
| Trocar modelo | [Admin Dashboard](admin/ADMIN_DASHBOARD.md) → Aba Settings |
| Ver conversas | [Admin Dashboard](admin/ADMIN_DASHBOARD.md) → Aba Chat Logs |
| Exportar logs | [Admin Dashboard](admin/ADMIN_DASHBOARD.md) → Botão Export CSV |
| Usar Gemini | [Gemini Integration](guides/GEMINI_INTEGRATION.md) |
| Habilitar Thinking Mode | [Gemini Integration](guides/GEMINI_INTEGRATION.md) → Configuração |
| Consultar gastos do MRE | [Portal da Transparência](api/PORTAL_TRANSPARENCIA_GUIDE.md) |
| Otimizar RAG | [Optimization Recommendations](guides/OPTIMIZATION_RECOMMENDATIONS.md) |
| Reduzir custos | [OpenRouter Guide](guides/OPENROUTER_GUIDE.md) → Comparação |

---

## ❓ FAQ

### Onde encontro...?

**Instruções de instalação?**
→ [Setup Guide](setup/SETUP_GUIDE.md)

**Como usar o dashboard?**
→ [Admin Dashboard](admin/ADMIN_DASHBOARD.md)

**Qual prompt usar?**
→ [Prompt Oficial de Chancelaria](guides/PROMPT_OFICIAL_CHANCELARIA.md)

**Qual modelo escolher?**
→ [OpenRouter Guide](guides/OPENROUTER_GUIDE.md) ou [Gemini Integration](guides/GEMINI_INTEGRATION.md)

**Como melhorar performance?**
→ [Optimization Recommendations](guides/OPTIMIZATION_RECOMMENDATIONS.md)

**Como consultar gastos públicos?**
→ [Portal da Transparência](api/PORTAL_TRANSPARENCIA_GUIDE.md)

---

## 📞 Suporte

Se não encontrar o que precisa:

1. **Verifique o README principal** - [../README.md](../README.md)
2. **Consulte o CHANGELOG** - [../CHANGELOG.md](../CHANGELOG.md)
3. **Revise os guias específicos** acima
4. **Troubleshooting** - Cada guia tem seção de troubleshooting

---

## 📝 Convenções

### Símbolos Usados

- ✅ Feature implementada
- 🆕 Novidade/Recurso recente
- ⚠️ Atenção/Importante
- 💡 Dica útil
- 🔧 Configuração necessária
- 📊 Performance/Métricas
- 🔒 Segurança
- 💰 Custos/Preços
- ⭐ Recomendado
- ❌ Não fazer isso

### Formato de Comandos

```bash
# Comando de exemplo
npm run comando
```

### Formato de Código

```typescript
// Exemplo de código TypeScript
const example = "valor";
```

### Formato de Configuração

```env
# Exemplo de .env
VARIAVEL=valor
```

---

## 🔄 Atualizações

Esta documentação é atualizada junto com o código. Sempre verifique:
- [CHANGELOG.md](../CHANGELOG.md) para ver as últimas mudanças
- Versão atual no README principal

**Última atualização:** 2025-11-16
**Versão da documentação:** v2.1.0

---

## 🤝 Contribuindo

Encontrou algo faltando ou incorreto na documentação?

1. Abra uma issue descrevendo o problema
2. Sugira melhorias via Pull Request
3. Entre em contato com a equipe de desenvolvimento

---

**Boa leitura!** 📖✨
