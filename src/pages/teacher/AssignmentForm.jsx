import { useState } from 'react';

function toLocalDateTime(isoString) {
  if (!isoString) return '';

  const date = new Date(isoString);
  const offset = date.getTimezoneOffset() * 60_000;

  return new Date(date.getTime() - offset)
    .toISOString()
    .slice(0, 16);
}

export default function AssignmentForm({
  classes,
  assignment = null,
  onSubmit,
  onCancel,
}) {
  const [values, setValues] = useState({
    classId: assignment?.classId || classes[0]?.id || '',
    title: assignment?.title || '',
    description: assignment?.description || '',
    dueAt: toLocalDateTime(assignment?.dueAt),
    maxScore: assignment?.maxScore ?? 100,
    status: assignment?.status || 'draft',
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;
    setValues((previous) => ({ ...previous, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const cleanTitle = values.title.trim();
    const score = Number(values.maxScore);
    const nextErrors = {};

    if (!values.classId) nextErrors.classId = 'Choose a class.';
    if (!cleanTitle) nextErrors.title = 'Title is required.';
    if (cleanTitle.length > 160) {
      nextErrors.title = 'Use 160 characters or fewer.';
    }
    if (!values.dueAt || Number.isNaN(new Date(values.dueAt).getTime())) {
      nextErrors.dueAt = 'Choose a valid due date and time.';
    }
    if (!Number.isFinite(score) || score <= 0 || score > 10000) {
      nextErrors.maxScore = 'Points must be between 0 and 10,000.';
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);

    try {
      await onSubmit({
        classId: values.classId,
        title: cleanTitle,
        description: values.description.trim(),
        dueAt: new Date(values.dueAt).toISOString(),
        maxScore: score,
        status: values.status,
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="form" onSubmit={handleSubmit} noValidate>
      <div className="form-field">
        <label className="form-label" htmlFor="assignment-class">
          Class
        </label>
        <select
          id="assignment-class"
          name="classId"
          className="form-input"
          value={values.classId}
          onChange={handleChange}
          aria-invalid={Boolean(errors.classId)}
          disabled={submitting}
        >
          <option value="">Choose a class</option>
          {classes.map((cls) => (
            <option key={cls.id} value={cls.id}>
              {cls.name} — Section {cls.section}
            </option>
          ))}
        </select>
        {errors.classId && (
          <span className="form-error">{errors.classId}</span>
        )}
      </div>

      <div className="form-field">
        <label className="form-label" htmlFor="assignment-title">
          Title
        </label>
        <input
          id="assignment-title"
          name="title"
          className="form-input"
          value={values.title}
          onChange={handleChange}
          placeholder="e.g. Lab 1: SQL fundamentals"
          maxLength={160}
          aria-invalid={Boolean(errors.title)}
          disabled={submitting}
        />
        {errors.title && (
          <span className="form-error">{errors.title}</span>
        )}
      </div>

      <div className="form-field">
        <label className="form-label" htmlFor="assignment-description">
          Instructions
        </label>
        <textarea
          id="assignment-description"
          name="description"
          className="form-input assignment-description"
          value={values.description}
          onChange={handleChange}
          placeholder="Describe the work students should submit."
          rows={5}
          disabled={submitting}
        />
      </div>

      <div className="form-row">
        <div className="form-field">
          <label className="form-label" htmlFor="assignment-due-at">
            Due date and time
          </label>
          <input
            id="assignment-due-at"
            name="dueAt"
            type="datetime-local"
            className="form-input"
            value={values.dueAt}
            onChange={handleChange}
            aria-invalid={Boolean(errors.dueAt)}
            disabled={submitting}
          />
          {errors.dueAt && (
            <span className="form-error">{errors.dueAt}</span>
          )}
        </div>

        <div className="form-field">
          <label className="form-label" htmlFor="assignment-max-score">
            Points
          </label>
          <input
            id="assignment-max-score"
            name="maxScore"
            type="number"
            min="0.01"
            max="10000"
            step="0.01"
            className="form-input"
            value={values.maxScore}
            onChange={handleChange}
            aria-invalid={Boolean(errors.maxScore)}
            disabled={submitting}
          />
          {errors.maxScore && (
            <span className="form-error">{errors.maxScore}</span>
          )}
        </div>
      </div>

      <div className="form-field">
        <label className="form-label" htmlFor="assignment-status">
          Visibility
        </label>
        <select
          id="assignment-status"
          name="status"
          className="form-input"
          value={values.status}
          onChange={handleChange}
          disabled={submitting}
        >
          <option value="draft">Save as draft</option>
          <option value="published">Publish to students</option>
          <option value="closed">Closed</option>
        </select>
      </div>

      <div className="form-actions">
        <button
          type="button"
          className="btn btn-outline"
          onClick={onCancel}
          disabled={submitting}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="btn btn-primary"
          disabled={submitting}
        >
          {submitting
            ? 'Saving…'
            : assignment
              ? 'Save changes'
              : 'Create assignment'}
        </button>
      </div>
    </form>
  );
}
