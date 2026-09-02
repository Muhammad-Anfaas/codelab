import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import DataTable from '../../components/DataTable';
import ConfirmDialog from '../../components/ConfirmDialog';
import Notice from '../../components/Notice';
import Icon from '../../components/Icon';
import StudentImportModal from '../../components/StudentImportModal';
import { useData } from '../../data/useData';
import { studentsInClass } from '../../data/selectors';
import { formatDate } from '../../utils/format';
import './ClassDetails.css';

export default function ClassDetails() {
  const { classId } = useParams();
  const {
    classes,
    students,
    enrollments,
    currentTeacherId,
    loadingRoster,
    importStudents,
    removeStudentFromClass,
  } = useData();

  const [showImport, setShowImport] = useState(false);
  const [pendingRemove, setPendingRemove] = useState(null);
  const [notice, setNotice] = useState(null);

  // Class IDs are Supabase UUID strings. RLS remains the security boundary;
  // this ownership check keeps the UI from exposing another teacher's class.
  const cls = classes.find(
    (candidate) =>
      candidate.id === classId &&
      candidate.teacherId === currentTeacherId,
  );

  if (!cls) {
    return (
      <>
        <div className="page-header">
          <div>
            <h1 className="page-title">Class not found</h1>
            <p className="page-subtitle">It may have been removed, or it belongs to another teacher.</p>
          </div>
        </div>
        <Link to="/teacher/classes" className="btn btn-outline">
          <Icon name="arrow-left" size={16} />
          Back to My Classes
        </Link>
      </>
    );
  }

  const roster = studentsInClass(students, enrollments, cls.id);

  async function handleImport(values) {
    const result = await importStudents(cls.id, values);
    const summary = result.summary;

    setShowImport(false);
    setNotice({
      tone: summary.failed > 0 ? 'error' : 'info',
      text:
        `Import complete: ${summary.created} account${summary.created === 1 ? '' : 's'} created, ` +
        `${summary.enrolled} enrollment${summary.enrolled === 1 ? '' : 's'} added, ` +
        `${summary.alreadyEnrolled} already enrolled, ` +
        `${summary.failed} failed.`,
    });
  }

  async function handleRemove() {
    try {
      await removeStudentFromClass(
        cls.id,
        pendingRemove.id,
      );
      setNotice({
        tone: 'info',
        text: `${pendingRemove.name} was removed from ${cls.name}.`,
      });
      setPendingRemove(null);
    } catch (error) {
      setNotice({
        tone: 'error',
        text:
          error.message ||
          'The student could not be removed from this class.',
      });
    }
  }

  const columns = [
    {
      key: 'rollNumber',
      label: 'Roll number',
      render: (student) => (
        <span className="mono nowrap">{student.rollNumber}</span>
      ),
    },
    { key: 'name', label: 'Name', render: (s) => <span className="nowrap">{s.name}</span> },
    { key: 'email', label: 'Email' },
    { key: 'joinedAt', label: 'Joined', render: (s) => <span className="mono nowrap">{formatDate(s.joinedAt)}</span> },
    {
      key: 'status',
      label: 'Status',
      render: (s) => (
        <span className={`badge ${s.mustChangePassword ? 'badge-muted' : 'badge-accent'}`}>
          {s.mustChangePassword ? 'Invited' : 'Active'}
        </span>
      ),
    },
    {
      key: 'actions',
      label: '',
      render: (s) => (
        <button type="button" className="btn btn-ghost-danger btn-sm" onClick={() => setPendingRemove(s)}>
          <Icon name="trash" size={15} />
          Remove
        </button>
      ),
    },
  ];

  return (
    <>
      <Link to="/teacher/classes" className="back-link">
        <Icon name="arrow-left" size={16} />
        My Classes
      </Link>

      <div className="page-header">
        <div>
          <h1 className="page-title">{cls.name}</h1>
          <p className="page-subtitle">
            <span className="badge badge-accent">Section {cls.section}</span>
            <span className="page-subtitle-sep">·</span>
            {roster.length} student{roster.length === 1 ? '' : 's'}
          </p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setShowImport(true)}>
          <Icon name="plus" size={16} />
          Import CSV
        </button>
      </div>

      {notice && (
        <Notice
          tone={notice.tone}
          onDismiss={() => setNotice(null)}
        >
          {notice.text}
        </Notice>
      )}

      <section className="section">
        <div className="section-header">
          <h2 className="section-title">Students</h2>
        </div>
        <div className="panel">
          <DataTable
            columns={columns}
            rows={roster}
            emptyMessage={
              loadingRoster
                ? 'Loading students…'
                : 'No students yet. Import a CSV to add the first roster.'
            }
          />
        </div>
      </section>

      {showImport && (
        <StudentImportModal
          classSection={cls.section}
          onImport={handleImport}
          onCancel={() => setShowImport(false)}
        />
      )}

      {pendingRemove && (
        <ConfirmDialog
          title="Remove student"
          message={`Remove ${pendingRemove.name} from ${cls.name}? Their account stays; they just leave this class.`}
          confirmLabel="Remove"
          danger
          onConfirm={handleRemove}
          onCancel={() => setPendingRemove(null)}
        />
      )}
    </>
  );
}
