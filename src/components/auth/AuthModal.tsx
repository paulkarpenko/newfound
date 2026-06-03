import { useEffect, useState } from 'react';
import { AnimatePresence, motion as fm } from 'framer-motion';
import { AuthError, type AvatarChoice } from '@/lib/auth';
import { AVATAR_PRESETS } from '@/lib/avatars';
import { useAuth } from '@/state/useAuth';
import Avatar from './Avatar';

export type AuthMode = 'login' | 'signup' | 'profile' | 'password';

interface Props {
  mode: AuthMode;
  onClose(): void;
  onSwitchMode(mode: AuthMode): void;
}

const inputStyle: React.CSSProperties = {
  background: 'var(--nf-canvas)',
  color: 'var(--nf-ink)',
  border: '1px solid var(--nf-rule)',
  borderRadius: 3,
  padding: '8px 10px',
  fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
  fontSize: 13,
  outline: 'none',
  width: '100%',
};

export default function AuthModal({ mode, onClose, onSwitchMode }: Props) {
  const user = useAuth((s) => s.user);
  const signup = useAuth((s) => s.signup);
  const login = useAuth((s) => s.login);
  const updateProfile = useAuth((s) => s.updateProfile);
  const changePassword = useAuth((s) => s.changePassword);

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState(mode === 'profile' ? user?.name ?? '' : '');
  const [identifier, setIdentifier] = useState('');
  const [avatar, setAvatar] = useState<AvatarChoice>(
    mode === 'profile' ? user?.avatar ?? 'initials' : 'initials',
  );
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // The preview profile drives the live avatar swatch initials.
  const previewProfile = {
    name: mode === 'profile' ? name : name,
    username: mode === 'signup' ? username || 'you' : (user?.username ?? (username || 'you')),
  };

  const submit = async () => {
    setError(null);
    setBusy(true);
    try {
      if (mode === 'login') {
        await login(identifier, password);
      } else if (mode === 'signup') {
        await signup({ username, email, password, name: name || undefined, avatar });
      } else if (mode === 'password') {
        if (newPassword !== confirmPassword) throw new AuthError('New passwords do not match.');
        await changePassword(currentPassword, newPassword);
      } else {
        await updateProfile({ name, avatar });
      }
      onClose();
    } catch (err) {
      setError(err instanceof AuthError ? err.message : err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const title =
    mode === 'login'
      ? 'Sign in'
      : mode === 'signup'
        ? 'Create your profile'
        : mode === 'password'
          ? 'Change password'
          : 'Edit profile';

  return (
    <AnimatePresence>
      <fm.div
        key="auth-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        data-no-pan
        data-panel-scrollable
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 90,
          background: 'rgba(0,0,0,0.36)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '4vh 2vw',
        }}
      >
        <fm.div
          initial={{ opacity: 0, y: 8, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.98 }}
          transition={{ duration: 0.18 }}
          style={{
            width: 'min(420px, 94vw)',
            maxHeight: '92vh',
            overflow: 'auto',
            background: 'var(--nf-panel)',
            border: '1px solid var(--nf-rule)',
            borderRadius: 6,
            boxShadow: '0 24px 60px rgba(0,0,0,0.30)',
          }}
        >
          <header
            style={{
              padding: '16px 20px 12px',
              borderBottom: '1px solid var(--nf-rule)',
              background: 'var(--nf-panel-deep)',
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              gap: 12,
            }}
          >
            <div>
              <p className="font-smallcaps">newfound</p>
              <h2
                style={{
                  fontFamily: 'Source Serif 4, serif',
                  fontSize: 20,
                  color: 'var(--nf-ink)',
                  margin: '4px 0 0',
                }}
              >
                {title}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              style={{ fontSize: 18, color: 'var(--nf-ink-soft)', padding: 4, lineHeight: 1 }}
            >
              ×
            </button>
          </header>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
            style={{ padding: 20, display: 'grid', gap: 12 }}
          >
            {mode === 'login' && (
              <Field label="username or email">
                <input
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  autoFocus
                  autoComplete="username"
                  style={inputStyle}
                />
              </Field>
            )}

            {mode === 'signup' && (
              <>
                <Field label="username">
                  <input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoFocus
                    autoComplete="username"
                    placeholder="e.g. madison_fan"
                    style={inputStyle}
                  />
                </Field>
                <Field label="email">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    placeholder="you@example.com"
                    style={inputStyle}
                  />
                </Field>
              </>
            )}

            {(mode === 'signup' || mode === 'profile') && (
              <Field label="name (optional)">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  placeholder="how you'd like to be shown"
                  style={inputStyle}
                />
              </Field>
            )}

            {mode === 'profile' && user && (
              <div style={{ display: 'grid', gap: 4 }}>
                <span className="font-smallcaps">account</span>
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: 'var(--nf-ink-soft)' }}>
                  @{user.username} · {user.email}
                </p>
              </div>
            )}

            {(mode === 'signup' || mode === 'profile') && (
              <AvatarPicker avatar={avatar} onChange={setAvatar} profile={previewProfile} />
            )}

            {(mode === 'login' || mode === 'signup') && (
              <Field label="password">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  placeholder={mode === 'signup' ? 'at least 6 characters' : ''}
                  style={inputStyle}
                />
              </Field>
            )}

            {mode === 'password' && (
              <>
                {user && (
                  <div style={{ display: 'grid', gap: 4 }}>
                    <span className="font-smallcaps">account</span>
                    <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: 'var(--nf-ink-soft)' }}>
                      @{user.username} · {user.email}
                    </p>
                  </div>
                )}
                <Field label="current password">
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    autoFocus
                    autoComplete="current-password"
                    style={inputStyle}
                  />
                </Field>
                <Field label="new password">
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    autoComplete="new-password"
                    placeholder="at least 6 characters"
                    style={inputStyle}
                  />
                </Field>
                <Field label="confirm new password">
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                    style={inputStyle}
                  />
                </Field>
              </>
            )}

            {error && (
              <p
                style={{
                  fontFamily: 'Inter, sans-serif',
                  fontSize: 12,
                  color: '#a23',
                  margin: 0,
                }}
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={busy}
              style={{
                marginTop: 4,
                padding: '9px 14px',
                background: 'var(--nf-focus)',
                color: '#fff',
                border: 'none',
                borderRadius: 3,
                fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
                textTransform: 'uppercase',
                letterSpacing: '0.14em',
                fontSize: 11,
                fontWeight: 600,
                cursor: busy ? 'wait' : 'pointer',
                opacity: busy ? 0.7 : 1,
              }}
            >
              {busy
                ? '…'
                : mode === 'login'
                  ? 'sign in'
                  : mode === 'signup'
                    ? 'create profile'
                    : mode === 'password'
                      ? 'update password'
                      : 'save changes'}
            </button>

            {mode === 'login' && (
              <SwitchLine
                prompt="No account yet?"
                action="Create one"
                onClick={() => onSwitchMode('signup')}
              />
            )}
            {mode === 'signup' && (
              <SwitchLine
                prompt="Already have an account?"
                action="Sign in"
                onClick={() => onSwitchMode('login')}
              />
            )}
            {mode === 'profile' && (
              <SwitchLine
                prompt="Want to change your password?"
                action="Change password"
                onClick={() => onSwitchMode('password')}
              />
            )}
            {mode === 'password' && (
              <SwitchLine
                prompt=""
                action="Back to profile"
                onClick={() => onSwitchMode('profile')}
              />
            )}
          </form>
        </fm.div>
      </fm.div>
    </AnimatePresence>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'grid', gap: 4 }}>
      <span className="font-smallcaps">{label}</span>
      {children}
    </label>
  );
}

