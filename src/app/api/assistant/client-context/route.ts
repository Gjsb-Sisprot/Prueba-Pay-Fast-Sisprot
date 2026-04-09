import { NextRequest, NextResponse } from "next/server";
import { fetchClientContracts } from "@/modules/assistant/lib/sisprot-api";
import type { ClientContextData } from "@/modules/assistant/lib/types";

const clientCache = new Map<string, { data: ClientContextData; expiresAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000;

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
    const { contracts, debugUrl } = await fetchClientContracts(normalizedId);

    if (contracts.length === 0) {
      return NextResponse.json(
        { success: false, error: "Cliente no encontrado", debugUrl },
        { status: 404 }
      );
    }

    const firstContract = contracts[0];
    const totalDebt = contracts.reduce((sum, c) => sum + parseFloat(c.debt || "0"), 0);
    const activeCount = contracts.filter(c => c.isActive).length;
    const suspendedCount = contracts.length - activeCount;

    const clientData: ClientContextData = {
      identification: normalizedId,
      name: firstContract.clientName,
      contract: firstContract.contractId.toString(),
      sector: firstContract.sector,
      address: firstContract.address,
      planName: firstContract.planName,
      serviceStatus: firstContract.isActive ? "active" : "suspended",
      hasDebt: totalDebt > 0,
      debtAmount: totalDebt,
      onuSerial: firstContract.onuSerial,
      totalContracts: contracts.length,
      activeContracts: activeCount,
      suspendedContracts: suspendedCount,
      allContracts: contracts.map(c => ({
        contractId: c.contractId,
        status: c.status,
        statusCode: c.statusCode,
        debt: parseFloat(c.debt || "0"),
        hasDebt: parseFloat(c.debt || "0") > 0,
        sector: c.sector,
        planName: c.planName,
        onuSerial: c.onuSerial,
        isActive: c.isActive
      }))
    };

    clientCache.set(normalizedId, {
      data: clientData,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });

    return NextResponse.json({ success: true, data: clientData, debugUrl });
  } catch (error) {
    console.error(`[CLIENT_CONTEXT_ERROR]`, error);
    return NextResponse.json(
      { success: false, error: "Error al consultar API de Sisprot" },
      { status: 502 }
    );
  }
}
