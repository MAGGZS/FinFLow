import * as FinanceService from '../services/FinanceService.js';

const handle = (fn) => async (req, res) => {
  try {
    const result = await fn(req, res);
    res.json(result);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
};

// ── Orçamento ──────────────────────────────────────────────

export const getResumo = handle(async (req) => {
  const { ano, mes } = req.query;
  return FinanceService.getResumoMensal(
    req.userId,
    parseInt(ano) || new Date().getFullYear(),
    parseInt(mes) || new Date().getMonth() + 1
  );
});

export const getOrcamento = handle(async (req) => {
  const { ano, mes } = req.query;
  return FinanceService.getOrCreateOrcamento(
    req.userId,
    parseInt(ano) || new Date().getFullYear(),
    parseInt(mes) || new Date().getMonth() + 1
  );
});

export const updateOrcamento = handle(async (req) => {
  return FinanceService.updateOrcamento(req.params.id, req.userId, req.body);
});

// ── Gastos ─────────────────────────────────────────────────

export const getGastos = handle(async (req) => {
  return FinanceService.listarGastos(req.userId, req.params.orcamentoId);
});

export const postGasto = handle(async (req) => {
  return FinanceService.criarGasto(req.userId, req.params.orcamentoId, req.body);
});

export const putGasto = handle(async (req) => {
  return FinanceService.atualizarGasto(req.params.id, req.userId, req.body);
});

export const deleteGasto = handle(async (req) => {
  await FinanceService.deletarGasto(req.params.id, req.userId);
  return { ok: true };
});

// ── Rendas ─────────────────────────────────────────────────

export const getRendas = handle(async (req) => {
  return FinanceService.listarRendas(req.userId, req.params.orcamentoId);
});

export const postRenda = handle(async (req) => {
  return FinanceService.criarRenda(req.userId, req.params.orcamentoId, req.body);
});

export const deleteRenda = handle(async (req) => {
  await FinanceService.deletarRenda(req.params.id, req.userId);
  return { ok: true };
});

// ── Categorias ─────────────────────────────────────────────

export const getCategorias = handle(async (req) => {
  return FinanceService.listarCategorias(req.userId);
});

export const postCategoria = handle(async (req) => {
  return FinanceService.criarCategoria(req.userId, req.body);
});

export const deleteCategoria = handle(async (req) => {
  await FinanceService.deletarCategoria(req.params.id, req.userId);
  return { ok: true };
});
