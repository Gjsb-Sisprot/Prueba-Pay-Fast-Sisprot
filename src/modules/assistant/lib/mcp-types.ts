
import { createMCPClient } from "@ai-sdk/mcp";

export type MCPClientType = Awaited<ReturnType<typeof createMCPClient>>;

export type MCPToolSet = Awaited<ReturnType<MCPClientType["tools"]>>;

export interface ConversationMessage {
  role: "user" | "model" | "tool";
  content: string;
  timestamp: string;
  toolCallId?: string;
  toolName?: string;
}

export interface MCPClientContract {
  contractId: number;
  clientName: string;
  status: string;
  statusCode: number;
  isSuspended: boolean;
  isActive: boolean;
  debt: string;
  hasDebt: boolean;
  sector: string;
  onuSerial: string;
  onuMac: string;
  ppuser: string;
}

export interface MCPClientStatusResponse {
  success: boolean;
  data?: {
    identification: string;
    contracts: MCPClientContract[];
    summary: {
      totalContracts: number;
      activeContracts: number;
      suspendedContracts: number;
      hasAnyDebt: boolean;
    };
  };
}
