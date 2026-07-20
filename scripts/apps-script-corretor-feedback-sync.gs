/**
 * Cole isso no Apps Script DE CADA planilha de corretor (Marques e Barone) — é um script
 * diferente do que fica na planilha base. Ele espelha o que for digitado na coluna Feedback
 * da aba "Feedback" (tabela simplificada: Cliente/Telefone/Email/Feedback) pra coluna
 * Feedback da aba "Leads" (que é de onde o script da planilha base recolhe o feedback pra
 * concentrar tudo). É um "simple trigger" (onEdit) — não precisa Implantar nem configurar
 * gatilho manualmente, funciona assim que você salva.
 */

const ABA_TABELA_FEEDBACK = 'Feedback'; // aba com Cliente/Telefone/Email/Feedback
const COLUNA_FEEDBACK_NA_TABELA = 4; // D
const ABA_LEADS_CORRETOR = 'Leads'; // aba completa (mesma estrutura da planilha base + Feedback)
const COLUNA_FEEDBACK_NOS_LEADS = 18; // R — 17 colunas originais + Feedback no final

function onEdit(e) {
  const sheet = e.range.getSheet();
  if (sheet.getName() !== ABA_TABELA_FEEDBACK) return;
  if (e.range.getColumn() !== COLUNA_FEEDBACK_NA_TABELA) return;
  if (e.range.getRow() === 1) return; // ignora edição no cabeçalho

  const abaLeads = sheet.getParent().getSheetByName(ABA_LEADS_CORRETOR);
  if (!abaLeads) return;

  // A linha N da aba Feedback corresponde à linha N da aba Leads (mesma ordem, já que a
  // tabela é gerada com ARRAYFORMULA a partir da aba Leads, sem filtro nem ordenação).
  abaLeads.getRange(e.range.getRow(), COLUNA_FEEDBACK_NOS_LEADS).setValue(e.range.getValue());
}
