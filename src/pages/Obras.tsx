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
import { Plus, MoreVertical, Pencil, Trash2, Upload, Image } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { 
  listarObras, 
  criarObra, 
  atualizarObra, 
  excluirObra, 
  uploadFoto,
  type Obra,
  type ObraParaEnvio
} from "@/lib/api";

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
    custo_previsto: 0,
    cliente: "",
    responsavel: "",
    logo_url: null as string | null,
    data_previsao_fim: ""
  });

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const [obraEmEdicao, setObraEmEdicao] = useState<Obra | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [logoEditFile, setLogoEditFile] = useState<File | null>(null);
  const [logoEditPreview, setLogoEditPreview] = useState<string | null>(null);

  useEffect(() => {
    carregarObras();
  }, []);

  const carregarObras = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('[DEBUG] Carregando obras...');

      const data = await listarObras();
      console.log('[DEBUG] Obras carregadas:', data);
      
      if (data && Array.isArray(data)) {
        console.log('[DEBUG] Atualizando estado com', data.length, 'obras');
        setObras([...data]); // Criar uma nova referência para garantir re-renderização
      } else {
        console.log('[DEBUG] Nenhuma obra encontrada ou formato inválido:', data);
        setObras([]);
      }
    } catch (error) {
      console.error('[DEBUG] Erro ao carregar obras:', error);
      setError('Não foi possível carregar as obras. Por favor, tente novamente.');
      toast({
        title: "Erro ao carregar obras",
        description: "Não foi possível carregar a lista de obras. Verifique sua conexão e tente novamente.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerDetalhes = (obraId: number) => {
    navigate(`/obras/${obraId}`);
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setLogoFile(file);
      
      // Criar preview
      const reader = new FileReader();
      reader.onload = (event) => {
        setLogoPreview(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLogoEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setLogoEditFile(file);
      
      // Criar preview
      const reader = new FileReader();
      reader.onload = (event) => {
        setLogoEditPreview(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleNovaObra = async () => {
    if (!novaObra.nome || !novaObra.endereco || !novaObra.custo_previsto) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha todos os campos obrigatórios: nome, endereço e custo previsto.",
        variant: "destructive"
      });
      return;
    }

    try {
      setUploadingLogo(true);
      
      // Upload do logo se existir
      let logoUrl = null;
      if (logoFile) {
        const resultado = await uploadFoto(logoFile);
        logoUrl = resultado;
      }
      
      const novaObraData: ObraParaEnvio = {
        nome: novaObra.nome,
        endereco: novaObra.endereco,
        custo_previsto: novaObra.custo_previsto,
        custo_real: 0,
        progresso: 0,
        status: 'em_andamento' as const,
        cliente: novaObra.cliente || null,
        responsavel: novaObra.responsavel || null,
        logo_url: logoUrl,
        data_inicio: null,
        data_previsao_fim: novaObra.data_previsao_fim ? `${novaObra.data_previsao_fim}-01` : null,
        user_id: null, // Será preenchido automaticamente pelo backend
        trello_board_id: null
      };

      console.log('[DEBUG] Enviando dados para criação da obra:', novaObraData);

      const obraCriada = await criarObra(novaObraData);

      // Forçar recarregamento completo das obras
      const obrasAtualizadas = await listarObras();
      console.log('[DEBUG] Obras recarregadas após criação:', obrasAtualizadas);
      setObras(obrasAtualizadas || []);
      
      setNovaObra({ 
        nome: "", 
        endereco: "", 
        custo_previsto: 0, 
        cliente: "", 
        responsavel: "", 
        logo_url: null,
        data_previsao_fim: ""
      });
      setLogoFile(null);
      setLogoPreview(null);
      setShowDialog(false);
      
      toast({
        title: "Obra criada com sucesso! 🏗️",
        description: `A obra "${novaObra.nome}" foi criada e já está disponível no sistema.`
      });
    } catch (error) {
      console.error('Erro ao criar obra:', error);
      toast({
        title: "Erro ao criar obra",
        description: "Não foi possível criar a obra. Verifique os dados e tente novamente.",
        variant: "destructive"
      });
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleEditarObra = (obra: Obra) => {
    setObraEmEdicao(obra);
    setLogoEditPreview(obra.logo_url);
    setShowEditDialog(true);
  };

  const handleSalvarEdicao = async () => {
    console.log('[DEBUG] Função handleSalvarEdicao chamada');
    if (!obraEmEdicao) {
      console.log('[DEBUG] obraEmEdicao é null ou undefined');
      return;
    }

    console.log('[DEBUG] Dados da obra em edição:', obraEmEdicao);

    try {
      setUploadingLogo(true);
      console.log('[DEBUG] Iniciando upload do logo (se houver)');
      
      // Upload do logo se existir
      let logoUrl = obraEmEdicao.logo_url;
      if (logoEditFile) {
        console.log('[DEBUG] Enviando novo logo');
        const resultado = await uploadFoto(logoEditFile);
        logoUrl = resultado;
        console.log('[DEBUG] Logo enviado com sucesso:', logoUrl);
      }
      
      console.log('[DEBUG] Enviando dados para atualização da obra');
      const dadosAtualizacao: Partial<ObraParaEnvio> = {
        nome: obraEmEdicao.nome,
        endereco: obraEmEdicao.endereco,
        custo_previsto: obraEmEdicao.custo_previsto,
        custo_real: obraEmEdicao.custo_real,
        progresso: obraEmEdicao.progresso,
        status: obraEmEdicao.status,
        cliente: obraEmEdicao.cliente,
        responsavel: obraEmEdicao.responsavel,
        logo_url: logoUrl,
        data_inicio: obraEmEdicao.data_inicio,
        data_previsao_fim: obraEmEdicao.data_previsao_fim ? 
          (obraEmEdicao.data_previsao_fim.length === 7 ? `${obraEmEdicao.data_previsao_fim}-01` : obraEmEdicao.data_previsao_fim) : 
          null
      };
      console.log('[DEBUG] Dados de atualização:', dadosAtualizacao);
      
      const obraAtualizada = await atualizarObra(obraEmEdicao.id, dadosAtualizacao);
      console.log('[DEBUG] Obra atualizada com sucesso:', obraAtualizada);

      // Forçar recarregamento completo das obras
      const obrasAtualizadas = await listarObras();
      console.log('[DEBUG] Obras recarregadas após atualização:', obrasAtualizadas);
      setObras(obrasAtualizadas || []);
      
      setObraEmEdicao(null);
      setLogoEditFile(null);
      setLogoEditPreview(null);
      setShowEditDialog(false);
      
      toast({
        title: "Obra atualizada! ✅",
        description: `As informações da obra "${obraEmEdicao.nome}" foram atualizadas com sucesso.`
      });
    } catch (error) {
      console.error('[DEBUG] Erro ao atualizar obra:', error);
      toast({
        title: "Erro na atualização",
        description: "Não foi possível atualizar as informações da obra. Tente novamente mais tarde.",
        variant: "destructive"
      });
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleExcluirObra = async (obraId: number) => {
    try {
      await excluirObra(obraId);
      await carregarObras();
      
      toast({
        title: "Obra excluída! 🗑️",
        description: "A obra foi removida permanentemente do sistema."
      });
    } catch (error) {
      console.error('Erro ao excluir obra:', error);
      toast({
        title: "Erro ao excluir",
        description: "Não foi possível excluir a obra. Ela pode estar sendo usada em outros registros do sistema.",
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
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Nova Obra</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 max-h-[70vh] overflow-y-auto p-1">
              <div>
                <label htmlFor="nome" className="block text-sm font-medium mb-1">
                  Nome da Obra *
                </label>
                <Input
                  id="nome"
                  value={novaObra.nome}
                  onChange={(e) => setNovaObra({ ...novaObra, nome: e.target.value })}
                  placeholder="Nome da obra"
                />
              </div>

              <div>
                <label htmlFor="endereco" className="block text-sm font-medium mb-1">
                  Endereço *
                </label>
                <Input
                  id="endereco"
                  value={novaObra.endereco}
                  onChange={(e) => setNovaObra({ ...novaObra, endereco: e.target.value })}
                  placeholder="Endereço completo"
                />
              </div>

              <div>
                <label htmlFor="custo_previsto" className="block text-sm font-medium mb-1">
                  Custo Previsto (R$) *
                </label>
                <Input
                  id="custo_previsto"
                  type="number"
                  value={novaObra.custo_previsto}
                  onChange={(e) => setNovaObra({ ...novaObra, custo_previsto: Number(e.target.value) })}
                  placeholder="0.00"
                />
              </div>

              <div>
                <label htmlFor="cliente" className="block text-sm font-medium mb-1">
                  Cliente
                </label>
                <Input
                  id="cliente"
                  value={novaObra.cliente || ""}
                  onChange={(e) => setNovaObra({ ...novaObra, cliente: e.target.value })}
                  placeholder="Nome do cliente"
                />
              </div>

              <div>
                <label htmlFor="responsavel" className="block text-sm font-medium mb-1">
                  Responsável
                </label>
                <Input
                  id="responsavel"
                  value={novaObra.responsavel || ""}
                  onChange={(e) => setNovaObra({ ...novaObra, responsavel: e.target.value })}
                  placeholder="Nome do responsável"
                />
              </div>

              <div>
                <label htmlFor="data_previsao_fim" className="block text-sm font-medium mb-1">
                  Previsão de Término
                </label>
                <Input
                  id="data_previsao_fim"
                  type="month"
                  value={novaObra.data_previsao_fim}
                  onChange={(e) => setNovaObra({ ...novaObra, data_previsao_fim: e.target.value })}
                />
              </div>

              <Button 
                onClick={handleNovaObra} 
                className="w-full"
                disabled={uploadingLogo}
              >
                {uploadingLogo ? "Criando..." : "Criar Obra"}
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
                  {obra.cliente && (
                    <p className="text-sm text-gray-500">Cliente: {obra.cliente}</p>
                  )}
                </div>
                {obra.logo_url && (
                  <div className="w-12 h-12 rounded-md overflow-hidden">
                    <img 
                      src={obra.logo_url} 
                      alt={`Logo de ${obra.nome}`} 
                      className="w-full h-full object-contain"
                    />
                  </div>
                )}
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Obra</DialogTitle>
          </DialogHeader>
          {obraEmEdicao && (
            <div className="space-y-4 max-h-[70vh] overflow-y-auto p-1">
              <div>
                <label htmlFor="edit-nome" className="block text-sm font-medium mb-1">
                  Nome da Obra *
                </label>
                <Input
                  id="edit-nome"
                  value={obraEmEdicao?.nome || ""}
                  onChange={(e) => setObraEmEdicao(prev => prev ? { ...prev, nome: e.target.value } : null)}
                  placeholder="Nome da obra"
                />
              </div>

              <div>
                <label htmlFor="edit-endereco" className="block text-sm font-medium mb-1">
                  Endereço *
                </label>
                <Input
                  id="edit-endereco"
                  value={obraEmEdicao?.endereco || ""}
                  onChange={(e) => setObraEmEdicao(prev => prev ? { ...prev, endereco: e.target.value } : null)}
                  placeholder="Endereço completo"
                />
              </div>

              <div>
                <label htmlFor="edit-custo_previsto" className="block text-sm font-medium mb-1">
                  Custo Previsto (R$) *
                </label>
                <Input
                  id="edit-custo_previsto"
                  type="number"
                  value={obraEmEdicao?.custo_previsto || 0}
                  onChange={(e) => setObraEmEdicao(prev => prev ? { ...prev, custo_previsto: Number(e.target.value) } : null)}
                  placeholder="0.00"
                />
              </div>

              <div>
                <label htmlFor="edit-cliente" className="block text-sm font-medium mb-1">
                  Cliente
                </label>
                <Input
                  id="edit-cliente"
                  value={obraEmEdicao?.cliente || ""}
                  onChange={(e) => setObraEmEdicao(prev => prev ? { ...prev, cliente: e.target.value } : null)}
                  placeholder="Nome do cliente"
                />
              </div>

              <div>
                <label htmlFor="edit-responsavel" className="block text-sm font-medium mb-1">
                  Responsável
                </label>
                <Input
                  id="edit-responsavel"
                  value={obraEmEdicao?.responsavel || ""}
                  onChange={(e) => setObraEmEdicao(prev => prev ? { ...prev, responsavel: e.target.value } : null)}
                  placeholder="Nome do responsável"
                />
              </div>

              <div>
                <label htmlFor="edit-data_previsao_fim" className="block text-sm font-medium mb-1">
                  Previsão de Término
                </label>
                <Input
                  id="edit-data_previsao_fim"
                  type="month"
                  value={obraEmEdicao?.data_previsao_fim || ""}
                  onChange={(e) => setObraEmEdicao(prev => prev ? { ...prev, data_previsao_fim: e.target.value } : null)}
                />
              </div>

              <Button 
                onClick={(e) => {
                  console.log('[DEBUG] Evento onClick do botão Salvar Alterações acionado');
                  e.preventDefault(); // Prevenir comportamento padrão
                  handleSalvarEdicao();
                }} 
                onMouseDown={() => console.log('[DEBUG] Botão Salvar Alterações recebeu clique (mousedown)')}
                className="w-full"
                disabled={uploadingLogo}
                type="button" // Garantir que é um botão normal, não de submit
              >
                {uploadingLogo ? "Salvando..." : "Salvar Alterações"}
              </Button>
              
              <Button 
                onClick={() => {
                  console.log('[DEBUG] Botão alternativo clicado');
                  if (!obraEmEdicao) {
                    console.log('[DEBUG] obraEmEdicao é null');
                    return;
                  }
                  
                  // Função simplificada para testar apenas a atualização
                  (async () => {
                    try {
                      console.log('[DEBUG] Tentando atualizar obra com ID:', obraEmEdicao.id);
                      const dadosSimples: Partial<ObraParaEnvio> = {
                        nome: obraEmEdicao.nome,
                        // Não incluímos data_previsao_fim aqui
                      };
                      console.log('[DEBUG] Dados simplificados:', dadosSimples);
                      
                      const resultado = await atualizarObra(obraEmEdicao.id, dadosSimples);
                      console.log('[DEBUG] Resultado da atualização simplificada:', resultado);
                      
                      // Forçar recarregamento completo das obras
                      const obrasAtualizadas = await listarObras();
                      console.log('[DEBUG] Obras recarregadas após teste:', obrasAtualizadas);
                      setObras(obrasAtualizadas || []);
                      
                      toast({
                        title: "Teste",
                        description: "Atualização simplificada realizada!"
                      });
                    } catch (erro) {
                      console.error('[DEBUG] Erro na atualização simplificada:', erro);
                      toast({
                        title: "Erro no Teste",
                        description: "Falha na atualização simplificada.",
                        variant: "destructive"
                      });
                    }
                  })();
                }}
                className="w-full mt-2"
                variant="outline"
              >
                Teste de Atualização
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Obras;
