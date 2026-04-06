import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateObject } from "ai";
import { z } from "zod";
import { NextResponse } from "next/server";

const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
});

const VENEZUELAN_BANKS = `
LISTA COMPLETA DE BANCOS VENEZOLANOS (código - nombre - acrónimo/alias):

0191 - Banco Nacional de Crédito - BNC
0177 - Banco de la Fuerza Armada Nacional Bolivariana - BANFANB, FANB
0175 - Banco Bicentenario del Pueblo - BICENTENARIO
0174 - Banplus Banco Universal - BANPLUS
0173 - Banco Internacional de Desarrollo - BID
0172 - Banco Bancamiga - BANCAMIGA
0171 - Banco Activo - ACTIVO
0169 - Banco Mi Banco - MI BANCO
0168 - Banco Bancrecer S.A. - BANCRECER
0166 - Banco Agrícola de Venezuela - BAV, AGRICOLA
0163 - Banco del Tesoro - TESORO
0157 - Banco DelSur - DELSUR
0156 - Banco 100% Banco - 100%BANCO
0151 - Banco Fondo Común - BFC, FONDO COMUN
0146 - Banco de la Gente Emprendedora - BANGENTE
0138 - Banco Plaza - PLAZA
0137 - Banco Sofitasa - SOFITASA
0134 - Banco Banesco - BANESCO
0128 - Banco Caroní - CARONI
0115 - Banco Exterior - EXTERIOR
0114 - Banco del Caribe - BANCARIBE, CARIBE
0108 - Banco Provincial - PROVINCIAL, BBVA
0105 - Banco Mercantil - MERCANTIL
0104 - Banco Venezolano de Crédito - VENEZOLANO DE CREDITO, BVC
0102 - Banco de Venezuela - BDV, VENEZUELA
0001 - Banco Central de Venezuela - BCV
00 - CHASE
01 - ZELLE
0 - WELLS FARGO
`;

const receiptDataSchema = z.object({
  date: z
    .string()
    .describe(
      "Fecha del pago en formato YYYY-MM-DD. SOLO si aparece explícitamente en la imagen en campos como: 'Fecha', 'Fecha de operación', 'Date'. Si NO encuentras una fecha visible en la imagen, devuelve cadena vacía ''. NUNCA inventes o asumas una fecha."
    ),
  bankCode: z
    .string()
    .describe(
      `Código del banco EMISOR (desde donde se envió el pago) - EXACTAMENTE 4 dígitos.

IMPORTANTE: Busca el código en estos campos del comprobante:
- "Cuenta debitada" o "Cuenta origen" (ej: "Cta. Corriente BNC: ***5389" → código es 0191)
- "Banco origen" o "Desde"
- "Origen" o "From"
- En el logo o encabezado del banco emisor

NO uses el código del banco RECEPTOR/DESTINO/BENEFICIARIO.

También identifica por acrónimos en el nombre de la cuenta:
- BNC = 0191
- BDV = 0102
- MERCANTIL = 0105
- PROVINCIAL = 0108
- BANESCO = 0134
- BICENTENARIO = 0175
- BANFANB = 0177
- BFC = 0151

Si no encuentras el código ni puedes identificar el banco, devuelve cadena vacía ''.`
    ),
  bankName: z
    .string()
    .describe(
      "Nombre completo del banco EMISOR (desde donde se envió el pago). Identifícalo por el logo, encabezado, o el campo de cuenta origen/debitada. NO uses el banco del beneficiario/receptor. Si no puedes identificarlo, devuelve cadena vacía ''."
    ),
  amount: z
    .string()
    .describe(
      "Monto transferido/enviado con decimales. Formato: 1234.56 (usa punto como separador decimal). Busca en campos como: 'Monto', 'Total', 'Amount'. Si no encuentras el monto, devuelve cadena vacía ''. NUNCA inventes un monto."
    ),
  referenceNumber: z
    .string()
    .describe(
      "Número de referencia o confirmación de la transacción. Busca en campos como: 'Referencia', 'Ref', 'Número de confirmación'. Solo dígitos numéricos. Si no encuentras la referencia, devuelve cadena vacía ''. NUNCA inventes una referencia."
    ),
  missingFields: z
    .array(z.enum(["date", "bankCode", "amount", "referenceNumber"]))
    .describe(
      "Lista de campos que NO se encontraron en la imagen. Incluye aquí cada campo donde devolviste cadena vacía '' porque no estaba visible o legible en el comprobante."
    ),
  confidence: z
    .number()
    .min(0)
    .max(1)
    .describe(
      "Nivel de confianza de la extracción entre 0 y 1. Reduce la confianza si hay campos faltantes o poco legibles."
    ),
});

