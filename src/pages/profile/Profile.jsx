import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Lock, Check, Eye, EyeOff, Save } from 'lucide-react';
import Toast, { useToast } from '../../components/Toast';
import './Profile.css';

const BASE_URL = import.meta.env.VITE_API_URL;

const rules = [
  { id: 'len',     label: 'Mínimo 8 caracteres',  test: v => v.length >= 8 },
  { id: 'upper',   label: 'Uma letra maiúscula',   test: v => /[A-Z]/.test(v) },
  { id: 'number',  label: 'Um número',             test: v => /[0-9]/.test(v) },
  { id: 'special', label: 'Um caractere especial', test: v => /[^A-Za-z0-9]/.test(v) },
];

export default function Profile() {
  const navigate = useNavigate();
  const { toasts, show: toast } = useToast();
  const usuario = JSON.parse(localStorage.getItem('usuario') || 'null');

  const [nome, setNome] = useState(usuario?.nome || '');
  const [email, setEmail] = useState(usuario?.email || '');
  const [senha, setSenha] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [showSenha, setShowSenha] = useState(false);
  const [showConfirmar, setShowConfirmar] = useState(false);
  const [pwdFocused, setPwdFocused] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  if (!usuario) { navigate('/'); return null; }

  const headers = {
    Authorization: `Bearer ${localStorage.getItem('token')}`,
    'Content-Type': 'application/json',
  };

  const checks = rules.map(r => ({ ...r, ok: r.test(senha) }));
  const senhaOk = checks.every(c => c.ok);
  const inicial = (usuario.nome || 'U').charAt(0).toUpperCase();

  const validate = () => {
    const e = {};
    if (!nome.trim()) e.nome = 'Nome é obrigatório.';
    if (!email.trim()) e.email = 'Email é obrigatório.';
    if (senha) {
      if (!senhaOk) e.senha = 'A senha não atende aos requisitos.';
      if (senha !== confirmar) e.confirmar = 'As senhas não coincidem.';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const body = { nome, email };
      if (senha) body.senha = senha;

      const res = await fetch(`${BASE_URL}/auth/perfil`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao salvar.');

      localStorage.setItem('usuario', JSON.stringify({ ...usuario, nome, email }));
      toast('Perfil atualizado com sucesso!', 'success');
      setSenha('');
      setConfirmar('');
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="pf-page">
      <Toast toasts={toasts}/>

      <div className="pf-topbar">
        <div>
          <div className="pf-title">Meu Perfil</div>
          <div className="pf-subtitle">Gerencie suas informações pessoais</div>
        </div>
      </div>

      <div className="pf-layout">

        {/* Card avatar */}
        <div className="pf-avatar-card">
          <div className="pf-avatar">{inicial}</div>
          <div className="pf-avatar-name">{usuario.nome}</div>
          <div className="pf-avatar-email">{usuario.email}</div>
          <div className="pf-avatar-badge">
            {usuario.admin ? '⚙ Administrador' : '👤 Usuário'}
          </div>
        </div>

        {/* Formulário */}
        <div className="pf-form-card">
          <div className="pf-form-body">

            <div className="pf-section-label">
              <User size={13}/> Informações pessoais
            </div>

            <div className="pf-field">
              <label>Nome</label>
              <input
                value={nome}
                onChange={e => { setNome(e.target.value); setErrors(v => ({ ...v, nome: '' })); }}
                placeholder="Seu nome"
                className={errors.nome ? 'pf-input-error' : ''}
              />
              {errors.nome && <span className="pf-error">⚠ {errors.nome}</span>}
            </div>

            <div className="pf-field">
              <label>Email</label>
              <input
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); setErrors(v => ({ ...v, email: '' })); }}
                placeholder="seu@email.com"
                className={errors.email ? 'pf-input-error' : ''}
              />
              {errors.email && <span className="pf-error">⚠ {errors.email}</span>}
            </div>

            <div className="pf-divider"/>

            <div className="pf-section-label">
              <Lock size={13}/> Alterar senha <span className="pf-optional">(opcional)</span>
            </div>

            <div className="pf-field">
              <label>Nova senha</label>
              <div className="pf-input-wrap">
                <input
                  type={showSenha ? 'text' : 'password'}
                  value={senha}
                  onChange={e => { setSenha(e.target.value); setErrors(v => ({ ...v, senha: '' })); }}
                  onFocus={() => setPwdFocused(true)}
                  onBlur={() => setPwdFocused(false)}
                  placeholder="••••••••"
                  className={errors.senha ? 'pf-input-error' : ''}
                />
                <button type="button" className="pf-eye" onClick={() => setShowSenha(s => !s)}>
                  {showSenha ? <EyeOff size={15}/> : <Eye size={15}/>}
                </button>
              </div>
              {errors.senha && <span className="pf-error">⚠ {errors.senha}</span>}
            </div>

            {(pwdFocused || senha.length > 0) && (
              <div className="pf-rules">
                {checks.map(c => (
                  <div key={c.id} className={`pf-rule${c.ok ? ' ok' : ''}`}>
                    <span className="pf-rule-icon">
                      {c.ok
                        ? <Check size={9} strokeWidth={3}/>
                        : <span style={{ width: 9, height: 9, borderRadius: '50%', border: '1.5px solid currentColor', display: 'inline-block' }}/>
                      }
                    </span>
                    {c.label}
                  </div>
                ))}
              </div>
            )}

            <div className="pf-field">
              <label>Confirmar nova senha</label>
              <div className="pf-input-wrap">
                <input
                  type={showConfirmar ? 'text' : 'password'}
                  value={confirmar}
                  onChange={e => { setConfirmar(e.target.value); setErrors(v => ({ ...v, confirmar: '' })); }}
                  placeholder="••••••••"
                  className={errors.confirmar ? 'pf-input-error' : ''}
                />
                <button type="button" className="pf-eye" onClick={() => setShowConfirmar(s => !s)}>
                  {showConfirmar ? <EyeOff size={15}/> : <Eye size={15}/>}
                </button>
              </div>
              {errors.confirmar && <span className="pf-error">⚠ {errors.confirmar}</span>}
            </div>

          </div>

          <div className="pf-form-footer">
            <button className="pf-btn-save" onClick={handleSave} disabled={saving}>
              <Save size={14}/>
              {saving ? 'Salvando...' : 'Salvar alterações'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
