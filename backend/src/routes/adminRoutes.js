import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { supabase } from '../config/supabase.js';

const router = Router();

const authAdmin = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token ausente.' });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const { data: me } = await supabase.from('usuario').select('id, admin').eq('id', payload.id).single();
    if (!me?.admin) return res.status(403).json({ error: 'Acesso negado.' });
    req.userId = payload.id;
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido.' });
  }
};

// Descobre o nome da coluna de data dinamicamente
const getDateField = async () => {
  const { data } = await supabase.from('usuario').select('criado_em, created_at').limit(1);
  if (!data?.[0]) return 'created_at';
  return 'criado_em' in data[0] ? 'criado_em' : 'created_at';
};

router.get('/stats', authAdmin, async (req, res) => {
  const dateField = await getDateField();

  const { data: todos, error } = await supabase
    .from('usuario')
    .select(`id, ativo, admin, ${dateField}`);

  if (error) return res.status(500).json({ error: error.message });

  const list = todos ?? [];
  const now = new Date();

  // Cadastros por dia nos últimos 30 dias
  const last30 = {};
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    last30[key] = 0;
  }
  list.forEach(u => {
    const key = new Date(u[dateField]).toISOString().slice(0, 10);
    if (key in last30) last30[key]++;
  });

  // Cadastros por mês nos últimos 12 meses
  const last12 = {};
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    last12[key] = 0;
  }
  list.forEach(u => {
    const d = new Date(u[dateField]);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (key in last12) last12[key]++;
  });

  res.json({
    total: list.length,
    ativos: list.filter(u => u.ativo).length,
    inativos: list.filter(u => !u.ativo).length,
    admins: list.filter(u => u.admin).length,
    novosHoje: list.filter(u => new Date(u[dateField]).toDateString() === now.toDateString()).length,
    novosSemana: list.filter(u => {
      const d = new Date(u[dateField]);
      const diff = (now - d) / (1000 * 60 * 60 * 24);
      return diff <= 7;
    }).length,
    cadastrosDia: Object.entries(last30).map(([date, count]) => ({ date, count })),
    cadastrosMes: Object.entries(last12).map(([month, count]) => ({ month, count })),
  });
});

router.get('/usuarios', authAdmin, async (req, res) => {
  const dateField = await getDateField();
  const { data, error } = await supabase
    .from('usuario')
    .select(`id, nome, email, ativo, admin, ${dateField}`)
    .order('id', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data ?? []);
});

router.put('/usuarios/:id', authAdmin, async (req, res) => {
  const { nome, email, ativo, admin } = req.body;
  const id = parseInt(req.params.id) || req.params.id;

  // Busca dados atuais para proteger campos restritos
  const { data: alvo } = await supabase.from('usuario').select('admin').eq('id', id).single();

  const update = { nome, email, ativo };
  // Só permite mudar admin se não for o próprio usuário
  if (String(id) !== String(req.userId)) update.admin = admin;

  const { data, error } = await supabase
    .from('usuario')
    .update(update)
    .eq('id', id)
    .select('id, nome, email, ativo, admin');

  if (error) {
    console.error('PUT error:', error);
    return res.status(500).json({ error: error.message });
  }
  if (!data?.length) return res.status(404).json({ error: 'Usuário não encontrado.' });
  res.json(data[0]);
});

router.delete('/usuarios/:id', authAdmin, async (req, res) => {
  const id = parseInt(req.params.id) || req.params.id;

  if (String(id) === String(req.userId))
    return res.status(400).json({ error: 'Você não pode excluir sua própria conta.' });

  const { data: alvo } = await supabase.from('usuario').select('admin').eq('id', id).single();
  if (alvo?.admin)
    return res.status(400).json({ error: 'Não é possível excluir outro administrador.' });

  const { error } = await supabase.from('usuario').delete().eq('id', id);
  if (error) {
    console.error('DELETE error:', error);
    return res.status(500).json({ error: error.message });
  }
  res.json({ ok: true });
});

export default router;
