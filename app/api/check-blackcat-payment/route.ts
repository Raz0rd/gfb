import { type NextRequest, NextResponse } from "next/server"

const BLACKCAT_API_AUTH = process.env.BLACKCAT_API_AUTH || "Basic cGtfMERsc0F6eHhOVmpiVUVXMWs0aVBJU0pEblQ2VUVEclBWWlZvSjZrQkE2bzlrUWNHOnNrX1dpWUt1eXB4cFhLeXdoZjgwVm9pS2xCcFZnZWJpdENDVU5sN01GbVZ4WUh5cWxacg=="

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const transactionId = searchParams.get('id')
    
    if (!transactionId) {
      return NextResponse.json({ error: "ID da transação não fornecido" }, { status: 400 })
    }

    console.log("🔍 Verificando pagamento BlackCat:", transactionId)

    const response = await fetch(`https://api.blackcatpagamentos.com/v1/sales/${transactionId}`, {
      method: "GET",
      headers: {
        "Authorization": BLACKCAT_API_AUTH,
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("❌ Erro ao verificar pagamento BlackCat:", {
        status: response.status,
        body: errorText
      })
      return NextResponse.json({ 
        error: "Erro ao verificar pagamento",
        details: errorText
      }, { status: response.status })
    }

    const result = await response.json()
    console.log("✅ Status do pagamento BlackCat:", result.status)
    
    // Adaptar resposta para formato compatível
    const adaptedResponse = {
      status: 200,
      data: {
        id: result.id || result.sale_id,
        status: mapBlackCatStatus(result.status),
        amount: result.amount || result.total,
        paymentMethod: "PIX",
        customer: result.customer,
        items: result.items,
      }
    }
    
    return NextResponse.json(adaptedResponse)
  } catch (error) {
    console.error("❌ Erro ao verificar pagamento BlackCat:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}

// Mapear status do BlackCat para nosso formato (uppercase para compatibilidade)
function mapBlackCatStatus(status: string): string {
  const statusMap: { [key: string]: string } = {
    'pending': 'WAITING_PAYMENT',
    'waiting_payment': 'WAITING_PAYMENT',
    'paid': 'PAID',
    'approved': 'PAID',
    'refused': 'REFUSED',
    'canceled': 'CANCELED',
    'cancelled': 'CANCELED',
    'expired': 'CANCELED',
  }
  
  return statusMap[status?.toLowerCase()] || 'WAITING_PAYMENT'
}
