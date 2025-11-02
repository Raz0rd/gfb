import { NextResponse } from 'next/server'

const EZZPAG_AUTH_TOKEN = 'c2tfbGl2ZV92MnpCODdZR3FVdDRPNXRKa0Qza0xreGR2OE80T3pIT0lGQkVidnVza246eA=='
const EZZPAG_BASE_URL = 'https://api.ezzypag.com.br/v1'

// Função para gerar email fake se necessário
function generateFakeEmail(name: string): string {
  const cleanName = name.toLowerCase().replace(/\s+/g, '')
  return `${cleanName}${Date.now()}@cliente.com`
}

// Função para limpar telefone
function cleanPhone(phone: string): string {
  return phone.replace(/\D/g, '')
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    
    // Obter host para construir URL do webhook
    const host = request.headers.get('host') || 'localhost:3000'
    const protocol = host.includes('localhost') ? 'http' : 'https'
    const webhookUrl = `${protocol}://${host}/api/webhook/ezzpag`

    // Preparar payload para Ezzpag
    const ezzpagPayload = {
      customer: {
        document: {
          number: body.customer.document?.number || body.customer.document,
          type: 'cpf'
        },
        name: body.customer.name,
        email: body.customer.email || generateFakeEmail(body.customer.name),
        phone: cleanPhone(body.customer.phone)
      },
      shipping: {
        address: {
          street: body.shipping.address.street,
          streetNumber: body.shipping.address.streetNumber,
          zipCode: body.shipping.address.zipCode,
          neighborhood: body.shipping.address.neighborhood,
          city: body.shipping.address.city,
          state: body.shipping.address.state,
          country: 'BR'
        },
        fee: 0
      },
      items: body.items.map((item: any) => ({
        tangible: item.tangible || false,
        title: item.title,
        unitPrice: item.unitPrice,
        quantity: item.quantity || 1
      })),
      amount: body.amount,
      paymentMethod: 'pix',
      postbackUrl: webhookUrl
    }

    console.log('📤 [Ezzpag] Criando transação PIX...')

    // Tentar até 3 vezes em caso de erro 403
    let response: Response | null = null
    let attempts = 0
    const maxAttempts = 3
    
    while (attempts < maxAttempts) {
      attempts++
      
      response = await fetch(`${EZZPAG_BASE_URL}/transactions`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${EZZPAG_AUTH_TOKEN}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(ezzpagPayload),
      })
      
      // Se não for 403, sair do loop
      if (response.status !== 403) {
        break
      }
      
      // Se for 403 e não for a última tentativa, aguardar 2 segundos
      if (attempts < maxAttempts) {
        console.log(`⚠️ [Ezzpag] Erro 403, tentativa ${attempts}/${maxAttempts}. Aguardando 2s...`)
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
    }

    if (!response) {
      return NextResponse.json(
        { error: 'Erro ao conectar com Ezzpag após 3 tentativas' },
        { status: 503 }
      )
    }

    if (!response.ok) {
      const errorText = await response.text()
      let errorData: any = {}
      
      try {
        errorData = JSON.parse(errorText)
      } catch (e) {
        errorData = { message: errorText }
      }
      
      console.error('❌ [Ezzpag] ERROR:', response.status, errorData.message || errorText)
      
      // Extrair mensagem de erro específica da Ezzpag
      let userMessage = 'Erro ao processar pagamento. Tente novamente.'
      const ezzpagError = errorData.message || errorText
      
      // Verificar erros específicos da Ezzpag (422 retorna array de erros)
      if (response.status === 422) {
        if (ezzpagError.includes('customer.email is invalid')) {
          userMessage = 'customer.email is invalid'
        } else if (ezzpagError.includes('customer.phone is invalid')) {
          userMessage = 'customer.phone is invalid'
        } else if (ezzpagError.includes('customer.document is invalid')) {
          userMessage = 'customer.document is invalid'
        } else if (ezzpagError.includes('customer.name is invalid')) {
          userMessage = 'customer.name is invalid'
        } else {
          userMessage = 'Dados incompletos ou inválidos. Verifique as informações.'
        }
      } else if (response.status === 400) {
        if (ezzpagError.toLowerCase().includes('cpf')) {
          userMessage = 'CPF inválido. Por favor, verifique os dados e tente novamente.'
        } else if (ezzpagError.toLowerCase().includes('phone')) {
          userMessage = 'customer.phone is invalid'
        } else if (ezzpagError.toLowerCase().includes('email')) {
          userMessage = 'customer.email is invalid'
        } else {
          userMessage = 'Dados inválidos. Por favor, verifique as informações.'
        }
      } else if (response.status === 401 || response.status === 403) {
        userMessage = 'Erro de autenticação. Entre em contato com o suporte.'
      } else if (response.status >= 500) {
        userMessage = 'Serviço temporariamente indisponível. Tente novamente em instantes.'
      }
      
      return NextResponse.json(
        { error: userMessage, details: errorData },
        { status: response.status }
      )
    }

    const data = await response.json()

    // Extrair informações da resposta Ezzpag
    const transactionId = data.id?.toString()
    const pixCode = data.pix?.qrcode
    
    console.log('✅ [Ezzpag] PIX criado com sucesso!')
    console.log(`   - Transaction ID: ${transactionId}`)
    console.log(`   - Valor: R$ ${(data.amount / 100).toFixed(2)}`)
    console.log(`   - Status: ${data.status}`)
    console.log(`   - Cliente: ${data.customer?.name}`)

    // Retornar no formato esperado pelo frontend
    return NextResponse.json({
      id: data.id,
      status: data.status,
      amount: data.amount,
      paymentMethod: data.paymentMethod,
      qrCode: pixCode,
      pix: {
        qrcode: pixCode,
        expirationDate: data.pix?.expirationDate,
      },
      customer: data.customer,
      items: data.items,
    })
  } catch (error) {
    console.error('❌ [Ezzpag] Erro na API:', error)
    return NextResponse.json(
      { error: 'Erro interno ao processar transação' },
      { status: 500 }
    )
  }
}
