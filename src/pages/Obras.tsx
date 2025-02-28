import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import type { Obra } from "@/types/obra";
import { listarObras, criarObra, atualizarObra, excluirObra } from "@/lib/api";

const Obras = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [obras, setObras] = useState<Obra[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDialog, setShowDialog] = useState(false);

  const [novaObra, setNovaObra] = useState({
    nome: "",
    endereco: "",
    custo_previsto: 0
  });

  const [obraEmEdicao, setObraEmEdicao] = useState<Obra | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);

  useEffect(() => {
    carregarObras();
  }, []);

  const carregarObras = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Carregando obras...');

      const data = await listarObras();
      console.log('Obras carregadas:', data);
      setObras(data || []);
    } catch (error) {
      console.error('Erro ao carregar obras:', error);
      setError('Não foi possível carregar as obras. Por favor, tente novamente.');
      toast({
        title: "Erro",
        description: "Não foi possível carregar as obras.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerDetalhes = (obraId: number) => {
    navigate(`/obras/${obraId}`);
  };

  const handleNovaObra = async () => {
    if (!novaObra.nome || !novaObra.endereco || novaObra.custo_previsto <= 0) {
      toast({
        title: "Erro",
        description: "Por favor, preencha todos os campos corretamente.",
        variant: "destructive"
      });
      return;
    }

    try {
      const novaObraData = {
        nome: novaObra.nome,
        endereco: novaObra.endereco,
        custo_previsto: novaObra.custo_previsto,
        custo_real: 0,
        progresso: 0,
        status: 'em_andamento' as const
      };

      const novaObraCompleta: Obra = {
        ...novaObraData,
        id: obras.length + 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        etapas: []
      };

      setObras([...obras, novaObraCompleta]);
      setNovaObra({ nome: "", endereco: "", custo_previsto: 0 });
      setShowDialog(false);
      toast({
        title: "Sucesso",
        description: "Obra criada com sucesso!"
      });
    } catch (error) {
      console.error('Erro ao criar obra:', error);
      toast({
        title: "Erro",
        description: "Não foi possível criar a obra.",
        variant: "destructive"
      });
    }
  };

  const handleEditarObra = (obra: Obra) => {
    setObraEmEdicao(obra);
    setShowEditDialog(true);
  };

  const handleSalvarEdicao = async () => {
    if (!obraEmEdicao) return;

    try {
      await atualizarObra(obraEmEdicao.id, {
        nome: obraEmEdicao.nome,
        endereco: obraEmEdicao.endereco,
        custo_previsto: obraEmEdicao.custo_previsto,
        custo_real: obraEmEdicao.custo_real,
        progresso: obraEmEdicao.progresso,
        status: obraEmEdicao.status
      });

      await carregarObras();
      setShowEditDialog(false);
      setObraEmEdicao(null);
      
      toast({
        title: "Sucesso",
        description: "Obra atualizada com sucesso!"
      });
    } catch (error) {
      console.error('Erro ao atualizar obra:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar a obra.",
        variant: "destructive"
      });
    }
  };

  const handleExcluirObra = async (obraId: number) => {
    try {
      await excluirObra(obraId);
      await carregarObras();
      
      toast({
        title: "Sucesso",
        description: "Obra excluída com sucesso!"
      });
    } catch (error) {
      console.error('Erro ao excluir obra:', error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir a obra.",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
        <p className="text-gray-600">Carregando obras...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-slideIn p-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800">Obras</h1>
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Nova Obra
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova Obra</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Nome da Obra</label>
                <Input
                  value={novaObra.nome}
                  onChange={(e) =>
                    setNovaObra({ ...novaObra, nome: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium">Endereço</label>
                <Input
                  value={novaObra.endereco}
                  onChange={(e) =>
                    setNovaObra({ ...novaObra, endereco: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium">Custo Previsto</label>
                <Input
                  type="number"
                  value={novaObra.custo_previsto}
                  onChange={(e) =>
                    setNovaObra({
                      ...novaObra,
                      custo_previsto: Number(e.target.value)
                    })
                  }
                />
              </div>
              <Button onClick={handleNovaObra} className="w-full">
                Criar Obra
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {obras.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">Nenhuma obra cadastrada</p>
          <Button onClick={() => setShowDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Primeira Obra
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {obras.map((obra) => (
            <Card key={obra.id} className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-lg">{obra.nome}</h3>
                  <p className="text-sm text-gray-500 mt-1">{obra.endereco}</p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => handleEditarObra(obra)}>
                      <Pencil className="w-4 h-4 mr-2" />
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExcluirObra(obra.id)}>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="mt-4">
                <div className="flex justify-between text-sm mb-1">
                  <span>Progresso</span>
                  <span>{obra.progresso}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-primary rounded-full h-2 transition-all"
                    style={{ width: `${obra.progresso}%` }}
                  />
                </div>
              </div>

              <div className="mt-4">
                <div className="text-sm text-gray-500">
                  <p>Custo Previsto: R$ {obra.custo_previsto.toLocaleString()}</p>
                  <p>Custo Real: R$ {obra.custo_real.toLocaleString()}</p>
                </div>
              </div>

              <div className="mt-4 flex justify-between items-center">
                <span className="text-sm text-gray-500">{obra.status}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleVerDetalhes(obra.id)}
                >
                  Ver Detalhes
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Obra</DialogTitle>
          </DialogHeader>
          {obraEmEdicao && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Nome da Obra</label>
                <Input
                  value={obraEmEdicao.nome}
                  onChange={(e) =>
                    setObraEmEdicao({ ...obraEmEdicao, nome: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium">Endereço</label>
                <Input
                  value={obraEmEdicao.endereco}
                  onChange={(e) =>
                    setObraEmEdicao({ ...obraEmEdicao, endereco: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium">Custo Previsto</label>
                <Input
                  type="number"
                  value={obraEmEdicao.custo_previsto}
                  onChange={(e) =>
                    setObraEmEdicao({
                      ...obraEmEdicao,
                      custo_previsto: Number(e.target.value)
                    })
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium">Custo Real</label>
                <Input
                  type="number"
                  value={obraEmEdicao.custo_real}
                  onChange={(e) =>
                    setObraEmEdicao({
                      ...obraEmEdicao,
                      custo_real: Number(e.target.value)
                    })
                  }
                />
              </div>
              <Button onClick={handleSalvarEdicao} className="w-full">
                Salvar Alterações
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Obras;
