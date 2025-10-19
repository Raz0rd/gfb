"use client"

import { MapPin } from "lucide-react"
import { useEffect, useState } from "react"

export default function LocationHeader() {
  const [userLocation, setUserLocation] = useState({
    city: "",
    state: "",
    confirmed: false
  })
  const [deliveryTime, setDeliveryTime] = useState("")

  // Função para carregar localização
  const loadLocation = () => {
    const savedLocation = localStorage.getItem("user-location")
    if (savedLocation) {
      try {
        const { city, state, confirmed, deliveryTime } = JSON.parse(savedLocation)
        if (confirmed) {
          setUserLocation({ city, state, confirmed })
          
          // Usar tempo salvo ou gerar novo se não existir
          if (deliveryTime) {
            setDeliveryTime(deliveryTime)
          } else {
            // Gerar tempo de entrega aleatório entre 10-30 minutos apenas na primeira vez
            const time = Math.floor(Math.random() * 21) + 10 // 10-30 minutos
            const timeString = `${time} minutos`
            setDeliveryTime(timeString)
            
            // Salvar o tempo gerado no localStorage
            const updatedLocation = { city, state, confirmed, deliveryTime: timeString }
            localStorage.setItem("user-location", JSON.stringify(updatedLocation))
          }
        }
      } catch (error) {
        console.log("Erro ao carregar localização:", error)
      }
    }
  }

  useEffect(() => {
    // Carregar localização inicial
    loadLocation()
    
    // Escutar evento customizado de atualização de localização
    const handleLocationUpdate = () => {
      console.log("📍 LocationHeader: Recebeu evento de atualização")
      loadLocation()
    }
    
    // Adicionar listeners para múltiplos eventos
    window.addEventListener('locationUpdated', handleLocationUpdate)
    window.addEventListener('storage', handleLocationUpdate)
    
    // Cleanup
    return () => {
      window.removeEventListener('locationUpdated', handleLocationUpdate)
      window.removeEventListener('storage', handleLocationUpdate)
    }
  }, [])

  // Não mostrar se localização não foi confirmada
  if (!userLocation.confirmed || !userLocation.city) {
    return null
  }

  return (
    <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white py-2 px-4 shadow-md">
      <div className="container mx-auto">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 text-center">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 flex-shrink-0" />
            <span className="text-sm font-semibold">
              📍 Entregas para <strong>{userLocation.city}</strong>
              {userLocation.state && ` - ${userLocation.state}`}
            </span>
          </div>
          <span className="text-xs sm:text-sm opacity-90">
            ⚡ Tempo estimado: <strong>{deliveryTime}</strong>
          </span>
        </div>
      </div>
    </div>
  )
}
