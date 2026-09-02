import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import { useData } from '../../data/useData';
import { dueLabel, formatDate } from '../../utils/format';

import './StudentAssignments.css';

export default function StudentAssignments() {
  const navigate = useNavigate();
  const { assignments, assignmentQuestions, classes } = useData();

  const rows = useMemo(() => assignments.map((assignment) => ({
    ...assignment,
    className: classes.find((cls) => cls.id === assignment.classId)?.name
      || 'Class',
    questionCount: assignmentQuestions.filter(
      (question) => question.assignmentId === assignment.id,
    ).length,
  })), [assignmentQuestions, assignments, classes]);

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Coding assignments</h1>
          <p className="page-subtitle">
            Start an assessment only when you are ready to enter fullscreen.
          </p>
        </div>
      </div>

      <div className="student-assignment-grid">
        {rows.length === 0 ? (
          <div className="panel"><div className="empty">No assignments are available.</div></div>
        ) : rows.map((assignment) => {
          const ready = assignment.questionCount >= 6;
          return (
            <article className="student-assignment-card" key={assignment.id}>
              <div>
                <span className="badge badge-accent">{assignment.className}</span>
                <h2>{assignment.title}</h2>
                <p>{assignment.description || 'Coding assessment'}</p>
              </div>
              <dl>
                <div><dt>Questions</dt><dd>{assignment.questionCount}</dd></div>
                <div><dt>Duration</dt><dd>{assignment.durationMinutes || 'Until due'}{assignment.durationMinutes ? ' min' : ''}</dd></div>
                <div><dt>Due</dt><dd>{formatDate(assignment.dueAt)}</dd></div>
              </dl>
              <div className="student-assignment-footer">
                <span>{dueLabel(assignment.dueAt)}</span>
                <button type="button" className="btn btn-primary"
                  disabled={!ready}
                  onClick={() => navigate(`/student/assignments/${assignment.id}/code`)}>
                  {ready ? 'Open assignment' : 'Setup incomplete'}
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}
