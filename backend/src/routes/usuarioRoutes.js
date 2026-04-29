import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { login, register } from '../controllers/UsuarioController.js';
import { updatePerfil } from '../controllers/UsuarioController.js';

const router = Router();

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

router.post('/login', login);
router.post('/register', register);
router.put('/perfil', auth, updatePerfil);

export default router;
