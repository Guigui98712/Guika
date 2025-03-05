import React, { useEffect } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
} from 'reactflow';
import 'reactflow/dist/style.css';

interface DiarioRegistro {
  data: string;
  etapas_iniciadas: string[];
  etapas_concluidas: string[];
}

interface FluxogramaObraProps {
  registros: DiarioRegistro[];
}

// Etapas reorganizadas conforme as seções especificadas
const etapasConfig = [
  // Seção 1
  { id: '1', nome: 'Serviços Preliminares', position: { x: 0, y: 0 } },
  // Seção 2
  { id: '2', nome: 'Terraplenagem', position: { x: 200, y: 0 } },
  // Seção 3
  { id: '3', nome: 'Fundação', position: { x: 400, y: 0 } },
  // Seção 4 - Alvenaria e Estrutura (paralelo)
  { id: '4', nome: 'Alvenaria', position: { x: 600, y: -50 } },
  { id: '5', nome: 'Estrutura', position: { x: 600, y: 50 } },
  // Seção 5 - Passagens e Laje (paralelo)
  { id: '6', nome: 'Passagens Elétricas', position: { x: 800, y: -100 } },
  { id: '7', nome: 'Passagens Hidráulicas', position: { x: 800, y: 0 } },
  { id: '8', nome: 'Laje', position: { x: 800, y: 100 } },
  // Seção 6 - Cobertura e Instalações (paralelo)
  { id: '9', nome: 'Cobertura', position: { x: 1000, y: -100 } },
  { id: '10', nome: 'Instalações Elétricas', position: { x: 1000, y: 0 } },
  { id: '11', nome: 'Instalações Hidráulicas', position: { x: 1000, y: 100 } },
  // Seção 7 - Reboco e Regularização
  { id: '12', nome: 'Reboco', position: { x: 1200, y: -50 } },
  { id: '13', nome: 'Regularização', position: { x: 1200, y: 50 } },
  // Seção 8 - Revestimento, Gesso e Marmoraria (paralelo)
  { id: '14', nome: 'Revestimento', position: { x: 1400, y: -100 } },
  { id: '15', nome: 'Gesso', position: { x: 1400, y: 0 } },
  { id: '16', nome: 'Marmoraria', position: { x: 1400, y: 100 } },
  // Seção 9 - Pintura
  { id: '17', nome: 'Pintura', position: { x: 1600, y: 0 } },
  // Seção 10 - Esquadrias
  { id: '18', nome: 'Esquadrias', position: { x: 1800, y: 0 } },
  // Seção 11 - Limpeza Bruta
  { id: '19', nome: 'Limpeza Bruta', position: { x: 2000, y: 0 } },
  // Seção 12 - Marcenaria e Metais (paralelo)
  { id: '20', nome: 'Marcenaria', position: { x: 2200, y: -50 } },
  { id: '21', nome: 'Metais', position: { x: 2200, y: 50 } },
  // Seção 13 - Limpeza Final
  { id: '22', nome: 'Limpeza Final', position: { x: 2400, y: 0 } },
];

