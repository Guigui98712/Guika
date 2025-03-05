import html2pdf from 'html2pdf.js';

const SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.metadata.readonly'
];
const ROOT_FOLDER_NAME = 'Relatórios Obra Tracker';
const CLIENT_ID = '107092884838-e1a1apg3escncvlnpmule5sjuaso4p0k.apps.googleusercontent.com';
const APP_ORIGIN = window.location.origin;

let auth: any = null;
let gapiLoaded = false;
let rootFolderId: string | null = null;

// Função para carregar o script do Google Identity Services
function loadGoogleIdentityScript() {
  return new Promise((resolve, reject) => {
    if (document.querySelector('script[src="https://accounts.google.com/gsi/client"]')) {
      resolve(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      console.log('[DEBUG] Script Google Identity carregado com sucesso');
      resolve(true);
    };
    script.onerror = (error) => {
      console.error('[DEBUG] Erro ao carregar script Google Identity:', error);
      reject(error);
    };
    document.head.appendChild(script);
  });
}

// Função para carregar o script da API do Google
function loadGapiScript() {
  return new Promise((resolve, reject) => {
    if (document.querySelector('script[src="https://apis.google.com/js/api.js"]')) {
      resolve(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://apis.google.com/js/api.js';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      console.log('[DEBUG] Script GAPI carregado com sucesso');
      resolve(true);
    };
    script.onerror = (error) => {
      console.error('[DEBUG] Erro ao carregar script GAPI:', error);
      reject(error);
    };
    document.head.appendChild(script);
  });
}

async function loadGoogleApi() {
  if (gapiLoaded) return;
  
  try {
    console.log('[DEBUG] Iniciando carregamento dos scripts Google...');
    await Promise.all([loadGoogleIdentityScript(), loadGapiScript()]);
    console.log('[DEBUG] Scripts carregados com sucesso');

    return new Promise((resolve, reject) => {
      gapi.load('client', async () => {
        try {
          console.log('[DEBUG] Inicializando cliente Google...');
          await gapi.client.init({
            apiKey: import.meta.env.VITE_GOOGLE_API_KEY,
            discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest']
          });
          
          gapiLoaded = true;
          console.log('[DEBUG] Cliente Google inicializado com sucesso');
          resolve(true);
        } catch (error) {
          console.error('[DEBUG] Erro ao inicializar cliente Google:', error);
          reject(error);
        }
      });
    });
  } catch (error) {
    console.error('[DEBUG] Erro ao carregar scripts do Google:', error);
    throw error;
  }
}

async function getAuth() {
  try {
    if (!auth) {
      console.log('[DEBUG] Iniciando processo de autenticação...');
      
      if (!gapiLoaded) {
        await loadGoogleApi();
      }

      return new Promise((resolve, reject) => {
        try {
          // Configurar o cliente OAuth2
          const client = google.accounts.oauth2.initCodeClient({
            client_id: CLIENT_ID,
            scope: SCOPES.join(' '),
            ux_mode: 'popup',
            callback: (response) => {
              if (response.error) {
                console.error('[DEBUG] Erro na autenticação:', response);
                reject(response);
                return;
              }

              // Trocar o código por um token de acesso
              fetch('https://oauth2.googleapis.com/token', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                  client_id: CLIENT_ID,
                  code: response.code,
                  grant_type: 'authorization_code',
                  redirect_uri: 'postmessage'
                })
              })
              .then(res => res.json())
              .then(data => {
                if (data.error) {
                  console.error('[DEBUG] Erro ao obter token:', data);
                  reject(data);
                  return;
                }

                console.log('[DEBUG] Token obtido com sucesso');
                auth = data;
                gapi.client.setToken(data);
                resolve(data);
              })
              .catch(error => {
                console.error('[DEBUG] Erro na troca do código:', error);
                reject(error);
              });
            },
          });

          console.log('[DEBUG] Solicitando autorização...');
          client.requestCode();

        } catch (error) {
          console.error('[DEBUG] Erro ao solicitar autorização:', error);
          reject(error);
        }
      });
    }
    
    return auth;
  } catch (error) {
    console.error('[DEBUG] Erro na autenticação com Google Drive:', error);
    throw new Error('Falha na autenticação com Google Drive');
  }
}

