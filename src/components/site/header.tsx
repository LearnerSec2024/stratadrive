"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { BrandMark, Icon } from "./icon";

const navigation = [
  { href: "/#lessons", text: "Lesson journey" },
  { href: "/#how-it-works", text: "How it works" },
  { href: "/#faqs", text: "FAQs" },
  { href: "/enquire", text: "Make an enquiry" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    function escapeMenu(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        toggle.current?.focus();
      }
    }
    document.addEventListener("keydown", escapeMenu);
    return () => document.removeEventListener("keydown", escapeMenu);
  }, [open]);

  return (
    <>
      <a href="#main-content" className="skip-link">Skip to content</a>
      <div className="preview-strip">
        <div className="container preview-strip-inner"><span className="preview-label">Preview</span><span>A look at the road ahead. Online booking is not available yet.</span></div>
      </div>
      <header className="site-header">
        <div className="container header-inner">
          <Link href="/" className="brand" aria-label="StrataDrive home" onClick={() => setOpen(false)}><BrandMark /><span>Strata<span className="brand-light">Drive</span></span></Link>
          <nav className="desktop-nav" aria-label="Main navigation">
            {navigation.map((item) => <Link key={item.href} href={item.href}>{item.text}</Link>)}
          </nav>
          <Link className="button button-primary header-book" href="/book">Book a lesson<Icon name="arrow" /></Link>
          <button ref={toggle} type="button" className="menu-toggle" aria-expanded={open} aria-controls="mobile-navigation" aria-label={open ? "Close navigation" : "Open navigation"} onClick={() => setOpen(!open)}><Icon name={open ? "close" : "menu"} /></button>
        </div>
        <nav className="mobile-nav container" id="mobile-navigation" aria-label="Mobile navigation" hidden={!open}>
          {navigation.map((item) => <Link key={item.href} href={item.href} onClick={() => setOpen(false)}>{item.text}</Link>)}
          <Link href="/book" onClick={() => setOpen(false)}>Book a lesson<Icon name="arrow" /></Link>
        </nav>
      </header>
    </>
  );
}
