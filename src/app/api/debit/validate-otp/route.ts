import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const response = await fetch(
      `${process.env.SISPROTGF_API_URL}/public/payments/bnc/debit/process-debit/`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-KEY": process.env.SISPROTGF_API_KEY || "",
        },
        body: JSON.stringify(body),
      }
    );

    const responseData = await response.json().catch(() => ({}));

    // Retornar información del estado para manejo específico
    // Considerar tanto 201 (created) como 200 (ok) para flujos de verificación
    return NextResponse.json(
      {
        success: response.status === 201 || response.status === 200,
        status: response.status,
        message: responseData.message,
        data: responseData,
      },
      { status: response.status }
    );
  } catch (error) {
    console.error("=== ERROR EN Solicitar otp ===");
    console.error("Timestamp:", new Date().toISOString());
    console.error("Error details:", error);
    console.error("===================================");

    return NextResponse.json(
      {
        success: false,
        status: 500,
        message: "Error interno del servidor",
        data: {},
      },
      { status: 500 }
    );
  }
}