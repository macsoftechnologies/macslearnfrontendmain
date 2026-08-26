import { useState, useEffect } from 'react';
import { BookMarked } from 'lucide-react';
import { buildStaticUrl } from '../../api/client';
import { getPublicBySlug } from '../../api/organizations';
import './AuthShell.css';

export default function AuthShell({ eyebrow, title, subtitle, children, wide, footer, slug }) {
  const [org, setOrg] = useState(null);
  const [loading, setLoading] = useState(!!slug);

  useEffect(() => {
    if (slug) {
      setLoading(true);
      getPublicBySlug(slug)
        .then((res) => {
          if (res.data?.data) {
            setOrg(res.data.data);
          } else if (res.data) {
            setOrg(res.data);
          }
        })
        .catch(() => setOrg(null))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    if (org?.name) {
      document.title = `${org.name} - Login`;
    } else {
      document.title = 'LMS';
    }
  }, [org?.name]);

  return (
    <div className="auth-shell">
      <div className="auth-shell__side">
        <div className="auth-shell__brand" style={{ minHeight: '32px' }}>
          {!loading && (
            <>
              {org?.logoUrl ? (
                <img src={buildStaticUrl(org.logoUrl)} alt={`${org.name} logo`} style={{ maxHeight: '32px', marginRight: '8px' }} />
              ) : (
                <span className="auth-shell__mark">
                  <BookMarked size={20} />
                </span>
              )}
              <span> {org?.name || 'LMS'}</span>
            </>
          )}
        </div>
        <div className="auth-shell__quote">
          <p className="auth-shell__quote-text">
            "The organized classroom is the one where every learner always knows what comes next."
          </p>
          <div className="auth-shell__stats">
            <div>
              <strong>4</strong>
              <span>Role-based portals</span>
            </div>
            <div>
              <strong>Live</strong>
              <span>Progress tracking</span>
            </div>
            <div>
              <strong>Secure</strong>
              <span>Token-based access</span>
            </div>
          </div>
        </div>
      </div>

      <div className="auth-shell__form-col">
        <div className={`auth-card ${wide ? 'auth-card--wide' : ''}`}>
          {eyebrow && <span className="page-eyebrow">{eyebrow}</span>}
          <h1 className="auth-card__title">{title}</h1>
          {subtitle && <p className="auth-card__subtitle">{subtitle}</p>}
          <div className="auth-card__body">{children}</div>
          {footer && <div className="auth-card__footer">{footer}</div>}
        </div>
      </div>
    </div>
  );
}
