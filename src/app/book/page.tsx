import type { Metadata } from "next";
import Link from "next/link";
import { BookingPreview } from "@/components/site/booking-preview";
import { Icon } from "@/components/site/icon";

export const metadata: Metadata = { title: "Booking preview | StrataDrive", description: "Explore the StrataDrive lesson journey preview. Online booking is not available yet; no personal information is collected." };

export default function BookPage() {
  return (
    <main id="main-content" className="booking-page container" tabIndex={-1}>
      <nav className="breadcrumbs" aria-label="Breadcrumb"><Link href="/">Home</Link><Icon name="chevron" /><span aria-current="page">Booking preview</span></nav>
      <div className="booking-page-heading"><p className="eyebrow">A PREVIEW OF THE ROAD AHEAD</p><h1>Explore your lesson journey.</h1><p>A little planning. A clearer direction. Take a look at the steps, without entering your personal details.</p></div>
      <aside className="booking-disclosure" aria-label="Booking preview information"><Icon name="info" /><p><strong>Online booking is not available in this preview.</strong> No dates are available and no lessons can be reserved.</p></aside>
      <BookingPreview />
    </main>
  );
}
