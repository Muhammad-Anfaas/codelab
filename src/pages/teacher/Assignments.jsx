import { useMemo, useState } from 'react';

import ConfirmDialog from '../../components/ConfirmDialog';
import DataTable from '../../components/DataTable';
import Icon from '../../components/Icon';
import Modal from '../../components/Modal';
import Notice from '../../components/Notice';
import { classesByTeacher } from '../../data/selectors';
import { useData } from '../../data/useData';
import { dueLabel, formatDate } from '../../utils/format';
import AssignmentForm from './AssignmentForm';

import './Assignments.css';

function statusLabel(status) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export default function Assignments() {
  const {
    assignments,
    classes,
    currentTeacherId,
    loadingAssignments,
    createAssignment,
    updateAssignment,
    updateAssignmentStatus,
    deleteAssignment,
  } = useData();

  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [notice, setNotice] = useState(null);

  const myClasses = useMemo(
    () => classesByTeacher(classes, currentTeacherId),
    [classes, currentTeacherId],
  );

  const myClassIds = useMemo(
    () => new Set(myClasses.map((cls) => cls.id)),
    [myClasses],
  );

  const rows = useMemo(
    () => assignments
      .filter((assignment) => myClassIds.has(assignment.classId))
      .map((assignment) => ({
        ...assignment,
        className: myClasses.find(
          (cls) => cls.id === assignment.classId,
        )?.name || 'Unknown class',
      })),
    [assignments, myClasses, myClassIds],
  );

  async function runAction(action, successMessage) {
    try {
      setNotice(null);
      await action();
      setNotice({ tone: 'info', message: successMessage });
      return true;
    } catch (error) {
      console.error('Assignment action failed:', error);
      setNotice({
        tone: 'error',
        message: error.message || 'Assignment action failed.',
      });
      return false;
    }
  }

  async function handleCreate(values) {
    const succeeded = await runAction(
      () => createAssignment(values),
      `Created “${values.title}”.`,
    );
    if (succeeded) setShowCreate(false);
  }

  async function handleUpdate(values) {
    const succeeded = await runAction(
      () => updateAssignment(editing.id, values),
      `Updated “${values.title}”.`,
    );
    if (succeeded) setEditing(null);
  }

  async function handleDelete() {
    const assignment = deleting;
    const succeeded = await runAction(
      () => deleteAssignment(assignment.id),
      `Deleted “${assignment.title}”.`,
    );
    if (succeeded) setDeleting(null);
  }

  const columns = [
    {
      key: 'title',
      label: 'Assignment',
      render: (assignment) => (
        <div>
          <div className="assignment-title">{assignment.title}</div>
          <div className="assignment-meta">
            {assignment.maxScore} points · Created {formatDate(assignment.createdAt)}
          </div>
        </div>
      ),
    },
    {
      key: 'className',
      label: 'Class',
    },
    {
      key: 'dueAt',
      label: 'Due',
      render: (assignment) => (
        <div>
          <div>{formatDate(assignment.dueAt)}</div>
          <div className="assignment-meta">{dueLabel(assignment.dueAt)}</div>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (assignment) => (
        <span
          className={`badge ${
            assignment.status === 'published'
              ? 'badge-accent'
              : 'badge-muted'
          }`}
        >
          {statusLabel(assignment.status)}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (assignment) => (
        <div className="assignment-actions">
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setEditing(assignment)}
          >
            Edit
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => runAction(
              () => updateAssignmentStatus(
                assignment.id,
                assignment.status === 'published' ? 'draft' : 'published',
              ),
              assignment.status === 'published'
                ? `Moved “${assignment.title}” to drafts.`
                : `Published “${assignment.title}”.`,
            )}
          >
            {assignment.status === 'published' ? 'Unpublish' : 'Publish'}
          </button>
          <button
            type="button"
            className="btn btn-ghost-danger btn-sm"
            onClick={() => setDeleting(assignment)}
          >
            Delete
          </button>
        </div>
      ),
    },
  ];

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Assignments</h1>
          <p className="page-subtitle">
            Create, publish, and manage work for your classes.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setShowCreate(true)}
          disabled={myClasses.length === 0}
        >
          <Icon name="plus" size={16} />
          Create assignment
        </button>
      </div>

      {notice && (
        <Notice
          tone={notice.tone}
          onDismiss={() => setNotice(null)}
        >
          {notice.message}
        </Notice>
      )}

      {myClasses.length === 0 ? (
        <div className="panel">
          <div className="empty">
            Create a class before adding assignments.
          </div>
        </div>
      ) : (
        <div className="panel">
          <DataTable
            columns={columns}
            rows={rows}
            emptyMessage={
              loadingAssignments
                ? 'Loading assignments…'
                : 'No assignments yet. Create your first assignment.'
            }
          />
        </div>
      )}

      {showCreate && (
        <Modal
          title="Create assignment"
          onClose={() => setShowCreate(false)}
        >
          <AssignmentForm
            classes={myClasses}
            onSubmit={handleCreate}
            onCancel={() => setShowCreate(false)}
          />
        </Modal>
      )}

      {editing && (
        <Modal
          title="Edit assignment"
          onClose={() => setEditing(null)}
        >
          <AssignmentForm
            key={editing.id}
            classes={myClasses}
            assignment={editing}
            onSubmit={handleUpdate}
            onCancel={() => setEditing(null)}
          />
        </Modal>
      )}

      {deleting && (
        <ConfirmDialog
          title="Delete assignment"
          message={`Delete “${deleting.title}”? This cannot be undone.`}
          confirmLabel="Delete assignment"
          danger
          onConfirm={handleDelete}
          onCancel={() => setDeleting(null)}
        />
      )}
    </>
  );
}