function SwitchLine({
  prompt,
  action,
  onClick,
}: {
  prompt: string;
  action: string;
  onClick(): void;
}) {
  return (
    <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: 'var(--nf-ink-soft)', textAlign: 'center', margin: 0 }}>
      {prompt}{' '}
      <button
        type="button"
        onClick={onClick}
        style={{
          color: 'var(--nf-focus)',
          fontWeight: 600,
          textDecoration: 'underline',
          background: 'none',
          border: 'none',
          padding: 0,
          cursor: 'pointer',
          font: 'inherit',
        }}
      >
        {action}
      </button>
    </p>
  );
}

function AvatarPicker({
  avatar,
  onChange,
  profile,
}: {
  avatar: AvatarChoice;
  onChange(a: AvatarChoice): void;
  profile: { name?: string; username: string };
}) {
  return (
    <div style={{ display: 'grid', gap: 6 }}>
      <span className="font-smallcaps">avatar</span>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        <SwatchButton
          selected={avatar === 'initials'}
          onClick={() => onChange('initials')}
          title="Use initials"
        >
          <Avatar avatar="initials" profile={profile} size={34} ring={avatar === 'initials'} />
        </SwatchButton>
        {AVATAR_PRESETS.map((p) => {
          const value: AvatarChoice = `preset:${p.id}`;
          return (
            <SwatchButton
              key={p.id}
              selected={avatar === value}
              onClick={() => onChange(value)}
              title={p.label}
            >
              <Avatar avatar={value} profile={profile} size={34} ring={avatar === value} />
            </SwatchButton>
          );
        })}
      </div>
      <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 10, color: 'var(--nf-ink-whisper)', margin: 0 }}>
        Initials are taken from your name, or username if no name is set.
      </p>
    </div>
  );
}

function SwatchButton({
  selected,
  onClick,
  title,
  children,
}: {
  selected: boolean;
  onClick(): void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      aria-pressed={selected}
      style={{
        padding: 2,
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        lineHeight: 0,
        borderRadius: '50%',
      }}
    >
      {children}
    </button>
  );
}
