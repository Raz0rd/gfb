import { type NextRequest, NextResponse } from "next/server"

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const transactionId = searchParams.get("id")

    if (!transactionId) {
      return NextResponse.json({ error: "ID da transação é obrigatório" }, { status: 400 })
    }

    const response = await fetch(`https://api.blackcatpagamentos.com/v1/transactions/${transactionId}`, {
      method: "GET",
      headers: {
        "accept": "application/json",
        "authorization": "Basic cGtfMERsc0F6eHhOVmpiVUVXMWs0aVBJU0pEblQ2VUVEclBWWlZvSjZrQkE2bzlrUWNHOnNrX1dpWUt1eXB4cFhLeXdoZjgwVm9pS2xCcFZnZWJpdENDVU5sN01GbVZ4WUh5cWxacg==",
        "cache-control": "no-cache, no-store, must-revalidate",
        "pragma": "no-cache"
      },
      cache: 'no-store',
      next: { revalidate: 0 }
    })

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`)
    }

    const data = await response.json()
    console.log(`✅ Status BlackCat - ID: ${transactionId}, Status: ${data.status}, PaidAt: ${data.paidAt}`)
    
    // Retornar com headers para evitar cache
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })
  } catch (error) {
    console.error("❌ Erro ao verificar status do pagamento:", error)
    return NextResponse.json({ error: "Erro ao verificar pagamento" }, { status: 500 })
  }
}
