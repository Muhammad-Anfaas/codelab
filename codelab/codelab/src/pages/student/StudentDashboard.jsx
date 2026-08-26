import { Link, useNavigate, useOutletContext } from 'react-router-dom';
import StatCard from '../../components/StatCard';
import ClassCard from '../../components/ClassCard';
import { studentAssignments, studentGrades, studentActivity } from '../../mock/data';
import { useData } from '../../data/useData';
import { classesForStudent } from '../../data/selectors';
import { dueLabel } from '../../utils/format';
import './StudentDashboard.css';

export default function StudentDashboard() {
  const { user } = useOutletContext();
  const navigate = useNavigate();

  const { classes: allClasses, enrollments, teachers } = useData();

  const classes = classesForStudent(allClasses, enrollments, teachers, user.id);
  // Assignments and grades are still static — a later step.
  const assignments = studentAssignments;
  const grades = studentGrades;

  const pending = assignments.filter((a) => a.status === 'pending');
  const average =
    grades.length > 0
      ? Math.round(grades.reduce((sum, g) => sum + (g.score / g.max) * 100, 0) / grades.length)
      : null;

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Welcome back, {user.name}.</p>
        </div>
      </div>

      <div className="stats-grid">
        <StatCard label="Enrolled classes" value={classes.length} icon="classes" />
        <StatCard
          label="Assignments to submit"
          value={pending.length}
          icon="assignments"
          hint={pending[0] ? `Next: ${dueLabel(pending[0].dueAt).toLowerCase()}` : 'All caught up'}
        />
        <StatCard
          label="Average grade"
          value={average === null ? '—' : `${average}%`}
          icon="grades"
          hint={`Based on ${grades.length} graded assignments`}
        />
      </div>

      <section className="section">
        <div className="section-header">
          <h2 className="section-title">My Classes</h2>
          <Link to="/student/classes" className="section-link">View all classes</Link>
        </div>

        {classes.length === 0 ? (
          <div className="panel">
            <div className="empty">You're not enrolled in any class yet. Your teacher will add you.</div>
          </div>
        ) : (
          <div className="card-grid">
            {classes.map((cls) => (
              <ClassCard
                key={cls.id}
                name={cls.name}
                section={cls.section}
                meta={`Teacher: ${cls.teacherName}`}
                onOpen={() => navigate(`/student/classes/${cls.id}`)}
              />
            ))}
          </div>
        )}
      </section>

      <div className="two-col">
        <section className="section">
          <div className="section-header">
            <h2 className="section-title">Upcoming assignments</h2>
            <Link to="/student/assignments" className="section-link">View all</Link>
          </div>
          <div className="panel">
            <div className="panel-body">
              {assignments.length === 0 ? (
                <div className="empty">Nothing due right now.</div>
              ) : (
                <ul className="list">
                  {assignments.map((assignment) => (
                    <li key={assignment.id} className="list-item">
                      <span className="list-dot" />
                      <div className="list-main">
                        <div className="list-title">{assignment.title}</div>
                        <div className="list-meta">{assignment.className}</div>
                      </div>
                      <span className={`badge ${assignment.status === 'pending' ? 'badge-accent' : 'badge-muted'}`}>
                        {assignment.status === 'pending' ? dueLabel(assignment.dueAt) : 'Submitted'}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>

        <div>
          <section className="section">
            <div className="section-header">
              <h2 className="section-title">Recent grades</h2>
              <Link to="/student/grades" className="section-link">View all</Link>
            </div>
            <div className="panel">
              <div className="panel-body">
                <ul className="list">
                  {grades.map((grade) => (
                    <li key={grade.id} className="list-item">
                      <div className="list-main">
                        <div className="list-title">{grade.title}</div>
                        <div className="list-meta">{grade.className}</div>
                      </div>
                      <span className="grade-score mono">
                        {grade.score}<span className="grade-max">/{grade.max}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          <section className="section">
            <div className="section-header">
              <h2 className="section-title">Recent activity</h2>
            </div>
            <div className="panel">
              <div className="panel-body">
                <ul className="list">
                  {studentActivity.map((event) => (
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
      </div>
    </>
  );
}
