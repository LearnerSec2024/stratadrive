"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { Icon } from "./icon";

const steps = ["Your starting point", "Availability", "What's next"];
const preferences = [
  { value: "new", title: "I'm new to driving", text: "Thinking about the first steps behind the wheel." },
  { value: "practice", title: "I've practised before", text: "Looking ahead to the next stage of learning." },
  { value: "returning", title: "I'm returning to driving", text: "Considering a fresh start and a little more confidence." },
];

export function BookingPreview() {
  const [step, setStep] = useState(0);
  const [preference, setPreference] = useState("");
  const heading = useRef<HTMLHeadingElement>(null);
  function goToStep(next: number) {
    setStep(next);
    requestAnimationFrame(() => heading.current?.focus());
  }

  function restart() { setPreference(""); goToStep(0); }

  return (
    <div className="booking-shell">
      <nav className="booking-progress" aria-label="Booking preview steps"><ol>{steps.map((label, index) => <li key={label}><button type="button" onClick={() => goToStep(index)} aria-current={step === index ? "step" : undefined}><span className="progress-number">{index + 1}</span><span>{label}<small>{index === 0 ? "Get your bearings" : index === 1 ? "See where times will appear" : "Understand the next step"}</small></span></button></li>)}</ol><div className="progress-note"><Icon name="info" /><p>This is a preview, not a reservation. No personal information is collected.</p></div></nav>
      <section className="booking-panel" aria-labelledby="preview-step-heading">
        <p className="eyebrow">STEP {step + 1} OF 3 · PREVIEW</p>
        {step === 0 && <><h2 ref={heading} tabIndex={-1} id="preview-step-heading">Every journey starts somewhere.</h2><p className="panel-intro">Choose a general starting point to explore the preview. This preference stays on this page only.</p><fieldset className="preference-options"><legend>Where are you starting from?</legend>{preferences.map((item) => <label key={item.value} className={`preference-option ${preference === item.value ? "is-selected" : ""}`}><input type="radio" name="starting-point" value={item.value} checked={preference === item.value} onChange={() => setPreference(item.value)} /><span><strong>{item.title}</strong><span>{item.text}</span></span></label>)}</fieldset><div className="panel-actions"><span className="small-note">No contact details needed.</span><button type="button" className="button button-primary" onClick={() => goToStep(1)}>Continue to availability<Icon name="arrow" /></button></div></>}
        {step === 1 && <><h2 ref={heading} tabIndex={-1} id="preview-step-heading">Availability will live here.</h2><p className="panel-intro">When online booking is ready, this is where real instructor and lesson times will appear.</p><div className="availability-empty"><span className="availability-icon"><Icon name="calendar" /></span><h3>No live availability</h3><p>No instructors or times are connected in this preview. There are no dates to select or lessons to reserve.</p><span className="availability-label">Preview only</span></div><div className="panel-actions"><button type="button" className="text-link" onClick={() => goToStep(0)}>Back</button><button type="button" className="button button-primary" onClick={() => goToStep(2)}>See what&apos;s next<Icon name="arrow" /></button></div></>}
        {step === 2 && <><h2 ref={heading} tabIndex={-1} id="preview-step-heading">A clearer picture of the journey.</h2><p className="panel-intro">That&apos;s the shape of the booking experience. This preview ends here.</p><dl className="preview-summary"><div><dt>Your starting point</dt><dd>{preferences.find((item) => item.value === preference)?.title ?? "Not selected"}</dd></div><div><dt>Lesson availability</dt><dd>Not connected</dd></div></dl><div className="honest-outcome"><Icon name="info" /><p><strong>No lesson has been booked.</strong> No enquiry has been sent and no payment has been taken. Confirmed lesson and contact information will follow before launch.</p></div><div className="panel-actions"><button type="button" className="text-link" onClick={restart}>Start again</button><Link href="/" className="button button-primary">Back to home<Icon name="arrow" /></Link></div></>}
      </section>
    </div>
  );
}

