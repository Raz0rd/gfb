import { type NextRequest, NextResponse } from "next/server"

const API_KEY = "84f2022f-a84b-4d63-a727-1780e6261fe8"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    console.log("📤 Criando transação Ativo B2B:", JSON.stringify(body, null, 2))

    const response = await fetch("https://api.ativob2b.com/api/user/transactions", {
      method: "POST",
      headers: {
        "x-api-key": API_KEY,
        "User-Agent": "AtivoB2B/1.0",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("❌ Erro Ativo B2B Response:", {
        status: response.status,
        statusText: response.statusText,
        body: errorText
      })
      return NextResponse.json({ 
        error: "Erro ao criar transação",
        details: errorText,
        status: response.status
      }, { status: response.status })
    }

    const result = await response.json()
    console.log("✅ Transação Ativo B2B criada:", result)
    
    // Adaptar resposta para formato compatível (apenas PIX)
    if (result.status === 200 && result.data) {
      const data = result.data
      const adaptedResponse = {
        id: data.id,
        status: data.status, // WAITING_PAYMENT, PAID, REFUSED
        amount: data.amount,
        paymentMethod: "PIX",
        pix: {
          qrcode: data.qrCode || "",
          expirationDate: data.pix?.expirationDate || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        },
        customer: data.customer,
        items: data.items,
      }
      return NextResponse.json(adaptedResponse)
    }
    
    return NextResponse.json(result)
  } catch (error) {
    console.error("❌ Erro ao criar transação Ativo B2B:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
