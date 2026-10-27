import type { Metadata } from "next";
import Link from "next/link";
import { EnquiryForm } from "@/components/site/enquiry-form";
import { Icon } from "@/components/site/icon";

export const metadata: Metadata = { title: "Make an enquiry | StrataDrive", description: "Try StrataDrive's local lesson enquiry preview using sample details. No lesson is booked and no email is sent." };

export default function EnquirePage() {
  return <main id="main-content" className="enquiry-page container" tabIndex={-1}>
    <nav className="breadcrumbs" aria-label="Breadcrumb"><Link href="/">Home</Link><Icon name="chevron" /><span aria-current="page">Make an enquiry</span></nav>
    <div className="enquiry-heading"><p className="eyebrow">YOUR JOURNEY STARTS WITH A CONVERSATION</p><h1>Let&apos;s talk about your next step.</h1><p>A little direction can make the road ahead feel clearer. Explore the next step with a sample lesson enquiry.</p></div>
    <aside className="booking-disclosure" aria-label="Local enquiry preview information"><Icon name="info" /><p><strong>Local preview — use made-up details only.</strong> Enquiries are saved locally. No lesson is booked and no email is sent.</p></aside>
    <div className="enquiry-layout"><EnquiryForm /><aside className="enquiry-guide" aria-labelledby="enquiry-guide-heading"><span className="enquiry-guide-icon"><Icon name="compass" /></span><p className="eyebrow">ONE CLEAR NEXT STEP</p><h2 id="enquiry-guide-heading">A little confidence starts here.</h2><p>Whether you are imagining your first lesson or finding your way back behind the wheel, a clear starting point helps.</p><ol><li><span>01</span><div><strong>Share a sample enquiry</strong><p>Use a made-up name and email address to try this preview.</p></div></li><li><span>02</span><div><strong>See a saved receipt</strong><p>A receipt appears only after your enquiry has been saved.</p></div></li><li><span>03</span><div><strong>Keep the next step clear</strong><p>There is no reservation, payment or email in this preview.</p></div></li></ol><Link href="/book" className="text-link">Explore the booking preview<Icon name="arrow" /></Link></aside></div>
  </main>;
}
