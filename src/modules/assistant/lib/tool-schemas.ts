
import { z } from "zod";


export type ToolStatus = "enabled" | "disabled" | "coming_soon";

export interface ToolConfig {
  name: string;
  description: string;
  status: ToolStatus;
  icon: string;
}

export const ASSISTANT_TOOLS: Record<string, ToolConfig> = {
  database: {
    name: "Consulta de Base de Datos",
    description: "Consulta información de clientes, facturas y contratos",
    status: "coming_soon",
    icon: "Database",
  },
  rag: {
    name: "Base de Conocimientos",
    description: "Busca en documentos y guías de Sisprot",
    status: "coming_soon",
    icon: "BookOpen",
  },
  api: {
    name: "APIs Externas",
    description: "Consulta tasas de cambio, estado de pagos, etc.",
    status: "coming_soon",
    icon: "Globe",
  },
} as const;


export const databaseQuerySchema = z.object({
  queryType: z
    .enum(["client", "invoice", "contract", "payment"])
    .describe("Tipo de entidad a consultar"),
  identifier: z
    .string()
    .describe("Identificador único (cédula, número de contrato, etc.)"),
  fields: z
    .array(z.string())
    .optional()
    .describe("Campos específicos a retornar"),
});

export type DatabaseQueryInput = z.infer<typeof databaseQuerySchema>;

export const ragSearchSchema = z.object({
  query: z
    .string()
    .describe("Pregunta o consulta en lenguaje natural"),
  category: z
    .enum(["faq", "guide", "policy", "general"])
    .optional()
    .describe("Categoría de documentos a buscar"),
  topK: z
    .number()
    .min(1)
    .max(10)
    .optional()
    .describe("Número de resultados relevantes a retornar (default: 3)"),
});

export type RagSearchInput = z.infer<typeof ragSearchSchema>;

export const apiCallSchema = z.object({
  endpoint: z
    .enum(["currency_rate", "payment_status", "service_status"])
    .describe("Endpoint de API a consultar"),
  params: z
    .record(z.string(), z.string())
    .optional()
    .describe("Parámetros adicionales para la consulta"),
});

export type ApiCallInput = z.infer<typeof apiCallSchema>;


export interface DatabaseQueryResult {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
  queryType: string;
}

export interface RagSearchResult {
  success: boolean;
  results?: Array<{
    content: string;
    similarity: number;
    source?: string;
  }>;
  error?: string;
}

export interface ApiCallResult {
  success: boolean;
  data?: unknown;
  error?: string;
  endpoint: string;
}
