-- Atualizar algumas etapas para 'em_andamento'
UPDATE etapas_datas
SET 
    status = 'em_andamento',
    data_inicio = CURRENT_DATE
WHERE obra_id = 3  -- Substitua pelo ID da sua obra
AND etapa_nome IN (
    'Terraplenagem',
    'Fundação',
    'Infraestrutura'
);

-- Atualizar algumas etapas para 'concluida'
UPDATE etapas_datas
SET 
    status = 'concluida',
    data_inicio = CURRENT_DATE - INTERVAL '30 days',
    data_fim = CURRENT_DATE
WHERE obra_id = 3  -- Substitua pelo ID da sua obra
AND etapa_nome IN (
    'Terraplenagem'
);