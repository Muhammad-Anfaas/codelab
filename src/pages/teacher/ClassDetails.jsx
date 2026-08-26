import { useState } from 'react';
import { Link, useOutletContext, useParams } from 'react-router-dom';
import DataTable from '../../components/DataTable';
import Modal from '../../components/Modal';
import ConfirmDialog from '../../components/ConfirmDialog';
import InviteForm from '../../components/InviteForm';
import Notice from '../../components/Notice';
import Icon from '../../components/Icon';
import { useData } from '../../data/useData';
import { studentsInClass } from '../../data/selectors';
import { formatDate } from '../../utils/format';
import './ClassDetails.css';

export default function ClassDetails() {
  const { user } = useOutletContext();
  const { classId } = useParams();
  const { classes, students, enrollments, addStudentToClass, removeStudentFromClass } = useData();

  const [showAdd, setShowAdd] = useState(false);
  const [pendingRemove, setPendingRemove] = useState(null);
  const [notice, setNotice] = useState(null);

  // URL params are strings; ids in the store are numbers.
  const id = Number(classId);
  // Only this teacher's classes. (UI convenience — the backend will enforce it.)
  const cls = classes.find((c) => c.id === id && c.teacherId === user.id);

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

  function handleAdd(values) {
    const { student, created } = addStudentToClass(cls.id, values);
    setShowAdd(false);
    setNotice(
      created
        ? `Invitation sent to ${student.email}. (Mock: the backend will generate the temporary password and send the email.)`
        : `${student.name} already had a Codelab account and was added to this class.`,
    );
  }

  function handleRemove() {
    removeStudentFromClass(cls.id, pendingRemove.id);
    setNotice(`${pendingRemove.name} was removed from ${cls.name}.`);
    setPendingRemove(null);
  }

  const columns = [
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
        <button type="button" className="btn btn-primary" onClick={() => setShowAdd(true)}>
          <Icon name="plus" size={16} />
          Add student
        </button>
      </div>

      {notice && <Notice onDismiss={() => setNotice(null)}>{notice}</Notice>}

      <section className="section">
        <div className="section-header">
          <h2 className="section-title">Students</h2>
        </div>
        <div className="panel">
          <DataTable columns={columns} rows={roster} emptyMessage="No students yet. Add the first one." />
        </div>
      </section>

      {showAdd && (
        <Modal title="Add student" onClose={() => setShowAdd(false)}>
          <InviteForm
            submitLabel="Add student"
            onSubmit={handleAdd}
            onCancel={() => setShowAdd(false)}
            validate={(v) =>
              roster.some((s) => s.email === v.email)
                ? { email: 'This student is already in the class.' }
                : null
            }
          />
        </Modal>
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
