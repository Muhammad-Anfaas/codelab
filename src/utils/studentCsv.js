export const STUDENT_CSV_HEADERS = [
  'Sr#',
  'Roll_No.',
  'Full_Name',
  'Roll No without hyphen',
  'section',
];

function normalizeHeader(value) {
  return value
    .replace(/^\uFEFF/, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];

    if (quoted) {
      if (character === '"') {
        if (text[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        field += character;
      }

      continue;
    }

    if (character === '"' && field.length === 0) {
      quoted = true;
    } else if (character === ',') {
      row.push(field);
      field = '';
    } else if (character === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (character !== '\r') {
      field += character;
    }
  }

  if (quoted) {
    throw new Error('The CSV contains an unclosed quoted field.');
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((values) =>
    values.some((value) => value.trim() !== ''),
  );
}

export function studentEmailFromNormalizedRoll(normalizedRollNumber) {
  const match = /^(\d{2})P(\d{4})$/i.exec(
    normalizedRollNumber.trim(),
  );

  if (!match) return null;

  return `p${match[1]}${match[2]}@pwr.nu.edu.pk`;
}

export function validateStudentCsv(text, expectedSection) {
  let csvRows;

  try {
    csvRows = parseCsv(text);
  } catch (error) {
    return {
      rows: [],
      errors: [{ rowNumber: null, message: error.message }],
    };
  }

  if (csvRows.length === 0) {
    return {
      rows: [],
      errors: [{ rowNumber: null, message: 'The CSV file is empty.' }],
    };
  }

  const normalizedHeaders = csvRows[0].map(normalizeHeader);
  const headerIndexes = new Map(
    normalizedHeaders.map((header, index) => [header, index]),
  );
  const missingHeaders = STUDENT_CSV_HEADERS.filter(
    (header) => !headerIndexes.has(normalizeHeader(header)),
  );

  if (missingHeaders.length > 0) {
    return {
      rows: [],
      errors: [
        {
          rowNumber: 1,
          message: `Missing required header${missingHeaders.length === 1 ? '' : 's'}: ${missingHeaders.join(', ')}.`,
        },
      ],
    };
  }

  const indexes = Object.fromEntries(
    STUDENT_CSV_HEADERS.map((header) => [
      header,
      headerIndexes.get(normalizeHeader(header)),
    ]),
  );
  const targetSection = expectedSection.trim().toUpperCase();
  const seenRollNumbers = new Set();
  const rows = [];
  const errors = [];

  csvRows.slice(1).forEach((values, dataIndex) => {
    const rowNumber = dataIndex + 2;
    const serialNumber = values[indexes['Sr#']]?.trim() ?? '';
    const rollNumber = values[indexes['Roll_No.']]?.trim().toUpperCase() ?? '';
    const fullName = values[indexes.Full_Name]?.trim() ?? '';
    const normalizedRollNumber =
      values[indexes['Roll No without hyphen']]?.trim().toUpperCase() ?? '';
    const section = values[indexes.section]?.trim().toUpperCase() ?? '';
    const rowErrors = [];

    if (!serialNumber) rowErrors.push('Sr# is required');
    if (!rollNumber) rowErrors.push('Roll_No. is required');
    if (!fullName) rowErrors.push('Full_Name is required');
    if (!normalizedRollNumber) {
      rowErrors.push('Roll No without hyphen is required');
    }
    if (!section) rowErrors.push('section is required');

    const rollMatch = /^(\d{2})P-(\d{4})$/i.exec(rollNumber);
    const expectedNormalized = rollMatch
      ? `${rollMatch[1]}P${rollMatch[2]}`
      : null;

    if (rollNumber && !rollMatch) {
      rowErrors.push('Roll_No. must match the format 25P-0512');
    }

    if (
      expectedNormalized &&
      normalizedRollNumber !== expectedNormalized
    ) {
      rowErrors.push(
        `normalized roll number must be ${expectedNormalized}`,
      );
    }

    const email = studentEmailFromNormalizedRoll(
      normalizedRollNumber,
    );

    if (normalizedRollNumber && !email) {
      rowErrors.push(
        'Roll No without hyphen must match the format 25P0512',
      );
    }

    if (section && section !== targetSection) {
      rowErrors.push(
        `section must match the selected class section (${targetSection})`,
      );
    }

    if (normalizedRollNumber) {
      if (seenRollNumbers.has(normalizedRollNumber)) {
        rowErrors.push('duplicate roll number in this CSV');
      } else {
        seenRollNumbers.add(normalizedRollNumber);
      }
    }

    const parsedRow = {
      rowNumber,
      serialNumber,
      rollNumber,
      fullName,
      normalizedRollNumber,
      section,
      email,
      initialPassword: rollNumber,
    };

    if (rowErrors.length > 0) {
      errors.push({
        rowNumber,
        rollNumber,
        message: rowErrors.join('; '),
      });
      return;
    }

    rows.push(parsedRow);
  });

  if (csvRows.length === 1) {
    errors.push({
      rowNumber: null,
      message: 'The CSV contains headers but no student rows.',
    });
  }

  return { rows, errors };
}
