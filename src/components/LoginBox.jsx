import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import heroImg from '../assets/hero.png';
import './LoginBox.css';
import api from '../services/api';
import Toast, { useToast } from './Toast';

const EyeIcon = ({ open }) => open ? (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
) : (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
);

const Field = ({ label, id, type, name, placeholder, defaultValue, error, onChange, onFocus, onBlur, inputRef }) => {
  const [show, setShow] = useState(false);
  const isPassword = type === 'password';
  return (
    <div className="form-group">
      <label htmlFor={id}>{label}</label>
      <div className={`input-wrap${isPassword ? ' input-wrap-password' : ''}`}>
        <input
          ref={inputRef}
          type={isPassword && show ? 'text' : type}
          id={id}
          name={name}
          placeholder={placeholder}
          defaultValue={defaultValue}
          onChange={onChange}
          onFocus={onFocus}
          onBlur={onBlur}
          className={error && error.trim() ? 'input-error' : ''}
        />
        {isPassword && (
          <button type="button" className="eye-btn" onClick={() => setShow(s => !s)} tabIndex={-1}>
            <EyeIcon open={show} />
          </button>
        )}
      </div>
      <div className={`field-error-wrap${error && error.trim() ? ' field-error-visible' : ''}`}>
        <span className="field-error">⚠ {error}</span>
      </div>
    </div>
  );
};

const rules = [
  { id: 'len',     label: 'Mínimo 8 caracteres',  test: v => v.length >= 8 },
  { id: 'upper',   label: 'Uma letra maiúscula',   test: v => /[A-Z]/.test(v) },
  { id: 'number',  label: 'Um número',             test: v => /[0-9]/.test(v) },
  { id: 'special', label: 'Um caractere especial', test: v => /[^A-Za-z0-9]/.test(v) },
];

const PasswordStrength = ({ value, visible, anchorRef }) => {
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (!anchorRef?.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    setPos({
      top: rect.top + rect.height / 2,
      left: rect.right + 14,
    });
  }, [visible, anchorRef]);

  const checks = rules.map(r => ({ ...r, ok: r.test(value) }));

  return createPortal(
    <div
      className={`pwd-drop${visible ? ' pwd-drop-open' : ''}`}
      style={{ top: pos.top, left: pos.left }}
    >
      <div className="pwd-drop-inner">
        {checks.map(c => (
          <div key={c.id} className={`pwd-rule${c.ok ? ' pwd-rule-ok' : ''}`}>
            <span className="pwd-rule-icon">
              {c.ok ? (
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <polyline points="1.5,5 4,7.5 8.5,2.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              ) : (
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <circle cx="5" cy="5" r="3.5" stroke="currentColor" strokeWidth="1.5"/>
                </svg>
              )}
            </span>
            {c.label}
          </div>
        ))}
      </div>
    </div>,
    document.body
  );
};

