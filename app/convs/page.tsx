"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"

declare global {
  interface Window {
    gtag: (...args: any[]) => void;
  }
}

export default function ConversaoPage() {
  const router = useRouter()
  const [conversionSent, setConversionSent] = useState(false)
  const [testValue, setTestValue] = useState("1.0")
  const [testTransactionId, setTestTransactionId] = useState("")

  // Função para enviar conversão
  const sendConversion = () => {
    if (typeof window !== 'undefined' && window.gtag) {
      const transactionId = testTransactionId || `conv_${Date.now()}`
      const value = parseFloat(testValue) || 1.0

      window.gtag('event', 'conversion', {
        'send_to': 'AW-17545933033/08VqCI_Qj5obEOnhxq5B',
        'value': value,
        'currency': 'BRL',
        'transaction_id': transactionId
      });

      console.log('✅ Conversão enviada:', {
        send_to: 'AW-17545933033/08VqCI_Qj5obEOnhxq5B',
        value,
        currency: 'BRL',
        transaction_id: transactionId
      });

      setConversionSent(true)
      setTimeout(() => setConversionSent(false), 3000)
    } else {
      console.error('❌ Google Tag não encontrado')
      alert('Erro: Google Tag não carregado')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 p-4">
      <div className="container mx-auto max-w-2xl py-8">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="mb-4 flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center">
              🎯 Teste de Conversão Google Ads
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>Tag de Conversão:</strong> AW-17545933033/08VqCI_Qj5obEOnhxq5B
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Valor da Conversão (BRL)
                </label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="1.0"
                  value={testValue}
                  onChange={(e) => setTestValue(e.target.value)}
                  className="text-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Transaction ID (opcional)
                </label>
                <Input
                  type="text"
                  placeholder="Deixe vazio para gerar automaticamente"
                  value={testTransactionId}
                  onChange={(e) => setTestTransactionId(e.target.value)}
                />
              </div>

              <Button
                onClick={sendConversion}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white py-6 text-lg font-bold"
                size="lg"
              >
                {conversionSent ? '✅ Conversão Enviada!' : '🚀 Enviar Conversão'}
              </Button>

              {conversionSent && (
                <div className="bg-green-100 border border-green-300 rounded-lg p-4 text-center">
                  <p className="text-green-800 font-semibold">
                    ✅ Conversão enviada com sucesso!
                  </p>
                  <p className="text-sm text-green-700 mt-1">
                    Verifique o console para mais detalhes
                  </p>
                </div>
              )}
            </div>

            <div className="bg-gray-50 rounded-lg p-4 text-xs text-gray-600">
              <p className="font-semibold mb-2">ℹ️ Informações:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Esta página envia conversões de teste para o Google Ads</li>
                <li>Use valores reais para testar o tracking</li>
                <li>Verifique o console do navegador (F12) para logs detalhados</li>
                <li>As conversões podem levar alguns minutos para aparecer no Google Ads</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
