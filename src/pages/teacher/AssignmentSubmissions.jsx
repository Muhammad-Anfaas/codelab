import Editor from '@monaco-editor/react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { useData } from '../../data/useData';
import { supabase } from '../../lib/supabase';
import { formatDate } from '../../utils/format';

import './AssignmentSubmissions.css';

export default function AssignmentSubmissions() {
  const { assignmentId } = useParams();
  const {
    assignments,
    assignmentQuestions,
    students,
    enrollments,
  } = useData();
  const [attempts, setAttempts] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [events, setEvents] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [activeQuestionId, setActiveQuestionId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const assignment = assignments.find((item) => item.id === assignmentId);
  const questions = assignmentQuestions.filter(
    (question) => question.assignmentId === assignmentId,
  );

  useEffect(() => {
    let cancelled = false;
    async function loadSubmissions() {
      setLoading(true);
      const attemptsResponse = await supabase
        .from('assignment_attempts')
        .select('*')
        .eq('assignment_id', assignmentId)
        .order('started_at', { ascending: false });
      if (cancelled) return;
      if (attemptsResponse.error) {
        setError(attemptsResponse.error.message);
        setLoading(false);
        return;
      }
      const loadedAttempts = attemptsResponse.data || [];
      setAttempts(loadedAttempts);
      if (loadedAttempts.length === 0) {
        setAnswers([]);
        setEvents([]);
        setLoading(false);
        return;
      }
      const attemptIds = loadedAttempts.map((attempt) => attempt.id);
      const [answersResponse, eventsResponse] = await Promise.all([
        supabase.from('submission_answers').select('*').in('attempt_id', attemptIds),
        supabase.from('integrity_events').select('*')
          .in('attempt_id', attemptIds).order('received_at', { ascending: false }),
      ]);
      if (cancelled) return;
      if (answersResponse.error || eventsResponse.error) {
        setError((answersResponse.error || eventsResponse.error).message);
      } else {
        setAnswers(answersResponse.data || []);
        setEvents(eventsResponse.data || []);
      }
      setLoading(false);
    }
    loadSubmissions();
    return () => { cancelled = true; };
  }, [assignmentId]);

  const roster = useMemo(() => enrollments
    .filter((enrollment) => enrollment.classId === assignment?.classId)
    .map((enrollment) => {
      const student = students.find((item) => item.id === enrollment.studentId);
      const attempt = attempts.find((item) => item.student_id === enrollment.studentId);
      return student ? { ...student, attempt } : null;
    })
    .filter(Boolean), [assignment?.classId, attempts, enrollments, students]);

  const selectedStudent = roster.find((student) => student.id === selectedStudentId);
  const selectedAttempt = selectedStudent?.attempt;
  const activeQuestion = questions.find((question) => question.id === activeQuestionId)
    || questions[0];
  const activeAnswer = answers.find(
    (answer) => answer.attempt_id === selectedAttempt?.id
      && answer.question_id === activeQuestion?.id,
  );
  const selectedEvents = events.filter(
    (event) => event.attempt_id === selectedAttempt?.id,
  );

  function selectStudent(student) {
    setSelectedStudentId(student.id);
    setActiveQuestionId(questions[0]?.id || null);
  }

  if (!assignment) {
    return <div className="panel"><div className="empty">Assignment not found.</div></div>;
  }

  return (
    <>
      <div className="page-header">
        <div>
          <Link to="/teacher/assignments" className="section-link">Assignments</Link>
          <h1 className="page-title">{assignment.title}</h1>
          <p className="page-subtitle">Student submissions and integrity evidence</p>
        </div>
      </div>

      {error && <div className="coding-error">{error}</div>}
      <div className="submission-review">
        <aside className="submission-roster panel">
          <div className="submission-roster-title">
            <strong>Students</strong><span>{roster.length}</span>
          </div>
          {loading ? <div className="empty">Loading…</div> : roster.map((student) => (
            <button key={student.id} type="button"
              className={student.id === selectedStudentId ? 'active' : ''}
              onClick={() => selectStudent(student)}>
              <span><strong>{student.name}</strong><small>{student.rollNumber}</small></span>
              <span className={`badge ${student.attempt?.status === 'submitted' ? 'badge-accent' : 'badge-muted'}`}>
                {student.attempt?.status?.replace('_', ' ') || 'Not started'}
              </span>
            </button>
          ))}
        </aside>

        <main className="submission-detail panel">
          {!selectedStudent ? (
            <div className="empty">Select a student to inspect their attempt.</div>
          ) : !selectedAttempt ? (
            <div className="empty">{selectedStudent.name} has not started this assignment.</div>
          ) : (
            <>
              <header className="submission-student-header">
                <div>
                  <h2>{selectedStudent.name}</h2>
                  <span className="mono">{selectedStudent.rollNumber}</span>
                </div>
                <div>
                  <span className="badge badge-muted">{selectedAttempt.status}</span>
                  <span>Started {formatDate(selectedAttempt.started_at)}</span>
                  <span>{selectedEvents.length} integrity events</span>
                </div>
              </header>
              <nav className="submission-question-tabs" aria-label="Submitted questions">
                {questions.map((question, index) => (
                  <button key={question.id} type="button"
                    className={question.id === activeQuestion?.id ? 'active' : ''}
                    onClick={() => setActiveQuestionId(question.id)}>
                    Q{index + 1}
                  </button>
                ))}
              </nav>
              <section className="submission-answer">
                <div className="submission-prompt">
                  <h3>{activeQuestion?.title}</h3>
                  <p>{activeQuestion?.prompt}</p>
                </div>
                <div className="submission-editor">
                  <Editor
                    height="100%"
                    language={activeQuestion?.language || 'plaintext'}
                    value={activeAnswer?.code || '// No saved answer'}
                    theme={document.documentElement.dataset.theme === 'dark' ? 'vs-dark' : 'light'}
                    options={{ readOnly: true, minimap: { enabled: false }, automaticLayout: true }}
                  />
                </div>
              </section>
            </>
          )}
        </main>
      </div>
    </>
  );
}
