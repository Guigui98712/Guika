import React, { useState, useEffect } from "react";
import { Link, useLocation, Outlet } from "react-router-dom";
import { Building2, Calculator } from "lucide-react";
import { supabase } from "@/lib/supabase";

const Layout = () => {
  const location = useLocation();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.from('obras').select('count');
      if (error) throw error;
      console.log('Conexão com Supabase OK');
    } catch (err) {
      console.error('Erro na conexão com Supabase:', err);
      setError('Erro ao conectar com o banco de dados');
    } finally {
      setIsLoading(false);
    }
  };

  const menuItems = [
    { icon: Building2, label: "Obras", path: "/obras" },
    { icon: Calculator, label: "Orçamentos", path: "/orcamentos" }
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="text-red-600 mb-4">{error}</div>
        <button 
          onClick={checkConnection}
          className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark"
        >
          Tentar Novamente
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-lg fixed h-full">
        <div className="p-4 border-b">
          <h1 className="text-2xl font-bold text-primary">ConstructManager</h1>
        </div>
        <nav className="mt-4">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center px-6 py-3 text-gray-700 hover:bg-gray-100 transition-colors ${
                  isActive ? "bg-gray-100 border-r-4 border-primary" : ""
                }`}
              >
                <Icon className="w-5 h-5 mr-3" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Main content */}
      <div className="flex-1 ml-64">
        <div className="p-8">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default Layout;
