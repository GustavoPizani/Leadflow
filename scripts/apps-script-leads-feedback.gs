/**
 * Código de referência do Apps Script usado na planilha "Leads Campanha Eterno" (Google
 * Sheets) pra separar os leads por corretor (Marques/Barone) em planilhas próprias, onde cada
 * um dá feedback, e concentrar esses feedbacks na aba "Feedback" da planilha base.
 *
 * Cole isso em: planilha base -> Extensões -> Apps Script -> Code.gs.
 * Não faz parte do deploy do Leadflow — é só o arquivo de referência guardado no repo.
 *
 * Estrutura esperada na planilha base:
 *   - aba "Leads": dados crus do Meta. A automação nativa do Meta só alimenta o
 *     "Formulário Eterno" — os formulários listados em FORMULARIOS_PARA_IMPORTAR são
 *     importados pelo próprio script (via Graph API, importarLeadsDeFormularios_) antes de
 *     cada sync, direto na aba Leads, sem duplicar quem já está lá (casa por id).
 *   - aba "Feedback": onde o script ESCREVE o resultado (mesmas colunas da aba Leads + Corretor
 *     + Feedback) — é essa aba que concentra tudo.
 */

// ============ CONFIG ============
const LEADFLOW_EXPORT_URL = 'https://leadflow-lyart-eight.vercel.app/api/integrations/leads-export';
const LEADFLOW_META_FORM_LEADS_URL = 'https://leadflow-lyart-eight.vercel.app/api/integrations/meta-form-leads';
const LEADFLOW_EXPORT_SECRET = 'a21c25b65ac98c87bf3826264dfaaf5a86c64e37050dcb5f';

const CORRETOR_SHEETS = {
  Marques: '12-Xi1Kn5OzAAXmP1-_K-GHwnhyh8_VMMk8Co1q_Hk8I',
  Barone: '1HaW0eMYeWJ4DRgWHpfB53XGv8rQpmjni2TCsNrx2j0I',
};

// form_id (sem o prefixo "f:") de cada formulário que a automação do Meta NÃO está trazendo
// pra aba Leads sozinha — o script busca esses direto na Graph API a cada sync.
const FORMULARIOS_PARA_IMPORTAR = ['1038766118881682']; // Formulário Eterno Obama

const ABA_LEADS = 'Leads'; // aba de origem na planilha base (script importa + lê daqui)
const ABA_FEEDBACK = 'Feedback'; // aba de saída (o script escreve aqui) na planilha base
const ABA_DESTINO = 'Leads'; // nome da aba criada em cada planilha de corretor
// =================================

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Leadflow')
    .addItem('Sincronizar tudo agora', 'sincronizarTudo')
    .addToUi();
}

/** Roda as etapas em sequência. É essa a função pra colocar num gatilho por tempo. */
function sincronizarTudo() {
  importarLeadsDeFormularios_();
  const leadflowData = buscarDadosLeadflow_();
  const corretorPorLinha = calcularCorretorPorLinha_(leadflowData);
  const feedbackPorId = coletarFeedbacksDosCorretores_();
  escreverAbaFeedback_(corretorPorLinha, feedbackPorId);
  distribuirParaCorretores_(corretorPorLinha, feedbackPorId);
}

/** Busca na Graph API (via Leadflow) os leads de cada formulário em FORMULARIOS_PARA_IMPORTAR
 * e adiciona na aba Leads só os que ainda não estão lá (casando pelo id). Não toca nas linhas
 * já existentes — só faz append das novas. */
