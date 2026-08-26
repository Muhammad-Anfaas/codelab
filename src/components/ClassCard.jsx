import './ClassCard.css';

/**
 * A class shown on the teacher and student dashboards.
 *
 * Props
 *  - name:        "Programming Fundamentals"
 *  - section:     "A"
 *  - meta:        one line of context: "42 students" or "Teacher: Ahmed Raza"
 *  - buttonLabel: defaults to "Open Class"
 *  - onOpen:      click handler for the button
 */
export default function ClassCard({ name, section, meta, buttonLabel = 'Open Class', onOpen }) {
  return (
    <article className="class-card">
      <h3 className="class-card-title">{name}</h3>
      <div className="class-card-details">
        <span className="badge badge-accent">Section {section}</span>
        {meta && <span className="class-card-meta">{meta}</span>}
      </div>
      <div className="class-card-footer">
        <button type="button" className="btn btn-primary btn-sm" onClick={onOpen}>
          {buttonLabel}
        </button>
      </div>
    </article>
  );
}
