import { Router } from 'express';
import jwt from 'jsonwebtoken';
import * as FC from '../controllers/FinanceController.js';

const router = Router();

// Middleware de autenticação
const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token ausente.' });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = payload.id;
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido.' });
  }
};

router.use(auth);

// Resumo mensal
router.get('/resumo', FC.getResumo);

// Orçamento
router.get('/orcamento', FC.getOrcamento);
router.put('/orcamento/:id', FC.updateOrcamento);

// Gastos
router.get('/orcamento/:orcamentoId/gastos', FC.getGastos);
router.post('/orcamento/:orcamentoId/gastos', FC.postGasto);
router.put('/gastos/:id', FC.putGasto);
router.delete('/gastos/:id', FC.deleteGasto);

// Rendas extras
router.get('/orcamento/:orcamentoId/rendas', FC.getRendas);
router.post('/orcamento/:orcamentoId/rendas', FC.postRenda);
router.delete('/rendas/:id', FC.deleteRenda);

// Categorias
router.get('/categorias', FC.getCategorias);
router.post('/categorias', FC.postCategoria);
router.delete('/categorias/:id', FC.deleteCategoria);

export default router;
