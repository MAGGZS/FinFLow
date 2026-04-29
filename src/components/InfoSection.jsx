import './InfoSection.css';

export default function InfoSection() {
  return (
    <div className="info-section">
      <div className="project-header">
        <h1 className="project-title">FinFlow</h1>
        <p className="project-subtitle">Controle total das suas finanças</p>
        <p className="project-description">
          Gerencie receitas, despesas e investimentos em um só lugar.
          Visualize seu patrimônio em tempo real e tome decisões financeiras mais inteligentes.
        </p>
        <div className="features-list">
          <div className="feature-item">
            <div className="feature-dot"></div>
            <span>Dashboard com visão geral do seu saldo</span>
          </div>
          <div className="feature-item">
            <div className="feature-dot"></div>
            <span>Categorização automática de gastos</span>
          </div>
          <div className="feature-item">
            <div className="feature-dot"></div>
            <span>Relatórios e metas de economia mensais</span>
          </div>
        </div>
      </div>
    </div>
  );
}
