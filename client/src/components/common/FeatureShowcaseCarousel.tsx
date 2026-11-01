import React, { useState } from 'react';

interface FeatureSlide {
  id: string;
  badge: string;
  title: string;
  tagline: string;
  description: string;
  highlights: string[];
  ctaLabel: string;
  onAction: () => void;
  accentColor: string;
  icon: string;
}

interface FeatureShowcaseCarouselProps {
  onOpenRadar?: () => void;
  onOpenBudgetSimulator: () => void;
  onOpenContingency: () => void;
  onOpenVendorReliability?: () => void;
  onOpenGuestPortal?: () => void;
}

export const FeatureShowcaseCarousel: React.FC<FeatureShowcaseCarouselProps> = ({
  onOpenRadar,
  onOpenBudgetSimulator,
  onOpenContingency,
  onOpenVendorReliability,
  onOpenGuestPortal
}) => {
  const slides: FeatureSlide[] = [
    {
      id: 'radar',
      badge: 'OPERATIONAL INTELLIGENCE',
      title: 'Wedding Readiness & Risk Radar',
      tagline: 'Zero-Penalty Multi-Factor Operational Health Scoring',
      description:
        'Continuous mathematical scoring (0–100) across Task Execution (35), Vendor Logistics (25), Incident Stability (25), and Timeline Integrity (15) with null-safe schedule collision detection and hard blocker overrides.',
      highlights: ['Mutually exclusive scoring model', 'Hard blocker severity override', 'Staff collision detection'],
      ctaLabel: 'Inspect Readiness Cockpit',
      onAction: () => onOpenRadar?.(),
      accentColor: 'var(--gold)',
      icon: '◈'
    },
    {
      id: 'simulator',
      badge: 'FINANCIAL INTELLIGENCE',
      title: 'Live Budget Impact Simulator',
      tagline: 'Real-Time What-If Scenario Analysis Using Awarded Tender Rates',
      description:
        'Interactively simulate guest count additions, photography/sound overtime, and decor adjustments against verified tender rates with zero double counting and clean agency markup controls.',
      highlights: ['Awarded tender discovery', '0% pass-through markup slider', 'Live client surplus/deficit'],
      ctaLabel: 'Launch Budget Simulator',
      onAction: onOpenBudgetSimulator,
      accentColor: '#B8955A',
      icon: '💰'
    },
    {
      id: 'portal',
      badge: 'GUEST CONCIERGE',
      title: 'Guest Concierge QR Portal',
      tagline: 'Mobile-First Luxury Itinerary & Household RSVP Synchronization',
      description:
        'SHA-256 token-gated public portal allowing guests to view royal itineraries, navigate via Google Maps, and submit transactional household RSVPs with individual dietary and sub-event preferences.',
      highlights: ['E.164 phone normalization', 'Concurrency P2002 safe retries', 'Public rate-limited API'],
      ctaLabel: 'Preview Guest Portal',
      onAction: () => onOpenGuestPortal?.(),
      accentColor: '#8D1728',
      icon: '✦'
    },
    {
      id: 'contingency',
      badge: 'CRISIS MANAGEMENT',
      title: 'Contingency & Emergency Backup Planner',
      tagline: 'Rapid Protocol Execution & Automated Incident Dispatch',
      description:
        'Two-step commander activation protocol that instantly re-routes event venues on schedule, creates linked critical incidents, and idempotently dispatches emergency tasks to field staff.',
      highlights: ['Commander RBAC enforcement', 'Atomic venue relocation', 'Post-mortem resolution log'],
      ctaLabel: 'Review Contingency Plans',
      onAction: onOpenContingency,
      accentColor: 'var(--er)',
      icon: '⚡'
    },
    {
      id: 'reliability',
      badge: 'PROCUREMENT INTELLIGENCE',
      title: 'Vendor Reliability Dossier',
      tagline: 'Evidence-Based Partner Evaluation & Risk Mitigation',
      description:
        'Three-pillar algorithmic index (0–100) combining Check-in Punctuality (40%), Incident Safety (35%), and Cost Variance Fidelity (25%) with emerging partner protection gating (< 2 weddings = UNRATED).',
      highlights: ['40 / 35 / 25 weighted index', 'Emerging partner safeguard', 'Evidence coverage meter'],
      ctaLabel: 'Explore Reliability Matrix',
      onAction: () => onOpenVendorReliability?.(),
      accentColor: '#3A6B4F',
      icon: '★'
    }
  ];

  const [currentIndex, setCurrentIndex] = useState(0);

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % slides.length);
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const current = slides[currentIndex];

  return (
    <div
      className="card"
      style={{
        padding: '1.4rem 1.6rem',
        background: 'linear-gradient(135deg, #FFFDF8 0%, #FAF5EB 100%)',
        border: '1.5px solid var(--bd)',
        borderLeft: `5px solid ${current.accentColor}`,
        borderRadius: '12px',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 4px 20px rgba(41,35,33,0.04)'
      }}
    >
      {/* Top Banner Ribbon */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.8rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem' }}>
          <span style={{ fontSize: '1.2rem', color: current.accentColor }}>{current.icon}</span>
          <span
            style={{
              fontSize: '.72rem',
              letterSpacing: '.18em',
              fontWeight: 700,
              textTransform: 'uppercase',
              color: 'var(--tp)'
            }}
          >
            {current.badge}
          </span>
        </div>

        {/* Carousel Navigation Arrows */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '.4rem' }}>
          <button
            onClick={prevSlide}
            className="rk-btn o s"
            style={{ padding: '.25rem .55rem', borderRadius: '50%', width: '28px', height: '28px', minWidth: '28px' }}
            title="Previous Feature"
          >
            ‹
          </button>
          <button
            onClick={nextSlide}
            className="rk-btn o s"
            style={{ padding: '.25rem .55rem', borderRadius: '50%', width: '28px', height: '28px', minWidth: '28px' }}
            title="Next Feature"
          >
            ›
          </button>
        </div>
      </div>

      {/* Main Slide Content */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '1.2rem', alignItems: 'center' }}>
        <div>
          <h3 className="sf" style={{ fontSize: '1.6rem', margin: '0 0 .2rem 0', color: 'var(--ink)' }}>
            {current.title}
          </h3>
          <div style={{ fontSize: '.88rem', color: 'var(--gold)', fontWeight: 600, marginBottom: '.4rem' }}>
            {current.tagline}
          </div>
          <p style={{ fontSize: '.82rem', color: 'var(--tp)', lineHeight: 1.5, margin: '0 0 .8rem 0', maxWidth: '780px' }}>
            {current.description}
          </p>

          {/* Feature Highlights Pills */}
          <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            {current.highlights.map((h, i) => (
              <span
                key={i}
                style={{
                  fontSize: '.74rem',
                  padding: '.2rem .6rem',
                  borderRadius: '20px',
                  background: '#fff',
                  border: '1px solid var(--bd)',
                  color: 'var(--ink)'
                }}
              >
                ✓ {h}
              </span>
            ))}
          </div>
        </div>

        {/* Action Button */}
        <div>
          <button
            onClick={current.onAction}
            className="rk-btn g"
            style={{
              padding: '.7rem 1.3rem',
              fontSize: '.85rem',
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              gap: '.5rem',
              boxShadow: '0 4px 14px rgba(184,149,90,0.25)'
            }}
          >
            <span>{current.ctaLabel}</span>
            <span>&rarr;</span>
          </button>
        </div>
      </div>

      {/* Slide Indicators Dots */}
      <div style={{ display: 'flex', gap: '.4rem', marginTop: '1rem', justifyContent: 'center' }}>
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrentIndex(i)}
            style={{
              width: i === currentIndex ? '22px' : '6px',
              height: '6px',
              borderRadius: '3px',
              background: i === currentIndex ? current.accentColor : '#DCD3C5',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              transition: 'all 0.3s'
            }}
            title={`Slide ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
};
