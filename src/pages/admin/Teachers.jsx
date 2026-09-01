import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import DataTable from '../../components/DataTable';
import Modal from '../../components/Modal';
import ConfirmDialog from '../../components/ConfirmDialog';
import InviteForm from '../../components/InviteForm';
import Notice from '../../components/Notice';
import Icon from '../../components/Icon';
import { useData } from '../../data/useData';
import { classCountByTeacher, newestFirst } from '../../data/selectors';
import { formatDate } from '../../utils/format';

export default function Teachers() {
  const { teachers, classes, addTeacher, removeTeacher } = useData();
  const location = useLocation();

  // The dashboard's "Add teacher" button navigates here with state so the
  // form opens immediately.
  const [showAdd, setShowAdd] = useState(Boolean(location.state?.openAdd));
  const [pendingRemove, setPendingRemove] = useState(null); // teacher awaiting confirmation
  const [notice, setNotice] = useState(null); // { tone, text }

  const rows = newestFirst(teachers).map((t) => ({
    ...t,
    classCount: classCountByTeacher(classes, t.id),
  }));

 async function handleAdd(values) {
  try {
    setNotice(null);

    const teacher = await addTeacher(values);

    setShowAdd(false);

    setNotice({
      tone: 'info',
      text: `Teacher created successfully. Temporary password: ${teacher.temporaryPassword}`,
    });
  } catch (error) {
    setNotice({
      tone: 'error',
      text: error.message || 'Failed to create teacher.',
    });
  }
}

  function handleRemove() {
    const error = removeTeacher(pendingRemove.id);
    setNotice(
      error
        ? { tone: 'error', text: error }
        : { tone: 'info', text: `${pendingRemove.name} was removed.` },
    );
    setPendingRemove(null);
  }

  const columns = [
    { key: 'name', label: 'Name', render: (t) => <span className="nowrap">{t.name}</span> },
    { key: 'email', label: 'Email' },
    { key: 'classCount', label: 'Classes', render: (t) => <span className="mono">{t.classCount}</span> },
    { key: 'createdAt', label: 'Added', render: (t) => <span className="mono nowrap">{formatDate(t.createdAt)}</span> },
    {
      key: 'status',
      label: 'Status',
      render: (t) => (
        <span className={`badge ${t.mustChangePassword ? 'badge-muted' : 'badge-accent'}`}>
          {t.mustChangePassword ? 'Invited' : 'Active'}
        </span>
      ),
    },
    {
      key: 'actions',
      label: '',
      render: (t) => (
        <button type="button" className="btn btn-ghost-danger btn-sm" onClick={() => setPendingRemove(t)}>
          <Icon name="trash" size={15} />
          Remove
        </button>
      ),
    },
  ];

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Teachers</h1>
          <p className="page-subtitle">
            {teachers.length} teacher{teachers.length === 1 ? '' : 's'} on the platform.
          </p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setShowAdd(true)}>
          <Icon name="plus" size={16} />
          Add teacher
        </button>
      </div>

      {notice && (
        <Notice tone={notice.tone} onDismiss={() => setNotice(null)}>
          {notice.text}
        </Notice>
      )}

      <div className="panel">
        <DataTable columns={columns} rows={rows} emptyMessage="No teachers yet. Add the first one." />
      </div>

      {showAdd && (
        <Modal title="Add teacher" onClose={() => setShowAdd(false)}>
          <InviteForm
            submitLabel="Send invitation"
            onSubmit={handleAdd}
            onCancel={() => setShowAdd(false)}
            validate={(v) =>
              teachers.some((t) => t.email === v.email)
                ? { email: 'A teacher with this email already exists.' }
                : null
            }
          />
        </Modal>
      )}

      {pendingRemove && (
        <ConfirmDialog
          title="Remove teacher"
          message={`Remove ${pendingRemove.name} (${pendingRemove.email})? They will lose access to Codelab.`}
          confirmLabel="Remove"
          danger
          onConfirm={handleRemove}
          onCancel={() => setPendingRemove(null)}
        />
      )}
    </>
  );
}