function importarLeadsDeFormularios_() {
  if (FORMULARIOS_PARA_IMPORTAR.length === 0) return;

  const aba = pegarAba_(ABA_LEADS);
  const lastRow = aba.getLastRow();
  const lastCol = aba.getLastColumn();
  if (lastCol < 1) return;

  const headers = aba.getRange(1, 1, 1, lastCol).getValues()[0];
  const idIdx = indiceColuna_(headers, 'id');
  const idsExistentes = new Set();
  if (lastRow >= 2 && idIdx !== -1) {
    aba.getRange(2, idIdx + 1, lastRow - 1, 1).getValues().forEach((r) => idsExistentes.add(r[0]));
  }

  FORMULARIOS_PARA_IMPORTAR.forEach((externalFormId) => {
    const res = UrlFetchApp.fetch(LEADFLOW_META_FORM_LEADS_URL + '?externalFormId=' + externalFormId, {
      headers: { 'x-internal-secret': LEADFLOW_EXPORT_SECRET },
      muteHttpExceptions: true,
    });
    if (res.getResponseCode() !== 200) {
      console.error('Falha ao importar leads do formulário ' + externalFormId + ': ' + res.getContentText());
      return;
    }

    const linhas = JSON.parse(res.getContentText()).rows;
    const novas = linhas.filter((linha) => !idsExistentes.has(linha[0]));
    if (novas.length === 0) return;

    aba.getRange(aba.getLastRow() + 1, 1, novas.length, novas[0].length).setValues(novas);
    novas.forEach((linha) => idsExistentes.add(linha[0]));
    console.log('Importados ' + novas.length + ' leads novos do formulário ' + externalFormId);
  });
}

function buscarDadosLeadflow_() {
  const res = UrlFetchApp.fetch(LEADFLOW_EXPORT_URL, {
    headers: { 'x-internal-secret': LEADFLOW_EXPORT_SECRET },
    muteHttpExceptions: true,
  });
  if (res.getResponseCode() !== 200) {
    throw new Error('Falha ao buscar dados do Leadflow: ' + res.getContentText());
  }
  return JSON.parse(res.getContentText()).leads; // [{id, externalLeadId, email, phone, assignedUserName, ...}]
}

/** A aba Leads usa "l:123..." pro id e "p:+55..." pro telefone — tira o prefixo pra casar
 * com o externalLeadId cru que o Leadflow devolve. */
function limparPrefixo_(valor) {
  return String(valor || '').replace(/^[a-z]:/, '').trim();
}

function normalizarTelefone_(valor) {
  return limparPrefixo_(valor).replace(/\D/g, '');
}

function pegarAba_(nome) {
  const aba = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(nome);
  if (!aba) throw new Error('Aba "' + nome + '" não encontrada nesta planilha.');
  return aba;
}

function indiceColuna_(headers, nome) {
  return headers.indexOf(nome); // 0-based; -1 se não achar
}

/** Lê a aba Leads e devolve { headers, linhas, corretorIdx: -1 } — corretor é calculado à
 * parte, não existe fisicamente na aba Leads. */
function lerLeads_() {
  const aba = pegarAba_(ABA_LEADS);
  const lastRow = aba.getLastRow();
  const lastCol = aba.getLastColumn();
  if (lastRow < 2 || lastCol < 1) return { headers: [], linhas: [] };

  const headers = aba.getRange(1, 1, 1, lastCol).getValues()[0];
  const linhas = aba.getRange(2, 1, lastRow - 1, lastCol).getValues();
  return { headers, linhas };
}

/** Casa cada linha da aba Leads com o corretor atribuído no Leadflow (por id, e-mail ou
 * telefone, nessa ordem de prioridade). Devolve { headers, linhas: [...linhaOriginal, corretor] }. */
function calcularCorretorPorLinha_(leadflowData) {
  const { headers, linhas } = lerLeads_();
  if (linhas.length === 0) return { headers, linhas: [] };

  const idIdx = indiceColuna_(headers, 'id');
  const emailIdx = indiceColuna_(headers, 'email');
  const telIdx = indiceColuna_(headers, 'telefone');

  const porId = {};
  const porEmail = {};
  const porTelefone = {};
  leadflowData.forEach((l) => {
    if (l.externalLeadId) porId[String(l.externalLeadId)] = l.assignedUserName;
    if (l.email) porEmail[l.email.toLowerCase()] = l.assignedUserName;
    if (l.phone) porTelefone[l.phone.replace(/\D/g, '')] = l.assignedUserName;
  });

  const linhasComCorretor = linhas.map((linha) => {
    const id = limparPrefixo_(linha[idIdx]);
    const email = String(linha[emailIdx] || '').toLowerCase().trim();
    const tel = normalizarTelefone_(linha[telIdx]);
    const corretor = porId[id] || porEmail[email] || porTelefone[tel] || '';
    return [...linha, corretor];
  });

  return { headers, linhas: linhasComCorretor };
}

