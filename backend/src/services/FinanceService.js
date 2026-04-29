import { supabase } from '../config/supabase.js';

// ── Orçamento ──────────────────────────────────────────────

export async function getOrCreateOrcamento(usuario_id, ano, mes) {
  const { data: existing } = await supabase
    .from('orcamentos_mensais')
    .select('*')
    .eq('usuario_id', usuario_id)
    .eq('ano', ano)
    .eq('mes', mes)
    .single();

  if (existing) return existing;

  const { data, error } = await supabase
    .from('orcamentos_mensais')
    .insert({ usuario_id, ano, mes, renda_base: 0 })
    .select()
    .single();

  if (error) throw { status: 500, message: error.message };
  return data;
}

export async function updateOrcamento(id, usuario_id, { renda_base, observacoes }) {
  const { data, error } = await supabase
    .from('orcamentos_mensais')
    .update({ renda_base, observacoes })
    .eq('id', id)
    .eq('usuario_id', usuario_id)
    .select()
    .single();

  if (error) throw { status: 500, message: error.message };
  return data;
}

export async function getResumoMensal(usuario_id, ano, mes) {
  const orcamento = await getOrCreateOrcamento(usuario_id, ano, mes);

  const [{ data: gastos }, { data: rendas }] = await Promise.all([
    supabase.from('gastos').select('valor, categoria_id, categorias(nome,cor,icone)').eq('orcamento_id', orcamento.id),
    supabase.from('rendas_extras').select('valor').eq('orcamento_id', orcamento.id),
  ]);

  const totalGastos = (gastos || []).reduce((s, g) => s + Number(g.valor), 0);
  const totalRendaExtra = (rendas || []).reduce((s, r) => s + Number(r.valor), 0);
  const rendaTotal = Number(orcamento.renda_base) + totalRendaExtra;
  const saldo = rendaTotal - totalGastos;

  // Gastos por categoria
  const porCategoria = {};
  (gastos || []).forEach(g => {
    const cat = g.categorias?.nome || 'Sem categoria';
    const cor = g.categorias?.cor || '#888';
    const icone = g.categorias?.icone || '📦';
    if (!porCategoria[cat]) porCategoria[cat] = { nome: cat, cor, icone, total: 0 };
    porCategoria[cat].total += Number(g.valor);
  });

  return {
    orcamento,
    renda_base: Number(orcamento.renda_base),
    renda_extra: totalRendaExtra,
    renda_total: rendaTotal,
    total_gastos: totalGastos,
    saldo,
    percentual_gasto: rendaTotal > 0 ? Math.round((totalGastos / rendaTotal) * 100) : 0,
    por_categoria: Object.values(porCategoria),
  };
}

// ── Gastos ─────────────────────────────────────────────────

export async function listarGastos(usuario_id, orcamento_id) {
  const { data, error } = await supabase
    .from('gastos')
    .select('*, categorias(id,nome,cor,icone)')
    .eq('usuario_id', usuario_id)
    .eq('orcamento_id', orcamento_id)
    .order('data_gasto', { ascending: false });

  if (error) throw { status: 500, message: error.message };
  return data;
}

export async function criarGasto(usuario_id, orcamento_id, body) {
  const { descricao, valor, data_gasto, categoria_id, recorrente, observacoes } = body;
  const { data, error } = await supabase
    .from('gastos')
    .insert({ usuario_id, orcamento_id, descricao, valor, data_gasto, categoria_id, recorrente: recorrente || false, observacoes })
    .select('*, categorias(id,nome,cor,icone)')
    .single();

  if (error) throw { status: 500, message: error.message };
  return data;
}

export async function atualizarGasto(id, usuario_id, body) {
  const { descricao, valor, data_gasto, categoria_id, recorrente, observacoes } = body;
  const { data, error } = await supabase
    .from('gastos')
    .update({ descricao, valor, data_gasto, categoria_id, recorrente, observacoes })
    .eq('id', id)
    .eq('usuario_id', usuario_id)
    .select('*, categorias(id,nome,cor,icone)')
    .single();

  if (error) throw { status: 500, message: error.message };
  return data;
}

export async function deletarGasto(id, usuario_id) {
  const { error } = await supabase.from('gastos').delete().eq('id', id).eq('usuario_id', usuario_id);
  if (error) throw { status: 500, message: error.message };
}

// ── Rendas extras ──────────────────────────────────────────

export async function listarRendas(usuario_id, orcamento_id) {
  const { data, error } = await supabase
    .from('rendas_extras')
    .select('*, categorias(id,nome,cor,icone)')
    .eq('usuario_id', usuario_id)
    .eq('orcamento_id', orcamento_id)
    .order('recebido_em', { ascending: false });

  if (error) throw { status: 500, message: error.message };
  return data;
}

export async function criarRenda(usuario_id, orcamento_id, body) {
  const { descricao, valor, recebido_em, categoria_id } = body;
  const { data, error } = await supabase
    .from('rendas_extras')
    .insert({ usuario_id, orcamento_id, descricao, valor, recebido_em, categoria_id })
    .select('*, categorias(id,nome,cor,icone)')
    .single();

  if (error) throw { status: 500, message: error.message };
  return data;
}

export async function deletarRenda(id, usuario_id) {
  const { error } = await supabase.from('rendas_extras').delete().eq('id', id).eq('usuario_id', usuario_id);
  if (error) throw { status: 500, message: error.message };
}

// ── Categorias ─────────────────────────────────────────────

export async function listarCategorias(usuario_id) {
  const { data, error } = await supabase
    .from('categorias')
    .select('*')
    .or(`usuario_id.eq.${usuario_id},padrao.eq.true`)
    .order('nome');

  if (error) throw { status: 500, message: error.message };
  return data;
}

export async function criarCategoria(usuario_id, body) {
  const { nome, icone, cor, tipo } = body;
  const { data, error } = await supabase
    .from('categorias')
    .insert({ usuario_id, nome, icone, cor, tipo, padrao: false })
    .select()
    .single();

  if (error) throw { status: 500, message: error.message };
  return data;
}

export async function deletarCategoria(id, usuario_id) {
  const { error } = await supabase
    .from('categorias')
    .delete()
    .eq('id', id)
    .eq('usuario_id', usuario_id)
    .eq('padrao', false);

  if (error) throw { status: 500, message: error.message };
}
