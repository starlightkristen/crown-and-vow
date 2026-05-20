import React, { useState } from 'react';

// ============================================================
// CROWN & VOW — Marlena's Bachelorette Hub (v2.1)
// Section order: Hero → Manor → Questionnaire intro →
// Necessities → Specifics → Tell Us About You → Stars →
// Presentation → Coin → Sign & Send
// ============================================================

const TRIP = {
  bride: 'Marlena',
  weddingDate: 'November 14, 2026',
  startDate: 'September 18, 2026',
  endDate: 'September 20, 2026',
  faireDate: 'Saturday, September 19',
  faireName: 'New York Renaissance Faire',
  faireLocation: 'Tuxedo Park, NY',
  rentalArea: 'Greenwood Lake, NY',
  vrboLink: 'https://www.vrbo.com/4249385',
  venmo: '[VENMO]',
  formspreeEndpoint: 'https://formspree.io/f/YOUR_ENDPOINT_HERE',
  costBreakdown: [
    { item: 'Lodging share (2 nights)', note: 'TBA' },
    { item: 'Faire ticket', note: 'TBA' },
  ],
};

const DropCap = ({ letter }) => (
  <span style={{
    float: 'left',
    fontFamily: '"IM Fell English SC", serif',
    fontSize: '4.5rem',
    lineHeight: '0.85',
    paddingRight: '0.5rem',
    paddingTop: '0.25rem',
    color: 'var(--gold)',
    fontWeight: 'normal',
  }}>
    {letter}
  </span>
);

const Divider = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '4rem 0', gap: '1.5rem' }}>
    <div style={{ flex: 1, height: '1px', background: 'linear-gradient(to right, transparent, var(--gold), transparent)', maxWidth: '180px' }} />
    <span style={{ color: 'var(--gold)', fontSize: '1.4rem', fontFamily: '"IM Fell English", serif' }}>❦</span>
    <div style={{ flex: 1, height: '1px', background: 'linear-gradient(to right, transparent, var(--gold), transparent)', maxWidth: '180px' }} />
  </div>
);

const SectionHeader = ({ kicker, title, subtitle }) => (
  <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
    <div style={{
      fontFamily: '"IM Fell English SC", serif',
      fontSize: '0.85rem',
      letterSpacing: '0.4em',
      color: 'var(--gold)',
      marginBottom: '0.75rem',
      textTransform: 'uppercase',
    }}>
      {kicker}
    </div>
    <h2 style={{
      fontFamily: '"IM Fell English", serif',
      fontSize: 'clamp(2rem, 5vw, 3.5rem)',
      color: 'var(--cream)',
      margin: 0,
      fontWeight: 'normal',
      letterSpacing: '0.02em',
    }}>
      {title}
    </h2>
    {subtitle && (
      <p style={{ marginTop: '1.5rem', fontStyle: 'italic', color: 'var(--cream-soft)', maxWidth: '480px', margin: '1.5rem auto 0' }}>
        {subtitle}
      </p>
    )}
  </div>
);

const Field = ({ label, helper, children }) => (
  <div style={{ marginBottom: '1.75rem' }}>
    <label>{label}</label>
    {helper && <span className="label-helper">{helper}</span>}
    {children}
  </div>
);

