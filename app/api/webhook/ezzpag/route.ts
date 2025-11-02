import { type NextRequest, NextResponse } from "next/server"

// Função para obter API Key UTMify baseada no domínio
function getUtmifyApiKey(host: string): string {
  const normalizedHost = host.toLowerCase()
  
  if (normalizedHost.includes('entregasexpressnasuaporta.store')) {
    return 'soKGdNa8RKDPzAF06pNJydotUPanUGd84yXy'
  }
  
  if (normalizedHost.includes('gasbutano.pro')) {
    return 'rhb1izmPmgoYzOLYrwfRxt1ZGTjO5OKxo9to'
  }
  
  return 'rhb1izmPmgoYzOLYrwfRxt1ZGTjO5OKxo9to' // Fallback gasbutano
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    console.log('🔔 [Webhook Ezzpag] Recebido:', {
      status: body.status,
      id: body.id,
      amount: body.amount,
      timestamp: new Date().toISOString()
    })
    
    // Verificar se é PAID
    const status = body.status?.toUpperCase()
    
    if (status === 'PAID') {
      console.log('✅ [Webhook Ezzpag] Status PAID detectado!')
      
      const transactionId = body.id
      const amount = body.amount // em centavos
      const host = request.headers.get('host') || 'gasbutano.pro'
      
      // Enviar para UTMify com status PAID
      try {
        const apiKey = getUtmifyApiKey(host)
        
        // Criar payload UTMify usando dados do webhook
        const utmifyPayload = {
          orderId: transactionId.toString(),
          platform: "GBsNew",
          paymentMethod: "pix",
          status: "paid",
          createdAt: body.createdAt || new Date().toISOString().replace('T', ' ').substring(0, 19),
          approvedDate: new Date().toISOString().replace('T', ' ').substring(0, 19),
          refundedAt: null,
          customer: {
            name: body.customer?.name || "Cliente",
            email: body.customer?.email || `cliente${Date.now()}@gbsnew.pro`,
            phone: body.customer?.phone || "5500000000000",
            document: body.customer?.document?.number || "00000000000",
            country: "BR",
            ip: "0.0.0.0"
          },
          products: [{
            id: `product-${transactionId}-0`,
            name: "GBnewTno",
            planId: null,
            planName: null,
            quantity: 1,
            priceInCents: amount
          }],
          trackingParameters: {
            src: null,
            sck: null,
            utm_source: null,
            utm_campaign: null,
            utm_medium: null,
            utm_content: null,
            utm_term: null
          },
          commission: {
            totalPriceInCents: amount,
            gatewayFeeInCents: Math.round(amount * 0.04),
            userCommissionInCents: Math.round(amount * 0.96)
          },
          isTest: false
        }
        
        console.log('📤 [Webhook Ezzpag] Enviando UTMify PAID:', {
          orderId: utmifyPayload.orderId,
          status: utmifyPayload.status
        })
        
        const utmifyResponse = await fetch("https://api.utmify.com.br/api-credentials/orders", {
          method: "POST",
          headers: {
            "x-api-token": apiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(utmifyPayload),
        })
        
        if (utmifyResponse.ok) {
          const utmifyResult = await utmifyResponse.json()
          console.log('✅ [Webhook Ezzpag] UTMify PAID enviado:', utmifyResult)
        } else {
          const errorText = await utmifyResponse.text()
          console.error('❌ [Webhook Ezzpag] Erro UTMify:', errorText)
        }
        
      } catch (error) {
        console.error('❌ [Webhook Ezzpag] Erro ao enviar UTMify:', error)
      }
    }
    
    // Retornar 200 OK para o Ezzpag
    return NextResponse.json({ 
      success: true,
      message: "Webhook recebido com sucesso"
    })
    
  } catch (error) {
    console.error('❌ [Webhook Ezzpag] Erro geral:', error)
    return NextResponse.json({ 
      success: false,
      error: "Erro ao processar webhook"
    }, { status: 500 })
  }
}
