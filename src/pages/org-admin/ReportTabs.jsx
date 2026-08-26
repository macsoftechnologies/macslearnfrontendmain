import { useLocation, useNavigate } from 'react-router-dom';
import Tabs from '../../components/ui/Tabs';

export default function ReportTabs() {
  const location = useLocation();
  const navigate = useNavigate();
  return (
    <Tabs
      tabs={[
        { key: 'overview', label: 'Overview' },
        { key: 'course-performance', label: 'Course Performance' },
      ]}
      active={location.pathname.split('/').pop()}
      onChange={(k) => navigate(`/admin/reports/${k}`)}
    />
  );
}
