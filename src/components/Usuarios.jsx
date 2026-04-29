import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import './Usuarios.css';
import Toast, { useToast } from './Toast';

const BASE_URL = 'http://localhost:8080';

const getAvatarColor = (nome) => {
  const colors = ['#A89BF2','#8B7FD9','#6B5FA8','#D4CCFF','#9f8ef5','#c4b8ff'];
  return colors[nome.charCodeAt(0) % colors.length];
};

function ConfirmModal({ usuario, onConfirm, onCancel }) {
  if (!usuario) return null;
  return (
    <div className="usr-modal-overlay" onClick={onCancel}>
      <div className="usr-modal-box" onClick={e => e.stopPropagation()}>
        <div className="usr-modal-icon usr-modal-icon-red">⚠</div>
        <div className="usr-modal-title">Excluir usuário?</div>
        <div className="usr-modal-desc">
          Tem certeza que deseja excluir <strong>{usuario.nome}</strong>? Esta ação não pode ser desfeita.
        </div>
        <div className="usr-modal-actions">
          <button className="usr-btn-cancel" onClick={onCancel}>Cancelar</button>
          <button className="usr-btn-delete" onClick={onConfirm}>Excluir</button>
        </div>
      </div>
    </div>
  );
}

function EditModal({ usuario, onSave, onCancel, isSelf }) {
  const [nome, setNome] = useState(usuario.nome);
  const [email, setEmail] = useState(usuario.email);
  const [ativo, setAtivo] = useState(usuario.ativo);
  const [admin, setAdmin] = useState(usuario.admin);
  const [saving, setSaving] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);

  const hasChanges =
    nome !== usuario.nome ||
    email !== usuario.email ||
    ativo !== usuario.ativo ||
    admin !== usuario.admin;

  const handleCancel = () => {
    if (hasChanges) setConfirmExit(true);
    else onCancel();
  };

  const handleSave = async () => {
    setSaving(true);
    await onSave({ ...usuario, nome, email, ativo, admin });
    setSaving(false);
  };

  const Toggle = ({ value, onChange, labelOn, labelOff, colorOn, locked }) => (
    <div className={`usr-edit-toggle${locked ? ' usr-toggle-locked' : ''}`} onClick={locked ? undefined : onChange}>
      <div className={`usr-toggle-track${value ? ' on' : ''}`}
        style={value && colorOn ? { background: colorOn, borderColor: 'transparent' } : {}}>
        <div className="usr-toggle-thumb"/>
      </div>
      <span className={value ? 'usr-toggle-label-on' : 'usr-toggle-label-off'}>
        {value ? labelOn : labelOff}
        {locked && <span className="usr-locked-hint"> · não editável</span>}
      </span>
    </div>
  );

  return (
    <div className="usr-modal-overlay" onClick={handleCancel}>
      <div className="usr-modal-box usr-modal-edit" onClick={e => e.stopPropagation()}>

        {/* Modal de confirmação de saída — dentro do mesmo box */}
        {confirmExit && (
          <div className="usr-exit-confirm">
            <div className="usr-exit-icon">↩</div>
            <div className="usr-exit-title">Descartar alterações?</div>
            <div className="usr-exit-desc">As alterações feitas não serão salvas.</div>
            <div className="usr-modal-actions">
              <button className="usr-btn-cancel" onClick={() => setConfirmExit(false)}>Continuar editando</button>
              <button className="usr-btn-delete" onClick={onCancel}>Descartar</button>
            </div>
          </div>
        )}

        <div className={confirmExit ? 'usr-edit-content usr-edit-content-hidden' : 'usr-edit-content'}>
          <div className="usr-modal-edit-header">
            <div className="usr-modal-avatar" style={{ background: getAvatarColor(usuario.nome) }}>
              {usuario.nome.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="usr-modal-title" style={{ textAlign: 'left', marginBottom: 2 }}>Editar usuário</div>
              <div className="usr-modal-id">#{usuario.id}</div>
            </div>
            {hasChanges && <span className="usr-unsaved-badge">Não salvo</span>}
          </div>

          <div className="usr-modal-section-label">Informações</div>
          <div className="usr-edit-field">
            <label>Nome</label>
            <input value={nome} onChange={e => setNome(e.target.value)} />
          </div>
          <div className="usr-edit-field">
            <label>Email</label>
            <input value={email} onChange={e => setEmail(e.target.value)} />
          </div>

          <div className="usr-modal-section-label">Permissões</div>
          <div className="usr-edit-toggles">
            <Toggle
              value={ativo}
              onChange={() => setAtivo(a => !a)}
              labelOn="Conta ativa"
              labelOff="Conta inativa"
              colorOn="linear-gradient(135deg,#10b981,#059669)"
            />
            <Toggle
              value={admin}
              onChange={() => setAdmin(a => !a)}
              labelOn="Administrador"
              labelOff="Usuário comum"
              colorOn="linear-gradient(135deg,var(--purple-primary),var(--accent))"
              locked={isSelf}
            />
          </div>

          <div className="usr-modal-actions">
            <button className="usr-btn-cancel" onClick={handleCancel} disabled={saving}>Cancelar</button>
            <button className="usr-btn-save" onClick={handleSave} disabled={saving || !hasChanges}>
              {saving ? 'Salvando...' : 'Salvar alterações'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Usuarios() {
  const navigate = useNavigate();
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [editando, setEditando] = useState(null);
  const [deletando, setDeletando] = useState(null);
  const { toasts, show: toast } = useToast();
  const PER_PAGE = 8;
  const adminAtual = JSON.parse(localStorage.getItem('usuario') || '{}');
  const podeExcluir = (u) => !u.admin && String(u.id) !== String(adminAtual.id);

  useEffect(() => {
    const usuario = JSON.parse(localStorage.getItem('usuario') || 'null');
    if (!usuario?.admin) { navigate('/'); return; }
    carregar();
  }, []);

  const carregar = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/admin/usuarios`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      const data = await res.json();
      setUsuarios(Array.isArray(data) ? data : []);
    } catch (e) {
      toast('Erro ao carregar usuários.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (u) => {
    try {
      const res = await fetch(`${BASE_URL}/admin/usuarios/${u.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ nome: u.nome, email: u.email, ativo: u.ativo, admin: u.admin }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao salvar.');
      setUsuarios(prev => prev.map(x => x.id === u.id ? { ...x, ...data } : x));
      setEditando(null);
      toast('Usuário atualizado com sucesso!', 'success');
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  const handleDelete = async () => {
    try {
      const res = await fetch(`${BASE_URL}/admin/usuarios/${deletando.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao excluir.');
      setUsuarios(prev => prev.filter(x => x.id !== deletando.id));
      setDeletando(null);
      toast('Usuário excluído com sucesso.', 'success');
    } catch (e) {
      toast(e.message, 'error');
      setDeletando(null);
    }
  };

  const filtered = useMemo(() =>
    usuarios.filter(u =>
      u.nome.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
    ), [usuarios, search]);

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const current = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <div className="usr-page">
      <Toast toasts={toasts} />
      {editando && <EditModal usuario={editando} onSave={handleSave} onCancel={() => setEditando(null)} isSelf={String(editando.id) === String(adminAtual.id)} />}
      {deletando && <ConfirmModal usuario={deletando} onConfirm={handleDelete} onCancel={() => setDeletando(null)} />}

      <div className="usr-header">
        <div>
          <div className="usr-title">Gerenciar Usuários</div>
          <div className="usr-subtitle">Gerencie todos os usuários da plataforma</div>
        </div>
        <button className="usr-refresh" onClick={carregar} disabled={loading}>↻ Atualizar</button>
      </div>

      <div className="usr-search-wrap">
        <span className="usr-search-icon">🔍</span>
        <input
          className="usr-search"
          placeholder="Pesquisar por nome ou email..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
        />
      </div>

      <div className="usr-card">
        <table className="usr-table">
          <thead>
            <tr>
              <th>Usuário</th>
              <th>Email</th>
              <th>Cadastro</th>
              <th>Perfil</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6" className="usr-empty"><div className="dash-spinner" style={{margin:'0 auto'}}/></td></tr>
            ) : current.length === 0 ? (
              <tr><td colSpan="6" className="usr-empty">
                <div className="usr-empty-icon">👥</div>
                {search ? 'Nenhum usuário encontrado.' : 'Nenhum usuário cadastrado.'}
              </td></tr>
            ) : current.map(u => (
              <tr key={u.id}>
                <td>
                  <div className="usr-user-cell">
                    <div className="usr-avatar" style={{ background: getAvatarColor(u.nome) }}>
                      {u.nome.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="usr-nome">{u.nome}</div>
                      <div className="usr-id">#{u.id}</div>
                    </div>
                  </div>
                </td>
                <td className="usr-email">{u.email}</td>
                <td className="usr-date">{new Date(u.criado_em || u.created_at).toLocaleDateString('pt-BR')}</td>
                <td><span className={`usr-pill ${u.admin ? 'pill-admin' : 'pill-user'}`}>{u.admin ? 'Admin' : 'Usuário'}</span></td>
                <td><span className={`usr-pill ${u.ativo ? 'pill-active' : 'pill-inactive'}`}>{u.ativo ? 'Ativo' : 'Inativo'}</span></td>
                <td>
                  <div className="usr-actions">
                    <button className="usr-btn-edit" onClick={() => setEditando(u)}>✎ Editar</button>
                    {podeExcluir(u) && (
                      <button className="usr-btn-del" onClick={() => setDeletando(u)}>✕ Excluir</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="usr-pagination">
          <button className="usr-page-btn" onClick={() => setPage(p => p - 1)} disabled={page === 1}>‹ Anterior</button>
          <span className="usr-page-info">Página {page} de {totalPages}</span>
          <button className="usr-page-btn" onClick={() => setPage(p => p + 1)} disabled={page === totalPages}>Próximo ›</button>
        </div>
      )}
    </div>
  );
}
