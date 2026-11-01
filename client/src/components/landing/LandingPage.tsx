import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';

interface LandingPageProps {
  onEnterApp?: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onEnterApp }) => {
  const { login, register } = useAuth();
  const trackRef = useRef<HTMLDivElement>(null);

  // Demo user credentials mapping to seeded database accounts
  const demoUsers = [
    { name: 'Ananya Singhal', role: 'Lead Planner', email: 'lead.planner@royalknot.in' },
    { name: 'Rajesh Chouhan', role: 'Coordinator', email: 'operations@royalknot.in' },
    { name: 'System Administrator', role: 'Admin', email: 'admin@royalknot.in' },
    { name: 'Devika Rajyashree', role: 'Founder', email: 'founder@royalknot.in' },
    { name: 'Vikram Rathore', role: 'Finance Director', email: 'finance@royalknot.in' }
  ];

  const [authMode, setAuthMode] = useState<'signin' | 'register'>('signin');
  const [useManualEmail, setUseManualEmail] = useState(true);
  const [selectedUserIndex, setSelectedUserIndex] = useState(0);
  const [email, setEmail] = useState('lead.planner@royalknot.in');
  const [password, setPassword] = useState('RoyalKnot#2026');

  // Registration form state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regRole, setRegRole] = useState<'COORDINATOR' | 'LEAD_PLANNER' | 'FINANCE_DIRECTOR' | 'FOUNDER' | 'ADMIN'>('COORDINATOR');
  const [regPhone, setRegPhone] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // References to animated DOM layers
  const glowRef = useRef<HTMLDivElement>(null);
  const cplRef = useRef<HTMLDivElement>(null);
  const chsRef = useRef<HTMLDivElement>(null);
  const flrRef = useRef<HTMLDivElement>(null);
  const petsRef = useRef<HTMLDivElement>(null);
  const c1Ref = useRef<HTMLDivElement>(null);
  const c2Ref = useRef<HTMLDivElement>(null);
  const c3Ref = useRef<HTMLDivElement>(null);
  const lgRef = useRef<HTMLDivElement>(null);
  const hintRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Generate 14 rose petals
    const petContainer = petsRef.current;
    if (!petContainer) return;
    petContainer.innerHTML = '';

    const PET_COUNT = window.matchMedia('(max-width:700px)').matches ? 7 : 14;
    const petalsData: Array<{ el: HTMLDivElement; sp: number; ph: number; dx: number }> = [];

    for (let i = 0; i < PET_COUNT; i++) {
      const d = document.createElement('div');
      d.className = 'pet';
      const s = 8 + Math.random() * (i % 3 ? 14 : 34);
      Object.assign(d.style, {
        width: s + 'px',
        height: s * 0.75 + 'px',
        left: Math.random() * 100 + '%',
        top: '-60px',
        filter: `blur(${i % 3 ? 0 : 4}px)`,
        position: 'absolute'
      });
      petContainer.appendChild(d);
      petalsData.push({
        el: d,
        sp: 0.5 + Math.random() * 1.2,
        ph: Math.random() * 6,
        dx: (Math.random() - 0.5) * 160
      });
    }

    const rp = (p: number, a: number, b: number) => Math.min(1, Math.max(0, (p - a) / (b - a)));
    const ez = (x: number) => x * x * (3 - 2 * x);
    let cur = 0;
    let tgt = 0;
    let reqId: number;

    const onScroll = () => {
      const track = trackRef.current;
      if (!track) return;
      const maxScroll = track.offsetHeight - window.innerHeight;
      tgt = maxScroll > 0 ? Math.min(1, Math.max(0, window.scrollY / maxScroll)) : 0;
    };

    window.addEventListener('scroll', onScroll, { passive: true });

    const tick = () => {
      cur += (tgt - cur) * 0.16;
      const p = cur;

      if (c1Ref.current) {
        c1Ref.current.style.opacity = String(ez(rp(p, 0.02, 0.08)) * (1 - ez(rp(p, 0.14, 0.2))));
      }
      if (hintRef.current) {
        hintRef.current.style.opacity = String(1 - rp(p, 0, 0.05));
      }
      if (glowRef.current) {
        glowRef.current.style.opacity = String(0.4 + ez(rp(p, 0.1, 0.5)) * 0.6);
      }

      const c = ez(rp(p, 0.15, 0.38));
      if (cplRef.current) {
        cplRef.current.style.opacity = String(c);
        cplRef.current.style.transform = `scale(${0.82 + 0.18 * c + p * 0.06}) translateY(${(1 - c) * 40}px)`;
      }

      if (chsRef.current) {
        chsRef.current.style.opacity = String(ez(rp(p, 0.3, 0.5)));
        chsRef.current.style.transform = `translateY(${(1 - ez(rp(p, 0.3, 0.5))) * -70}px)`;
      }

      if (flrRef.current) {
        flrRef.current.style.opacity = String(ez(rp(p, 0.25, 0.5)));
      }

      const pp = rp(p, 0.4, 0.9);
      petalsData.forEach((o) => {
        const y = -60 + ((pp * 1.6 * o.sp + o.ph * 0.1) % 1.4) * (window.innerHeight + 120);
        const x = Math.sin(p * 9 * o.sp + o.ph) * 40 + o.dx * pp;
        o.el.style.opacity = pp > 0 && pp < 1 ? '0.85' : '0';
        o.el.style.transform = `translate3d(${x}px,${y}px,0) rotate(${p * 600 * o.sp + o.ph * 60}deg)`;
      });

      if (c2Ref.current) {
        c2Ref.current.style.opacity = String(ez(rp(p, 0.4, 0.5)) * (1 - ez(rp(p, 0.6, 0.66))));
        c2Ref.current.style.transform = `translateY(${(1 - ez(rp(p, 0.4, 0.5))) * 30}px)`;
      }

      if (c3Ref.current) {
        c3Ref.current.style.opacity = String(ez(rp(p, 0.64, 0.74)) * (1 - ez(rp(p, 0.84, 0.9))));
        c3Ref.current.style.transform = `translateY(${(1 - ez(rp(p, 0.64, 0.74))) * 30}px)`;
      }

      const lg = ez(rp(p, 0.88, 0.97));
      if (lgRef.current) {
        lgRef.current.style.opacity = String(lg);
        if (lg > 0.6) {
          lgRef.current.classList.add('on');
        } else {
          lgRef.current.classList.remove('on');
        }
      }

      reqId = requestAnimationFrame(tick);
    };

    reqId = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(reqId);
    };
  }, []);

  const handleScrollToLogin = () => {
    const track = trackRef.current;
    if (!track) return;
    window.scrollTo({
      top: track.offsetHeight - window.innerHeight,
      behavior: 'smooth'
    });
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const loginEmail = useManualEmail ? email.trim() : demoUsers[selectedUserIndex].email;
      await login({
        email: loginEmail,
        password: password
      });
      if (onEnterApp) {
        onEnterApp();
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await register({
        name: regName.trim(),
        email: regEmail.trim(),
        password: regPassword,
        role: regRole,
        phone: regPhone.trim() || undefined
      });
      if (onEnterApp) {
        onEnterApp();
      }
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please check form details.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div id="land">
      {/* Floating Pill Top Nav */}
      <nav className="land-nav">
        <b className="sf" style={{ fontSize: '1.2rem', letterSpacing: '.05em' }}>The Royal Knot</b>
        <span style={{ fontSize: '.8rem', opacity: 0.7 }}>Wedding Operations</span>
        <button className="rk-btn g s" onClick={handleScrollToLogin}>Sign in</button>
      </nav>

      <div className="track" id="track" ref={trackRef}>
        <div className="pin">
          {/* Ambient Golden Glow */}
          <div
            className="ly"
            id="glow"
            ref={glowRef}
            style={{
              background: 'radial-gradient(50% 40% at 50% 38%, rgba(232,185,120,.45), transparent 70%)'
            }}
          />

          {/* Palace Chandeliers */}
          <div className="ly" id="chs" ref={chsRef}>
            {[
              [50, 16, 240],
              [26, 9, 170],
              [74, 9, 170]
            ].map(([left, width, height], idx) => (
              <svg
                key={idx}
                viewBox={`0 0 120 ${height}`}
                style={{
                  position: 'absolute',
                  left: `${left - width / 2}%`,
                  top: 0,
                  width: `${width}%`,
                  filter: 'drop-shadow(0 0 16px rgba(232,185,120,.5))'
                }}
              >
                <line x1="60" y1="0" x2="60" y2={height * 0.3} stroke="#B8955A" />
                <path
                  d={`M60 ${height * 0.3} L24 ${height * 0.52} Q60 ${height * 0.62} 96 ${height * 0.52}Z`}
                  fill="#B8955A"
                />
                {[30, 45, 60, 75, 90].map((x, cIdx) => (
                  <g key={cIdx}>
                    <circle cx={x} cy={height * 0.7} r="3" fill="#F5EBDD" />
                    <line x1={x} y1={height * 0.55} x2={x} y2={height * 0.7} stroke="#E8B978" strokeWidth="0.8" />
                  </g>
                ))}
              </svg>
            ))}
          </div>

          {/* Stylized Indian Royal Couple Silhouette SVG */}
          <div
            className="ly"
            id="cpl"
            ref={cplRef}
            style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end' }}
          >
            <svg
              viewBox="0 0 420 640"
              style={{
                height: '68vh',
                filter: 'drop-shadow(0 0 40px rgba(232,185,120,.3))'
              }}
            >
              <defs>
                <linearGradient id="iv" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#cdbb9c" />
                  <stop offset="0.6" stopColor="#F5EBDD" />
                  <stop offset="1" stopColor="#a8957a" />
                </linearGradient>
                <linearGradient id="rd" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#A51E32" />
                  <stop offset="1" stopColor="#4a0a16" />
                </linearGradient>
                <linearGradient id="sk" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#b98062" />
                  <stop offset="1" stopColor="#7f523c" />
                </linearGradient>
              </defs>

              {/* Groom Sherwani & Turban */}
              <path d="M70 640 L82 300 Q90 250 130 238 L175 238 Q215 250 222 300 L232 640Z" fill="url(#iv)" />
              <rect x="140" y="215" width="22" height="28" fill="url(#sk)" />
              <ellipse cx="151" cy="185" rx="30" ry="36" fill="url(#sk)" />
              <path d="M118 175 Q120 128 152 126 Q186 128 186 175 Q150 150 118 175Z" fill="#B8955A" />

              {/* Bride Rajasthani Lehenga, Dupatta & Choli */}
              <path
                d="M262 400 L250 300 Q256 262 285 252 L330 252 Q355 262 358 300 L340 380 L420 640 L196 640Z"
                fill="url(#rd)"
              />
              <path d="M214 640 Q300 560 400 640" fill="none" stroke="#B8955A" strokeWidth="3" />
              <rect x="294" y="228" width="20" height="28" fill="url(#sk)" />
              <ellipse cx="304" cy="198" rx="28" ry="34" fill="url(#sk)" />
              <path d="M272 190 Q276 142 304 140 Q334 142 336 190 Q304 162 272 190Z" fill="#1b0f0d" />
            </svg>
          </div>

          {/* Floor Radial Glow */}
          <div
            className="ly"
            id="flr"
            ref={flrRef}
            style={{
              background: 'radial-gradient(70% 90% at 50% 100%, rgba(141,23,40,.5), transparent 70%)',
              top: '60%'
            }}
          />

          {/* Falling Physics Rose Petals Container */}
          <div className="ly" id="pets" ref={petsRef} />

          {/* Vignette Overlay */}
          <div
            className="ly"
            id="vig"
            style={{
              background: 'radial-gradient(120% 90% at 50% 45%, transparent 45%, rgba(15,10,9,.9))',
              pointerEvents: 'none'
            }}
          />

          {/* Story Caption 1 */}
          <div className="cap" id="c1" ref={c1Ref} style={{ top: '46%' }}>
            <h2 className="sf" style={{ fontStyle: 'italic', fontSize: 'clamp(1.6rem, 4.5vw, 3.2rem)' }}>
              Some moments deserve to last forever.
            </h2>
          </div>

          {/* Story Caption 2 */}
          <div className="cap" id="c2" ref={c2Ref} style={{ bottom: '9vh' }}>
            <div className="eb">Every wedding is a production</div>
            <h2 className="sf">
              Four hundred guests.<br />
              <em>Eighteen vendors.</em> One platform.
            </h2>
          </div>

          {/* Story Caption 3 */}
          <div className="cap" id="c3" ref={c3Ref} style={{ bottom: '9vh' }}>
            <div className="eb">Enquiry &rarr; Wedding &rarr; RFQ &rarr; Settlement</div>
            <h2 className="sf">
              From first enquiry<br />
              to final <em>settlement.</em>
            </h2>
            <div className="stats">
              <div>
                <b>25</b>
                <span style={{ color: '#cdbb9c', fontSize: '.78rem' }}>weddings a season</span>
              </div>
              <div>
                <b>3 days</b>
                <span style={{ color: '#cdbb9c', fontSize: '.78rem' }}>per celebration</span>
              </div>
              <div>
                <b>&inr; Cr</b>
                <span style={{ color: '#cdbb9c', fontSize: '.78rem' }}>managed with control</span>
              </div>
            </div>
          </div>

          {/* Floating Member Authentication Form Card */}
          <div className="lg" id="lg" ref={lgRef}>
            <div className="lgc" style={{ maxWidth: '420px', width: '92%' }}>
              {/* Auth Mode Toggle Tabs */}
              <div style={{ display: 'flex', borderBottom: '1px solid var(--bd)', marginBottom: '1.2rem', paddingBottom: '.4rem', gap: '.6rem' }}>
                <button
                  type="button"
                  onClick={() => { setAuthMode('signin'); setError(null); }}
                  className={`rk-btn s ${authMode === 'signin' ? 'g' : 'o'}`}
                  style={{ flex: 1, padding: '.45rem' }}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => { setAuthMode('register'); setError(null); }}
                  className={`rk-btn s ${authMode === 'register' ? 'g' : 'o'}`}
                  style={{ flex: 1, padding: '.45rem' }}
                >
                  Create Account
                </button>
              </div>

              {authMode === 'signin' ? (
                <form onSubmit={handleSignIn} style={{ display: 'grid', gap: '.8rem' }}>
                  <div className="sf" style={{ fontSize: '1.8rem', textAlign: 'center' }}>
                    Welcome back
                  </div>
                  <div style={{ textAlign: 'center', fontSize: '.76rem', color: 'var(--tp)' }}>
                    Unified Operations Cockpit &bull; Day-of Execution
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.3rem' }}>
                      <label style={{ fontSize: '.75rem', color: 'var(--tp)' }}>
                        {useManualEmail ? 'Email Address' : 'Select Pre-configured Persona'}
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setUseManualEmail(!useManualEmail);
                          if (!useManualEmail) {
                            setEmail(demoUsers[selectedUserIndex].email);
                          }
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--gold)',
                          fontSize: '.72rem',
                          cursor: 'pointer',
                          textDecoration: 'underline'
                        }}
                      >
                        {useManualEmail ? '⚡ Quick Persona Pick' : '✎ Type Manual Email'}
                      </button>
                    </div>

                    {useManualEmail ? (
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="e.g. founder@royalknot.in"
                        required
                        style={{
                          background: '#fff',
                          border: '1px solid var(--bd)',
                          borderRadius: '8px',
                          padding: '.55rem .75rem',
                          width: '100%',
                          fontSize: '.85rem'
                        }}
                      />
                    ) : (
                      <select
                        value={selectedUserIndex}
                        onChange={(e) => {
                          const idx = Number(e.target.value);
                          setSelectedUserIndex(idx);
                          setEmail(demoUsers[idx].email);
                        }}
                        style={{
                          background: '#fff',
                          border: '1px solid var(--bd)',
                          borderRadius: '8px',
                          padding: '.55rem .75rem',
                          width: '100%',
                          fontSize: '.85rem'
                        }}
                      >
                        {demoUsers.map((u, i) => (
                          <option key={i} value={i}>
                            {u.name} — {u.role} ({u.email})
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div>
                    <label style={{ fontSize: '.75rem', color: 'var(--tp)', display: 'block', marginBottom: '.3rem' }}>
                      Password
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Password"
                      required
                      style={{
                        background: '#fff',
                        border: '1px solid var(--bd)',
                        borderRadius: '8px',
                        padding: '.55rem .75rem',
                        width: '100%',
                        fontSize: '.85rem'
                      }}
                    />
                  </div>

                  {error && (
                    <div style={{ color: 'var(--er)', fontSize: '.78rem', background: '#FDF2F2', padding: '.5rem', borderRadius: '6px' }}>
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="rk-btn g"
                    style={{ width: '100%', marginTop: '.3rem', padding: '.65rem 1rem' }}
                  >
                    {isLoading ? 'Verifying credentials...' : 'Enter The Royal Knot'}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleRegister} style={{ display: 'grid', gap: '.7rem' }}>
                  <div className="sf" style={{ fontSize: '1.8rem', textAlign: 'center' }}>
                    Create Account
                  </div>
                  <div style={{ textAlign: 'center', fontSize: '.76rem', color: 'var(--tp)' }}>
                    Register for Royal Knot Wedding Management
                  </div>

                  <div>
                    <label style={{ fontSize: '.75rem', color: 'var(--tp)', display: 'block', marginBottom: '.25rem' }}>
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      placeholder="e.g. Maharani Ananya"
                      required
                      style={{
                        background: '#fff',
                        border: '1px solid var(--bd)',
                        borderRadius: '8px',
                        padding: '.5rem .7rem',
                        width: '100%',
                        fontSize: '.82rem'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '.75rem', color: 'var(--tp)', display: 'block', marginBottom: '.25rem' }}>
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="e.g. ananya@royalknot.in"
                      required
                      style={{
                        background: '#fff',
                        border: '1px solid var(--bd)',
                        borderRadius: '8px',
                        padding: '.5rem .7rem',
                        width: '100%',
                        fontSize: '.82rem'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '.75rem', color: 'var(--tp)', display: 'block', marginBottom: '.25rem' }}>
                      Password (min 6 characters)
                    </label>
                    <input
                      type="password"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="Create secure password"
                      required
                      minLength={6}
                      style={{
                        background: '#fff',
                        border: '1px solid var(--bd)',
                        borderRadius: '8px',
                        padding: '.5rem .7rem',
                        width: '100%',
                        fontSize: '.82rem'
                      }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '.6rem' }}>
                    <div>
                      <label style={{ fontSize: '.75rem', color: 'var(--tp)', display: 'block', marginBottom: '.25rem' }}>
                        Operational Role
                      </label>
                      <select
                        value={regRole}
                        onChange={(e) => setRegRole(e.target.value as any)}
                        style={{
                          background: '#fff',
                          border: '1px solid var(--bd)',
                          borderRadius: '8px',
                          padding: '.5rem .6rem',
                          width: '100%',
                          fontSize: '.8rem'
                        }}
                      >
                        <option value="COORDINATOR">Coordinator (Day-of)</option>
                        <option value="LEAD_PLANNER">Lead Planner</option>
                        <option value="FINANCE_DIRECTOR">Finance Director</option>
                        <option value="FOUNDER">Founder / Executive</option>
                        <option value="ADMIN">System Administrator</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ fontSize: '.75rem', color: 'var(--tp)', display: 'block', marginBottom: '.25rem' }}>
                        Phone (Optional)
                      </label>
                      <input
                        type="tel"
                        value={regPhone}
                        onChange={(e) => setRegPhone(e.target.value)}
                        placeholder="+91..."
                        style={{
                          background: '#fff',
                          border: '1px solid var(--bd)',
                          borderRadius: '8px',
                          padding: '.5rem .6rem',
                          width: '100%',
                          fontSize: '.8rem'
                        }}
                      />
                    </div>
                  </div>

                  {error && (
                    <div style={{ color: 'var(--er)', fontSize: '.78rem', background: '#FDF2F2', padding: '.5rem', borderRadius: '6px' }}>
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="rk-btn g"
                    style={{ width: '100%', marginTop: '.3rem', padding: '.65rem 1rem' }}
                  >
                    {isLoading ? 'Creating account...' : 'Create Account & Enter'}
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* Scroll Prompt */}
          <div
            id="hint"
            ref={hintRef}
            style={{
              position: 'absolute',
              bottom: '3vh',
              left: '50%',
              transform: 'translateX(-50%)',
              letterSpacing: '.35em',
              textTransform: 'uppercase',
              color: '#d9b877',
              fontSize: '.65rem',
              pointerEvents: 'none'
            }}
          >
            Scroll
          </div>
        </div>
      </div>
    </div>
  );
};
