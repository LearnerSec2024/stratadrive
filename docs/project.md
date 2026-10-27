# Product and roadmap

StrataDrive supports a driving instruction business: first one owner/instructor, later several instructors. The owner is the product decision maker. Future actors include instructors, prospects and learners; guardian access remains an explicit future requirements decision.

| Phase | Outcome | Current scope |
| --- | --- | --- |
| 0 | Project foundation | Repository foundation implemented; operational acceptance pending |
| 1 | Public website and enquiries | 1A provisional visual approval; 1B local synthetic enquiry intake implemented and locally verified. Explicit 1B owner manual acceptance and public-launch decisions remain pending |
| 2 | CRM and enquiry workflow | Deferred |
| 3 | Instructor availability and booking | Deferred |
| 4 | Lesson records and competency assessments | Deferred |
| 5 | Customer progress portal | Deferred |
| 6 | Communications and automation | Deferred |
| 7 | Multi-instructor operations | Deferred |

See [progress and phase history](progress.md) for dated finished work, validation, decisions, outstanding items and links to detailed phase records. Update that history at each work handoff; a prepared plan or passing tests do not imply owner acceptance.

[Technology stack](tech-stack.md) is the single current reference for components, purposes, versions, the visual data flow and implemented/deferred status. This roadmap owns product scope rather than a separate technology inventory.

The historical 0A scope excluded business endpoints, forms, CRM, booking, authentication, database schema, customer information and deployments. The later approved local synthetic enquiry scope is recorded in [Iteration 1B](iterations/1b.md); it does not authorize real customer data or deployment. Defining an architectural boundary does not authorize implementing it.

Before relevant feature work, resolve hosting, enquiry retention/consent, learner/guardian relationships, instructor permissions, booking timezone/duration/cancellation rules and whether future independent businesses are in scope. Multiple employees within one business do not by themselves require SaaS tenancy.
