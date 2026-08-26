import { Link, useNavigate, useOutletContext } from 'react-router-dom';
import StatCard from '../../components/StatCard';
import DataTable from '../../components/DataTable';
import Icon from '../../components/Icon';
import { adminActivity } from '../../mock/data';
import { useData } from '../../data/useData';
import { classCountByTeacher, newestFirst } from '../../data/selectors';
import { formatDate } from '../../utils/format';
import './AdminDashboard.css';

// Column definitions live outside the component: they never change between renders.
const teacherColumns = [
  { key: 'name', label: 'Name', render: (teacher) => <span className="nowrap">{teacher.name}</span> },
  { key: 'email', label: 'Email' },
  {
    key: 'classCount',
    label: 'Classes',
    render: (teacher) => <span className="mono">{teacher.classCount}</span>,
  },
  {
    key: 'createdAt',
    label: 'Joined',
    render: (teacher) => <span className="mono nowrap">{formatDate(teacher.createdAt)}</span>,
  },
  {
    key: 'status',
    label: 'Status',
    render: (teacher) => (
      <span className={`badge ${teacher.mustChangePassword ? 'badge-muted' : 'badge-accent'}`}>
        {teacher.mustChangePassword ? 'Invited' : 'Active'}
      </span>
    ),
  },
];

export default function AdminDashboard() {
  const { user } = useOutletContext();
  const navigate = useNavigate();
  const { teachers, students, classes } = useData();

  const invitedTeachers = teachers.filter((t) => t.mustChangePassword).length;
  const invitedStudents = students.filter((s) => s.mustChangePassword).length;
  const recentTeachers = newestFirst(teachers)
    .slice(0, 4)
    .map((t) => ({ ...t, classCount: classCountByTeacher(classes, t.id) }));

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Welcome back, {user.name}. Here's what's happening on Codelab.</p>
        </div>
        <div className="quick-actions">
          {/* The add-teacher form will live on the Teachers page. */}
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => navigate('/admin/teachers', { state: { openAdd: true } })}
          >
            <Icon name="plus" size={16} />
            Add teacher
          </button>
        </div>
      </div>

      <div className="stats-grid">
        <StatCard
          label="Total teachers"
          value={teachers.length}
          icon="teachers"
          hint={invitedTeachers ? `${invitedTeachers} invitation${invitedTeachers === 1 ? '' : 's'} pending` : 'All active'}
        />
        <StatCard
          label="Total students"
          value={students.length}
          icon="students"
          hint={invitedStudents ? `${invitedStudents} awaiting first login` : 'All active'}
        />
        <StatCard label="Total classes" value={classes.length} icon="classes" hint={`Across ${teachers.length} teachers`} />
      </div>

      <div className="two-col two-col-wide">
        <section className="section">
          <div className="section-header">
            <h2 className="section-title">Recent teachers</h2>
            <Link to="/admin/teachers" className="section-link">View all teachers</Link>
          </div>
          <div className="panel">
            <DataTable columns={teacherColumns} rows={recentTeachers} emptyMessage="No teachers yet. Add the first one." />
          </div>
        </section>

        <section className="section">
          <div className="section-header">
            <h2 className="section-title">Recent activity</h2>
          </div>
          <div className="panel">
            <div className="panel-body">
              <ul className="list">
                {adminActivity.map((event) => (
                  <li key={event.id} className="list-item">
                    <span className="list-dot" />
                    <div className="list-main">
                      <div className="list-title">{event.text}</div>
                      <div className="list-meta">{event.when}</div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