export default function LoginBox() {
  const [mode, setMode] = useState('login');
  const [animating, setAnimating] = useState(false);
  const [direction, setDirection] = useState('right');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleTooltip, setGoogleTooltip] = useState(false);
  const googleBtnRef = useRef(null);
  const [googleTooltipPos, setGoogleTooltipPos] = useState({ top: 0, left: 0 });
  const [terms, setTerms] = useState(false);
  const [termsError, setTermsError] = useState('');
  const [prefill, setPrefill] = useState({ email: '', senha: '' });
  const [fieldErrors, setFieldErrors] = useState({});
  const [registerPassword, setRegisterPassword] = useState('');
  const [pwdFocused, setPwdFocused] = useState(false);
  const pwdInputRef = useRef(null);
  const navigate = useNavigate();
  const { toasts, show: showToast } = useToast();

  const setError = (field, msg) => setFieldErrors(e => ({ ...e, [field]: msg }));
  const clearError = (field) => setFieldErrors(e => ({ ...e, [field]: '' }));

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await api.login(e.target.email.value, e.target.password.value);
      localStorage.setItem('usuario', JSON.stringify(data.usuario));
      if (data.usuario.admin) navigate('/admin');
      else navigate('/app');
    } catch (err) {
      setFieldErrors({ loginEmail: true, loginPassword: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    const { nome, email, password, confirmPassword } = e.target;
    let hasError = false;
    const errors = {};

    if (!nome.value.trim()) { errors.nome = 'Nome é obrigatório.'; hasError = true; }
    if (!email.value.trim()) { errors.email = 'Email é obrigatório.'; hasError = true; }
    if (!rules.every(r => r.test(password.value))) { errors.password = 'A senha não atende aos requisitos.'; hasError = true; }
    if (password.value !== confirmPassword.value) { errors.confirmPassword = 'As senhas não coincidem.'; hasError = true; }
    if (!terms) { setTermsError('Aceite os termos para continuar.'); hasError = true; }
    else setTermsError('');

    if (hasError) return setFieldErrors(errors);

    setLoading(true);
    try {
      await api.register(nome.value, email.value, password.value);
      showToast('Conta criada com sucesso!', 'success');
      setPrefill({ email: email.value, senha: password.value });
      switchMode('login');
    } catch (err) {
      if (err.message.includes('mail')) setError('email', err.message);
      else showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    const rect = googleBtnRef.current.getBoundingClientRect();
    setGoogleTooltipPos({ top: rect.top - 44, left: rect.left + rect.width / 2 });
    setGoogleTooltip(true);
    setTimeout(() => setGoogleTooltip(false), 3000);
  };

  const switchMode = (m) => {
    if (animating) return;
    setDirection(m === 'register' ? 'right' : 'left');
    setAnimating(true);
    setTimeout(() => {
      setMode(m);
      setTerms(false);
      setTermsError('');
      setFieldErrors({});
      setRegisterPassword('');
      if (m === 'register') setPrefill({ email: '', senha: '' });
      setAnimating(false);
    }, 320);
  };

  const GoogleIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="currentColor"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="currentColor"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="currentColor"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="currentColor"/>
    </svg>
  );

  return (
    <div className="form-section">
      <Toast toasts={toasts} />
      <PasswordStrength value={registerPassword} visible={pwdFocused || registerPassword.length > 0} anchorRef={pwdInputRef} />
      <div className="login-box">
        <button className="back-btn" onClick={() => mode === 'register' ? switchMode('login') : history.back()}>
          <span>← Voltar</span>
        </button>

        <div className={`login-content form-transition ${animating ? `exit-${direction}` : `enter-${direction}`}`}>
          <div className="title-container">
            <img src={heroImg} alt="Logo" className="login-logo" />
            <div className="welcome-text">{mode === 'login' ? 'Bem-vindo de volta!' : 'Crie sua conta'}</div>
            <div className="title-main">{mode === 'login' ? 'Faça o login' : 'Cadastro'}</div>
          </div>

          {mode === 'login' ? (
            <form key={prefill.email} onSubmit={handleLogin}>
              <Field label="Seu email" id="email" type="email" name="email" placeholder="email@gmail.com"
                defaultValue={prefill.email} error={fieldErrors.loginEmail ? ' ' : ''}
                onChange={() => clearError('loginEmail')} />
              <Field label="Senha" id="password" type="password" name="password" placeholder="••••••••"
                defaultValue={prefill.senha} error={fieldErrors.loginPassword}
                onChange={() => setFieldErrors({})} />
              <button type="submit" className="signin-btn" disabled={loading}>
                {loading ? 'Entrando...' : 'Entrar'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister}>
              <Field label="Nome de usuário" id="nome" type="text" name="nome" placeholder="Seu nome"
                error={fieldErrors.nome} onChange={() => clearError('nome')} />
              <Field label="Email" id="email" type="email" name="email" placeholder="email@gmail.com"
                error={fieldErrors.email} onChange={() => clearError('email')} />
              <Field label="Senha" id="password" type="password" name="password" placeholder="••••••••"
                error={fieldErrors.password}
                inputRef={pwdInputRef}
                onChange={e => { clearError('password'); setRegisterPassword(e.target.value); }}
                onFocus={() => setPwdFocused(true)}
                onBlur={() => setPwdFocused(false)}
              />
              <Field label="Confirmar senha" id="confirmPassword" type="password" name="confirmPassword" placeholder="••••••••"
                error={fieldErrors.confirmPassword} onChange={() => clearError('confirmPassword')} />
              <div className={`form-check${terms ? ' checked' : ''}${termsError ? ' check-invalid' : ''}`}
                onClick={() => { setTerms(t => !t); setTermsError(''); }}>
                <input type="checkbox" id="terms" checked={terms} onChange={() => {}} />
                <div className="custom-checkbox">
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <polyline points="1.5,5 4,7.5 8.5,2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <label htmlFor="terms" className="check-label">
                  Concordo com os <a href="#" onClick={e => e.stopPropagation()}>Termos de Serviço</a> e a <a href="#" onClick={e => e.stopPropagation()}>Política de Privacidade</a>
                </label>
              </div>
              <div className={`field-error-wrap${termsError ? ' field-error-visible' : ''}`}>
                <span className="field-error terms-error">⚠ {termsError}</span>
              </div>
              <button type="submit" className="signin-btn" disabled={loading}>
                {loading ? 'Criando conta...' : 'Criar conta'}
              </button>
            </form>
          )}

          <div className="links-container">
            <div className="divider"></div>
            <p className="signup-link">
              {mode === 'login' ? (
                <>Primeira vez aqui? <a href="#" onClick={(e) => { e.preventDefault(); switchMode('register'); }}>Crie sua conta</a></>
              ) : (
                <>Já tem conta? <a href="#" onClick={(e) => { e.preventDefault(); switchMode('login'); }}>Faça o login</a></>
              )}
            </p>
            <div className="google-btn-wrap">
              <button ref={googleBtnRef} type="button" className="google-btn" onClick={handleGoogleLogin} disabled={googleLoading}>
                <GoogleIcon />
                {googleLoading ? 'Conectando...' : 'Continuar com Google'}
              </button>
            </div>
            {googleTooltip && createPortal(
              <div className="google-tooltip" style={{ top: googleTooltipPos.top, left: googleTooltipPos.left }}>
                Em breve! Funcionalidade ainda não implementada.
              </div>,
              document.body
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
