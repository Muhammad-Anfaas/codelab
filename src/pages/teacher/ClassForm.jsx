import { useState } from 'react';

/**
 * Create-class form (name + section).
 * `existingClasses` lets it reject a duplicate name/section for this teacher.
 */
export default function ClassForm({ existingClasses = [], onSubmit, onCancel }) {
  const [values, setValues] = useState({ name: '', section: '' });
  const [errors, setErrors] = useState({});

  function handleChange(event) {
    const { name, value } = event.target;
    setValues((prev) => ({ ...prev, [name]: value }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    const cleaned = { name: values.name.trim(), section: values.section.trim().toUpperCase() };
    const nextErrors = {};
    if (!cleaned.name) nextErrors.name = 'Class name is required.';
    if (!cleaned.section) nextErrors.section = 'Section is required.';
    const duplicate = existingClasses.some(
      (c) => c.name.toLowerCase() === cleaned.name.toLowerCase() && c.section === cleaned.section,
    );
    if (duplicate) nextErrors.section = 'You already have this class and section.';

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    onSubmit(cleaned);
  }

  return (
    <form className="form" onSubmit={handleSubmit} noValidate>
      <div className="form-field">
        <label className="form-label" htmlFor="class-name">Class name</label>
        <input
          id="class-name"
          name="name"
          className="form-input"
          value={values.name}
          onChange={handleChange}
          placeholder="e.g. Programming Fundamentals - Lab"
          aria-invalid={Boolean(errors.name)}
        />
        {errors.name && <span className="form-error">{errors.name}</span>}
      </div>

      <div className="form-field">
        <label className="form-label" htmlFor="class-section">Section</label>
        <input
          id="class-section"
          name="section"
          className="form-input"
          value={values.section}
          onChange={handleChange}
          placeholder="e.g. 1-D"
          maxLength={5}
          aria-invalid={Boolean(errors.section)}
        />
        {errors.section && <span className="form-error">{errors.section}</span>}
      </div>

      <div className="form-actions">
        <button type="button" className="btn btn-outline" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn btn-primary">Create class</button>
      </div>
    </form>
  );
}
