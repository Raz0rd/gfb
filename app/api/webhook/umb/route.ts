import { type NextRequest, NextResponse } from "next/server"
import fs from 'fs'
import path from 'path'

// Função para obter conversion tag baseada no domínio
function getConversionTag(host: string): string {
  const normalizedHost = host.toLowerCase()
  
  if (normalizedHost.includes('entregasexpressnasuaporta.store')) {
    return 'AW-17554338622/ZCa-CN2Y7qobEL7mx7JB'
  }
  
  if (normalizedHost.includes('gasbutano.pro')) {
    return 'AW-17545933033/08VqCI_Qj5obEOnhxq5B'
  }
  
  return 'AW-17545933033/08VqCI_Qj5obEOnhxq5B' // Fallback gasbutano
}

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
    
    console.log('🔔 [Webhook Umbrela] Recebido:', {
      status: body.status,
      id: body.id,
      amount: body.amount,
      timestamp: new Date().toISOString()
    })
    
    // Verificar se é PAID
    const status = body.status?.toUpperCase()
    
    if (status === 'PAID') {
      console.log('✅ [Webhook] Status PAID detectado!')
      
      const transactionId = body.id
      const amount = body.amount // em centavos
      const host = request.headers.get('host') || 'gasbutano.pro'
      
      // 1. Enviar conversão para Google Ads
      try {
        const conversionTag = getConversionTag(host)
        const conversionValueBRL = amount / 100 // Converter centavos para reais
        
        console.log('📢 [Webhook] Enviando Google Ads:', {
          conversionTag,
          value: conversionValueBRL,
          transactionId
        })
        
        // Aqui você pode fazer uma requisição para um endpoint que dispara o gtag
        // Ou salvar em um banco para o frontend consumir
        
      } catch (error) {
        console.error('❌ [Webhook] Erro Google Ads:', error)
      }
      
      // 2. Enviar para UTMify com status PAID
      try {
        const apiKey = getUtmifyApiKey(host)
        
        // Buscar dados do pedido salvo
        let orderData = null
        try {
          const filePath = path.join(process.cwd(), 'orders-data.json')
          const fileContent = fs.readFileSync(filePath, 'utf-8')
          const ordersData = JSON.parse(fileContent)
          orderData = ordersData[transactionId]
        } catch (error) {
          console.log('⚠️ [Webhook] Pedido não encontrado no arquivo, usando dados do webhook')
        }
        
        // Criar payload UTMify (usar dados salvos se existirem)
        const utmifyPayload = {
          orderId: transactionId.toString(),
          platform: "GasButano",
          paymentMethod: "pix",
          status: "paid",
          createdAt: orderData?.timestamp || new Date().toISOString().replace('T', ' ').substring(0, 19),
          approvedDate: new Date().toISOString().replace('T', ' ').substring(0, 19),
          refundedAt: null,
          customer: orderData?.customer || {
            name: body.customer?.name || "Cliente",
            email: body.customer?.email || "cliente@gasbutano.pro",
            phone: body.customer?.phone || "5500000000000",
            document: "00000000000",
            country: "BR",
            ip: "0.0.0.0"
          },
          products: orderData?.products || [{
            id: `product-${transactionId}-0`,
            name: body.items?.[0]?.title || "Produto",
            planId: null,
            planName: null,
            quantity: 1,
            priceInCents: amount
          }],
          trackingParameters: orderData?.trackingParameters || {
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
        
        console.log('📤 [Webhook] Enviando UTMify PAID:', {
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
          console.log('✅ [Webhook] UTMify PAID enviado:', utmifyResult)
        } else {
          const errorText = await utmifyResponse.text()
          console.error('❌ [Webhook] Erro UTMify:', errorText)
        }
        
      } catch (error) {
        console.error('❌ [Webhook] Erro ao enviar UTMify:', error)
      }
    }
    
    // Retornar 200 OK para a Umbrela
    return NextResponse.json({ 
      success: true,
      message: "Webhook recebido com sucesso"
    })
    
  } catch (error) {
    console.error('❌ [Webhook] Erro geral:', error)
    return NextResponse.json({ 
      success: false,
      error: "Erro ao processar webhook"
    }, { status: 500 })
  }
}
