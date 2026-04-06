import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const response = await fetch(
      `${process.env.SISPROTGF_API_URL}/public/clients/payment_methods/`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-KEY": process.env.SISPROTGF_API_KEY || "",
        },
        body: JSON.stringify(body.payload),
      }
    );

    const responseData = await response.json().catch(() => ({}));

    // Retornar información del estado para manejo específico
    return NextResponse.json(
      {
        success: response.status === 201,
        status: response.status,
        message: responseData.message,
        data: responseData,
      },
      { status: response.status }
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        status: 500,
        message: "Error interno del servidor",
        data: {error},
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const client_id = searchParams.get("client_id");

    if (!client_id) {
      return NextResponse.json(
        { error: "Parámetro 'client_id' requerido" },
        { status: 400 }
      );
    }

    const response = await fetch(
      `${process.env.SISPROTGF_API_URL}/public/clients/payment_methods/?client=${encodeURIComponent(
        client_id
      )}`,
      {
        method: "GET",
        headers: {
          "X-API-KEY": process.env.SISPROTGF_API_KEY || "",
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: "Error al buscar pagos asociados" },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error en API de pagos asociados:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    let id = searchParams.get("id");
    console.log("Deleting affiliated method with id api:", id);

    // Allow id in body for DELETE requests sent with JSON
    if (!id) {
      const body = await request.json().catch(() => null);
      if (body && body.id) id = String(body.id);
    }

    if (!id) {
      return NextResponse.json(
        { success: false, message: "Parámetro 'id' requerido" },
        { status: 400 }
      );
    }

    const response = await fetch(
      `${process.env.SISPROTGF_API_URL}/public/clients/payment_methods/${encodeURIComponent(
        id
      )}/`,
      {
        method: "DELETE",
        headers: {
          "X-API-KEY": process.env.SISPROTGF_API_KEY || "",
          "Content-Type": "application/json",
        },
      }
    );

    // If external API returned 204 No Content, return a 204 without body
    if (response.status === 204) {
      return new NextResponse(null, { status: 204 });
    }

    const responseData = await response.json().catch(() => ({}));

    return NextResponse.json(
      {
        success: response.ok,
        status: response.status,
        message: responseData.message || (response.ok ? "Eliminado" : "Error"),
        data: responseData,
      },
      { status: response.status }
    );
  } catch (error) {
    console.error("Error en DELETE /api/methods/affiliate:", error);
     return NextResponse.json(
      {
        success: false,
        status: 500,
        message: "Error interno del servidor",
        data: {error},
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    let id: string | null = null;
    const contentType = request.headers.get("content-type") || "";

    if (request.nextUrl.search) {
      const { searchParams } = new URL(request.url);
      id = searchParams.get("id");
    }

    // accept id in body as well
    const body = contentType.includes("application/json") ? await request.json().catch(() => null) : null;
    if (!id && body && body.id) id = String(body.id);
    const payload = body && body.payload ? body.payload : body;

    if (!id) {
      return NextResponse.json({ success: false, message: "Parámetro 'id' requerido" }, { status: 400 });
    }

    const response = await fetch(
      `${process.env.SISPROTGF_API_URL}/public/clients/payment_methods/${encodeURIComponent(id)}/`,
      {
        method: "PATCH",
        headers: {
          "X-API-KEY": process.env.SISPROTGF_API_KEY || "",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    );

    if (response.status === 204) return new NextResponse(null, { status: 204 });

    const responseData = await response.json().catch(() => ({}));

    return NextResponse.json(
      {
        success: response.ok,
        status: response.status,
        message: responseData.message || (response.ok ? "Actualizado" : "Error"),
        data: responseData,
      },
      { status: response.status }
    );
  } catch (error) {
    console.error("Error en PATCH /api/methods/affiliate:", error);
    return NextResponse.json({ success: false, status: 500, message: "Error interno del servidor", data: { error } }, { status: 500 });
  }
}
