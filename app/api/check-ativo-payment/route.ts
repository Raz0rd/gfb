import { type NextRequest, NextResponse } from "next/server"

const API_KEY = "84f2022f-a84b-4d63-a727-1780e6261fe8"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const transactionId = searchParams.get('id')
    
    if (!transactionId) {
      return NextResponse.json({ error: "ID da transação não fornecido" }, { status: 400 })
    }

    console.log("🔍 Verificando pagamento Ativo B2B:", transactionId)

    const response = await fetch(`https://api-gateway.umbrellapag.com/api/user/transactions/${transactionId}`, {
      method: "GET",
      headers: {
        "x-api-key": API_KEY,
        "User-Agent": "UMBRELLAB2B/1.0",
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("❌ Erro ao verificar pagamento:", {
        status: response.status,
        body: errorText
      })
      return NextResponse.json({ 
        error: "Erro ao verificar pagamento",
        details: errorText
      }, { status: response.status })
    }

    const data = await response.json()
    console.log("✅ Status do pagamento:", data.data?.status)
    return NextResponse.json(data)
  } catch (error) {
    console.error("❌ Erro ao verificar pagamento Ativo B2B:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
