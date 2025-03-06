import { AppUpdate } from '@capawesome/capacitor-app-update';

export const initializeLiveUpdates = async () => {
  try {
    // Verifica se há atualizações disponíveis
    const result = await AppUpdate.getAppUpdateInfo();
    
    if (result.updateAvailable) {
      // Se houver atualização, pergunta ao usuário se deseja atualizar
      const shouldUpdate = window.confirm('Uma nova versão está disponível. Deseja atualizar agora?');
      
      if (shouldUpdate) {
        // Inicia o processo de atualização
        await AppUpdate.performImmediateUpdate();
      }
    }
  } catch (error) {
    console.error('Erro ao verificar atualizações:', error);
  }
};

// Função para verificar atualizações manualmente
export const checkForUpdates = async () => {
  try {
    const result = await AppUpdate.getAppUpdateInfo();
    return result.updateAvailable;
  } catch (error) {
    console.error('Erro ao verificar atualizações:', error);
    return false;
  }
}; 