import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, MoreVertical, Pen, Trash } from "lucide-react";
import type { Obra } from "@/types/obra";
import type { Orcamento } from "@/types/orcamento";
import { useToast } from "@/components/ui/use-toast";
import { listarObras, listarOrcamentos, excluirOrcamento } from "@/lib/api";

const Orcamentos = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [obraId, setObraId] = useState<string>("");
  const [obras, setObras] = useState<Obra[]>([]);
  const [orcamentos, setOrcamentos] = useState<Orcamento[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      setLoading(true);
      const [obrasData, orcamentosData] = await Promise.all([
        listarObras(),
        listarOrcamentos()
      ]);
      
      setObras(obrasData || []);
      setOrcamentos(orcamentosData || []);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleNovoOrcamento = () => {
    if (!obraId) {
      toast({
        title: "Erro",
        description: "Selecione uma obra primeiro",
        variant: "destructive",
      });
      return;
    }
    navigate(`/orcamentos/novo/${obraId}`);
  };

  const handleVerOrcamento = (orcamentoId: number) => {
    navigate(`/orcamentos/${orcamentoId}`);
  };

  const handleEditarOrcamento = (event: React.MouseEvent, orcamentoId: number) => {
    event.stopPropagation();
    navigate(`/orcamentos/novo/${obraId}`, { 
      state: { orcamentoId } 
    });
  };

  const handleExcluirOrcamento = async (event: React.MouseEvent, orcamentoId: number) => {
    event.stopPropagation();
    try {
      await excluirOrcamento(orcamentoId);
      await carregarDados();
      toast({
        title: "Sucesso",
        description: "Orçamento excluído com sucesso",
      });
    } catch (error) {
      console.error('Erro ao excluir orçamento:', error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir o orçamento",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
        <p className="text-gray-600">Carregando dados...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-slideIn p-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800">Orçamentos</h1>
        <Button onClick={handleNovoOrcamento} className="bg-primary hover:bg-primary-dark">
          <Plus className="w-4 h-4 mr-2" />
          Novo Orçamento
        </Button>
      </div>

      <div className="w-full max-w-md">
        <Select value={obraId} onValueChange={setObraId}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione uma obra" />
          </SelectTrigger>
          <SelectContent>
            {obras.map((obra) => (
              <SelectItem key={obra.id} value={String(obra.id)}>
                {obra.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-6">
        {orcamentos.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {orcamentos
              .filter((orc) => orc.obra_id === Number(obraId))
              .map((orcamento) => (
                <Card
                  key={orcamento.id}
                  className="p-6 hover:shadow-lg transition-shadow cursor-pointer relative"
                  onClick={() => handleVerOrcamento(orcamento.id)}
                >
                  <div className="absolute top-4 right-4">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => handleEditarOrcamento(e, orcamento.id)}>
                          <Pen className="h-4 w-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-red-600"
                          onClick={(e) => handleExcluirOrcamento(e, orcamento.id)}
                        >
                          <Trash className="h-4 w-4 mr-2" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{orcamento.nome}</h3>
                    <p className="text-sm text-gray-500 mt-1">{orcamento.descricao}</p>
                    <div className="mt-4">
                      <p className="text-sm font-medium">Valor Total: R$ {orcamento.valor_total}</p>
                      <p className="text-sm text-gray-500">Status: {orcamento.status}</p>
                    </div>
                  </div>
                </Card>
              ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">Nenhum orçamento cadastrado</p>
            <Button onClick={handleNovoOrcamento}>
              <Plus className="w-4 h-4 mr-2" />
              Criar Primeiro Orçamento
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Orcamentos;
