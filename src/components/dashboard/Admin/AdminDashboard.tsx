'use client';

import { useState, useEffect, useRef } from "react";
import ListaUsers from "./ListaUsers";
import OtherData from "./OtherData";
import { LogOut, Menu } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const AdminDashboard = () => {
  const [selectedOption, setSelectedOption] = useState("Lista de usuarios");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const sidebarRef = useRef<HTMLDivElement | null>(null);
  const { signOut } = useAuth();
  const menuOptions = [
    "Lista de usuarios",
    "Datos sociogeograficos"
  ];

  const renderContent = () => {
    switch (selectedOption) {
      case "Lista de usuarios":
        return <ListaUsers />;
      case "Datos sociogeograficos":
        return <OtherData />;
      default:
        return <div>Seleccione una opción</div>;
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  // Cerrar sidebar cuando se hace clic fuera de él
  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (sidebarOpen && 
          sidebarRef.current && 
          !sidebarRef.current.contains(event.target as Node) &&
          event.target && !(event.target as Element).closest('button[aria-label="Toggle menu"]')) {
        setSidebarOpen(false);
      }
    }

    // Agregar evento solo si el sidebar está abierto
    if (sidebarOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
    }
    
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [sidebarOpen]);

  return (
    <div className="flex h-screen">
      {/* Mobile Header */}
      <div className="md:hidden fixed top-4 left-4 z-50">
        <button 
          onClick={() => setSidebarOpen(!sidebarOpen)} 
          className="text-white bg-mi-color-rgb p-2 rounded"
          aria-label="Toggle menu"
        >
          <Menu size={24} />
        </button>
      </div>

      {/* Sidebar */}
      <div
        ref={sidebarRef}
        className={`
          fixed top-0 left-0 h-full bg-mi-color-rgb text-white z-40 transform 
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
          transition-transform duration-300
          md:static md:translate-x-0 md:w-auto md:min-w-52
          flex flex-col
        `}
      >
        <div className="p-5 flex-1">
          <h2 className="text-xl font-bold mb-4 mt-12 md:mt-0">Panel de Administrador</h2>
          <ul>
            {menuOptions.map((option) => (
              <li
                key={option}
                className={`p-3 cursor-pointer rounded-lg hover:bg-gray-700 ${
                  selectedOption === option ? "bg-gray-600" : ""
                }`}
                onClick={() => {
                  setSelectedOption(option);
                  setSidebarOpen(false);
                }}
              >
                {option}
              </li>
            ))}
          </ul>
        </div>
        
        {/* Sign Out Button */}
        <div className="p-5 border-t border-gray-600">
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-2 p-3 text-left hover:bg-gray-700 rounded-lg transition-colors"
          >
            <LogOut size={20} />
            Cerrar Sesión
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 p-10 bg-celeste overflow-y-auto md:ml-0">{renderContent()}</div>
    </div>
  );
};

export default AdminDashboard;