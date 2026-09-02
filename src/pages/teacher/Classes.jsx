import { useState } from 'react';
import { Link, useLocation, useNavigate, useOutletContext } from 'react-router-dom';
import ClassCard from '../../components/ClassCard';
import Modal from '../../components/Modal';
import Notice from '../../components/Notice';
import Icon from '../../components/Icon';
import ClassForm from './ClassForm';
import { useData } from '../../data/useData';
import { classesByTeacher, studentCountByClass } from '../../data/selectors';

export default function Classes() {
  const { user } = useOutletContext();
  const [currentTeacherId, setCurrentTeacherId] = useState(null);
const {
  classes,
  enrollments,
  createClass,
  currentTeacherId,
} = useData();
  const navigate = useNavigate();
  const location = useLocation();

  const [showCreate, setShowCreate] = useState(Boolean(location.state?.openCreate));
  const [notice, setNotice] = useState(null);

const myClasses = classesByTeacher(
  classes,
  currentTeacherId,
);

async function handleCreate(values) {
  try {
    const cls = await createClass({
      ...values,
      teacherId: currentTeacherId,
    });

    setShowCreate(false);
    setNotice({
      type: 'success',
      class: cls,
    });
  } catch (error) {
    setNotice({
      type: 'error',
      message:
        error.message || 'Failed to create class.',
    });
  }
}
  async function loadCurrentTeacher() {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    setCurrentTeacherId(null);
    return null;
  }

  const { data, error } = await supabase
    .from('teachers')
    .select('id')
    .eq('profile_id', user.id)
    .single();

  if (error) {
    console.error('Failed to load current teacher:', error);
    setCurrentTeacherId(null);
    return null;
  }

  setCurrentTeacherId(data.id);
  return data.id;
}
  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">My Classes</h1>
          <p className="page-subtitle">
            {myClasses.length} class{myClasses.length === 1 ? '' : 'es'}. Open one to manage its students.
          </p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setShowCreate(true)}>
          <Icon name="plus" size={16} />
          Create class
        </button>
      </div>

      {notice && (
        <Notice onDismiss={() => setNotice(null)}>
          Created <strong>{notice.name} — Section {notice.section}</strong>.{' '}
          <Link to={`/teacher/classes/${notice.id}`}>Open it to add students.</Link>
        </Notice>
      )}

      {myClasses.length === 0 ? (
        <div className="panel">
          <div className="empty">You haven't created a class yet. Create one to start adding students.</div>
        </div>
      ) : (
        <div className="card-grid">
          {myClasses.map((cls) => (
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

      {showCreate && (
        <Modal title="Create class" onClose={() => setShowCreate(false)}>
          <ClassForm
            existingClasses={myClasses}
            onSubmit={handleCreate}
            onCancel={() => setShowCreate(false)}
          />
        </Modal>
      )}
    </>
  );
}
