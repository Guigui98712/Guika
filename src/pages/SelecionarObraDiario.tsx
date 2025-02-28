
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { listarObras } from '@/lib/api';
import { useToast } from '@/components/ui/use-toast';

const SelecionarObraDiario = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [obras, setObras] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarObras();
  }, []);

  const carregarObras = async () => {
    try {
      const data = await listarObras();
      setObras(data);
    } catch (error) {
      console.error('Erro ao carregar obras:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as obras.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Selecionar Obra para Diário</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {obras.map((obra) => (
          <Card key={obra.id} className="p-6 hover:shadow-lg transition-shadow">
            <h2 className="text-xl font-semibold mb-4">{obra.nome}</h2>
            <p className="text-gray-600 mb-4">{obra.endereco}</p>
            <Button 
              className="w-full"
              onClick={() => navigate(`/obras/${obra.id}/diario`)}
            >
              Acessar Diário
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default SelecionarObraDiario;
