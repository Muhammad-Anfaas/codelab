import { useState } from 'react';
import { isValidEmail } from '../utils/validate';

/**
 * Name + email form, used to invite a teacher (admin) or a student (teacher).
 *
 * Props
 *  - submitLabel: text on the submit button
 *  - onSubmit({ name, email }): called only when the form is valid
 *  - onCancel
 *  - validate({ name, email }) -> { field: message } | null
 *      optional extra checks from the parent (e.g. "email already used")
 */
export default function InviteForm({ submitLabel = 'Send invitation', onSubmit, onCancel, validate }) {
  const [values, setValues] = useState({ name: '', email: '' });
  const [errors, setErrors] = useState({});

  function handleChange(event) {
    const { name, value } = event.target;
    setValues((prev) => ({ ...prev, [name]: value }));
  }

  function handleSubmit(event) {
    event.preventDefault();

    const cleaned = { name: values.name.trim(), email: values.email.trim().toLowerCase() };
    const nextErrors = {};
    if (!cleaned.name) nextErrors.name = 'Name is required.';
    if (!cleaned.email) nextErrors.email = 'Email is required.';
    else if (!isValidEmail(cleaned.email)) nextErrors.email = 'Enter a valid email address.';
    Object.assign(nextErrors, validate?.(cleaned) ?? {});

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    onSubmit(cleaned);
  }

  return (
    <form className="form" onSubmit={handleSubmit} noValidate>
      <div className="form-field">
        <label className="form-label" htmlFor="invite-name">Full name</label>
        <input
          id="invite-name"
          name="name"
          className="form-input"
          value={values.name}
          onChange={handleChange}
          placeholder="Behram Shah"
          aria-invalid={Boolean(errors.name)}
        />
        {errors.name && <span className="form-error">{errors.name}</span>}
      </div>

      <div className="form-field">
        <label className="form-label" htmlFor="invite-email">Email address</label>
        <input
          id="invite-email"
          name="email"
          type="email"
          className="form-input"
          value={values.email}
          onChange={handleChange}
          placeholder="behram.shah@gmail.com"
          autoComplete="off"
          aria-invalid={Boolean(errors.email)}
        />
        {errors.email && <span className="form-error">{errors.email}</span>}
        <span className="form-help">
          This becomes their username. They'll receive a temporary password by email.
        </span>
      </div>

      <div className="form-actions">
        <button type="button" className="btn btn-outline" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn btn-primary">{submitLabel}</button>
      </div>
    </form>
  );
}
