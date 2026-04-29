import { useNavigate } from 'react-router-dom';
import { DollarSign, Banknote, CircleDollarSign, BadgeDollarSign, ArrowLeft } from 'lucide-react';
import './UnderConstruction.css';

export default function UnderConstruction() {
  const navigate = useNavigate();

  return (
    <div className="uc-page">
      <div className="uc-content">

        <div className="uc-scene">
          <div className="uc-coin uc-coin-1"><Banknote size={20}/></div>
          <div className="uc-coin uc-coin-2"><CircleDollarSign size={18}/></div>
          <div className="uc-coin uc-coin-3"><BadgeDollarSign size={20}/></div>
          <div className="uc-coin uc-coin-4"><CircleDollarSign size={16}/></div>
          <div className="uc-coin uc-coin-5"><Banknote size={18}/></div>
          <div className="uc-sign"><DollarSign size={72} strokeWidth={2}/></div>
        </div>

        <div className="uc-code">404</div>
        <div className="uc-divider"/>
        <div className="uc-badge">Em desenvolvimento</div>
        <div className="uc-title">Ainda não disponível</div>
        <div className="uc-desc">
          Esta funcionalidade está sendo construída<br/>
          com muito cuidado para você.
        </div>

        <button className="uc-btn" onClick={() => navigate(-1)}>
          <ArrowLeft size={15}/> Voltar
        </button>
      </div>
    </div>
  );
}
