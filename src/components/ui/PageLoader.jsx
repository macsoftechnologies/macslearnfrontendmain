import './PageLoader.css';

export default function PageLoader({ label = 'Syncing System Data' }) {
  return (
    <div className="page-loader">
      <div className="page-loader__cyber">
        <div className="page-loader__ring page-loader__ring--outer" />
        <div className="page-loader__ring page-loader__ring--middle" />
        <div className="page-loader__ring page-loader__ring--inner" />
        <div className="page-loader__core" />
      </div>
      <div className="page-loader__status">
        <span className="page-loader__label">{label}</span>
        <span className="page-loader__dots">
          <span />
          <span />
          <span />
        </span>
      </div>
    </div>
  );
}

