"use client"

import type React from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { ShoppingCart, MapPin, Clock, Bike, Star, TrendingUp, HelpCircle } from "lucide-react"
import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"

interface AddressData {
  cep: string
  logradouro: string
  bairro: string
  localidade: string
  uf: string
}

type StockData = {
  [key: string]: number
}

// Função para sanitizar inputs e prevenir XSS
const sanitizeInput = (input: string): string => {
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .replace(/[<>'"]/g, '')
    .trim()
}

const isInputSafe = (input: string): boolean => {
  const dangerousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /<iframe/i,
    /<object/i,
    /<embed/i
  ]
  return !dangerousPatterns.some(pattern => pattern.test(input))
}

export default function HomePage() {
  const router = useRouter()
  const [showCepModal, setShowCepModal] = useState(false)
  const [showHowItWorksModal, setShowHowItWorksModal] = useState(false)
  const [cep, setCep] = useState("")
  const [addressData, setAddressData] = useState<AddressData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  
  // Estado para localização do usuário
  const [userLocation, setUserLocation] = useState({
    city: "Barreiro, Contagem e região metropolitana",
    state: "",
    loading: false
  })
  
  // Estado para controlar estoque em tempo real
  const [stock, setStock] = useState<StockData>({
    "Combo 2 Botijões de Gás 13kg": 23,
    "Combo Gás + Garrafão": 31,
    "3 Garrafões de Água 20L": 18,
    "Gás de cozinha 13 kg (P13)": 45,
    "Garrafão de água Mineral 20L": 67,
    "Água Mineral Serragrande 20L": 52,
    "Botijão de Gás 8kg P8": 29
  })

  useEffect(() => {
    // Capturar parâmetros UTM da URL
    const params = new URLSearchParams(window.location.search)
    const utmParams = {
      src: params.get('src'),
      sck: params.get('sck'),
      utm_source: params.get('utm_source'),
      utm_campaign: params.get('utm_campaign'),
      utm_medium: params.get('utm_medium'),
      utm_content: params.get('utm_content'),
      utm_term: params.get('utm_term')
    }
    
    // Salvar parâmetros UTM no localStorage
    if (Object.values(utmParams).some(val => val !== null)) {
      localStorage.setItem('utm-params', JSON.stringify(utmParams))
    }
    
    const hasVisited = localStorage.getItem("unigas-visited")
    if (!hasVisited) {
      setShowCepModal(true)
    }
    
    // Solicitar localização do usuário para melhor experiência
    requestUserLocation()
  }, [])

  // Função para solicitar localização do usuário
  const requestUserLocation = () => {
    // 1. Tentar localização salva primeiro (localização real anterior)
    const savedLocation = localStorage.getItem("user-location")
    if (savedLocation) {
      try {
        const { city, state } = JSON.parse(savedLocation)
        setUserLocation({ city, state, loading: false })
        return
      } catch (error) {
        console.log("Erro ao carregar localização salva:", error)
      }
    }

    // 2. Tentar geolocalização do navegador (apenas GPS real)
    if (navigator.geolocation) {
      setUserLocation(prev => ({ ...prev, loading: true }))
      
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { latitude, longitude } = position.coords
            
            // Usar API de geocoding reverso para obter cidade
            const response = await fetch(
              `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=pt`
            )
            
            if (response.ok) {
              const data = await response.json()
              const city = data.city || data.locality || "sua região"
              const state = data.principalSubdivision || ""
              
              setUserLocation({
                city: city,
                state: state,
                loading: false
              })
              
              // Salvar no localStorage para próximas visitas (apenas localização real)
              localStorage.setItem("user-location", JSON.stringify({ city, state }))
              return
            }
          } catch (error) {
            console.log("Erro ao obter localização por GPS:", error)
          }
          
          // Se falhou, manter localização padrão
          setUserLocation(prev => ({ ...prev, loading: false }))
        },
        (error) => {
          console.log("Geolocalização negada ou erro:", error)
          // Se geolocalização falhou, manter localização padrão
          setUserLocation(prev => ({ ...prev, loading: false }))
        },
        {
          timeout: 10000,
          enableHighAccuracy: false
        }
      )
    }
    // Se geolocalização não disponível, mantém localização padrão
  }

  // Diminuir estoque a cada 5 minutos
  useEffect(() => {
    const interval = setInterval(() => {
      setStock(prevStock => {
        const newStock = { ...prevStock }
        const products = Object.keys(newStock)
        const randomProduct = products[Math.floor(Math.random() * products.length)]
        if (newStock[randomProduct] > 5) {
          newStock[randomProduct] -= Math.floor(Math.random() * 3) + 1 // Diminui 1-3 unidades
        }
        return newStock
      })
    }, 5 * 60 * 1000) // 5 minutos

    return () => clearInterval(interval)
  }, [])

  const fetchAddressData = async (cepValue: string) => {
    setLoading(true)
    setError("")

    try {
      const cleanCep = cepValue.replace(/\D/g, "")
      if (cleanCep.length !== 8) {
        setError("CEP deve ter 8 dígitos")
        return
      }

      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`)
      const data = await response.json()

      if (data.erro) {
        setError("CEP não encontrado")
        return
      }

      setAddressData(data)
      localStorage.setItem("unigas-address", JSON.stringify(data))
    } catch (err) {
      setError("Erro ao buscar CEP")
    } finally {
      setLoading(false)
    }
  }

  const handleCepSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await fetchAddressData(cep)
  }

  const handleCloseModal = () => {
    setShowCepModal(false)
    localStorage.setItem("unigas-visited", "true")
  }

  const formatCep = (value: string) => {
    const cleanValue = value.replace(/\D/g, "")
    if (cleanValue.length <= 8) {
      return cleanValue.replace(/(\d{5})(\d{3})/, "$1-$2")
    }
    return value
  }

  const handleBuyNow = (productName: string) => {
    // Recuperar parâmetros UTM salvos
    const utmParamsStr = localStorage.getItem('utm-params')
    let urlParams = `product=${encodeURIComponent(productName)}`
    
    if (utmParamsStr) {
      try {
        const utmParams = JSON.parse(utmParamsStr)
        // Adicionar todos os parâmetros UTM à URL
        Object.entries(utmParams).forEach(([key, value]) => {
          if (value) {
            urlParams += `&${key}=${encodeURIComponent(String(value))}`
          }
        })
      } catch (e) {
        console.log('Erro ao recuperar UTM params:', e)
      }
    }
    
    router.push(`/checkout?${urlParams}`)
  }

  // Componente para renderizar produto
  const ProductCard = ({ 
    name, 
    price, 
    image, 
    alt, 
    description, 
    isBestSeller = false,
    isCombo = false 
  }: {
    name: string
    price: string
    image: string
    alt: string
    description: string
    isBestSeller?: boolean
    isCombo?: boolean
  }) => (
    <Card className="bg-white border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 animate-fade-in-up relative">
      <CardContent className="p-6 sm:p-8 text-center">
        {/* Badge Mais Vendidos */}
        {isBestSeller && (
          <div className="absolute top-4 right-4 bg-red-500 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
            <Star size={12} fill="white" />
            MAIS VENDIDO
          </div>
        )}
        
        {/* Badge Combo */}
        {isCombo && (
          <div className="absolute top-4 left-4 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
            <TrendingUp size={12} />
            COMBO
          </div>
        )}

        <div className="w-24 h-24 sm:w-32 sm:h-32 mx-auto mb-4 sm:mb-6 flex items-center justify-center">
          <img
            src={image}
            alt={alt}
            className="w-full h-full object-contain transition-transform duration-300 hover:scale-110"
          />
        </div>
        
        <h3 className="text-gray-800 font-bold text-lg sm:text-xl mb-3">{name}</h3>
        
        <div className="mb-4">
          <span className="text-2xl sm:text-3xl font-bold text-orange-500">{price}</span>
        </div>

        {/* Entrega Grátis */}
        <div className="flex items-center justify-center gap-2 mb-2 text-green-600 font-semibold text-sm">
          <Bike size={16} />
          Entrega Grátis via Motoboy
        </div>

        {/* Estoque */}
        <div className="mb-4 text-red-600 font-semibold text-sm">
          ⚡ Restam apenas {stock[name] || 0} unidades!
        </div>
        
        <p className="text-gray-600 text-sm mb-4 sm:mb-6 leading-relaxed">
          {description}
        </p>
        
        <Button
          onClick={() => handleBuyNow(name)}
          className="bg-orange-500 hover:bg-orange-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg flex items-center gap-2 mx-auto shadow-md hover:shadow-lg transition-all duration-300 text-sm sm:text-base"
        >
          <ShoppingCart size={16} />
          Fazer Pedido
        </Button>
      </CardContent>
    </Card>
  )

  return (
    <div className="min-h-screen bg-white">
      {/* Modal Como Funciona */}
      <Dialog open={showHowItWorksModal} onOpenChange={setShowHowItWorksModal}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-center text-2xl font-bold text-gray-800 mb-4">
              🤔 Como Funciona Nosso Serviço?
            </DialogTitle>
            <DialogDescription className="text-center text-gray-600 mb-6">
              Entenda todo o processo de pedido e entrega
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Processo Geral */}
            <div className="bg-gradient-to-r from-orange-50 to-yellow-50 p-4 rounded-lg border border-orange-200">
              <h3 className="font-bold text-orange-800 mb-3 flex items-center gap-2">
                🚀 <span>Processo Geral</span>
              </h3>
              <div className="space-y-2 text-sm text-gray-700">
                <p>• <strong>1.</strong> Escolha seu produto e clique em "Fazer Pedido"</p>
                <p>• <strong>2.</strong> Informe seus dados e endereço de entrega</p>
                <p>• <strong>3.</strong> Gere o PIX e efetue o pagamento</p>
                <p>• <strong>4.</strong> Receba em até 30 minutos na sua casa!</p>
              </div>
            </div>

            {/* Para Produtos de Gás */}
            <div className="bg-gradient-to-r from-orange-50 to-red-50 p-4 rounded-lg border border-orange-200">
              <h3 className="font-bold text-orange-800 mb-3 flex items-center gap-2">
                🔥 <span>Para Produtos de Gás</span>
              </h3>
              <div className="space-y-2 text-sm text-gray-700">
                <p>• <strong>Marcas disponíveis:</strong> Copagaz, Nacional Gás, Liquigas, Ultragas, SupergasBras</p>
                <p>• <strong>Confirmação:</strong> Nosso motoboy irá ligar para confirmar sua marca preferida</p>
                <p>• <strong>Sem taxas:</strong> A ligação é gratuita e o processo é bem prático</p>
                <p>• <strong>Notificação automática:</strong> Ao gerar o PIX, o motoboy mais próximo já recebe notificação</p>
                <p>• <strong>Após pagamento:</strong> Motoboy aceita automaticamente e liga para confirmar</p>
                <p>• <strong>Sem troca:</strong> Botijões novos, sem necessidade de trocar o vasilhame</p>
              </div>
            </div>

            {/* Para Produtos de Água */}
            <div className="bg-gradient-to-r from-blue-50 to-cyan-50 p-4 rounded-lg border border-blue-200">
              <h3 className="font-bold text-blue-800 mb-3 flex items-center gap-2">
                💧 <span>Para Produtos de Água</span>
              </h3>
              <div className="space-y-2 text-sm text-gray-700">
                <p>• <strong>Marcas disponíveis:</strong> Naturágua, Indaiá, Serra Grande, Límpida, Santa Sofia, Pacoti, Marilia, Neblina, Sagrada, Litoragua</p>
                <p>• <strong>Processo direto:</strong> Sem necessidade de ligação, entrega direta</p>
                <p>• <strong>Outras marcas:</strong> Se quiser outra marca, nosso motoboy liga para confirmar</p>
                <p>• <strong>Sem devolução:</strong> Garrafões novos, sem necessidade de devolver</p>
              </div>
            </div>

            {/* Cobertura e Parcerias */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg border border-green-200">
              <h3 className="font-bold text-green-800 mb-3 flex items-center gap-2">
                🏢 <span>Nossa Cobertura</span>
              </h3>
              <div className="space-y-2 text-sm text-gray-700">
                <p>• <strong>Centrais de distribuição:</strong> Na maioria das cidades e bairros</p>
                <p>• <strong>Estamos pertinho:</strong> Sempre próximos de você</p>
                <p>• <strong>Parcerias nacionais:</strong> Trabalhamos com as principais fornecedoras do país</p>
                <p>• <strong>Entrega rápida:</strong> Até 30 minutos na sua porta</p>
              </div>
            </div>

            {/* Vantagens */}
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-lg border border-purple-200">
              <h3 className="font-bold text-purple-800 mb-3 flex items-center gap-2">
                ⭐ <span>Nossas Vantagens</span>
              </h3>
              <div className="space-y-2 text-sm text-gray-700">
                <p>• <strong>Sem troca de vasilhame:</strong> Produtos novos, direto da fábrica</p>
                <p>• <strong>Preço justo:</strong> Direto do fornecedor, sem intermediários</p>
                <p>• <strong>Entrega grátis:</strong> Sem taxa de entrega via motoboy</p>
                <p>• <strong>Pagamento fácil:</strong> PIX instantâneo e seguro</p>
                <p>• <strong>Atendimento personalizado:</strong> Motoboy confirma detalhes por telefone</p>
              </div>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <Button 
              onClick={() => {
                setShowHowItWorksModal(false)
                document.getElementById("produtos")?.scrollIntoView({ behavior: "smooth" })
              }}
              className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
            >
              Entendi! Fazer Pedido
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setShowHowItWorksModal(false)}
              className="px-6"
            >
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showCepModal} onOpenChange={setShowCepModal}>
        <DialogContent className="sm:max-w-md" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle className="text-center text-2xl font-bold text-gray-800">Bem-vindo à Unigas!</DialogTitle>
            <DialogDescription className="text-center text-gray-600">
              Para verificarmos se atendemos sua região, informe seu CEP ou permita acesso à sua localização:
            </DialogDescription>
          </DialogHeader>

          {!addressData ? (
            <form onSubmit={handleCepSubmit} className="space-y-4">
              <div>
                <Input
                  type="text"
                  placeholder="Digite seu CEP (ex: 12345-678)"
                  value={cep}
                  onChange={(e) => {
                    const value = sanitizeInput(e.target.value)
                    if (isInputSafe(value)) {
                      setCep(formatCep(value))
                    }
                  }}
                  className="text-center text-lg"
                  maxLength={9}
                />
                {error && <p className="text-red-500 text-sm text-center mt-2">{error}</p>}
              </div>

              <div className="space-y-3">
                <Button
                  type="submit"
                  disabled={loading || cep.length < 9}
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                >
                  {loading ? "Verificando..." : "Verificar CEP"}
                </Button>
                
                <div className="text-center text-gray-500 text-sm">ou</div>
                
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    requestUserLocation()
                    handleCloseModal()
                  }}
                  className="w-full border-orange-500 text-orange-500 hover:bg-orange-50"
                >
                  📍 Usar Minha Localização
                </Button>
                
                <p className="text-xs text-gray-500 text-center mt-2">
                  💡 Se não conseguirmos sua localização, você poderá informar o CEP no checkout
                </p>
                
                <Button type="button" variant="ghost" onClick={handleCloseModal} className="w-full text-gray-500">
                  Pular por agora
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <MapPin className="w-5 h-5 text-green-600" />
                  <h3 className="font-semibold text-green-800">Endereço Confirmado!</h3>
                </div>

                <div className="space-y-2 text-sm text-gray-700">
                  <p>
                    <strong>CEP:</strong> {addressData.cep}
                  </p>
                  <p>
                    <strong>Rua:</strong> {addressData.logradouro}
                  </p>
                  <p>
                    <strong>Bairro:</strong> {addressData.bairro}
                  </p>
                  <p>
                    <strong>Cidade:</strong> {addressData.localidade} - {addressData.uf}
                  </p>
                </div>
              </div>

              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-5 h-5 text-orange-600" />
                  <h3 className="font-semibold text-orange-800">Entrega Rápida!</h3>
                </div>
                <p className="text-sm text-gray-700">
                  Realizamos entrega em até <strong>30 minutos</strong> diretamente no seu endereço!
                </p>
              </div>

              <Button onClick={handleCloseModal} className="w-full bg-orange-500 hover:bg-orange-600 text-white">
                Começar a Comprar
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-100 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center">
            <img
              src="https://unigaseagua.com.br/wp-content/uploads/2025/02/unigas-com-letras-NORMAIS.png"
              alt="Unigas e Água"
              className="h-8 sm:h-10 w-auto"
            />
          </div>
          <nav className="hidden md:flex items-center space-x-6">
            <a
              href="#produtos"
              className="text-gray-600 hover:text-orange-500 transition-colors duration-200 text-sm font-medium"
              onClick={(e) => {
                e.preventDefault()
                document.getElementById("produtos")?.scrollIntoView({ behavior: "smooth" })
              }}
            >
              Produtos
            </a>
            <a
              href="#entrega"
              className="text-gray-600 hover:text-orange-500 transition-colors duration-200 text-sm font-medium"
              onClick={(e) => {
                e.preventDefault()
                document.getElementById("entrega")?.scrollIntoView({ behavior: "smooth" })
              }}
            >
              Entrega
            </a>
          </nav>
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-600 hover:text-orange-500 p-2"
              onClick={() => document.getElementById("produtos")?.scrollIntoView({ behavior: "smooth" })}
            >
              <ShoppingCart className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section id="inicio" className="bg-white py-12 sm:py-16 lg:py-20 border-b border-gray-100">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            <div className="text-center lg:text-left animate-fade-in-up">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-800 mb-4 sm:mb-6 leading-tight">
                Gás de cozinha
                <br />e Água Mineral
              </h1>
              <p className="text-gray-700 mb-6 sm:mb-8 text-lg sm:text-xl font-semibold">
  Somos parceiros das principais indústrias do setor e trazemos uma novidade única: 
  você pode comprar seu <span className="text-orange-600 font-bold">Gás de Cozinha</span> ou 
  <span className="text-blue-600 font-bold"> Água Mineral</span> em recipientes novos, 
  <span className="underline"> sem precisar trocar o vasilhame</span>. 
  Mais praticidade, mais agilidade e um preço justo direto da fábrica.
</p>
              <div className="flex flex-col sm:flex-row gap-4 mb-6 justify-center lg:justify-start">
                <Button
                  onClick={() => document.getElementById("produtos")?.scrollIntoView({ behavior: "smooth" })}
                  className="bg-orange-500 hover:bg-orange-600 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-lg flex items-center justify-center gap-2 text-base sm:text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                >
                  <ShoppingCart size={20} />
                  Fazer Pedido
                </Button>
                <Button
                  onClick={() => setShowHowItWorksModal(true)}
                  variant="outline"
                  className="border-2 border-orange-500 text-orange-500 hover:bg-orange-50 px-6 sm:px-8 py-3 sm:py-4 rounded-lg flex items-center justify-center gap-2 text-base sm:text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  <HelpCircle size={20} />
                  Dúvidas?
                </Button>
              </div>
            </div>

            <div className="relative animate-fade-in-right">
              <div className="flex justify-center">
                <img
                  src="https://unigaseagua.com.br/wp-content/uploads/2025/02/Trabalhamos-com-3-1.png"
                  alt="Produtos Unigas"
                  className="w-64 sm:w-80 h-48 sm:h-60 object-contain rounded-lg shadow-lg"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Products Section */}
      <section id="produtos" className="bg-gray-50 py-12 sm:py-16 lg:py-20 border-b border-gray-200">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12 sm:mb-16 animate-fade-in-up">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-800 mb-4">Nossos Produtos</h2>
            <div className="w-24 h-1 bg-orange-500 mx-auto rounded-full"></div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8 max-w-5xl mx-auto">
            
            {/* 1. GÁS P13 - MAIS VENDIDO */}
            <ProductCard
              name="Gás de cozinha 13 kg (P13)"
              price="R$ 89,00"
              image="/images/gas-p13.png"
              alt="Botijão de Gás P13 13kg"
              description="Peça seu botijão sem sair de casa!"
              isBestSeller={true}
            />

            {/* 2. COMBO GÁS + GARRAFÃO */}
            <ProductCard
              name="Combo Gás + Garrafão"
              price="R$ 99,00"
              image="/images/comboGas_garrafao.png"
              alt="Combo Gás + Garrafão"
              description="Combo completo com 1 botijão de gás 13kg + 1 garrafão de água 20L. Praticidade e economia em um só pedido."
              isBestSeller={true}
              isCombo={true}
            />

            {/* 3. GARRAFÃO DE ÁGUA */}
            <ProductCard
              name="Garrafão de água Mineral 20L"
              price="R$ 18,70"
              image="/images/agua-indaia-20l.png"
              alt="Água Mineral Indaiá 20L"
              description="Também contamos com água mineral de 20 litros. Esse galão é ideal para residências, empresas e escritórios. Encomende já você com agilidade."
            />

            {/* 4. 3 GARRAFÕES */}
            <ProductCard
              name="3 Garrafões de Água 20L"
              price="R$ 49,70"
              image="/images/3garrafoes.png"
              alt="3 Garrafões de Água 20L"
              description="Combo econômico com 3 garrafões de água mineral de 20 litros. Ideal para famílias grandes, empresas e estabelecimentos comerciais."
              isBestSeller={true}
              isCombo={true}
            />

            {/* 5. COMBO 2 BOTIJÕES */}
            <ProductCard
              name="Combo 2 Botijões de Gás 13kg"
              price="R$ 170,00"
              image="/images/combo 2 botijao 13kg.png"
              alt="Combo 2 Botijões de Gás 13kg"
              description="Combo promocional com 2 botijões de gás P13. Economia garantida para sua casa com desconto especial na compra em conjunto."
              isBestSeller={true}
              isCombo={true}
            />

            {/* <ProductCard
              name="Água Mineral Serragrande 20L"
              price="R$ 12,00"
              image="/images/agua-serragrande-20l.png"
              alt="Água Mineral Serragrande 20L"
              description="Também contamos com água mineral de 20 litros. Esse galão é ideal para residências, empresas e escritórios. Encomende já você com agilidade."
            /> */}

            <ProductCard
              name="Botijão de Gás 8kg P8"
              price="R$ 75,00"
              image="/images/gas-p8-8kg.png"
              alt="Botijão de Gás 8kg P8"
              description="O botijão de gás P8 tem capacidade para 8kg de GLP e sua aparência é a mesma do P13, porém um pouco mais estreito. Atende aos consumidores que buscam um produto mais barato e não possuem tanta demanda de gás em suas casas. Sendo uma excelente opção como botijão reserva."
            />
          </div>
        </div>
      </section>

      {/* Delivery Section */}
      <section id="entrega" className="bg-white py-12 sm:py-16 lg:py-20 border-b border-gray-200">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            <div className="flex justify-center order-2 lg:order-1 animate-fade-in-left">
              <img
                src="https://unigaseagua.com.br/wp-content/uploads/2025/02/Trabalhamos-com-4-1.png"
                alt="Entrega de produtos"
                className="w-64 sm:w-80 h-48 sm:h-60 object-contain rounded-lg shadow-lg"
              />
            </div>
            <div className="text-center lg:text-left order-1 lg:order-2 animate-fade-in-right">
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-800 mb-4 sm:mb-6 leading-tight">
                Entregamos no conforto da sua residência
              </h2>
              <div className="w-16 h-1 bg-orange-500 mb-4 sm:mb-6 rounded-full mx-auto lg:mx-0"></div>
              <p className="text-gray-600 mb-3 sm:mb-4 text-base sm:text-lg leading-relaxed">
                Para sua maior comodidade, agora você pode comprar online!
              </p>
              <p className="text-gray-600 mb-4 text-base sm:text-lg leading-relaxed">
                Realizamos atendimento rápido via Tele Gás (Disk Gás) ou pelo nosso site, garantindo entrega em até 30
                minutos diretamente na sua casa.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="bg-gray-50 py-12 sm:py-16 lg:py-20 border-b border-gray-200">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12 sm:mb-16 animate-fade-in-up">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-800 mb-4">Perguntas Frequentes</h2>
            <div className="w-24 h-1 bg-orange-500 mx-auto rounded-full"></div>
          </div>
          <div className="max-w-3xl mx-auto animate-fade-in-up animation-delay-200">
            <Accordion type="single" collapsible className="w-full space-y-3 sm:space-y-4">
              <AccordionItem value="item-1" className="bg-white rounded-lg shadow-md border-0">
                <AccordionTrigger className="px-4 sm:px-6 py-3 sm:py-4 hover:no-underline hover:bg-gray-50 rounded-lg transition-colors duration-300 text-left text-sm sm:text-base">
                  Posso pedir gás e água juntos?
                </AccordionTrigger>
                <AccordionContent className="px-4 sm:px-6 pb-3 sm:pb-4 text-gray-600 leading-relaxed text-sm sm:text-base">
                  Sim! Você pode fazer um pedido combinado de gás e água mineral para maior comodidade e economia no
                  frete.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-2" className="bg-white rounded-lg shadow-md border-0">
                <AccordionTrigger className="px-4 sm:px-6 py-3 sm:py-4 hover:no-underline hover:bg-gray-50 rounded-lg transition-colors duration-300 text-left text-sm sm:text-base">
                  Qual o tempo de entrega?
                </AccordionTrigger>
                <AccordionContent className="px-4 sm:px-6 pb-3 sm:pb-4 text-gray-600 leading-relaxed text-sm sm:text-base">
                  {userLocation.loading ? (
                    "Realizamos entregas em até 30 minutos para a região metropolitana. O tempo pode variar dependendo da localização e demanda."
                  ) : userLocation.city !== "Barreiro, Contagem e região metropolitana" ? (
                    <>
                      Realizamos entregas em até 30 minutos para <strong>{userLocation.city}</strong> e região. 
                      O tempo pode variar dependendo da localização específica e demanda.
                    </>
                  ) : (
                    "Realizamos entregas em até 30 minutos para a região metropolitana. O tempo pode variar dependendo da localização e demanda."
                  )}
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-3" className="bg-white rounded-lg shadow-md border-0">
                <AccordionTrigger className="px-4 sm:px-6 py-3 sm:py-4 hover:no-underline hover:bg-gray-50 rounded-lg transition-colors duration-300 text-left text-sm sm:text-base">
                Tenho que trocar o botijão como de costume?
                </AccordionTrigger>
                <AccordionContent className="px-4 sm:px-6 pb-3 sm:pb-4 text-gray-600 leading-relaxed text-sm sm:text-base">
                  Não, vendemos os botijões cheios sem a necessidade de troca.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-3" className="bg-white rounded-lg shadow-md border-0">
                <AccordionTrigger className="px-4 sm:px-6 py-3 sm:py-4 hover:no-underline hover:bg-gray-50 rounded-lg transition-colors duration-300 text-left text-sm sm:text-base">
                Tenho que devolver o garrafão ou trocar na hora?
                </AccordionTrigger>
                <AccordionContent className="px-4 sm:px-6 pb-3 sm:pb-4 text-gray-600 leading-relaxed text-sm sm:text-base">
                  Não, vendemos os garrafões cheios sem a necessidade de devolução. São novos e nunca foram usados.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-3" className="bg-white rounded-lg shadow-md border-0">
                <AccordionTrigger className="px-4 sm:px-6 py-3 sm:py-4 hover:no-underline hover:bg-gray-50 rounded-lg transition-colors duration-300 text-left text-sm sm:text-base">
                  Quais formas de pagamento vocês aceitam?
                </AccordionTrigger>
                <AccordionContent className="px-4 sm:px-6 pb-3 sm:pb-4 text-gray-600 leading-relaxed text-sm sm:text-base">
                  Aceitamos dinheiro, cartão de débito, cartão de crédito e PIX para sua maior comodidade.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-4" className="bg-white rounded-lg shadow-md border-0">
                <AccordionTrigger className="px-4 sm:px-6 py-3 sm:py-4 hover:no-underline hover:bg-gray-50 rounded-lg transition-colors duration-300 text-left text-sm sm:text-base">
                  Vocês atendem em quais regiões?
                </AccordionTrigger>
                <AccordionContent className="px-4 sm:px-6 pb-3 sm:pb-4 text-gray-600 leading-relaxed text-sm sm:text-base">
                  {userLocation.loading ? (
                    <span className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-500"></div>
                      Verificando sua localização...
                    </span>
                  ) : userLocation.city !== "Barreiro, Contagem e região metropolitana" ? (
                    <>
                      Atendemos <strong>{userLocation.city}</strong>{userLocation.state && `, ${userLocation.state}`} e região. 
                      Entre em contato para confirmar se sua localização específica está na nossa área de cobertura.
                    </>
                  ) : (
                    "Atendemos Barreiro, Contagem e região metropolitana. Entre em contato para confirmar se sua localização está na nossa área de cobertura."
                  )}
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-5" className="bg-white rounded-lg shadow-md border-0">
                <AccordionTrigger className="px-4 sm:px-6 py-3 sm:py-4 hover:no-underline hover:bg-gray-50 rounded-lg transition-colors duration-300 text-left text-sm sm:text-base">
                  Como posso fazer meu pedido?
                </AccordionTrigger>
                <AccordionContent className="px-4 sm:px-6 pb-3 sm:pb-4 text-gray-600 leading-relaxed text-sm sm:text-base">
                  Você pode fazer seu pedido pelo nosso site clicando em "Fazer Pedido", é bem fácil e intuitivo, nosso motoboy chegará até você em até 30 minutos.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white py-8 sm:py-12 border-t-2 border-gray-100">
        <div className="container mx-auto px-4 text-center">
          <p className="text-gray-600 text-base sm:text-lg">© 2025 Unigas e Água. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  )
}
