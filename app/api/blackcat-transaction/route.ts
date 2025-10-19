import { type NextRequest, NextResponse } from "next/server"

const BLACKCAT_API_AUTH = process.env.BLACKCAT_API_AUTH || "Basic cGtfMERsc0F6eHhOVmpiVUVXMWs0aVBJU0pEblQ2VUVEclBWWlZvSjZrQkE2bzlrUWNHOnNrX1dpWUt1eXB4cFhLeXdoZjgwVm9pS2xCcFZnZWJpdENDVU5sN01GbVZ4WUh5cWxacg=="

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    console.log("📤 Criando transação BlackCat:", JSON.stringify(body, null, 2))

    // Adaptar formato para BlackCat API
    const blackcatPayload = {
      customer: {
        name: body.customer.name,
        email: body.customer.email,
        document: body.customer.document.number,
        phone: body.customer.phone,
        address: {
          street: body.customer.address.street,
          number: body.customer.address.streetNumber,
          complement: body.customer.address.complement || "",
          neighborhood: body.customer.address.neighborhood,
          city: body.customer.address.city,
          state: body.customer.address.state,
          zipcode: body.customer.address.zipCode,
        }
      },
      items: body.items.map((item: any) => ({
        name: item.title,
        quantity: item.quantity,
        price: item.unitPrice,
      })),
      payment: {
        method: "pix",
      },
      metadata: body.metadata ? JSON.parse(body.metadata) : {},
    }

    const response = await fetch("https://api.blackcatpagamentos.com/v1/sales", {
      method: "POST",
      headers: {
        "Authorization": BLACKCAT_API_AUTH,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(blackcatPayload),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("❌ Erro BlackCat Response:", {
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
    console.log("✅ Transação BlackCat criada:", result)
    
    // Adaptar resposta para formato compatível
    const adaptedResponse = {
      id: result.id || result.sale_id,
      status: mapBlackCatStatus(result.status),
      amount: body.amount,
      paymentMethod: "PIX",
      pix: {
        qrcode: result.pix?.qr_code || result.pix?.qrcode || result.qr_code || "",
        expirationDate: result.pix?.expires_at || result.expires_at || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      },
      customer: body.customer,
      items: body.items,
    }
    
    return NextResponse.json(adaptedResponse)
  } catch (error) {
    console.error("❌ Erro ao criar transação BlackCat:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}

// Mapear status do BlackCat para nosso formato
function mapBlackCatStatus(status: string): string {
  const statusMap: { [key: string]: string } = {
    'pending': 'waiting_payment',
    'waiting_payment': 'waiting_payment',
    'paid': 'paid',
    'approved': 'paid',
    'refused': 'refused',
    'canceled': 'refused',
    'cancelled': 'refused',
    'expired': 'refused',
  }
  
  return statusMap[status?.toLowerCase()] || 'waiting_payment'
}
