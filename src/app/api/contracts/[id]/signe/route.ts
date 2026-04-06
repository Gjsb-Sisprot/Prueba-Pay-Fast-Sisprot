import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.SISPROTGF_API_URL;
const API_KEY = process.env.SISPROTGF_API_KEY;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: "El ID del contrato es requerido" },
        { status: 400 }
      );
    }

    const response = await fetch(`${API_URL}/public/contracts/${id}/sign/`, {
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
    console.error("Error in contract signing proxy:", error);
    return NextResponse.json(
      { error: "Error interno al firmar el contrato" },
      { status: 500 }
    );
  }
}
