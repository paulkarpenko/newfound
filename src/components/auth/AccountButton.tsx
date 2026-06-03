import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/state/useAuth';
import Avatar from './Avatar';
import AuthModal from './AuthModal';

/**
 * Top-left account control. Shows a "sign in" pill when anonymous, or the
 * reader's avatar (with a dropdown for profile / sign-out) when signed in.
 * Owns the AuthModal's open state.
 */
export default function AccountButton() {
  const status = useAuth((s) => s.status);
  const user = useAuth((s) => s.user);
  const hydrate = useAuth((s) => s.hydrate);
  const logout = useAuth((s) => s.logout);
  const modalMode = useAuth((s) => s.authModalMode);
  const openAuthModal = useAuth((s) => s.openAuthModal);
  const closeAuthModal = useAuth((s) => s.closeAuthModal);

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Restore session on first mount.
  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  // Close the dropdown on outside click.
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    window.addEventListener('mousedown', onDown);
    return () => window.removeEventListener('mousedown', onDown);
  }, [menuOpen]);

  // While the token verifies, render nothing to avoid a flash of "sign in".
  if (status === 'loading') return null;

  return (
    <div
      ref={menuRef}
      data-no-pan
      className="pointer-events-auto absolute top-4 z-30"
      style={{ left: 112 }}
    >
      {status === 'anon' || !user ? (
        <button
          type="button"
          onClick={() => openAuthModal('login')}
          className="font-smallcaps"
          style={{
            background: 'var(--nf-panel)',
            color: 'var(--nf-ink)',
            border: '1px solid var(--nf-rule)',
            borderRadius: 4,
            padding: '6px 12px',
            cursor: 'pointer',
          }}
        >
          sign in
        </button>
      ) : (
        <>
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Account menu"
            aria-expanded={menuOpen}
            style={{
              background: 'var(--nf-panel)',
              border: '1px solid var(--nf-rule)',
              borderRadius: 999,
              padding: 3,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              paddingRight: 10,
            }}
          >
            <Avatar avatar={user.avatar} profile={user} size={30} />
            <span
              style={{
                fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
                fontSize: 12,
                fontWeight: 500,
                color: 'var(--nf-ink)',
                maxWidth: 120,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {user.name || user.username}
            </span>
          </button>

          {menuOpen && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 6px)',
                left: 0,
                width: 232,
                background: 'var(--nf-panel)',
                border: '1px solid var(--nf-rule)',
                borderRadius: 6,
                boxShadow: '0 12px 32px rgba(0,0,0,0.16)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  padding: '12px 14px',
                  borderBottom: '1px solid var(--nf-rule)',
                  background: 'var(--nf-panel-deep)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                }}
              >
                <Avatar avatar={user.avatar} profile={user} size={38} />
                <div style={{ minWidth: 0 }}>
                  <p
                    style={{
                      fontFamily: 'Source Serif 4, serif',
                      fontSize: 14,
                      color: 'var(--nf-ink)',
                      margin: 0,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {user.name || user.username}
                  </p>
                  <p
                    style={{
                      fontFamily: 'Inter, sans-serif',
                      fontSize: 11,
                      color: 'var(--nf-ink-soft)',
                      margin: '2px 0 0',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    @{user.username}
                  </p>
                </div>
              </div>
              <MenuItem
                onClick={() => {
                  setMenuOpen(false);
                  openAuthModal('profile');
                }}
              >
                Edit profile
              </MenuItem>
              <MenuItem
                onClick={() => {
                  setMenuOpen(false);
                  openAuthModal('password');
                }}
              >
                Change password
              </MenuItem>
              <MenuItem
                onClick={() => {
                  setMenuOpen(false);
                  logout();
                }}
              >
                Sign out
              </MenuItem>
            </div>
          )}
        </>
      )}

      {modalMode && (
        <AuthModal mode={modalMode} onClose={closeAuthModal} onSwitchMode={openAuthModal} />
      )}
    </div>
  );
}

function MenuItem({ onClick, children }: { onClick(): void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'block',
        width: '100%',
        textAlign: 'left',
        padding: '10px 14px',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
        fontSize: 13,
        color: 'var(--nf-ink)',
        transition: 'background 120ms ease-out',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.background = 'var(--nf-panel-deep)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.background = 'transparent';
      }}
    >
      {children}
    </button>
  );
}
