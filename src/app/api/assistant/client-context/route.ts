
import { NextRequest, NextResponse } from "next/server";
import type { ClientContextData } from "@/modules/assistant/lib/types";


const MCP_SERVER_URL =
  process.env.MCP_SERVER_URL || "https://mcp-hono-production.up.railway.app";
const MCP_API_KEY = process.env.MCP_API_KEY || "";

const clientCache = new Map<string, { data: ClientContextData; expiresAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000;


interface MCPServiceDetail {
  id: number;
  mac: string;
  ip: string;
  serial: string;
  contract_detail: number;
  contract: number;
}

interface MCPContractDetail {
  id: number;
  nodo: string | null;
  nodo_name: string | null;
  plan: number;
  plan_cost: number;
  plan_name: string;
  service_type: number;
  service_type_name: string;
  status: number;
  status_name: string;
  date_end: string | null;
  service_detail: MCPServiceDetail[];
}

interface MCPBankAssociated {
  id: number;
  bank_associated: number;
  bank_associated_name: string;
  contract: number;
  nro_cta: string;
  tlf: string;
  name: string;
  bank_name: string;
  bank_id: string;
  identification: string;
  payment_method: number;
  payment_method_name: string;
}

interface MCPRawContract {
  id: number;
  client_id: number;
  name: string;
  last_name: string;
  identification: string;
  installation_order: string;
  mobile: string;
  email: string;
  latitude: string;
  longitude: string;
  pin_code: string;
  client_type: number;
  client_type_name: string;
  sector_id: number;
  sector_name: string;
  parish_id: number;
  parish_name: string;
  cycle: number;
  cycle_end: number;
  status: number;
  status_name: string;
  address: string;
  migrate: boolean;
  debt: number;
  debt_bs?: number;
  contract_tag: "available" | "verify" | "with_debt";
  next_invoice_validation_log?: {
    not_found?: number;
    used?: number;
    error?: number;
    payment?: number;
    definitely_not_found?: number;
    canceled?: number;
  } | null;
  contract_detail: MCPContractDetail[];
  contract_bank_associated: MCPBankAssociated[];
}


export async function GET(request: NextRequest) {
  const identification = request.nextUrl.searchParams.get("identification");

  if (!identification) {
    return NextResponse.json(
      { success: false, error: "Parametro identification requerido" },
      { status: 400 }
    );
  }

  const normalizedId = identification.toUpperCase().trim();

  const cached = clientCache.get(normalizedId);
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json({ success: true, data: cached.data, fromCache: true });
  }

  try {

    const response = await fetch(`${MCP_SERVER_URL}/api/tools/get_client_contracts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(MCP_API_KEY ? { Authorization: `Bearer ${MCP_API_KEY}` } : {}),
      },
      body: JSON.stringify({ identification: normalizedId }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { success: false, error: "Error al consultar datos del cliente" },
        { status: response.status }
      );
    }

    const rawResponse = await response.json();

    const contracts = parseMCPContractsResponse(rawResponse);

    if (!contracts || contracts.length === 0) {
      return NextResponse.json(
        { success: false, error: "Cliente no encontrado" },
        { status: 404 }
      );
    }

    const clientData = transformToClientContext(contracts);

    clientCache.set(normalizedId, {
      data: clientData,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });

    return NextResponse.json({ success: true, data: clientData });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Error de conexion con el servidor MCP" },
      { status: 502 }
    );
  }
}


function parseMCPContractsResponse(raw: unknown): MCPRawContract[] | null {
  if (!raw || typeof raw !== "object") return null;

  const obj = raw as Record<string, unknown>;

  if (obj.success === true && Array.isArray(obj.data)) {
    return obj.data as MCPRawContract[];
  }

  if (obj.result && typeof obj.result === "object") {
    const result = obj.result as Record<string, unknown>;
    if (result.success === true && Array.isArray(result.data)) {
      return result.data as MCPRawContract[];
    }
  }

  if (Array.isArray(obj.content)) {
    const first = obj.content[0] as Record<string, unknown> | undefined;
    if (first?.text && typeof first.text === "string") {
      try {
        const parsed = JSON.parse(first.text);
        return parseMCPContractsResponse(parsed);
      } catch {
      }
    }
  }

  if (Array.isArray(obj.data)) {
    return obj.data as MCPRawContract[];
  }

  return null;
}


function transformToClientContext(contracts: MCPRawContract[]): ClientContextData {
  const firstContract = contracts[0];

  const totalDebt = contracts.reduce((sum, c) => sum + (c.debt || 0), 0);

  const activeCount = contracts.filter(
    (c) => c.contract_tag === "available" || c.contract_tag === "verify"
  ).length;
  const suspendedCount = contracts.filter(
    (c) => c.contract_tag === "with_debt"
  ).length;

  const primaryContract =
    contracts.find((c) => c.contract_tag === "available") ||
    contracts.find((c) => c.contract_tag === "verify") ||
    contracts[0];

  const onuSerial =
    primaryContract.contract_detail?.[0]?.service_detail?.[0]?.serial;

  const serviceStatus: ClientContextData["serviceStatus"] =
    primaryContract.contract_tag === "with_debt" ? "suspended" : "active";

  return {
    identification: firstContract.identification,
    name: `${firstContract.name} ${firstContract.last_name}`.trim(),
    email: firstContract.email || undefined,
    phone: firstContract.mobile || undefined,
    contract: primaryContract.id.toString(),
    order: primaryContract.installation_order,
    sector: primaryContract.sector_name,
    parish: primaryContract.parish_name,
    address: primaryContract.address,
    planName: primaryContract.contract_detail?.[0]?.plan_name,
    cycle: primaryContract.cycle,
    serviceStatus,
    hasDebt: totalDebt > 0,
    debtAmount: totalDebt,
    onuSerial,
    contractTag: primaryContract.contract_tag,
    clientType: firstContract.client_type_name,
    totalContracts: contracts.length,
    activeContracts: activeCount,
    suspendedContracts: suspendedCount,
    allContracts: contracts.map((c) => ({
      contractId: c.id,
      installationOrder: c.installation_order,
      status: c.status_name,
      statusCode: c.status,
      debt: c.debt || 0,
      debtBs: c.debt_bs || 0,
      hasDebt: (c.debt || 0) > 0,
      sector: c.sector_name,
      parish: c.parish_name,
      planName: c.contract_detail?.[0]?.plan_name,
      address: c.address,
      contractTag: c.contract_tag,
      onuSerial: c.contract_detail?.[0]?.service_detail?.[0]?.serial,
      nextInvoiceValidationLog: c.next_invoice_validation_log
        ? {
            notFound: c.next_invoice_validation_log.not_found,
            used: c.next_invoice_validation_log.used,
            error: c.next_invoice_validation_log.error,
            payment: c.next_invoice_validation_log.payment,
            definitelyNotFound: c.next_invoice_validation_log.definitely_not_found,
            canceled: c.next_invoice_validation_log.canceled,
          }
        : null,
    })),
  };
}