async function findOrCreateFolder(name: string, parentId?: string) {
  console.log('[DEBUG] Procurando/criando pasta:', name, parentId ? `em ${parentId}` : 'na raiz');
  
  try {
    // Construir a query
    let query = `name = '${name}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
    if (parentId) {
      query += ` and '${parentId}' in parents`;
    }

    // Procurar pasta existente
    const response = await gapi.client.drive.files.list({
      q: query,
      fields: 'files(id, name)',
    });

    const files = response.result.files;
    if (files && files.length > 0) {
      console.log('[DEBUG] Pasta encontrada:', files[0].name);
      return files[0].id;
    }

    // Criar nova pasta
    const fileMetadata = {
      name: name,
      mimeType: 'application/vnd.google-apps.folder',
      ...(parentId && { parents: [parentId] }),
    };

    const file = await gapi.client.drive.files.create({
      resource: fileMetadata,
      fields: 'id',
    });

    console.log('[DEBUG] Nova pasta criada:', name);
    return file.result.id;
  } catch (error) {
    console.error('[DEBUG] Erro ao procurar/criar pasta:', error);
    throw error;
  }
}

async function getRootFolderId() {
  if (!rootFolderId) {
    rootFolderId = await findOrCreateFolder(ROOT_FOLDER_NAME);
  }
  return rootFolderId;
}

async function convertHtmlToPdf(html: string): Promise<Uint8Array> {
  // Criar um elemento temporário para renderizar o HTML
  const element = document.createElement('div');
  element.innerHTML = html;
  document.body.appendChild(element);

  // Configurações do PDF
  const options = {
    margin: [20, 20, 20, 20],
    filename: 'relatorio.pdf',
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };

  try {
    // Gerar o PDF
    const pdf = await html2pdf().set(options).from(element).outputPdf('arraybuffer');
    
    // Limpar o elemento temporário
    document.body.removeChild(element);
    
    return new Uint8Array(pdf);
  } catch (error) {
    // Limpar o elemento temporário em caso de erro
    document.body.removeChild(element);
    throw error;
  }
}

export async function saveReportToDrive(obraNome: string, dataRelatorio: string, htmlContent: string) {
  try {
    console.log('[DEBUG] Iniciando processo de salvamento do relatório...');
    
    // Primeiro garantir que estamos autenticados
    console.log('[DEBUG] Verificando autenticação...');
    await getAuth();
    
    console.log('[DEBUG] Iniciando conversão para PDF...');
    const pdfBuffer = await convertHtmlToPdf(htmlContent);
    console.log('[DEBUG] PDF gerado com sucesso');
    
    // Obter/criar estrutura de pastas
    const rootId = await getRootFolderId();
    console.log('[DEBUG] ID da pasta raiz:', rootId);
    
    const data = new Date(dataRelatorio);
    const ano = data.getFullYear().toString();
    const mes = new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(data);
    
    console.log('[DEBUG] Criando estrutura de pastas:', { ano, mes, obraNome });
    const anoFolder = await findOrCreateFolder(ano, rootId);
    const obraFolder = await findOrCreateFolder(obraNome, anoFolder);
    const mesFolder = await findOrCreateFolder(mes, obraFolder);

    const fileName = `Relatório Semanal - ${data.getDate().toString().padStart(2, '0')}-${(data.getMonth() + 1).toString().padStart(2, '0')}-${data.getFullYear()}.pdf`;
    console.log('[DEBUG] Nome do arquivo:', fileName);

    // Criar arquivo PDF no Drive
    const fileMetadata = {
      name: fileName,
      parents: [mesFolder],
      mimeType: 'application/pdf',
    };

    // Converter para Base64
    const base64Data = btoa(String.fromCharCode.apply(null, pdfBuffer));
    
    console.log('[DEBUG] Enviando arquivo para o Google Drive...');
    const file = await gapi.client.drive.files.create({
      resource: fileMetadata,
      media: {
        mimeType: 'application/pdf',
        body: base64Data,
      },
      fields: 'id, webViewLink',
    });

    console.log('[DEBUG] Arquivo salvo com sucesso:', file.result);
    return file.result.webViewLink;
  } catch (error) {
    console.error('[DEBUG] Erro ao salvar relatório no Drive:', error);
    throw error;
  }
} 