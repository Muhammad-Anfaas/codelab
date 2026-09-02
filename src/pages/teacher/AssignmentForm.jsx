import { useState } from 'react';

const languages = [
  ['python', 'Python'],
  ['javascript', 'JavaScript'],
  ['typescript', 'TypeScript'],
  ['java', 'Java'],
  ['cpp', 'C++'],
  ['csharp', 'C#'],
  ['go', 'Go'],
  ['rust', 'Rust'],
];

function toLocalDateTime(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function blankQuestion(position) {
  return {
    position,
    title: '',
    prompt: '',
    language: 'python',
    starterCode: '',
    maxScore: 10,
  };
}

export default function AssignmentForm({
  classes,
  assignment = null,
  questions = [],
  onSubmit,
  onCancel,
}) {
  const [values, setValues] = useState({
    classId: assignment?.classId || classes[0]?.id || '',
    title: assignment?.title || '',
    description: assignment?.description || '',
    dueAt: toLocalDateTime(assignment?.dueAt),
    availableFrom: toLocalDateTime(assignment?.availableFrom),
    durationMinutes: assignment?.durationMinutes ?? 120,
    status: assignment?.status || 'draft',
    fullscreenRequired: assignment?.fullscreenRequired ?? true,
    restrictClipboard: assignment?.restrictClipboard ?? true,
    maxFocusLosses: assignment?.maxFocusLosses ?? 5,
    questions: questions.length > 0
      ? questions.map((question) => ({ ...question }))
      : Array.from({ length: 6 }, (_, index) => blankQuestion(index + 1)),
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  function handleChange(event) {
    const { name, type, checked, value } = event.target;
    setValues((previous) => ({
      ...previous,
      [name]: type === 'checkbox' ? checked : value,
    }));
  }

  function updateQuestion(index, field, value) {
    setValues((previous) => ({
      ...previous,
      questions: previous.questions.map((question, questionIndex) => (
        questionIndex === index ? { ...question, [field]: value } : question
      )),
    }));
  }

  function addQuestion() {
    setValues((previous) => ({
      ...previous,
      questions: previous.questions.length >= 7
        ? previous.questions
        : [
            ...previous.questions,
            blankQuestion(previous.questions.length + 1),
          ],
    }));
  }

  function removeQuestion(index) {
    setValues((previous) => ({
      ...previous,
      questions: previous.questions
        .filter((_, questionIndex) => questionIndex !== index)
        .map((question, questionIndex) => ({
          ...question,
          position: questionIndex + 1,
        })),
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const nextErrors = {};
    const dueAt = new Date(values.dueAt);
    const availableFrom = values.availableFrom
      ? new Date(values.availableFrom)
      : null;
    const duration = Number(values.durationMinutes);
    const maxFocusLosses = Number(values.maxFocusLosses);

    if (!values.classId) nextErrors.classId = 'Choose a class.';
    if (!values.title.trim()) nextErrors.title = 'Title is required.';
    if (!values.dueAt || Number.isNaN(dueAt.getTime())) {
      nextErrors.dueAt = 'Choose a valid due date and time.';
    }
    if (availableFrom && availableFrom >= dueAt) {
      nextErrors.availableFrom = 'Availability must begin before the due date.';
    }
    if (!Number.isInteger(duration) || duration < 5 || duration > 480) {
      nextErrors.durationMinutes = 'Duration must be 5–480 minutes.';
    }
    if (
      !Number.isInteger(maxFocusLosses)
      || maxFocusLosses < 0
      || maxFocusLosses > 100
    ) {
      nextErrors.maxFocusLosses = 'Use a value from 0–100.';
    }
    if (
      ['published', 'closed'].includes(values.status)
      && (values.questions.length < 6 || values.questions.length > 7)
    ) {
      nextErrors.questions = 'Published assignments require 6 or 7 questions.';
    }

    values.questions.forEach((question, index) => {
      if (!question.title.trim() || !question.prompt.trim()) {
        nextErrors.questions = `Question ${index + 1} needs a title and prompt.`;
      }
      const score = Number(question.maxScore);
      if (!Number.isFinite(score) || score <= 0 || score > 10000) {
        nextErrors.questions = `Question ${index + 1} has invalid points.`;
      }
    });

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    try {
      const normalizedQuestions = values.questions.map((question) => ({
        ...question,
        title: question.title.trim(),
        prompt: question.prompt.trim(),
        starterCode: question.starterCode.trimEnd(),
        maxScore: Number(question.maxScore),
      }));
      await onSubmit({
        ...values,
        title: values.title.trim(),
        description: values.description.trim(),
        dueAt: dueAt.toISOString(),
        availableFrom: availableFrom?.toISOString() || null,
        durationMinutes: duration,
        maxFocusLosses,
        maxScore: normalizedQuestions.reduce(
          (total, question) => total + question.maxScore,
          0,
        ),
        questions: normalizedQuestions,
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="form assignment-form" onSubmit={handleSubmit} noValidate>
      <div className="form-field">
        <label className="form-label" htmlFor="assignment-class">Class</label>
        <select id="assignment-class" name="classId" className="form-input"
          value={values.classId} onChange={handleChange}
          aria-invalid={Boolean(errors.classId)} disabled={submitting}>
          <option value="">Choose a class</option>
          {classes.map((cls) => (
            <option key={cls.id} value={cls.id}>
              {cls.name} — Section {cls.section}
            </option>
          ))}
        </select>
        {errors.classId && <span className="form-error">{errors.classId}</span>}
      </div>

      <div className="form-field">
        <label className="form-label" htmlFor="assignment-title">Title</label>
        <input id="assignment-title" name="title" className="form-input"
          value={values.title} onChange={handleChange} maxLength={160}
          placeholder="e.g. Programming fundamentals assessment"
          aria-invalid={Boolean(errors.title)} disabled={submitting} />
        {errors.title && <span className="form-error">{errors.title}</span>}
      </div>

      <div className="form-field">
        <label className="form-label" htmlFor="assignment-description">Overview</label>
        <textarea id="assignment-description" name="description"
          className="form-input assignment-description" value={values.description}
          onChange={handleChange} rows={3} disabled={submitting}
          placeholder="Instructions that apply to the whole assessment." />
      </div>

      <div className="form-row">
        <div className="form-field">
          <label className="form-label" htmlFor="assignment-available-from">Available from</label>
          <input id="assignment-available-from" name="availableFrom"
            type="datetime-local" className="form-input"
            value={values.availableFrom} onChange={handleChange}
            aria-invalid={Boolean(errors.availableFrom)} disabled={submitting} />
          {errors.availableFrom && <span className="form-error">{errors.availableFrom}</span>}
        </div>
        <div className="form-field">
          <label className="form-label" htmlFor="assignment-due-at">Due date</label>
          <input id="assignment-due-at" name="dueAt" type="datetime-local"
            className="form-input" value={values.dueAt} onChange={handleChange}
            aria-invalid={Boolean(errors.dueAt)} disabled={submitting} />
          {errors.dueAt && <span className="form-error">{errors.dueAt}</span>}
        </div>
      </div>

      <div className="form-row">
        <div className="form-field">
          <label className="form-label" htmlFor="assignment-duration">Duration (minutes)</label>
          <input id="assignment-duration" name="durationMinutes" type="number"
            min="5" max="480" className="form-input"
            value={values.durationMinutes} onChange={handleChange}
            aria-invalid={Boolean(errors.durationMinutes)} disabled={submitting} />
          {errors.durationMinutes && <span className="form-error">{errors.durationMinutes}</span>}
        </div>
        <div className="form-field">
          <label className="form-label" htmlFor="assignment-focus-losses">Focus-loss threshold</label>
          <input id="assignment-focus-losses" name="maxFocusLosses" type="number"
            min="0" max="100" className="form-input"
            value={values.maxFocusLosses} onChange={handleChange}
            aria-invalid={Boolean(errors.maxFocusLosses)} disabled={submitting} />
          {errors.maxFocusLosses && <span className="form-error">{errors.maxFocusLosses}</span>}
        </div>
      </div>

      <div className="integrity-options">
        <label><input type="checkbox" name="fullscreenRequired"
          checked={values.fullscreenRequired} onChange={handleChange}
          disabled={submitting} /> Require fullscreen</label>
        <label><input type="checkbox" name="restrictClipboard"
          checked={values.restrictClipboard} onChange={handleChange}
          disabled={submitting} /> Block clipboard, drag/drop, and context menu</label>
      </div>

      <div className="question-builder-header">
        <div>
          <h3>Coding questions</h3>
          <p>Published assessments must contain 6 or 7 questions.</p>
        </div>
        <button type="button" className="btn btn-outline btn-sm"
          onClick={addQuestion} disabled={submitting || values.questions.length >= 7}>
          Add question
        </button>
      </div>
      {errors.questions && <span className="form-error">{errors.questions}</span>}

      {values.questions.map((question, index) => (
        <section className="question-editor-card" key={question.id || index}>
          <div className="question-editor-heading">
            <strong>Question {index + 1}</strong>
            <button type="button" className="btn btn-ghost-danger btn-sm"
              onClick={() => removeQuestion(index)}
              disabled={submitting || values.questions.length === 1}>
              Remove
            </button>
          </div>
          <div className="form-row">
            <input className="form-input" aria-label={`Question ${index + 1} title`}
              placeholder="Question title" value={question.title}
              onChange={(event) => updateQuestion(index, 'title', event.target.value)} />
            <select className="form-input" aria-label={`Question ${index + 1} language`}
              value={question.language}
              onChange={(event) => updateQuestion(index, 'language', event.target.value)}>
              {languages.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <textarea className="form-input" rows={4}
            aria-label={`Question ${index + 1} prompt`} placeholder="Problem statement"
            value={question.prompt}
            onChange={(event) => updateQuestion(index, 'prompt', event.target.value)} />
          <textarea className="form-input mono" rows={4}
            aria-label={`Question ${index + 1} starter code`} placeholder="Optional starter code"
            value={question.starterCode}
            onChange={(event) => updateQuestion(index, 'starterCode', event.target.value)} />
          <div className="question-points">
            <label className="form-label" htmlFor={`question-${index}-score`}>Points</label>
            <input id={`question-${index}-score`} className="form-input" type="number"
              min="0.01" max="10000" step="0.01" value={question.maxScore}
              onChange={(event) => updateQuestion(index, 'maxScore', event.target.value)} />
          </div>
        </section>
      ))}

      <div className="form-field">
        <label className="form-label" htmlFor="assignment-status">Status</label>
        <select id="assignment-status" name="status" className="form-input"
          value={values.status} onChange={handleChange} disabled={submitting}>
          <option value="draft">Save as draft</option>
          <option value="published">Publish to students</option>
          <option value="closed">Closed</option>
        </select>
      </div>

      <div className="form-actions">
        <button type="button" className="btn btn-outline" onClick={onCancel}
          disabled={submitting}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? 'Saving…' : assignment ? 'Save changes' : 'Create assignment'}
        </button>
      </div>
    </form>
  );
}
