import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.SISPROTGF_API_URL;
const API_KEY = process.env.SISPROTGF_API_KEY;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const response = await fetch(`${API_URL}/public/base/code_otp/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": API_KEY || "",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in OTP POST proxy:", error);
    return NextResponse.json(
      { error: "Error interno al generar OTP" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const communication_method = searchParams.get("communication_method");

    if (!code || !communication_method) {
      return NextResponse.json(
        { error: "Faltan parámetros requeridos: code y communication_method" },
        { status: 400 }
      );
    }

    const response = await fetch(
      `${API_URL}/public/base/code_otp/?code=${code}&communication_method=${communication_method}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "X-API-KEY": API_KEY || "",
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in OTP GET proxy:", error);
    return NextResponse.json(
      { error: "Error interno al validar OTP" },
      { status: 500 }
    );
  }
}
