import Editor from '@monaco-editor/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import ConfirmDialog from '../../components/ConfirmDialog';
import { useAuth } from '../../auth/useAuth';
import { useData } from '../../data/useData';
import { supabase } from '../../lib/supabase';

import './CodingWorkspace.css';

const suspiciousShortcuts = new Set([
  'F12', 'Control+Shift+I', 'Control+Shift+J', 'Control+Shift+C',
  'Meta+Alt+I', 'Meta+Alt+J', 'Meta+Alt+C', 'Control+U', 'Meta+U',
]);

function shortcutName(event) {
  return [
    event.ctrlKey ? 'Control' : '',
    event.metaKey ? 'Meta' : '',
    event.altKey ? 'Alt' : '',
    event.shiftKey ? 'Shift' : '',
    event.key.length === 1 ? event.key.toUpperCase() : event.key,
  ].filter(Boolean).join('+');
}

export default function CodingWorkspace() {
  const { assignmentId } = useParams();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { assignments } = useData();
  const assignmentPreview = assignments.find((item) => item.id === assignmentId);

  const [session, setSession] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [activeIndex, setActiveIndex] = useState(0);
  const [starting, setStarting] = useState(false);
  const [saveState, setSaveState] = useState('Not started');
  const [error, setError] = useState(null);
  const [fullscreenLost, setFullscreenLost] = useState(false);
  const [showSubmit, setShowSubmit] = useState(false);

  const challengeRef = useRef(null);
  const attemptIdRef = useRef(null);
  const requestQueueRef = useRef(Promise.resolve());
  const saveTimerRef = useRef(null);
  const tamperReportedRef = useRef(false);

  const invalidateSession = useCallback(async () => {
    await logout();
    navigate('/login', { replace: true });
  }, [logout, navigate]);

  const secureCall = useCallback((payload) => {
    const run = requestQueueRef.current.then(async () => {
      const response = await supabase.functions.invoke('exam-session', {
        body: {
          ...payload,
          attemptId: attemptIdRef.current,
          challenge: challengeRef.current,
        },
      });
      const result = response.data;
      if (response.error || !result?.success) {
        if (result?.invalidated) await invalidateSession();
        throw new Error(result?.error || response.error?.message || 'Session request failed.');
      }
      if (result.challenge) challengeRef.current = result.challenge;
      return result;
    });
    requestQueueRef.current = run.catch(() => undefined);
    return run;
  }, [invalidateSession]);

  const recordEvent = useCallback((eventType, details = {}) => {
    if (!attemptIdRef.current) return;
    secureCall({
      action: 'event',
      eventType,
      details,
      clientAt: new Date().toISOString(),
    }).catch(() => undefined);
  }, [secureCall]);

  async function startAttempt() {
    setStarting(true);
    setError(null);
    try {
      if (assignmentPreview?.fullscreenRequired && !document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      }
      const response = await supabase.functions.invoke('exam-session', {
        body: { action: 'start', assignmentId },
      });
      if (response.error || !response.data?.success) {
        throw new Error(response.data?.error || response.error?.message || 'Could not start.');
      }
      const result = response.data;
      attemptIdRef.current = result.attempt.id;
      challengeRef.current = result.challenge;
      setSession(result);
      setQuestions(result.questions);
      setAnswers(Object.fromEntries(result.questions.map((question) => {
        const saved = result.answers.find((answer) => answer.question_id === question.id);
        return [question.id, saved?.code ?? question.starter_code ?? ''];
      })));
      setSaveState('All changes saved');
    } catch (startError) {
      setError(startError.message);
      if (document.fullscreenElement) await document.exitFullscreen();
    } finally {
      setStarting(false);
    }
  }

  useEffect(() => {
    if (!session) return undefined;
    const heartbeat = window.setInterval(() => {
      secureCall({ action: 'heartbeat' })
        .then((result) => {
          setSession((current) => ({
            ...current,
            attempt: { ...current.attempt, status: result.status },
          }));
        })
        .catch((heartbeatError) => setError(heartbeatError.message));
    }, 15_000);
    return () => window.clearInterval(heartbeat);
  }, [secureCall, session]);

  useEffect(() => {
    if (!session) return undefined;

    function preventClipboard(event) {
      if (!session.assignment.restrict_clipboard) return;
      event.preventDefault();
      const eventType = event.type === 'paste'
        ? 'paste_attempt'
        : event.type === 'copy'
          ? 'copy_attempt'
          : event.type === 'cut'
            ? 'cut_attempt'
            : event.type === 'drop'
              ? 'drop_attempt'
              : 'context_menu';
      recordEvent(eventType);
    }

    function handleKey(event) {
      const shortcut = shortcutName(event);
      const clipboardShortcut = (event.ctrlKey || event.metaKey)
        && ['c', 'v', 'x'].includes(event.key.toLowerCase());
      if (clipboardShortcut && session.assignment.restrict_clipboard) {
        event.preventDefault();
        recordEvent(
          event.key.toLowerCase() === 'v' ? 'paste_attempt'
            : event.key.toLowerCase() === 'x' ? 'cut_attempt' : 'copy_attempt',
          { shortcut },
        );
      }
      if (suspiciousShortcuts.has(shortcut)) {
        event.preventDefault();
        recordEvent('suspicious_shortcut', { shortcut });
      }
    }

    function handleVisibility() {
      if (document.hidden) recordEvent('tab_hidden');
    }

    function handleBlur() {
      recordEvent('focus_loss');
    }

    function handleFullscreen() {
      const lost = session.assignment.fullscreen_required && !document.fullscreenElement;
      setFullscreenLost(lost);
      if (lost) recordEvent('fullscreen_exit');
    }

    const nativeAdd = EventTarget.prototype.addEventListener;
    const nativeFetch = window.fetch;
    const tamperCheck = window.setInterval(() => {
      if (
        !tamperReportedRef.current
        && (EventTarget.prototype.addEventListener !== nativeAdd || window.fetch !== nativeFetch)
      ) {
        tamperReportedRef.current = true;
        recordEvent('runtime_tamper');
      }
    }, 5_000);

    ['paste', 'copy', 'cut', 'drop', 'contextmenu'].forEach((type) => {
      document.addEventListener(type, preventClipboard, true);
    });
    window.addEventListener('keydown', handleKey, true);
    window.addEventListener('blur', handleBlur);
    document.addEventListener('visibilitychange', handleVisibility);
    document.addEventListener('fullscreenchange', handleFullscreen);

    return () => {
      ['paste', 'copy', 'cut', 'drop', 'contextmenu'].forEach((type) => {
        document.removeEventListener(type, preventClipboard, true);
      });
      window.removeEventListener('keydown', handleKey, true);
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('visibilitychange', handleVisibility);
      document.removeEventListener('fullscreenchange', handleFullscreen);
      window.clearInterval(tamperCheck);
    };
  }, [recordEvent, session]);

  function updateCode(questionId, code = '') {
    setAnswers((current) => ({ ...current, [questionId]: code }));
    setSaveState('Unsaved changes');
    window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(() => {
      setSaveState('Saving…');
      secureCall({ action: 'save', questionId, code })
        .then(() => setSaveState('All changes saved'))
        .catch((saveError) => {
          setSaveState('Save failed');
          setError(saveError.message);
        });
    }, 900);
  }

  async function reenterFullscreen() {
    await document.documentElement.requestFullscreen();
    setFullscreenLost(false);
  }

  async function submitAttempt() {
    try {
      await secureCall({ action: 'submit' });
      setShowSubmit(false);
      if (document.fullscreenElement) await document.exitFullscreen();
      navigate('/student/assignments', { replace: true });
    } catch (submitError) {
      setError(submitError.message);
    }
  }

  if (!session) {
    return (
      <div className="assessment-start panel">
        <div className="panel-body">
          <span className="badge badge-accent">Secured coding assessment</span>
          <h1>{assignmentPreview?.title || 'Coding assignment'}</h1>
          <p>
            Starting opens a timed fullscreen workspace. Clipboard actions,
            focus changes, fullscreen exits, and suspicious shortcuts are logged.
          </p>
          {error && <p className="form-error">{error}</p>}
          <button type="button" className="btn btn-primary"
            onClick={startAttempt} disabled={starting}>
            {starting ? 'Starting…' : 'Start secured attempt'}
          </button>
        </div>
      </div>
    );
  }

  const activeQuestion = questions[activeIndex];
  return (
    <div className="coding-workspace">
      <header className="coding-header">
        <div>
          <strong>{session.assignment.title}</strong>
          <span>{saveState}</span>
        </div>
        <div>
          <span className={`badge ${session.attempt.status === 'flagged' ? 'badge-muted' : 'badge-accent'}`}>
            {session.attempt.status}
          </span>
          <button type="button" className="btn btn-primary btn-sm"
            onClick={() => setShowSubmit(true)}>Submit assignment</button>
        </div>
      </header>

      {error && <div className="coding-error">{error}</div>}
      <div className="coding-body">
        <aside className="question-nav" aria-label="Questions">
          {questions.map((question, index) => (
            <button key={question.id} type="button"
              className={index === activeIndex ? 'active' : ''}
              onClick={() => setActiveIndex(index)}>
              <span>Q{index + 1}</span>
              <small>{question.max_score} pts</small>
            </button>
          ))}
        </aside>

        <section className="question-prompt">
          <span className="badge badge-muted">Question {activeIndex + 1}</span>
          <h1>{activeQuestion.title}</h1>
          <p>{activeQuestion.prompt}</p>
        </section>

        <section className="code-editor" aria-label="Code editor">
          <Editor
            height="100%"
            language={activeQuestion.language}
            value={answers[activeQuestion.id] || ''}
            onChange={(value) => updateCode(activeQuestion.id, value)}
            theme={document.documentElement.dataset.theme === 'dark' ? 'vs-dark' : 'light'}
            options={{
              automaticLayout: true,
              contextmenu: false,
              dragAndDrop: false,
              copyWithSyntaxHighlighting: false,
              fontSize: 14,
              minimap: { enabled: false },
              pasteAs: { enabled: false },
              tabSize: 2,
            }}
          />
        </section>
      </div>

      {fullscreenLost && (
        <div className="fullscreen-lock" role="alertdialog" aria-modal="true">
          <div>
            <h2>Fullscreen exited</h2>
            <p>This event was recorded. Re-enter fullscreen to continue.</p>
            <button type="button" className="btn btn-primary" onClick={reenterFullscreen}>
              Re-enter fullscreen
            </button>
          </div>
        </div>
      )}

      {showSubmit && (
        <ConfirmDialog
          title="Submit coding assignment"
          message="Submit all saved answers? You cannot continue editing after submission."
          confirmLabel="Submit assignment"
          onConfirm={submitAttempt}
          onCancel={() => setShowSubmit(false)}
        />
      )}
    </div>
  );
}
