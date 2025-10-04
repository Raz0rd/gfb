"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ArrowLeft, Target, CheckCircle, AlertCircle } from "lucide-react"
import { useRouter } from "next/navigation"

// Declaração de tipo para gtag
declare global {
  interface Window {
    gtag: (...args: any[]) => void;
  }
}

export default function AdminPage() {
  const router = useRouter()
  const [conversionSent, setConversionSent] = useState(false)
  const [testValue, setTestValue] = useState("89.00")
  const [testTransactionId, setTestTransactionId] = useState("")

  // Função para enviar conversão de teste
  const sendTestConversion = () => {
    if (typeof window !== 'undefined' && window.gtag) {
      const transactionId = testTransactionId || `test_${Date.now()}`
      const value = parseFloat(testValue) || 89.00

      window.gtag('event', 'conversion', {
        'send_to': 'AW-17545933033/08VqCI_Qj5obEOnhxq5B',
        'value': value,
        'currency': 'BRL',
        'transaction_id': transactionId
      });

      // Evento adicional para debug
      window.gtag('event', 'purchase_completed', {
        'value': value,
        'currency': 'BRL',
        'transaction_id': transactionId,
        'items': [{
          'item_name': 'Teste Admin',
          'price': value,
          'quantity': 1
        }]
      });

      console.log('🎯 Conversão de teste enviada:', {
        value,
        transactionId,
        timestamp: new Date().toISOString()
      });

      setConversionSent(true)
      setTestTransactionId(transactionId)
    } else {
      console.error('❌ Google Tag não encontrado!')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-100">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => router.push('/')}
            className="flex items-center gap-2 text-gray-600 hover:text-orange-500"
          >
            <ArrowLeft size={20} />
            Voltar ao Site
          </Button>
          <h1 className="text-xl font-bold text-gray-800">🔧 Admin - Teste Google Ads</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto space-y-6">
          
          {/* Warning */}
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-red-800">
                <AlertCircle size={20} />
                <p className="font-semibold">⚠️ ÁREA RESTRITA - APENAS PARA TESTES</p>
              </div>
              <p className="text-red-700 text-sm mt-2">
                Esta página é apenas para configurar e testar conversões do Google Ads. 
                Não deve ser acessível aos clientes.
              </p>
            </CardContent>
          </Card>

          {/* Test Conversion */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="text-orange-500" size={24} />
                Teste de Conversão Google Ads
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Valor da Conversão (R$)
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={testValue}
                  onChange={(e) => setTestValue(e.target.value)}
                  placeholder="89.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Transaction ID (opcional)
                </label>
                <Input
                  type="text"
                  value={testTransactionId}
                  onChange={(e) => setTestTransactionId(e.target.value)}
                  placeholder="Será gerado automaticamente se vazio"
                />
              </div>

              <Button
                onClick={sendTestConversion}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3"
              >
                🎯 Enviar Conversão de Teste
              </Button>

              {conversionSent && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2 text-green-800">
                    <CheckCircle size={20} />
                    <p className="font-semibold">✅ Conversão Enviada!</p>
                  </div>
                  <div className="text-green-700 text-sm mt-2 space-y-1">
                    <p><strong>Valor:</strong> R$ {testValue}</p>
                    <p><strong>Transaction ID:</strong> {testTransactionId}</p>
                    <p><strong>Timestamp:</strong> {new Date().toLocaleString('pt-BR')}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Instructions */}
          <Card>
            <CardHeader>
              <CardTitle>📋 Instruções</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-gray-700">
              <div>
                <h4 className="font-semibold text-gray-800">1. Como testar:</h4>
                <p>• Defina um valor de teste (ex: R$ 89,00)</p>
                <p>• Clique em "Enviar Conversão de Teste"</p>
                <p>• Verifique no console do navegador se aparece "🎯 Conversão de teste enviada"</p>
              </div>

              <div>
                <h4 className="font-semibold text-gray-800">2. Verificar no Google Ads:</h4>
                <p>• Acesse Google Ads → Ferramentas → Conversões</p>
                <p>• Procure pela conversão: AW-17612041352/CnirCM_BraQbEIjZic5B</p>
                <p>• Pode levar alguns minutos para aparecer</p>
              </div>

              <div>
                <h4 className="font-semibold text-gray-800">3. Em produção:</h4>
                <p>• As conversões serão enviadas automaticamente quando o PIX for pago</p>
                <p>• Remover esta página admin antes do deploy final</p>
              </div>
            </CardContent>
          </Card>

          {/* Quick Links */}
          <Card>
            <CardHeader>
              <CardTitle>🔗 Links Úteis</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant="outline"
                onClick={() => window.open('https://ads.google.com/aw/conversions', '_blank')}
                className="w-full justify-start"
              >
                📊 Google Ads - Conversões
              </Button>
              <Button
                variant="outline"
                onClick={() => window.open('https://app.netlify.com/sites/unigas-clone/deploys', '_blank')}
                className="w-full justify-start"
              >
                📦 Netlify - Deploy
              </Button>
              <Button
                variant="outline"
                onClick={() => window.open('https://developers.google.com/tag-platform/gtagjs/reference', '_blank')}
                className="w-full justify-start"
              >
                📚 Documentação Google Tag
              </Button>
            </CardContent>
          </Card>

        </div>
      </main>
    </div>
  )
}
