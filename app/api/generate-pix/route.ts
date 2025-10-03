import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const response = await fetch("https://api.blackcatpagamentos.com/v1/transactions", {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization:
          "Basic cGtfMERsc0F6eHhOVmpiVUVXMWs0aVBJU0pEblQ2VUVEclBWWlZvSjZrQkE2bzlrUWNHOnNrX1dpWUt1eXB4cFhLeXdoZjgwVm9pS2xCcFZnZWJpdENDVU5sN01GbVZ4WUh5cWxacg==",
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("Erro ao gerar PIX:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
