import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { listarObras } from '@/lib/api';
import type { Obra } from '@/types/obra';

const SelecionarObraRelatorio = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [obras, setObras] = useState<Obra[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarObras();
  }, []);

  const carregarObras = async () => {
    try {
      setLoading(true);
      const data = await listarObras();
      setObras(data || []);
    } catch (error) {
      console.error('Erro ao carregar obras:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar a lista de obras.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSelecionarObra = (obraId: number) => {
    navigate(`/obras/${obraId}/relatorios`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Selecionar Obra para Relatórios</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {obras.map((obra) => (
          <Card
            key={obra.id}
            className="p-6 hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => handleSelecionarObra(obra.id)}
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-lg mb-2">{obra.nome}</h3>
                <p className="text-sm text-gray-500">{obra.endereco}</p>
              </div>
              <FileText className="w-5 h-5 text-gray-400" />
            </div>
            
            <div className="mt-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Status:</span>
                <span className="font-medium capitalize">{obra.status.replace('_', ' ')}</span>
              </div>
              <div className="flex items-center justify-between text-sm mt-1">
                <span className="text-gray-500">Progresso:</span>
                <span className="font-medium">{obra.progresso}%</span>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {obras.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">Nenhuma obra cadastrada</p>
          <Button onClick={() => navigate('/obras')}>
            Cadastrar Nova Obra
          </Button>
        </div>
      )}
    </div>
  );
};

export default SelecionarObraRelatorio;