const FluxogramaObra: React.FC<FluxogramaObraProps> = ({ registros }) => {
  // Processa os registros para determinar o status atual de cada etapa
  const getEtapaStatus = (etapaNome: string) => {
    let status = 'pendente';
    
    for (const registro of registros) {
      if (registro.etapas_concluidas.includes(etapaNome)) {
        status = 'concluida';
        break;
      } else if (registro.etapas_iniciadas.includes(etapaNome)) {
        status = 'em_andamento';
      }
    }
    
    return status;
  };

  const getStatusColor = (etapaNome: string) => {
    const status = getEtapaStatus(etapaNome);
    console.log(`Status da etapa ${etapaNome}:`, status);
    
    switch (status) {
      case 'concluida':
        return '#4CAF50'; // Verde
      case 'em_andamento':
        return '#FFC107'; // Amarelo
      default:
        return '#F44336'; // Vermelho para pendente
    }
  };

  const nodes: Node[] = etapasConfig.map((etapa) => {
    const status = getEtapaStatus(etapa.nome);
    const color = getStatusColor(etapa.nome);
    
    return {
      id: etapa.id,
      data: { 
        label: (
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column',
            alignItems: 'center',
            gap: '4px',
            padding: '8px'
          }}>
            <span style={{ 
              fontSize: '12px',
              fontWeight: 'bold',
              textAlign: 'center',
              color: '#fff'
            }}>
              {etapa.nome}
            </span>
            <span style={{ 
              fontSize: '10px',
              color: '#fff',
              opacity: 0.8
            }}>
              {status}
            </span>
          </div>
        )
      },
      position: etapa.position,
      style: {
        background: color,
        border: 'none',
        borderRadius: '8px',
        minWidth: 150,
        minHeight: 60,
      },
    };
  });

  // Atualizando as conexões entre as etapas conforme as seções especificadas
  const edges: Edge[] = [
    // Seção 1 -> 2 -> 3: Sequência inicial
    { id: 'e1-2', source: '1', target: '2' },
    { id: 'e2-3', source: '2', target: '3' },
    
    // Seção 3 -> 4: Alvenaria e Estrutura (paralelos)
    { id: 'e3-4', source: '3', target: '4' },
    { id: 'e3-5', source: '3', target: '5' },
    
    // Seção 4 -> 5: Passagens e Laje (paralelos)
    { id: 'e4-6', source: '4', target: '6' },
    { id: 'e4-7', source: '4', target: '7' },
    { id: 'e4-8', source: '4', target: '8' },
    { id: 'e5-6', source: '5', target: '6' },
    { id: 'e5-7', source: '5', target: '7' },
    { id: 'e5-8', source: '5', target: '8' },
    
    // Seção 5 -> 6: Cobertura e Instalações (paralelos)
    { id: 'e6-9', source: '6', target: '9' },
    { id: 'e7-9', source: '7', target: '9' },
    { id: 'e8-9', source: '8', target: '9' },
    { id: 'e6-10', source: '6', target: '10' },
    { id: 'e7-10', source: '7', target: '10' },
    { id: 'e8-10', source: '8', target: '10' },
    { id: 'e6-11', source: '6', target: '11' },
    { id: 'e7-11', source: '7', target: '11' },
    { id: 'e8-11', source: '8', target: '11' },
    
    // Seção 6 -> 7: Reboco e Regularização
    { id: 'e9-12', source: '9', target: '12' },
    { id: 'e10-12', source: '10', target: '12' },
    { id: 'e11-12', source: '11', target: '12' },
    { id: 'e9-13', source: '9', target: '13' },
    { id: 'e10-13', source: '10', target: '13' },
    { id: 'e11-13', source: '11', target: '13' },
    
    // Seção 7 -> 8: Revestimento, Gesso e Marmoraria (paralelos)
    { id: 'e12-14', source: '12', target: '14' },
    { id: 'e12-15', source: '12', target: '15' },
    { id: 'e12-16', source: '12', target: '16' },
    { id: 'e13-14', source: '13', target: '14' },
    { id: 'e13-15', source: '13', target: '15' },
    { id: 'e13-16', source: '13', target: '16' },
    
    // Seção 8 -> 9 -> 10 -> 11: Sequência Pintura, Esquadrias, Limpeza Bruta
    { id: 'e14-17', source: '14', target: '17' },
    { id: 'e15-17', source: '15', target: '17' },
    { id: 'e16-17', source: '16', target: '17' },
    { id: 'e17-18', source: '17', target: '18' },
    { id: 'e18-19', source: '18', target: '19' },
    
    // Seção 11 -> 12: Marcenaria e Metais (paralelos)
    { id: 'e19-20', source: '19', target: '20' },
    { id: 'e19-21', source: '19', target: '21' },
    
    // Seção 12 -> 13: Limpeza Final
    { id: 'e20-22', source: '20', target: '22' },
    { id: 'e21-22', source: '21', target: '22' }
  ].map(edge => ({
    ...edge,
    animated: false,
    style: { stroke: '#999' },
    type: 'smoothstep'
  }));

  return (
    <div style={{ height: 500 }}>
      <div style={{ marginBottom: '10px', display: 'flex', gap: '20px', justifyContent: 'flex-end' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '12px', height: '12px', backgroundColor: '#4CAF50', borderRadius: '50%' }} />
          <span>Concluída</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '12px', height: '12px', backgroundColor: '#FFC107', borderRadius: '50%' }} />
          <span>Em Andamento</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '12px', height: '12px', backgroundColor: '#F44336', borderRadius: '50%' }} />
          <span>Pendente</span>
        </div>
      </div>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        minZoom={0.1}
        maxZoom={1.5}
      >
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </div>
  );
};

export default FluxogramaObra; 