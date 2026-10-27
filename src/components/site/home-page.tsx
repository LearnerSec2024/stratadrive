import Image from "next/image";
import Link from "next/link";
import { Icon } from "./icon";

const journeys = [
  { icon: "compass" as const, number: "01", title: "New to the driver's seat", text: "Get your bearings. Think about the basics, becoming comfortable with the controls and finding your rhythm.", link: "Explore first steps", className: "" },
  { icon: "road" as const, number: "02", title: "Finding your flow", text: "Build on what you know. Consider the skills you'd like to practise and the situations you'd like to feel more comfortable in.", link: "Picture your progress", className: "journey-card-blue" },
  { icon: "leaf" as const, number: "03", title: "Back behind the wheel", text: "A fresh start can begin with a small step. Take a moment to think about what would help you feel ready to drive again.", link: "Find your next step", className: "journey-card-dark" },
];

const questions = [
  ["Can I book a lesson now?", "Not yet. This is a preview of StrataDrive's website and booking journey. No lesson can be reserved or paid for here. You can explore the preview without entering personal information."],
  ["What lesson options will be available?", "Lesson options, prices and service areas are still being finalised. Confirmed information will be provided before online booking opens. The learning journeys shown here are ideas, not confirmed lesson packages."],
  ["Do I need to enter my personal details?", "No. The booking preview asks only about a general starting-point preference, which stays in the current page and is cleared when you leave or restart. There are no contact-detail fields or submissions."],
  ["Where can I find instructor and contact information?", "Instructor information and public contact details will be confirmed before launch. The image on this page is illustrative and does not show an actual StrataDrive vehicle or location."],
];

export function HomePage() {
  return (
    <main id="main-content" tabIndex={-1}>
      <section className="hero container" aria-labelledby="hero-heading">
        <div className="hero-copy">
          <p className="eyebrow"><span className="eyebrow-line" />A FRESH PERSPECTIVE ON LEARNING TO DRIVE</p>
          <h1 id="hero-heading">Your next step towards <span>confident driving.</span></h1>
          <p className="hero-description">A little direction. A little more confidence. Explore a thoughtful approach to your next chapter behind the wheel.</p>
          <div className="hero-actions"><Link href="/book" className="button button-primary">Book a lesson<Icon name="arrow" /></Link><Link href="#how-it-works" className="text-link">See how it works<Icon name="chevron" /></Link></div>
          <div className="hero-notes"><span><Icon name="check" />A clear path forward</span><span><Icon name="check" />At your own pace</span></div>
          <Link href="/enquire" className="text-link hero-enquiry-link">Try a sample lesson enquiry<Icon name="arrow" /></Link>
        </div>
        <figure className="hero-figure">
          <div className="hero-image-wrap"><Image src="/images/driving-hero.webp" alt="Illustrative blue car on a quiet tree-lined countryside road" fill sizes="(max-width: 760px) 100vw, 55vw" priority className="hero-image" /><div className="image-tag"><span className="image-tag-dot" />THE ROAD AHEAD</div><Link href="/book" className="image-callout"><span className="callout-icon"><Icon name="compass" /></span><span><strong>Every journey has a first step.</strong><span>Explore the booking preview<Icon name="arrow" /></span></span></Link></div>
          <figcaption>Illustrative image · Not an actual StrataDrive vehicle or service location</figcaption>
        </figure>
      </section>

      <div className="container direction-strip"><p>A little direction makes<br /><strong>all the difference.</strong></p><div><span><Icon name="compass" />Get your bearings</span><span><Icon name="road" />Find your rhythm</span><span><Icon name="leaf" />Look ahead</span></div></div>

      <section className="section container" id="lessons" aria-labelledby="lessons-heading">
        <div className="section-heading"><div><p className="eyebrow">FIND YOUR STARTING POINT</p><h2 id="lessons-heading">Your journey.<br /><span className="muted-heading">Your pace.</span></h2></div><p>Everyone brings a different starting point. These learning journey ideas help you think about what comes next. Confirmed lesson options will follow before launch.</p></div>
        <div className="journey-grid">{journeys.map((item) => <article key={item.number} className={`journey-card ${item.className}`}><div className="journey-card-top"><span className="journey-icon"><Icon name={item.icon} /></span><span className="card-number">{item.number}</span></div><h3>{item.title}</h3><p>{item.text}</p><Link href="/book" className="card-link">{item.link}<Icon name="arrow" /></Link></article>)}</div>
      </section>

      <section className="how-section" id="how-it-works" aria-labelledby="how-heading"><div className="container"><div className="how-heading"><div><p className="eyebrow eyebrow-light">LESS GUESSWORK. MORE DIRECTION.</p><h2 id="how-heading">A simpler way to<br />picture your next step.</h2></div><div><span className="light-label">Booking flow preview</span><p>From understanding your starting point to seeing what comes next. A preview of a clearer journey.</p></div></div><div className="steps-grid"><article><span className="step-number">01</span><h3>Find your starting point</h3><p>Explore a general learning preference. No personal details needed.</p></article><article><span className="step-number">02</span><h3>Look at the road ahead</h3><p>See where availability will appear when real booking is connected.</p></article><article><span className="step-number">03</span><h3>Understand what&apos;s next</h3><p>Review the preview and return home. No lesson is reserved.</p></article></div><Link href="/book" className="button button-white">Explore the journey<Icon name="arrow" /></Link></div></section>

      <section className="section faq-section container" id="faqs" aria-labelledby="faq-heading"><div><p className="eyebrow">A LITTLE CLARITY</p><h2 id="faq-heading">Good questions.<br /><span className="muted-heading">Clear answers.</span></h2><p className="faq-intro">A few things to know before exploring the preview.</p></div><div className="faq-list">{questions.map(([question, answer]) => <details key={question}><summary>{question}<span className="faq-plus" aria-hidden="true">+</span></summary><p>{answer}</p></details>)}</div></section>

      <section className="container final-cta"><div><p className="eyebrow">YOUR NEXT CHAPTER STARTS WITH A LOOK</p><h2>Picture the road ahead.</h2><p>Explore the booking journey. No details to fill in. No commitment.</p></div><Link href="/book" className="button button-primary">Explore the booking preview<Icon name="arrow" /></Link></section>
    </main>
  );
}
