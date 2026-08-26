import { useLocation, useOutletContext } from 'react-router-dom';
import { NAVIGATION } from '../config/navigation';

/**
 * Temporary page for sidebar links that don't have a real page yet.
 * It looks up the link's label from the navigation config so the page
 * heading matches the sidebar. Delete this once every route is built.
 */
export default function Placeholder() {
  const { pathname } = useLocation();
  const { role } = useOutletContext();

  const navItem = NAVIGATION[role].find((item) => item.to === pathname);
  const title = navItem ? navItem.label : 'Coming soon';

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">{title}</h1>
          <p className="page-subtitle">This page hasn't been built yet.</p>
        </div>
      </div>

      <div className="panel">
        <div className="empty">
          <code>{pathname}</code> will be implemented in a later step.
        </div>
      </div>
    </>
  );
}
