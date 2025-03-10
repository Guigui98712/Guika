import React, { useState, useEffect } from "react";
import { Link, useLocation, Outlet, useNavigate } from "react-router-dom";
import { Building2, Calculator, RefreshCw, LogOut, User } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const Layout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut, isDevelopmentMode } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCheckingConnection, setIsCheckingConnection] = useState(false);

  useEffect(() => {
    // Pular verificação de conexão no modo de desenvolvimento
    if (isDevelopmentMode) {
      setIsLoading(false);
      return;
    }
    
    checkConnection();
  }, [isDevelopmentMode]);

  const checkConnection = async () => {
    try {
      setIsLoading(true);
      setIsCheckingConnection(true);
      setError(null);
      
      // Verificar se as variáveis de ambiente estão definidas
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseKey) {
        setError('Variáveis de ambiente do Supabase não definidas. Verifique o arquivo .env.local');
        return;
      }
      
      console.log('Verificando conexão com Supabase...');
      console.log('URL:', supabaseUrl);
      
      // Tentar fazer uma consulta simples
      const { data, error } = await supabase.from('obras').select('id').limit(1);
      
      if (error) {
        console.error('Erro na consulta ao Supabase:', error);
        
        if (error.code === 'PGRST301') {
          setError('Erro de CORS. Verifique a configuração do CORS no Supabase.');
        } else if (error.code === '42P01') {
          setError('Tabela não encontrada. Verifique se as tabelas foram criadas no Supabase.');
        } else {
          setError(`Erro ao conectar com o banco de dados: ${error.message}`);
        }
        return;
      }
      
      console.log('Conexão com Supabase OK');
      setError(null);
    } catch (err: any) {
      console.error('Erro na conexão com Supabase:', err);
      setError(`Erro ao conectar com o banco de dados: ${err.message || 'Erro desconhecido'}`);
    } finally {
      setIsLoading(false);
      setIsCheckingConnection(false);
    }
  };

  const menuItems = [
    { icon: Building2, label: "Obras", path: "/obras" },
    { icon: Calculator, label: "Orçamentos", path: "/orcamentos" }
  ];

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  // Obter o nome do usuário
  const userName = user?.user_metadata?.name || user?.email || 'Usuário';

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
        <div className="text-red-600 mb-4 max-w-md text-center">
          <h2 className="text-xl font-bold mb-2">Erro de Conexão</h2>
          <p>{error}</p>
        </div>
        <button 
          onClick={checkConnection}
          className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark flex items-center"
          disabled={isCheckingConnection}
        >
          {isCheckingConnection ? (
            <>
              <RefreshCw className="animate-spin mr-2 h-4 w-4" />
              Verificando...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Tentar Novamente
            </>
          )}
        </button>
        <div className="mt-4 text-sm text-gray-600 max-w-md text-center">
          <p>Verifique se:</p>
          <ul className="list-disc list-inside mt-2 text-left">
            <li>O Supabase está online e acessível</li>
            <li>As variáveis de ambiente estão configuradas corretamente</li>
            <li>O CORS está configurado para permitir requisições de localhost:8083</li>
            <li>As tabelas foram criadas no banco de dados</li>
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm fixed top-0 left-0 right-0 z-10">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <h1 className="text-xl font-bold text-primary">G-Log</h1>
          
          <div className="flex items-center space-x-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <User className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{userName}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user?.email || 'Modo de desenvolvimento'}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-red-600 cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sair</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <button className="md:hidden">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <div className="flex pt-16">
        <aside className="fixed inset-y-0 left-0 z-10 w-64 bg-white border-r border-gray-200 pt-16 hidden md:block">
          <nav className="p-4 space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname.startsWith(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-md transition-colors ${
                    isActive
                      ? "bg-primary text-white"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </aside>

        <main className="flex-1 md:ml-64 p-4">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
