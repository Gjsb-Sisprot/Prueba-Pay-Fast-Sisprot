
export interface MCPToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, {
      type: string;
      description: string;
      enum?: string[];
    }>;
    required: string[];
  };
}

export const MCP_TOOL_DEFINITIONS: MCPToolDefinition[] = [
  {
    name: "save_interaction",
    description: "Guarda un mensaje en el historial de conversación",
    inputSchema: {
      type: "object",
      properties: {
        sessionId: { type: "string", description: "ID de la sesión" },
        role: { type: "string", description: "Rol: user, model, tool" },
        content: { type: "string", description: "Contenido del mensaje" },
      },
      required: ["sessionId", "role", "content"],
    },
  },
  {
    name: "set_session_state",
    description: "Guarda estado temporal de sesión",
    inputSchema: {
      type: "object",
      properties: {
        sessionId: { type: "string", description: "ID de la sesión" },
        key: { type: "string", description: "Clave del estado" },
        value: { type: "string", description: "Valor a guardar" },
      },
      required: ["sessionId", "key", "value"],
    },
  },
  {
    name: "delete_session_state",
    description: "Elimina estado temporal de sesión",
    inputSchema: {
      type: "object",
      properties: {
        sessionId: { type: "string", description: "ID de la sesión" },
        key: { type: "string", description: "Clave del estado a eliminar" },
      },
      required: ["sessionId", "key"],
    },
  },
  {
    name: "search_knowledge_base",
    description: "Búsqueda semántica en la base de conocimientos (planes, precios, FAQ, procedimientos)",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Pregunta o tema a buscar" },
        topK: { type: "number", description: "Número de resultados (default: 5)" },
      },
      required: ["query"],
    },
  },
  {
    name: "add_knowledge",
    description: "Agrega documento a la base de conocimientos",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Título del documento" },
        content: { type: "string", description: "Contenido del documento" },
        category: { type: "string", description: "Categoría: faq, guide, policy, procedure" },
      },
      required: ["title", "content", "category"],
    },
  },
  {
    name: "update_summary",
    description: "Actualiza el resumen de la conversación para handover",
    inputSchema: {
      type: "object",
      properties: {
        sessionId: { type: "string", description: "ID de la sesión" },
        summary: { type: "string", description: "Resumen actualizado" },
      },
      required: ["sessionId", "summary"],
    },
  },
  {
    name: "escalate_to_specialist",
    description: "Registra oficialmente la conversación como un ticket de soporte técnico",
    inputSchema: {
      type: "object",
      properties: {
        sessionId: { type: "string", description: "ID de la sesión" },
        reason: { type: "string", description: "Motivo de escalamiento" },
      },
      required: ["sessionId", "reason"],
    },
  },
  {
    name: "close_conversation",
    description: "Cierra la conversación con resolución",
    inputSchema: {
      type: "object",
      properties: {
        sessionId: { type: "string", description: "ID de la sesión" },
        resolution: { type: "string", description: "Resolución del caso" },
      },
      required: ["sessionId", "resolution"],
    },
  },
  {
    name: "takeover_conversation",
    description: "Un agente externo toma control de la conversación",
    inputSchema: {
      type: "object",
      properties: {
        sessionId: { type: "string", description: "ID de la sesión" },
        specialistId: { type: "string", description: "ID del especialista" },
      },
      required: ["sessionId", "specialistId"],
    },
  },
  {
    name: "list_conversations",
    description: "Lista conversaciones con filtros y paginación",
    inputSchema: {
      type: "object",
      properties: {
        status: { type: "string", description: "Filtrar por estado" },
        limit: { type: "number", description: "Límite de resultados" },
        offset: { type: "number", description: "Offset para paginación" },
      },
      required: [],
    },
  },
  {
    name: "search_conversations",
    description: "Busca conversaciones por cliente/contrato/sector",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Término de búsqueda" },
        field: { type: "string", description: "Campo: identification, contract, sector" },
      },
      required: ["query"],
    },
  },
  {
    name: "get_specialist_stats",
    description: "Obtiene estadísticas de un especialista",
    inputSchema: {
      type: "object",
      properties: {
        specialistId: { type: "string", description: "ID del especialista" },
      },
      required: ["specialistId"],
    },
  },
  {
    name: "reboot_onu",
    description: "Reinicia ONU remotamente",
    inputSchema: {
      type: "object",
      properties: {
        serialNumber: { type: "string", description: "Serial de la ONU" },
      },
      required: ["serialNumber"],
    },
  },
];
