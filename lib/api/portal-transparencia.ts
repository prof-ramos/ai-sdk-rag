/**
 * Helper para consultar a API do Portal da Transparência do Governo Federal
 * Documentação: https://api.portaldatransparencia.gov.br/v3/api-docs
 */

const BASE_URL = "https://api.portaldatransparencia.gov.br/api-de-dados";
const API_KEY = process.env.PORTAL_TRANSPARENCIA_API_KEY || "";

interface PortalTransparenciaOptions {
  endpoint: string;
  params?: Record<string, string | number>;
}

/**
 * Faz uma requisição à API do Portal da Transparência
 */
export async function consultarPortalTransparencia({
  endpoint,
  params = {},
}: PortalTransparenciaOptions): Promise<any> {
  if (!API_KEY) {
    throw new Error(
      "PORTAL_TRANSPARENCIA_API_KEY não configurada. Obtenha em https://api.portaldatransparencia.gov.br/"
    );
  }

  // Construir query string
  const queryParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    queryParams.append(key, String(value));
  });

  const url = `${BASE_URL}${endpoint}?${queryParams.toString()}`;

  try {
    const response = await fetch(url, {
      headers: {
        "chave-api-dados": API_KEY,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(
        `Portal da Transparência API error: ${response.status} ${response.statusText}`
      );
    }

    return await response.json();
  } catch (error) {
    console.error("Erro ao consultar Portal da Transparência:", error);
    throw error;
  }
}

/**
 * Busca órgãos do SIAFI (Sistema Integrado de Administração Financeira)
 */
export async function buscarOrgaosSIAFI(params?: { codigo?: string; nome?: string }) {
  return consultarPortalTransparencia({
    endpoint: "/orgaos-siafi",
    params: params || {},
  });
}

/**
 * Busca despesas por órgão
 * @param ano Ano de referência (obrigatório)
 * @param codigoOrgao Código do órgão (opcional)
 */
export async function buscarDespesasPorOrgao(ano: number, codigoOrgao?: string) {
  const params: any = { ano };
  if (codigoOrgao) params.codigoOrgao = codigoOrgao;

  return consultarPortalTransparencia({
    endpoint: "/despesas/por-orgao",
    params,
  });
}

/**
 * Busca contratos federais
 * @param dataInicial Data inicial (formato: dd/MM/yyyy)
 * @param dataFinal Data final (formato: dd/MM/yyyy)
 * @param codigoOrgao Código do órgão
 */
export async function buscarContratos(
  dataInicial: string,
  dataFinal: string,
  codigoOrgao: string
) {
  return consultarPortalTransparencia({
    endpoint: "/contratos",
    params: {
      dataInicial,
      dataFinal,
      codigoOrgao,
    },
  });
}

/**
 * Busca viagens a serviço
 * @param dataIdaDe Data inicial (formato: dd/MM/yyyy)
 * @param dataIdaAte Data final (formato: dd/MM/yyyy)
 * @param codigoOrgao Código do órgão
 */
export async function buscarViagens(
  dataIdaDe: string,
  dataIdaAte: string,
  codigoOrgao?: string
) {
  const params: any = {
    dataIdaDe,
    dataIdaAte,
  };

  if (codigoOrgao) params.codigoOrgao = codigoOrgao;

  return consultarPortalTransparencia({
    endpoint: "/viagens",
    params,
  });
}

/**
 * Busca licitações
 * @param dataInicial Data inicial (formato: dd/MM/yyyy)
 * @param dataFinal Data final (formato: dd/MM/yyyy)
 * @param codigoOrgao Código do órgão
 */
export async function buscarLicitacoes(
  dataInicial: string,
  dataFinal: string,
  codigoOrgao: string
) {
  return consultarPortalTransparencia({
    endpoint: "/licitacoes",
    params: {
      dataInicial,
      dataFinal,
      codigoOrgao,
    },
  });
}

/**
 * Busca informações de servidores por órgão
 * @param codigoOrgao Código do órgão (SIAPE)
 * @param pagina Página (opcional, padrão: 1)
 */
export async function buscarServidoresPorOrgao(codigoOrgao: string, pagina: number = 1) {
  return consultarPortalTransparencia({
    endpoint: "/servidores/por-orgao",
    params: {
      codigoOrgao,
      pagina,
    },
  });
}
