import { loginService, registerService, updatePerfilService } from '../services/UsuarioService.js';

export async function login(req, res) {
  const { email, senha } = req.body;
  if (!email || !senha)
    return res.status(400).json({ error: 'Preencha todos os campos.' });

  try {
    const data = await loginService({ email, senha });
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
}

export async function register(req, res) {
  const { nome, email, senha } = req.body;
  if (!nome || !email || !senha)
    return res.status(400).json({ error: 'Preencha todos os campos.' });

  try {
    const data = await registerService({ nome, email, senha });
    res.status(201).json(data);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
}

export async function updatePerfil(req, res) {
  try {
    const data = await updatePerfilService(req.userId, req.body);
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
}