export type ExtractedReceiptData = z.infer<typeof receiptDataSchema>;

export async function POST(request: Request) {
  try {
    const { imageBase64, mimeType } = await request.json();

    if (!imageBase64) {
      return NextResponse.json(
        { error: "No se proporcionó imagen" },
        { status: 400 }
      );
    }

    const model = google("gemini-flash-lite-latest");

    const imageDataUrl = `data:${mimeType || "image/jpeg"};base64,${imageBase64}`;

    const result = await generateObject({
      model,
      schema: receiptDataSchema,
      schemaName: "PaymentReceiptData",
      schemaDescription:
        "Datos extraídos de un comprobante de pago bancario venezolano (pago móvil, transferencia, etc.)",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              image: imageDataUrl,
            },
            {
              type: "text",
              text: `Analiza esta imagen de un comprobante de pago bancario venezolano.

${VENEZUELAN_BANKS}

INSTRUCCIONES CRÍTICAS - LEE CON ATENCIÓN:

⚠️ REGLA PRINCIPAL: NUNCA inventes, asumas o alucines datos que NO están visibles en la imagen.
Si un campo NO aparece claramente en el comprobante, devuelve cadena vacía "" y agrégalo a missingFields.

1. BANCO EMISOR (el banco desde donde SE ENVIÓ el pago):
   - Busca en "Cuenta debitada", "Cuenta origen", "Desde", "From", "Origen"
   - Si ves un acrónimo como "BNC", "BDV", "MERCANTIL", usa el código correspondiente
   - Ejemplo: Si dice "Cta. Corriente BNC: ***5389", el banco emisor es BNC = 0191
   - NO confundas con el banco del beneficiario/receptor/destino
   - Si no puedes identificar el banco: bankCode="" y bankName="" y agrega "bankCode" a missingFields

2. FECHA:
   - SOLO extrae la fecha si aparece EXPLÍCITAMENTE en la imagen
   - Busca campos etiquetados como "Fecha", "Date", "Fecha de operación"
   - Si la fecha NO está visible en ninguna parte: date="" y agrega "date" a missingFields
   - NUNCA inventes una fecha basándote en "hoy" o cualquier suposición

3. MONTO:
   - Busca "Monto", "Total", "Amount"
   - Convierte a formato con punto decimal (ej: 2000.00)
   - Si el monto NO está visible: amount="" y agrega "amount" a missingFields

4. REFERENCIA:
   - Busca "Referencia", "Ref", "Número de confirmación"
   - Solo números, sin letras ni caracteres especiales
   - Si la referencia NO está visible: referenceNumber="" y agrega "referenceNumber" a missingFields

5. MISSING FIELDS:
   - Agrega a este array TODOS los campos donde devolviste "" porque no estaban en la imagen
   - Esto es OBLIGATORIO para campos faltantes

Recuerda: Es preferible devolver "" que inventar un dato incorrecto.`,
            },
          ],
        },
      ],
    });

    return NextResponse.json({
      success: true,
      data: result.object,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Error al procesar la imagen",
        details: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 }
    );
  }
}
