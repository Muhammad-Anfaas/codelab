import { useState } from 'react';
import Modal from './Modal';
import {
  STUDENT_CSV_HEADERS,
  validateStudentCsv,
} from '../utils/studentCsv';
import './StudentImportModal.css';

export default function StudentImportModal({
  classSection,
  onImport,
  onCancel,
}) {
  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState([]);
  const [errors, setErrors] = useState([]);
  const [reading, setReading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  async function handleFileChange(event) {
    const file = event.target.files?.[0];

    setFileName(file?.name ?? '');
    setRows([]);
    setErrors([]);
    setSubmitError('');

    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
      setErrors([
        {
          rowNumber: null,
          message: 'Choose a file with a .csv extension.',
        },
      ]);
      return;
    }

    try {
      setReading(true);
      const text = await file.text();
      const result = validateStudentCsv(text, classSection);
      setRows(result.rows);
      setErrors(result.errors);
    } catch (error) {
      setErrors([
        {
          rowNumber: null,
          message: error.message || 'Could not read the CSV file.',
        },
      ]);
    } finally {
      setReading(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (rows.length === 0 || errors.length > 0) return;

    try {
      setImporting(true);
      setSubmitError('');

      await onImport({
        fileName,
        students: rows.map((row) => ({
          rowNumber: row.rowNumber,
          rollNumber: row.rollNumber,
          fullName: row.fullName,
          normalizedRollNumber: row.normalizedRollNumber,
          section: row.section,
        })),
      });
    } catch (error) {
      setSubmitError(
        error.message || 'The student import failed.',
      );
    } finally {
      setImporting(false);
    }
  }

  return (
    <Modal title="Import students from CSV" onClose={onCancel}>
      <form className="form" onSubmit={handleSubmit}>
        <div className="form-field">
          <label className="form-label" htmlFor="student-csv">
            CSV file
          </label>
          <input
            id="student-csv"
            className="form-input"
            type="file"
            accept=".csv,text/csv"
            onChange={handleFileChange}
            disabled={reading || importing}
          />
          <span className="form-help">
            Required headers: {STUDENT_CSV_HEADERS.join(', ')}
          </span>
        </div>

        {reading && (
          <p className="import-summary">Reading and validating CSV…</p>
        )}

        {errors.length > 0 && (
          <div className="import-errors" role="alert">
            <strong>
              Fix {errors.length} validation error
              {errors.length === 1 ? '' : 's'} before importing:
            </strong>
            <ul>
              {errors.map((error, index) => (
                <li key={`${error.rowNumber ?? 'file'}-${index}`}>
                  {error.rowNumber
                    ? `Row ${error.rowNumber}: `
                    : ''}
                  {error.message}
                </li>
              ))}
            </ul>
          </div>
        )}

        {rows.length > 0 && (
          <>
            <p className="import-summary">
              {rows.length} valid student
              {rows.length === 1 ? '' : 's'} ready to import into
              Section {classSection}.
            </p>

            <div className="import-preview">
              <table className="table">
                <thead>
                  <tr>
                    <th>Roll number</th>
                    <th>Name</th>
                    <th>Email</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.normalizedRollNumber}>
                      <td className="mono">{row.rollNumber}</td>
                      <td>{row.fullName}</td>
                      <td>{row.email}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {submitError && (
          <p className="form-error" role="alert">
            {submitError}
          </p>
        )}

        <div className="form-actions">
          <button
            type="button"
            className="btn btn-outline"
            onClick={onCancel}
            disabled={importing}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={
              reading ||
              importing ||
              rows.length === 0 ||
              errors.length > 0
            }
          >
            {importing
              ? 'Importing students…'
              : `Import ${rows.length || ''} student${rows.length === 1 ? '' : 's'}`}
          </button>
        </div>
      </form>
    </Modal>
  );
}
