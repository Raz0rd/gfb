import { NextResponse } from 'next/server'

const EZZPAG_AUTH_TOKEN = 'c2tfbGl2ZV92MnpCODdZR3FVdDRPNXRKa0Qza0xreGR2OE80T3pIT0lGQkVidnVza246eA=='
const EZZPAG_BASE_URL = 'https://api.ezzypag.com.br/v1'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const transactionId = searchParams.get('transactionId')

    if (!transactionId) {
      return NextResponse.json(
        { error: 'Transaction ID é obrigatório' },
        { status: 400 }
      )
    }

    console.log(`🔍 [Ezzpag] Consultando transação: ${transactionId}`)

    const response = await fetch(
      `${EZZPAG_BASE_URL}/transactions/${transactionId}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${EZZPAG_AUTH_TOKEN}`,
          'Content-Type': 'application/json'
        },
        cache: 'no-store', // Sem cache para sempre buscar status atualizado
      }
    )

    if (!response.ok) {
      console.error(`❌ [Ezzpag] Erro na API: ${response.status}`)
      return NextResponse.json(
        { error: `Erro na API Ezzpag: ${response.status}` },
        { status: response.status }
      )
    }

    const data = await response.json()
    console.log(`✅ [Ezzpag] Status atual: ${data.status}`)

    // Retornar no formato esperado pelo frontend
    return NextResponse.json({
      id: data.id,
      status: data.status,
      amount: data.amount,
      paymentMethod: data.paymentMethod,
      paidAt: data.paidAt,
      isPaid: data.status === 'PAID' || data.status === 'paid',
    })
  } catch (error) {
    console.error('❌ [Ezzpag] Erro ao verificar pagamento:', error)
    return NextResponse.json(
      { error: 'Erro interno ao verificar pagamento' },
      { status: 500 }
    )
  }
}
