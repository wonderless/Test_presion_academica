'use client';
import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen w-full bg-mi-color-rgb flex flex-col items-center justify-center p-4">
      {/* El título es largo, así que la fuente escala con el ancho en lugar de
          quedarse fija: a 48px (text-5xl) ocupaba media pantalla en escritorio
          y siete líneas en un teléfono. max-w-3xl evita además que se estire a
          todo lo ancho en monitores grandes, donde una línea tan larga cuesta
          de leer. */}
      <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-center mb-8 md:mb-12 text-white max-w-3xl">
        Programa de evaluación y orientación de los modos de afrontamiento a la
        tensión académica
      </h1>
      <div className="bg-celeste p-8 rounded-lg shadow-md w-full max-w-md mb-8">
        <h2 className="text-xl font-bold text-center mb-4">Acceso de Usuarios</h2>
        
        <div className="space-y-4">
          <Link
            href="/auth/loginUser"
            className="w-full block text-center bg-blue-500 text-white py-3 px-4 rounded-lg hover:bg-blue-600 transition duration-200"
          >
            Iniciar Sesión como Usuario
          </Link>
          
          <p className="text-sm text-gray-600 text-center">
            ¿No tienes cuenta?
            <Link
              href="/auth/registerUser"
              className="text-blue-500 hover:text-blue-700 transition duration-200"
            >
              Regístrate aquí
            </Link>
          </p>
        </div>
      </div>
      
      <div className="bg-celeste p-8 rounded-lg shadow-md w-full max-w-md">
        <h2 className="text-xl font-bold text-center mb-4">Acceso de Administradores</h2>
        
        <Link
          href="/auth/loginAdmin"
          className="w-full block text-center bg-gray-500 text-white py-3 px-4 rounded-lg hover:bg-gray-600 transition duration-200"
        >
          Iniciar Sesión como Administrador
        </Link>
      </div>
    </div>
  );
}