import './DataTable.css';

/**
 * A plain, reusable table.
 *
 * Props
 *  - columns: [{ key, label, render? }]
 *             `render(row)` lets a column show something other than row[key],
 *             e.g. a badge or a formatted date.
 *  - rows:    array of objects
 *  - rowKey:  which field uniquely identifies a row (default "id")
 *  - emptyMessage: shown when rows is empty
 */
export default function DataTable({ columns, rows, rowKey = 'id', emptyMessage = 'Nothing to show yet.' }) {
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key} scope="col">{column.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="empty">{emptyMessage}</td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row[rowKey]}>
                {columns.map((column) => (
                  <td key={column.key}>
                    {column.render ? column.render(row) : row[column.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