export default function CrownAndVow() {
  const [formData, setFormData] = useState({});
  const [submitted, setSubmitted] = useState(false);

  const update = (key, value) => setFormData((prev) => ({ ...prev, [key]: value }));
  const toggleMulti = (key, value) => {
    const cur = formData[key] || [];
    update(key, cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value]);
  };

  const submit = async () => {
    const payload = { ...formData, submittedAt: new Date().toISOString() };
    try {
      await fetch(TRIP.formspreeEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch (e) {
      console.log('Form payload (would send):', payload);
    }
    setSubmitted(true);
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IM+Fell+English:ital@0;1&family=IM+Fell+English+SC&family=EB+Garamond:ital,wght@0,400;0,500;1,400&display=swap');
        :root {
          --forest: #1a2820;
          --forest-deep: #0f1812;
          --cream: #e8dcc4;
          --cream-soft: #f0e6d2;
          --gold: #a8843a;
          --gold-bright: #c9a04a;
          --oxblood: #5c2618;
          --moss: #6b7a5a;
          --ink: #0d0d0d;
        }
        * { box-sizing: border-box; }
        body, html {
          margin: 0; padding: 0;
          background: var(--forest-deep); color: var(--cream);
          font-family: 'EB Garamond', serif; font-size: 18px; line-height: 1.7;
        }
        .candle-flicker { animation: flicker 4s infinite ease-in-out; }
        @keyframes flicker {
          0%, 100% { opacity: 1; filter: drop-shadow(0 0 30px rgba(168, 132, 58, 0.4)); }
          50% { opacity: 0.92; filter: drop-shadow(0 0 50px rgba(168, 132, 58, 0.6)); }
        }
        .parchment {
          background: linear-gradient(135deg, #e8dcc4 0%, #d4c4a4 100%);
          color: var(--ink); position: relative;
        }
        .parchment::before {
          content: ''; position: absolute; inset: 0;
          background-image:
            radial-gradient(circle at 20% 30%, rgba(92, 38, 24, 0.04) 0%, transparent 40%),
            radial-gradient(circle at 80% 70%, rgba(92, 38, 24, 0.04) 0%, transparent 40%);
          pointer-events: none;
        }
        .btn {
          background: transparent; border: 1px solid var(--gold); color: var(--gold);
          padding: 0.85rem 2rem; font-family: 'IM Fell English SC', serif;
          letter-spacing: 0.2em; font-size: 0.95rem; cursor: pointer;
          transition: all 0.3s; text-transform: uppercase;
        }
        .btn:hover { background: var(--gold); color: var(--forest-deep); letter-spacing: 0.25em; }
        .btn-primary { background: var(--gold); color: var(--forest-deep); }
        .btn-primary:hover { background: var(--gold-bright); }
        input[type="text"], input[type="email"], input[type="tel"], input[type="color"], textarea, select {
          width: 100%; padding: 0.75rem 1rem;
          background: rgba(232, 220, 196, 0.08);
          border: 1px solid rgba(168, 132, 58, 0.4);
          color: var(--cream); font-family: 'EB Garamond', serif;
          font-size: 1rem; border-radius: 0; margin-top: 0.4rem;
        }
        input:focus, textarea:focus, select:focus {
          outline: none; border-color: var(--gold);
          background: rgba(232, 220, 196, 0.12);
        }
        input[type="color"] { height: 50px; padding: 4px; cursor: pointer; }
        textarea { min-height: 70px; resize: vertical; }
        label {
          display: block; font-family: 'IM Fell English SC', serif;
          letter-spacing: 0.15em; font-size: 0.85rem; color: var(--gold);
          margin-bottom: 0.25rem; text-transform: uppercase;
        }
        .label-helper {
          font-family: 'EB Garamond', serif; font-style: italic;
          font-size: 0.85rem; color: var(--moss); letter-spacing: normal;
          text-transform: none; margin-top: 0.2rem; display: block;
        }
        .multi-checkbox {
          display: flex; align-items: center; gap: 0.75rem;
          padding: 0.6rem 0; cursor: pointer;
          font-family: 'EB Garamond', serif; color: var(--cream);
          font-size: 1rem;
        }
        .multi-checkbox input { width: auto; margin: 0; }
        .radio-option {
          display: block; width: 100%; text-align: left;
          background: rgba(232, 220, 196, 0.04);
          border: 1px solid rgba(168, 132, 58, 0.3);
          color: var(--cream); padding: 1rem 1.4rem;
          margin-bottom: 0.6rem; font-family: 'EB Garamond', serif;
          font-size: 1rem; cursor: pointer; transition: all 0.25s;
          font-style: italic;
        }
        .radio-option:hover {
          background: rgba(168, 132, 58, 0.12);
          border-color: var(--gold); padding-left: 1.8rem;
        }
        .radio-option.selected {
          background: rgba(168, 132, 58, 0.2);
          border-color: var(--gold-bright);
          padding-left: 1.8rem;
        }
        @media (max-width: 768px) { body { font-size: 17px; } }
      `}</style>

      {/* HERO */}
      <section style={{
        minHeight: '100vh',
        display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
        textAlign: 'center', padding: '4rem 1.5rem', position: 'relative',
        background: `
          radial-gradient(ellipse at center top, rgba(168, 132, 58, 0.15) 0%, transparent 60%),
          radial-gradient(ellipse at center bottom, rgba(92, 38, 24, 0.2) 0%, transparent 50%),
          var(--forest-deep)`,
      }}>
        <svg width="120" height="60" viewBox="0 0 120 60" style={{ marginBottom: '2rem', opacity: 0.6 }}>
          <path d="M60 5 Q 40 25, 20 30 M60 5 Q 80 25, 100 30 M60 5 L 60 50" stroke="var(--gold)" strokeWidth="0.8" fill="none" />
          <circle cx="60" cy="5" r="2.5" fill="var(--gold)" />
          <circle cx="20" cy="30" r="1.5" fill="var(--gold)" />
          <circle cx="100" cy="30" r="1.5" fill="var(--gold)" />
        </svg>

        <div className="candle-flicker">
          <div style={{
            fontFamily: '"IM Fell English SC", serif', fontSize: '0.9rem',
            letterSpacing: '0.5em', color: 'var(--gold)', marginBottom: '1.5rem',
          }}>
            ❦ You Are Summoned To ❦
          </div>
          <h1 style={{
            fontFamily: '"IM Fell English", serif',
            fontSize: 'clamp(3.5rem, 11vw, 8rem)', color: 'var(--cream)',
            margin: '0 0 1rem 0', fontWeight: 'normal',
            letterSpacing: '0.02em', lineHeight: '1',
          }}>
            Crown<span style={{ color: 'var(--gold)', fontStyle: 'italic', margin: '0 0.3em' }}>&amp;</span>Vow
          </h1>
          <div style={{
            fontFamily: '"EB Garamond", serif', fontStyle: 'italic',
            fontSize: '1.3rem', color: 'var(--cream-soft)',
            marginTop: '1rem', opacity: 0.85,
          }}>
            Marlena's Bachelorette · September 18–20, 2026
          </div>
        </div>

        <Divider />

        <button className="btn btn-primary" onClick={() => document.getElementById('manor').scrollIntoView({ behavior: 'smooth' })} style={{ marginTop: '1rem' }}>
          Enter the Court
        </button>
      </section>

      {/* MANOR */}
      <section id="manor" style={{ padding: '6rem 1.5rem', maxWidth: '760px', margin: '0 auto' }}>
        <SectionHeader kicker="Chapter the First" title="The Manor" />
        <div className="parchment" style={{ padding: '2.5rem', border: '1px solid var(--gold)' }}>
          <p style={{ margin: 0, fontSize: '1.1rem' }}>
            <DropCap letter="A" /> house near Greenwood Lake, roughly twenty minutes from the {TRIP.faireName} gates.
            Four bedrooms, fire pit, woods.
          </p>
          <div style={{ marginTop: '2rem' }}>
            <a href={TRIP.vrboLink} target="_blank" rel="noopener noreferrer" className="btn" style={{ borderColor: 'var(--oxblood)', color: 'var(--oxblood)' }}>
              View the Manor →
            </a>
          </div>
          <p style={{ marginTop: '2rem', fontStyle: 'italic', fontSize: '0.95rem', color: 'var(--moss)' }}>
            Address & arrival details will be sent privately the week of.
          </p>
        </div>
      </section>

      <Divider />

      {/* QUESTIONNAIRE INTRO */}
      <section style={{ padding: '4rem 1.5rem', maxWidth: '640px', margin: '0 auto', textAlign: 'center' }}>
        <SectionHeader kicker="Now — The Questionnaire" title="Tell Us Who You Are" />
        <p style={{ fontStyle: 'italic', color: 'var(--cream-soft)', fontSize: '1.1rem' }}>
          The more you tell us, the more thoughtful this weekend can be — surprises, snacks, vibes, all of it.
          <br /><br />
          <strong style={{ color: 'var(--gold)', fontStyle: 'normal' }}>Be specific. Be honest. Be a little weird.</strong>
        </p>
      </section>

      {/* SECTION 1 — NECESSITIES */}
      <section style={{ padding: '4rem 1.5rem', maxWidth: '640px', margin: '0 auto' }}>
        <SectionHeader kicker="Chapter the Second" title="The Necessities" subtitle="Boring but necessary. Skip nothing." />

        <Field label="Your Name">
          <input type="text" onChange={(e) => update('name', e.target.value)} />
        </Field>
        <Field label="Email">
          <input type="email" onChange={(e) => update('email', e.target.value)} />
        </Field>
        <Field label="Phone">
          <input type="tel" onChange={(e) => update('phone', e.target.value)} />
        </Field>
        <Field label="Shirt Size" helper="For any group merch we order.">
          <select onChange={(e) => update('shirtSize', e.target.value)}>
            <option>Choose...</option>
            <option>XS</option><option>S</option><option>M</option><option>L</option><option>XL</option><option>XXL</option><option>Other (note in allergies)</option>
          </select>
        </Field>
        <Field label="Shoe Size" helper="Number + women's/men's.">
          <input type="text" placeholder="e.g. women's 8.5" onChange={(e) => update('shoeSize', e.target.value)} />
        </Field>
        <Field label="Allergies" helper="Food, environmental, anything we should know.">
          <textarea onChange={(e) => update('allergies', e.target.value)} />
        </Field>
        <Field label="Accessibility Needs" helper="Mobility, sensory, medical, sleep — anything that helps us plan.">
          <textarea onChange={(e) => update('accessibility', e.target.value)} />
        </Field>
        <Field label="Dietary" helper="Vegetarian / vegan / GF / kosher / halal / lactose / picky honesty welcome.">
          <textarea onChange={(e) => update('dietary', e.target.value)} />
        </Field>
      </section>

      <Divider />

      {/* SECTION 2 — SPECIFICS */}
      <section style={{ padding: '4rem 1.5rem', maxWidth: '640px', margin: '0 auto' }}>
        <SectionHeader kicker="Chapter the Third" title="The Specifics" subtitle="Brands. Flavors. The truth, not the polite version. This is how we make it yours." />

        <Field label="Your Color" helper={`Pick one — and tell us specifically. "Oxblood. Not red red, oxblood."`}>
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
            <input type="color" defaultValue="#5c2618" style={{ width: '80px' }} onChange={(e) => update('colorHex', e.target.value)} />
            <input type="text" placeholder="describe it in words too" style={{ flex: 1 }} onChange={(e) => update('colorWords', e.target.value)} />
          </div>
        </Field>
        <Field label="Your Drink (alcoholic)" helper={`Brand. Type. How you take it. "Espolòn reposado, neat, lime back."`}>
          <textarea placeholder="be specific" onChange={(e) => update('drink', e.target.value)} />
        </Field>
        <Field label="Non-Alcoholic of Choice" helper={`"Topo Chico. Olipop cherry vanilla. Oat milk matcha latte."`}>
          <textarea onChange={(e) => update('nonAlc', e.target.value)} />
        </Field>
        <Field label="Coffee or Tea — Honestly" helper={`"Iced oat milk latte, light ice." Or: "Earl Grey, milk, one sugar."`}>
          <textarea onChange={(e) => update('coffeeTea', e.target.value)} />
        </Field>
        <Field label="Go-To Breakfast" helper="The one you actually eat, not the aspirational one.">
          <textarea onChange={(e) => update('breakfast', e.target.value)} />
        </Field>
        <Field label="The Snack You Cannot Live Without" helper={`Brand-specific is best. "Hot Cheetos. Trader Joe's everything cashews. Black licorice."`}>
          <textarea onChange={(e) => update('snack', e.target.value)} />
        </Field>
        <Field label="Saturday Post-Faire Dinner Vote" helper="We'll tally. Pick all that work for you.">
          <div style={{ marginTop: '0.5rem' }}>
            {[
              "Lakeside American (D'Boathaus / Emerald Point)",
              "Sushi & Japanese (Tokyo Plum House, Warwick)",
              "Mexican w/ frozen margaritas (Bone Yard Cantina)",
              "Upscale Italian (Cibo e Vino)",
              "Cool moody bar food (The Fed of Warwick — converted bank)",
            ].map((opt) => (
              <label key={opt} className="multi-checkbox">
                <input
                  type="checkbox"
                  checked={(formData.dinnerVote || []).includes(opt)}
                  onChange={() => toggleMulti('dinnerVote', opt)}
                />
                {opt}
              </label>
            ))}
          </div>
        </Field>
      </section>

      <Divider />

      {/* SECTION 3 — TELL US ABOUT YOU */}
      <section style={{ padding: '4rem 1.5rem', maxWidth: '640px', margin: '0 auto' }}>
        <SectionHeader kicker="Chapter the Fourth" title="Tell Us About You" subtitle="The fun part. There are no wrong answers." />

        <Field label="Scents That Pull You In" helper="Pick all that hit. There's no limit.">
          <div style={{ marginTop: '0.5rem' }}>
            {[
              '🌹 Floral (rose, jasmine, peony, tuberose)',
              '🌲 Woodsy (cedar, sandalwood, oak, pine)',
              '🍂 Earthy (moss, vetiver, patchouli, dirt-after-rain)',
              '🍊 Citrus (bergamot, blood orange, grapefruit, lemon)',
              '🍯 Sweet (vanilla, honey, caramel, brown sugar)',
              '🌶️ Spicy (clove, cinnamon, black pepper, cardamom)',
              '🌊 Fresh (sea salt, linen, eucalyptus, mint)',
              '🕯️ Smoky (incense, leather, tobacco, fireplace)',
              '☕ Gourmand (coffee, almond croissant, chocolate)',
            ].map((opt) => (
              <label key={opt} className="multi-checkbox">
                <input
                  type="checkbox"
                  checked={(formData.scents || []).includes(opt)}
                  onChange={() => toggleMulti('scents', opt)}
                />
                {opt}
              </label>
            ))}
          </div>
        </Field>

        <Field label="A Smell You'd Bottle If You Could" helper={`"My grandma's kitchen at Christmas." "The book aisle at a used bookstore." "First cold day of October."`}>
          <textarea onChange={(e) => update('scentBottle', e.target.value)} />
        </Field>

        <Field label="A Smell That Gives You The Ick" helper={`"Anything coconut." "Lavender. I know it's basic to hate but I do."`}>
          <textarea onChange={(e) => update('scentIck', e.target.value)} />
        </Field>

        <Field label="Your Ideal Night IN" helper="Set the scene. Be specific.">
          <textarea onChange={(e) => update('nightIn', e.target.value)} />
        </Field>

        <Field label="There's a cat in the road. It's making direct eye contact with you. What is happening here?" helper="Pick the one that feels truest.">
          <div style={{ marginTop: '0.5rem' }}>
            {[
              "It has a message and I have to figure out what.",
              "It is judging me. Fair.",
              "It's a test. I refuse to be the first to look away.",
              "It's clearly a god in disguise. I bow slightly.",
              "I am late for something but this is also important.",
              "This cat lives here now. I'll explain to my landlord.",
              "I have already lost. I drive around it.",
            ].map((opt) => (
              <button key={opt} type="button"
                className={`radio-option ${formData.q1 === opt ? 'selected' : ''}`}
                onClick={() => update('q1', opt)}>
                {opt}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Someone you knew in high school messages you out of nowhere. &quot;Hey, weird question.&quot; What do you reply?">
          <div style={{ marginTop: '0.5rem' }}>
            {[
              "\"Yes.\"",
              "\"How weird are we talking.\"",
              "\"Hi! What's up :)\" (I will regret this immediately)",
              "I leave them on read for 3 to 6 business days.",
              "I screenshot it and send it to my group chat first.",
              "\"I'm doing fine, thanks for asking, you?\" (deflect, redirect, evade)",
              "I'm already drafting three different responses. I will send none of them.",
            ].map((opt) => (
              <button key={opt} type="button"
                className={`radio-option ${formData.q2 === opt ? 'selected' : ''}`}
                onClick={() => update('q2', opt)}>
                {opt}
              </button>
            ))}
          </div>
        </Field>

        <Field label="You're at dinner. Someone at the table says something so wrong it stops time. What's your move?">
          <div style={{ marginTop: '0.5rem' }}>
            {[
              "Direct correction. Polite. Final.",
              "I make a face. They will see it. They will know.",
              "I ask one extremely specific follow-up question and watch them dig.",
              "I say nothing. I will be unpacking this for weeks.",
              "I agree with them on purpose to see how far it goes.",
              "I change the subject so smoothly no one notices what I did.",
              "I write it down later. This is going in the bit.",
            ].map((opt) => (
              <button key={opt} type="button"
                className={`radio-option ${formData.q3 === opt ? 'selected' : ''}`}
                onClick={() => update('q3', opt)}>
                {opt}
              </button>
            ))}
          </div>
        </Field>

        <Field label="The weekend is over. You're driving home alone. What's in the cup holder?">
          <div style={{ marginTop: '0.5rem' }}>
            {[
              "A perfect coffee. Calculated. Optimized.",
              "A water bottle that's been there since Saturday.",
              "Whatever I could grab. There are crumbs.",
              "A small souvenir from the trip I will keep forever.",
              "An old napkin with someone's number on it.",
              "A drink someone else made me. I don't know what's in it. It's delicious.",
              "Nothing. The cup holder is sacred.",
            ].map((opt) => (
              <button key={opt} type="button"
                className={`radio-option ${formData.q4 === opt ? 'selected' : ''}`}
                onClick={() => update('q4', opt)}>
                {opt}
              </button>
            ))}
          </div>
        </Field>
      </section>

      <Divider />

      {/* SECTION 4 — STARS */}
      <section style={{ padding: '4rem 1.5rem', maxWidth: '640px', margin: '0 auto' }}>
        <SectionHeader kicker="Chapter the Fifth" title="The Stars" subtitle="Optional, but fun. We're going extra." />

        <Field label="Your Birth Date" helper="Month and day are enough; year is optional.">
          <input type="text" placeholder="e.g. September 14, 1992 — or just Sept 14" onChange={(e) => update('birthDate', e.target.value)} />
        </Field>

        <Field label="Co-Star Username (optional)" helper={
          <>
            If you're on Co-Star, share your username so we can read everyone's chart together.
            <br />
            <a href="https://www.costarastrology.com/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--gold)' }}>Don't have it? Download Co-Star here →</a>
          </>
        }>
          <input type="text" placeholder="@username" onChange={(e) => update('costar', e.target.value)} />
        </Field>
      </section>

      <Divider />

      {/* PRESENTATION */}
      <section style={{ padding: '4rem 1.5rem', maxWidth: '640px', margin: '0 auto' }}>
        <SectionHeader kicker="Chapter the Sixth" title="The Presentation" />
        <div style={{ fontSize: '1.15rem', textAlign: 'center' }}>
          <p style={{ maxWidth: '500px', margin: '0 auto' }}>
            Somewhere during the weekend, a slideshow night.
          </p>
          <p style={{ maxWidth: '500px', margin: '1.5rem auto 0', fontStyle: 'italic', color: 'var(--cream-soft)' }}>
            The kind where everyone's made something completely unhinged about something they care way too much about. Format, length, topic — entirely open. The only ask: make it something only you would make.
          </p>
        </div>
      </section>

      <Divider />

      {/* COIN */}
      <section style={{ padding: '4rem 1.5rem', maxWidth: '760px', margin: '0 auto' }}>
        <SectionHeader kicker="Chapter the Seventh" title="The Coin" subtitle="Pricing will be updated as soon as everything is locked." />
        <div style={{ borderTop: '1px solid var(--gold)', borderBottom: '1px solid var(--gold)' }}>
          {TRIP.costBreakdown.map((row, i) => (
            <div key={i} style={{
              display: 'flex', justifyContent: 'space-between',
              padding: '1.1rem 0', gap: '1rem',
              borderBottom: i < TRIP.costBreakdown.length - 1 ? '1px solid rgba(168, 132, 58, 0.2)' : 'none',
            }}>
              <div style={{ fontFamily: 'IM Fell English, serif', fontSize: '1.1rem' }}>{row.item}</div>
              <div style={{ color: 'var(--moss)', fontStyle: 'italic', textAlign: 'right' }}>{row.note}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: '2.5rem', textAlign: 'center' }}>
          <p>Send your share to <strong style={{ color: 'var(--gold)', letterSpacing: '0.05em' }}>{TRIP.venmo}</strong> with the memo "Crown &amp; Vow."</p>
        </div>
      </section>

      <Divider />

      {/* SUBMIT */}
      <section style={{ padding: '4rem 1.5rem', maxWidth: '640px', margin: '0 auto', textAlign: 'center' }}>
        <SectionHeader kicker="The Final Page" title="By Your Hand" />
        {!submitted ? (
          <>
            <p style={{ fontStyle: 'italic', marginBottom: '2rem', color: 'var(--cream-soft)' }}>
              When you've answered everything above, sign and send.
              <br />Replies route directly to Kristen.
            </p>
            <button className="btn btn-primary" onClick={submit} style={{ fontSize: '1rem', padding: '1rem 2.5rem' }}>
              ❦ Sign &amp; Send ❦
            </button>
          </>
        ) : (
          <div className="parchment" style={{ padding: '3rem', border: '1px solid var(--gold)' }}>
            <h3 style={{ fontFamily: 'IM Fell English, serif', color: 'var(--oxblood)', fontWeight: 'normal' }}>
              The court receives you.
            </h3>
            <p style={{ color: 'var(--ink)', fontStyle: 'italic' }}>
              Reply received. See you in the wood, {formData.name || 'friend'}.
            </p>
          </div>
        )}
      </section>

      {/* FOOTER */}
      <footer style={{ padding: '3rem 1.5rem', textAlign: 'center', borderTop: '1px solid rgba(168, 132, 58, 0.3)', marginTop: '4rem' }}>
        <div style={{ fontFamily: 'IM Fell English SC, serif', letterSpacing: '0.4em', color: 'var(--gold)', fontSize: '0.85rem' }}>
          CROWN &amp; VOW
        </div>
        <div style={{ fontStyle: 'italic', color: 'var(--moss)', fontSize: '0.9rem', marginTop: '0.5rem' }}>
          For Marlena · September 2026
        </div>
      </footer>
    </>
  );
}
