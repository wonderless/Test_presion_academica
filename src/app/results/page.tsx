'use client'

import { LogOut } from 'lucide-react'
import { ResultsDisplay } from '../../components/ResultsDisplay/ResultsDisplay'
import { useAuth } from '@/contexts/AuthContext'

export default function Results() {
  const { user, loading: authLoading, signOut } = useAuth()

  // Esta página leía el documento del usuario solo para pasárselo a
  // ResultsDisplay como prop `userInfo`, que nunca llegaba a leerse:
  // ResultsDisplay carga por su cuenta lo que necesita a partir del userId.
  // Se ahorra así una lectura de Firestore por visita.

  const handleSignOut = async () => {
    try {
      // Al quedarse sin sesión, Redirect devuelve al consentimiento.
      await signOut()
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  if (authLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="w-full px-2 sm:px-4 py-4 sm:py-8 min-h-screen bg-mi-color-rgb">
      {/* Quien ya hizo el test y no puede repetirlo aterriza aquí desde el
          dashboard, así que esta pantalla necesita su propia salida: sin ella
          se quedaba sin ninguna forma de cerrar sesión. */}
      <div className="flex justify-end mb-2">
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 px-3 py-2 text-gray-200 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          title="Cerrar Sesión"
        >
          <LogOut size={20} />
          <span className="text-sm">Cerrar Sesión</span>
        </button>
      </div>

      {/* Redirect (en el layout) ya garantiza sesión y rol para esta ruta. */}
      {user && <ResultsDisplay userId={user.uid} />}
    </div>
  )
}
