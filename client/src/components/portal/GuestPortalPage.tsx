import React, { useState, useEffect } from 'react';

interface ItineraryEvent {
  id: string;
  title: string;
  subEvent: string;
  startTime: string;
  endTime: string;
  location: string;
  notes?: string | null;
}

interface ItineraryDay {
  dayNumber: number;
  title: string;
  date: string;
  events: ItineraryEvent[];
}

interface PublicItinerary {
  weddingTitle: string;
  coupleNames: string;
  venueName: string;
  city: string;
  startDate: string;
  endDate: string;
  welcomeMessage?: string | null;
  venueGoogleMapsUrl?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  itineraryDays: ItineraryDay[];
}

interface GuestPortalPageProps {
  token: string;
  onBackToApp?: () => void;
}

export const GuestPortalPage: React.FC<GuestPortalPageProps> = ({ token, onBackToApp }) => {
  const [itinerary, setItinerary] = useState<PublicItinerary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // RSVP Form State
  const [primaryName, setPrimaryName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [partySize, setPartySize] = useState(2);
  const [rsvpStatus, setRsvpStatus] = useState<'CONFIRMED' | 'DECLINED' | 'TENTATIVE'>('CONFIRMED');
  const [dietary, setDietary] = useState('Vegetarian');
  const [subEventsRsvp, setSubEventsRsvp] = useState<string[]>(['SANGEET', 'WEDDING_PHERAS', 'RECEPTION']);
  const [submitting, setSubmitting] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState<string | null>(null);

  useEffect(() => {
    const fetchItinerary = async () => {
      try {
        setLoading(true);
        let res = await fetch(`/api/public/portal/${token}`).catch(() => null);
        if (!res || !res.ok) {
          res = await fetch(`http://localhost:5000/api/public/portal/${token}`).catch(() => null);
        }
        if (!res) {
          throw new Error('Unable to reach guest portal server');
        }
        const data = await res.json();
        if (data.success && data.data) {
          setItinerary(data.data);
          setError(null);
        } else {
          setError(data.error || 'Portal itinerary unavailable');
        }
      } catch (err: any) {
        setError(err.message || 'Unable to connect to guest portal server');
      } finally {
        setLoading(false);
      }
    };
    if (token) fetchItinerary();
  }, [token]);

  const handleSubmitRsvp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!primaryName || !phone) {
      alert('Please enter your full name and contact number');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        primaryGuestName: primaryName,
        primaryContactPhone: phone,
        email: email || undefined,
        partySize,
        rsvpStatus,
        dietaryNotes: dietary,
        subEventsRsvp
      };

      let res = await fetch(`/api/public/portal/${token}/rsvp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).catch(() => null);

      if (!res || !res.ok) {
        res = await fetch(`http://localhost:5000/api/public/portal/${token}/rsvp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }).catch(() => null);
      }

      if (!res) {
        throw new Error('Unable to connect to guest portal server');
      }
      const data = await res.json();
      if (data.success) {
        setSubmissionSuccess(data.data?.message || 'Your household RSVP has been recorded with the concierge!');
      } else {
        alert(data.error || 'Failed to submit RSVP');
      }
    } catch (err: any) {
      alert('Network error submitting RSVP: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', width: '100%', background: '#0F0A09', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#F5EBDD', padding: '2rem' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', color: '#E8B978', marginBottom: '.8rem' }}>◈</div>
          <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '2rem', letterSpacing: '.05em' }}>The Royal Knot</div>
          <div style={{ color: '#CDBB9C', fontSize: '.85rem', letterSpacing: '.18em', textTransform: 'uppercase', marginTop: '.4rem' }}>
            Retrieving Celebration Dossier...
          </div>
        </div>
      </div>
    );
  }

  if (error || !itinerary) {
    return (
      <div style={{ minHeight: '100vh', width: '100%', background: '#0F0A09', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#F5EBDD', padding: '1.5rem' }}>
        <div style={{ maxWidth: '460px', width: '100%', background: '#1B1311', border: '1px solid rgba(232,185,120,0.3)', padding: '2.2rem', borderRadius: '16px', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', color: '#E8B978', marginBottom: '.6rem' }}>◈</div>
          <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.9rem', color: '#F5EBDD', margin: 0 }}>Celebration Portal Notice</h2>
          <p style={{ color: '#CDBB9C', fontSize: '.9rem', margin: '1rem 0 1.6rem', lineHeight: 1.5 }}>
            {error || 'This royal celebration portal link is inactive or has expired.'}
          </p>
          {onBackToApp && (
            <button className="rk-btn g" onClick={onBackToApp} style={{ padding: '.65rem 1.6rem' }}>
              Return to Operations System
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
        background: '#FAF6EE',
        color: '#292321',
        fontFamily: "'DM Sans', sans-serif"
      }}
    >
      {/* Top Floating App Bar */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 40,
          background: 'rgba(15, 10, 9, 0.96)',
          backdropFilter: 'blur(8px)',
          borderBottom: '1px solid rgba(232, 185, 120, 0.25)',
          padding: '.75rem 1.2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem' }}>
          <span style={{ color: '#E8B978', fontSize: '1.1rem' }}>◈</span>
          <span style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.25rem', color: '#F5EBDD', fontWeight: 600 }}>
            The Royal Knot
          </span>
          <span style={{ fontSize: '.72rem', letterSpacing: '.1em', textTransform: 'uppercase', color: '#CDBB9C', padding: '2px 8px', background: 'rgba(232, 185, 120, 0.15)', borderRadius: '12px' }}>
            Guest Concierge
          </span>
        </div>

        {onBackToApp && (
          <button
            id="btn-back-to-planner"
            onClick={onBackToApp}
            style={{
              background: 'transparent',
              border: '1px solid rgba(232, 185, 120, 0.4)',
              color: '#E8B978',
              padding: '.4rem .9rem',
              borderRadius: '20px',
              cursor: 'pointer',
              fontSize: '.78rem',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: '.4rem'
            }}
          >
            <span>←</span>
            <span>Back to Planner</span>
          </button>
        )}
      </div>

      {/* Hero Banner Header */}
      <div
        style={{
          background: '#0F0A09',
          color: '#F5EBDD',
          padding: '2.8rem 1.5rem 2.4rem',
          textAlign: 'center',
          borderBottom: '1px solid rgba(232, 185, 120, 0.2)'
        }}
      >
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div style={{ color: '#E8B978', fontSize: '.75rem', letterSpacing: '.25em', textTransform: 'uppercase', marginBottom: '.6rem', fontWeight: 600 }}>
            Royal Destination Celebration &bull; {itinerary.city}
          </div>
          <h1
            style={{
              fontFamily: 'Cormorant Garamond, serif',
              fontSize: 'clamp(2rem, 5vw, 3.2rem)',
              margin: '0 0 .5rem',
              fontWeight: 400,
              lineHeight: 1.15
            }}
          >
            {itinerary.coupleNames}
          </h1>
          <div style={{ fontSize: '.95rem', color: '#CDBB9C', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '.6rem', flexWrap: 'wrap' }}>
            <span>📍 {itinerary.venueName}</span>
            <span>&bull;</span>
            <span>
              {new Date(itinerary.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} –{' '}
              {new Date(itinerary.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
          </div>

          {itinerary.venueGoogleMapsUrl && (
            <div style={{ marginTop: '1rem' }}>
              <a
                href={itinerary.venueGoogleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '.4rem',
                  background: '#B8955A',
                  color: '#1B1311',
                  textDecoration: 'none',
                  padding: '.45rem 1.1rem',
                  borderRadius: '20px',
                  fontSize: '.82rem',
                  fontWeight: 600
                }}
              >
                <span>📍 Open Venue Directions in Google Maps ↗</span>
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Main Responsive Grid Layout (Schedule on Left, RSVP on Right) */}
      <div
        style={{
          maxWidth: '1180px',
          margin: '0 auto',
          padding: '2rem 1.2rem 4rem',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          gap: '2rem',
          alignItems: 'start'
        }}
      >
        {/* Left Column: Welcome Message & Multi-Day Celebration Itinerary */}
        <div style={{ display: 'grid', gap: '1.5rem' }}>
          {/* Welcome Note Card */}
          {itinerary.welcomeMessage && (
            <div
              className="card"
              style={{
                padding: '1.6rem 1.8rem',
                background: '#fff',
                borderLeft: '4px solid var(--gold)',
                boxShadow: '0 6px 20px rgba(41,35,33,0.04)'
              }}
            >
              <div style={{ color: 'var(--gold)', fontSize: '1.2rem', marginBottom: '.3rem' }}>◈</div>
              <p
                style={{
                  fontFamily: 'Cormorant Garamond, serif',
                  fontSize: '1.25rem',
                  fontStyle: 'italic',
                  margin: 0,
                  color: 'var(--ink)',
                  lineHeight: 1.45
                }}
              >
                "{itinerary.welcomeMessage}"
              </p>
            </div>
          )}

          {/* Schedule Section */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div>
                <span style={{ fontSize: '.72rem', letterSpacing: '.15em', textTransform: 'uppercase', color: 'var(--gold)', fontWeight: 600 }}>
                  Order of Proceedings
                </span>
                <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.8rem', margin: '.1rem 0 0' }}>
                  Celebration Itinerary
                </h2>
              </div>
              <span style={{ fontSize: '.8rem', color: 'var(--tp)' }}>
                {itinerary.itineraryDays.length} Celebration Days
              </span>
            </div>

            <div style={{ display: 'grid', gap: '1.2rem' }}>
              {itinerary.itineraryDays.map((day) => (
                <div
                  key={day.dayNumber}
                  className="card"
                  style={{
                    padding: '1.4rem',
                    background: '#fff',
                    borderRadius: '12px',
                    boxShadow: '0 4px 16px rgba(41,35,33,0.04)'
                  }}
                >
                  <div
                    style={{
                      borderBottom: '1px solid var(--bd)',
                      paddingBottom: '.6rem',
                      marginBottom: '.9rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'baseline'
                    }}
                  >
                    <div>
                      <span style={{ fontSize: '.72rem', letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--gold)', fontWeight: 600 }}>
                        Day {day.dayNumber}
                      </span>
                      <h3 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.4rem', margin: '.1rem 0 0' }}>
                        {day.title}
                      </h3>
                    </div>
                    <div style={{ fontSize: '.82rem', color: 'var(--tp)' }}>
                      {new Date(day.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
                    </div>
                  </div>

                  <div style={{ display: 'grid', gap: '.75rem' }}>
                    {day.events && day.events.length > 0 ? (
                      day.events.map((ev) => (
                        <div
                          key={ev.id}
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '.9rem',
                            padding: '.75rem .9rem',
                            borderRadius: '8px',
                            background: '#FAF6EE',
                            border: '1px solid rgba(231, 223, 208, 0.7)'
                          }}
                        >
                          <div style={{ width: '85px', fontSize: '.78rem', fontWeight: 600, color: 'var(--gold)', marginTop: '2px' }}>
                            {new Date(ev.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                          <div style={{ flex: 1 }}>
                            <b style={{ fontSize: '.9rem', color: 'var(--ink)' }}>{ev.title}</b>
                            <div style={{ fontSize: '.76rem', color: 'var(--tp)', marginTop: '.15rem', display: 'flex', alignItems: 'center', gap: '.4rem', flexWrap: 'wrap' }}>
                              <span>📍 {ev.location}</span>
                              <span>&bull;</span>
                              <span className="bd b-in" style={{ fontSize: '.68rem', padding: '1px 6px' }}>{ev.subEvent}</span>
                            </div>
                            {ev.notes && (
                              <div style={{ fontSize: '.75rem', color: 'var(--tp)', marginTop: '.3rem', fontStyle: 'italic' }}>
                                {ev.notes}
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div style={{ color: 'var(--tp)', fontSize: '.82rem', fontStyle: 'italic', padding: '.4rem 0' }}>
                        Detailed itinerary timings updating soon by lead coordinators.
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Household RSVP & VIP Concierge Card */}
        <div style={{ position: 'sticky', top: '4.5rem', display: 'grid', gap: '1rem' }}>
          <div
            className="card"
            style={{
              padding: '1.8rem',
              background: '#fff',
              borderRadius: '14px',
              borderTop: '4px solid var(--gold)',
              boxShadow: '0 8px 24px rgba(41,35,33,0.06)'
            }}
          >
            <div style={{ textAlign: 'center', marginBottom: '1.2rem' }}>
              <div style={{ fontSize: '.72rem', letterSpacing: '.18em', textTransform: 'uppercase', color: 'var(--tp)', fontWeight: 600 }}>
                Guest Concierge Portal
              </div>
              <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.75rem', margin: '.2rem 0' }}>
                Household RSVP
              </h2>
              <div style={{ fontSize: '.82rem', color: 'var(--tp)' }}>
                Confirm your family presence for palace accommodation and gala catering.
              </div>
            </div>

            {submissionSuccess ? (
              <div style={{ background: '#F2F8F4', border: '1px solid #C7E4CE', borderRadius: '12px', padding: '1.8rem', textAlign: 'center' }}>
                <div style={{ fontSize: '2.2rem', color: 'var(--ok)', marginBottom: '.4rem' }}>✓</div>
                <h3 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.6rem', color: 'var(--ok)', margin: 0 }}>Presence Confirmed</h3>
                <p style={{ color: 'var(--ink)', marginTop: '.4rem', fontSize: '.88rem', lineHeight: 1.45 }}>{submissionSuccess}</p>
                <button
                  className="rk-btn o s"
                  onClick={() => setSubmissionSuccess(null)}
                  style={{ marginTop: '1rem', width: '100%' }}
                >
                  Update Submission Details
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmitRsvp} style={{ display: 'grid', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '.78rem', fontWeight: 600, marginBottom: '.25rem', color: 'var(--ink)' }}>
                    Primary Guest Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Vikramaditya Sharma"
                    value={primaryName}
                    onChange={(e) => setPrimaryName(e.target.value)}
                    style={{ width: '100%', padding: '.55rem .8rem', fontSize: '.85rem' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.8rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '.78rem', fontWeight: 600, marginBottom: '.25rem', color: 'var(--ink)' }}>
                      Contact Phone *
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="+91 98290 12345"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      style={{ width: '100%', padding: '.55rem .8rem', fontSize: '.85rem' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '.78rem', fontWeight: 600, marginBottom: '.25rem', color: 'var(--ink)' }}>
                      Email (Optional)
                    </label>
                    <input
                      type="email"
                      placeholder="guest@royalknot.in"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      style={{ width: '100%', padding: '.55rem .8rem', fontSize: '.85rem' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.8rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '.78rem', fontWeight: 600, marginBottom: '.25rem', color: 'var(--ink)' }}>
                      Party Size
                    </label>
                    <select
                      value={partySize}
                      onChange={(e) => setPartySize(Number(e.target.value))}
                      style={{ width: '100%', padding: '.55rem .8rem', fontSize: '.85rem' }}
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                        <option key={n} value={n}>
                          {n} {n === 1 ? 'Guest (Solo)' : 'Guests (Family)'}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '.78rem', fontWeight: 600, marginBottom: '.25rem', color: 'var(--ink)' }}>
                      Dietary Choice
                    </label>
                    <select
                      value={dietary}
                      onChange={(e) => setDietary(e.target.value)}
                      style={{ width: '100%', padding: '.55rem .8rem', fontSize: '.85rem' }}
                    >
                      <option value="Vegetarian">Pure Vegetarian</option>
                      <option value="Jain">Jain (No Root Vegetables)</option>
                      <option value="Vegan">Vegan</option>
                      <option value="Non-Vegetarian">Non-Vegetarian</option>
                      <option value="Nut Allergy">Nut Allergy Alert</option>
                      <option value="No Restrictions">No Restrictions</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '.78rem', fontWeight: 600, marginBottom: '.25rem', color: 'var(--ink)' }}>
                    Attendance Status
                  </label>
                  <select
                    value={rsvpStatus}
                    onChange={(e) => setRsvpStatus(e.target.value as any)}
                    style={{ width: '100%', padding: '.55rem .8rem', fontSize: '.85rem' }}
                  >
                    <option value="CONFIRMED">Joyfully Accept (Confirmed)</option>
                    <option value="TENTATIVE">Tentative (Awaiting Travel)</option>
                    <option value="DECLINED">Regretfully Decline</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '.78rem', fontWeight: 600, marginBottom: '.4rem', color: 'var(--ink)' }}>
                    Attending Sub-Events
                  </label>
                  <div style={{ display: 'flex', gap: '.4rem', flexWrap: 'wrap' }}>
                    {['MEHENDI', 'HALDI', 'SANGEET', 'BARAAT', 'PHERAS', 'RECEPTION'].map((ev) => {
                      const isSelected = subEventsRsvp.includes(ev);
                      return (
                        <button
                          type="button"
                          key={ev}
                          onClick={() => {
                            setSubEventsRsvp(
                              isSelected ? subEventsRsvp.filter((x) => x !== ev) : [...subEventsRsvp, ev]
                            );
                          }}
                          style={{
                            padding: '.35rem .75rem',
                            borderRadius: '16px',
                            border: `1px solid ${isSelected ? 'var(--gold)' : 'var(--bd)'}`,
                            background: isSelected ? 'var(--gold)' : '#fff',
                            color: isSelected ? '#fff' : 'var(--ink)',
                            cursor: 'pointer',
                            fontSize: '.72rem',
                            fontWeight: 500,
                            transition: 'all 0.15s ease'
                          }}
                        >
                          {isSelected ? '✓ ' : '+ '} {ev}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div style={{ marginTop: '.6rem' }}>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="rk-btn g"
                    style={{ width: '100%', padding: '.75rem', fontSize: '.9rem', fontWeight: 600 }}
                  >
                    {submitting ? 'Submitting to Concierge...' : 'Submit Household RSVP'}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Emergency Concierge Desk info */}
          {itinerary.emergencyContactPhone && (
            <div
              style={{
                padding: '1rem',
                borderRadius: '10px',
                background: '#fff',
                border: '1px solid var(--bd)',
                fontSize: '.78rem',
                color: 'var(--tp)',
                textAlign: 'center'
              }}
            >
              <div>VIP Guest Concierge & Emergency Desk:</div>
              <b style={{ color: 'var(--ink)' }}>
                {itinerary.emergencyContactName || 'Operations Desk'} &bull; {itinerary.emergencyContactPhone}
              </b>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
