import { Link, useNavigate, useOutletContext } from 'react-router-dom';
import StatCard from '../../components/StatCard';
import ClassCard from '../../components/ClassCard';
import DataTable from '../../components/DataTable';
import Icon from '../../components/Icon';
import { teacherAssignments } from '../../mock/data';
import { useData } from '../../data/useData';
import { classesByTeacher, studentCountByClass } from '../../data/selectors';
import { dueLabel } from '../../utils/format';
import './TeacherDashboard.css';

const assignmentColumns = [
  { key: 'title', label: 'Assignment' },
  { key: 'className', label: 'Class' },
  {
    key: 'dueAt',
    label: 'Due',
    render: (assignment) => (
      <span className={`badge ${assignment.status === 'active' ? 'badge-accent' : 'badge-muted'}`}>
        {assignment.status === 'active' ? dueLabel(assignment.dueAt) : 'Closed'}
      </span>
    ),
  },
  {
    key: 'submitted',
    label: 'Submissions',
    render: (assignment) => (
      <div className="submissions">
        <span className="mono">
          {assignment.submitted}/{assignment.total}
        </span>
        <div className="progress" aria-hidden="true">
          <div
            className="progress-bar"
            style={{ width: `${Math.round((assignment.submitted / assignment.total) * 100)}%` }}
          />
        </div>
      </div>
    ),
  },
];

export default function TeacherDashboard() {
  const { user } = useOutletContext();
  const navigate = useNavigate();

  const { classes: allClasses, enrollments } = useData();

  const classes = classesByTeacher(allClasses, user.id);
  const assignments = teacherAssignments; // still static — a later step

  const totalStudents = classes.reduce((sum, c) => sum + studentCountByClass(enrollments, c.id), 0);
  const activeAssignments = assignments.filter((a) => a.status === 'active');

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Welcome back, {user.name}.</p>
        </div>
        {/* The create-class form will live on the My Classes page. */}
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => navigate('/teacher/classes', { state: { openCreate: true } })}
        >
          <Icon name="plus" size={16} />
          Create class
        </button>
      </div>

      <div className="stats-grid">
        <StatCard label="My classes" value={classes.length} icon="classes" />
        <StatCard label="Students" value={totalStudents} icon="students" hint="Across all classes" />
        <StatCard
          label="Active assignments"
          value={activeAssignments.length}
          icon="assignments"
          hint={activeAssignments[0] ? `Next: ${dueLabel(activeAssignments[0].dueAt).toLowerCase()}` : undefined}
        />
      </div>

      <section className="section">
        <div className="section-header">
          <h2 className="section-title">My Classes</h2>
          <Link to="/teacher/classes" className="section-link">View all classes</Link>
        </div>

        {classes.length === 0 ? (
          <div className="panel">
            <div className="empty">You haven't created a class yet. Create one to start adding students.</div>
          </div>
        ) : (
          <div className="card-grid">
            {classes.map((cls) => (
              <ClassCard
                key={cls.id}
                name={cls.name}
                section={cls.section}
                meta={`${studentCountByClass(enrollments, cls.id)} students`}
                onOpen={() => navigate(`/teacher/classes/${cls.id}`)}
              />
            ))}
          </div>
        )}
      </section>

      <section className="section">
        <div className="section-header">
          <h2 className="section-title">Assignments</h2>
          <Link to="/teacher/assignments" className="section-link">View all assignments</Link>
        </div>
        <div className="panel">
          <DataTable columns={assignmentColumns} rows={assignments} emptyMessage="No assignments yet." />
        </div>
      </section>
    </>
  );
}