/** Lê a coluna "Feedback" de cada planilha de corretor, casando pelo id do lead. */
function coletarFeedbacksDosCorretores_() {
  const feedbackPorId = {};
  Object.values(CORRETOR_SHEETS).forEach((idPlanilha) => {
    const ss = SpreadsheetApp.openById(idPlanilha);
    const aba = ss.getSheetByName(ABA_DESTINO);
    if (!aba || aba.getLastRow() < 2) return;

    const headerAba = aba.getRange(1, 1, 1, aba.getLastColumn()).getValues()[0];
    const idIdxAba = indiceColuna_(headerAba, 'id');
    const fbIdxAba = indiceColuna_(headerAba, 'Feedback');
    if (idIdxAba === -1 || fbIdxAba === -1) return;

    const dados = aba.getRange(2, 1, aba.getLastRow() - 1, aba.getLastColumn()).getValues();
    dados.forEach((linha) => {
      const fb = linha[fbIdxAba];
      if (fb) feedbackPorId[limparPrefixo_(linha[idIdxAba])] = fb;
    });
  });
  return feedbackPorId;
}

/** Escreve na aba Feedback: cabeçalho original + Corretor + Feedback, uma linha por lead. */
function escreverAbaFeedback_(corretorData, feedbackPorId) {
  const aba = pegarAba_(ABA_FEEDBACK);
  aba.clear();

  const { headers, linhas } = corretorData;
  if (headers.length === 0) return;

  const idIdx = indiceColuna_(headers, 'id');
  const novoHeader = [...headers, 'Corretor', 'Feedback'];
  aba.getRange(1, 1, 1, novoHeader.length).setValues([novoHeader]);

  if (linhas.length > 0) {
    const saida = linhas.map((linha) => {
      // `linha` aqui já é [...original, corretor] (ver calcularCorretorPorLinha_)
      const id = limparPrefixo_(linha[idIdx]);
      return [...linha, feedbackPorId[id] || ''];
    });
    aba.getRange(2, 1, saida.length, novoHeader.length).setValues(saida);
  }
  aba.setFrozenRows(1);
}

/** Copia, pra cada planilha de corretor, só as linhas atribuídas a ele (aba "Leads" lá,
 * recriada do zero a cada sync, com uma coluna extra "Feedback" no final). O feedback que ele
 * já tinha escrito é repovoado (via feedbackPorId, já coletado antes de recriar a aba) — só
 * leads novos aparecem com Feedback em branco. */
function distribuirParaCorretores_(corretorData, feedbackPorId) {
  const { headers, linhas } = corretorData;
  if (headers.length === 0) return;

  const corretorIdx = headers.length; // corretor foi anexado no fim de cada linha
  const idIdx = indiceColuna_(headers, 'id');

  Object.keys(CORRETOR_SHEETS).forEach((nomeCorretor) => {
    const idPlanilha = CORRETOR_SHEETS[nomeCorretor];
    const destino = SpreadsheetApp.openById(idPlanilha);
    let aba = destino.getSheetByName(ABA_DESTINO);
    if (!aba) aba = destino.insertSheet(ABA_DESTINO);

    const linhasDoCorretor = linhas
      .filter((linha) => linha[corretorIdx] === nomeCorretor)
      .map((linha) => linha.slice(0, headers.length)); // tira o Corretor, só os campos originais

    aba.clear();
    aba.getRange(1, 1, 1, headers.length + 1).setValues([[...headers, 'Feedback']]);
    if (linhasDoCorretor.length > 0) {
      const comFeedback = linhasDoCorretor.map((linha) => {
        const id = limparPrefixo_(linha[idIdx]);
        return [...linha, feedbackPorId[id] || ''];
      });
      aba.getRange(2, 1, comFeedback.length, comFeedback[0].length).setValues(comFeedback);
    }
    aba.setFrozenRows(1);
  });
}
