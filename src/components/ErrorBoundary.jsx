import { Component } from 'react';

/**
 * Catches any error thrown while rendering and shows it on screen instead
 * of leaving a blank page. (React only supports this as a class component.)
 * The message it prints is exactly what to paste when asking for help.
 */
export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (!this.state.error) return this.props.children;

    const { error } = this.state;
    return (
      <div style={{ padding: 32, fontFamily: 'system-ui, sans-serif', maxWidth: 800 }}>
        <h1 style={{ fontSize: 22, marginBottom: 8 }}>Codelab hit an error</h1>
        <p style={{ marginBottom: 16 }}>Copy the text below when asking for help.</p>
        <pre
          style={{
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            padding: 16,
            background: '#f1f4f8',
            color: '#26313e',
            borderRadius: 8,
            fontSize: 13,
          }}
        >
          {String(error?.stack || error)}
        </pre>
        <button type="button" onClick={() => window.location.reload()} style={{ marginTop: 16, padding: '8px 14px' }}>
          Reload
        </button>
      </div>
    );
  }
}
