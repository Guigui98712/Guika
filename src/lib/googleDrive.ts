import { google } from 'googleapis';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Configuração do cliente OAuth2
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// Criar instância do Drive
const drive = google.drive({ version: 'v3', auth: oauth2Client });

export interface GoogleDriveConfig {
  accessToken: string;
  refreshToken: string;
}

export const configurarGoogleDrive = (config: GoogleDriveConfig) => {
  oauth2Client.setCredentials({
    access_token: config.accessToken,
    refresh_token: config.refreshToken
  });
};

export const criarPastaAnual = async (ano: number) => {
  try {
    // Verificar se a pasta já existe
    const response = await drive.files.list({
      q: `name='${ano}' and mimeType='application/vnd.google-apps.folder'`,
      fields: 'files(id, name)',
      spaces: 'drive'
    });

    if (response.data.files && response.data.files.length > 0) {
      return response.data.files[0].id;
    }

    // Criar nova pasta
    const fileMetadata = {
      name: ano.toString(),
      mimeType: 'application/vnd.google-apps.folder'
    };

    const file = await drive.files.create({
      requestBody: fileMetadata,
      fields: 'id'
    });

    return file.data.id;
  } catch (error) {
    console.error('Erro ao criar pasta anual:', error);
    throw error;
  }
};

export const criarPastaMensal = async (pastaAnualId: string, mes: number) => {
  try {
    const nomeMes = format(new Date(2000, mes - 1, 1), 'MMMM', { locale: ptBR });

    // Verificar se a pasta já existe
    const response = await drive.files.list({
      q: `name='${nomeMes}' and mimeType='application/vnd.google-apps.folder' and '${pastaAnualId}' in parents`,
      fields: 'files(id, name)',
      spaces: 'drive'
    });

    if (response.data.files && response.data.files.length > 0) {
      return response.data.files[0].id;
    }

    // Criar nova pasta
    const fileMetadata = {
      name: nomeMes,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [pastaAnualId]
    };

    const file = await drive.files.create({
      requestBody: fileMetadata,
      fields: 'id'
    });

    return file.data.id;
  } catch (error) {
    console.error('Erro ao criar pasta mensal:', error);
    throw error;
  }
};

export const salvarRelatorioPDF = async (
  conteudoHTML: string,
  dataInicio: Date,
  nomeObra: string
) => {
  try {
    const ano = dataInicio.getFullYear();
    const mes = dataInicio.getMonth() + 1;

    // Criar estrutura de pastas
    const pastaAnualId = await criarPastaAnual(ano);
    const pastaMensalId = await criarPastaMensal(pastaAnualId, mes);

    // Nome do arquivo
    const nomeArquivo = `Relatório Semanal - ${nomeObra} - ${format(dataInicio, "dd-MM-yyyy")}`;

    // Criar arquivo HTML temporário no Drive
    const htmlFile = await drive.files.create({
      requestBody: {
        name: 'temp.html',
        mimeType: 'text/html',
        parents: [pastaMensalId]
      },
      media: {
        mimeType: 'text/html',
        body: conteudoHTML
      }
    });

    // Converter para PDF
    const pdfFile = await drive.files.copy({
      fileId: htmlFile.data.id!,
      requestBody: {
        name: `${nomeArquivo}.pdf`,
        mimeType: 'application/pdf',
        parents: [pastaMensalId]
      }
    });

    // Excluir arquivo HTML temporário
    await drive.files.delete({
      fileId: htmlFile.data.id!
    });

    return {
      fileId: pdfFile.data.id!,
      folderId: pastaMensalId
    };
  } catch (error) {
    console.error('Erro ao salvar relatório no Google Drive:', error);
    throw error;
  }
}; 