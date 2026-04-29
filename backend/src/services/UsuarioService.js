import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { supabase } from '../config/supabase.js';

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });

export async function loginService({ email, senha }) {
  const { data: usuario, error } = await supabase
    .from('usuario')
    .select('id, nome, email, senha_hash, ativo, admin')
    .eq('email', email)
    .single();

  if (error || !usuario || !(await bcrypt.compare(senha, usuario.senha_hash)))
    throw { status: 401, message: 'E-mail ou senha inválidos.' };

  if (!usuario.ativo)
    throw { status: 403, message: 'Conta desativada.' };

  const token = generateToken(usuario.id);
  return { token, usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email, admin: usuario.admin ?? false } };
}

export async function updatePerfilService(id, { nome, email, senha }) {
  const update = { nome, email };

  if (senha) {
    update.senha_hash = await bcrypt.hash(senha, 12);
  }

  const { data, error } = await supabase
    .from('usuario')
    .update(update)
    .eq('id', id)
    .select('id, nome, email, admin')
    .single();

  if (error) throw { status: 500, message: error.message };
  return data;
}

export async function registerService({ nome, email, senha }) {
  const { data: existing } = await supabase
    .from('usuario')
    .select('id')
    .eq('email', email)
    .single();

  if (existing)
    throw { status: 409, message: 'E-mail já cadastrado.' };

  const senha_hash = await bcrypt.hash(senha, 12);

  const { data, error } = await supabase
    .from('usuario')
    .insert({ nome, email, senha_hash })
    .select('id, nome, email')
    .single();

  if (error) {
    console.error('Supabase insert error:', error);
    throw { status: 500, message: 'Erro ao criar conta.' };
  }

  const token = generateToken(data.id);
  return { token, usuario: { id: data.id, nome: data.nome, email: data.email } };
}
