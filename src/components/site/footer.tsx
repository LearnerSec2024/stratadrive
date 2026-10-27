import Link from "next/link";
import { BrandMark } from "./icon";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container footer-top">
        <div><Link href="/" className="brand" aria-label="StrataDrive home"><BrandMark /><span>Strata<span className="brand-light">Drive</span></span></Link><p>A clearer direction for your driving journey.</p></div>
        <nav aria-label="Footer navigation"><Link href="/#lessons">Lesson journey</Link><Link href="/#how-it-works">How it works</Link><Link href="/#faqs">FAQs</Link><Link href="/enquire">Make an enquiry</Link><Link href="/book">Booking preview</Link></nav>
      </div>
      <div className="container footer-bottom"><span>© 2026 StrataDrive</span><span>Local website preview · Service details to be confirmed</span></div>
    </footer>
  );
}
