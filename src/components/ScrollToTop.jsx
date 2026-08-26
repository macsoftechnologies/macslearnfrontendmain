import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export default function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    const mainElement = document.querySelector('.app-shell__main');
    if (mainElement) {
      mainElement.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    } else {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }
  }, [pathname]);

  return null;
}