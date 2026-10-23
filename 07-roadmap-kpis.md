# Sthamly — Roadmap, KPIs and Risks

## 1. Roadmap (90 days, then beta)

Dates assume the start on 23 October 2026. Adjust as needed.

| Weeks | Dates (approx.) | Focus | Deliverables | Exit check |
|---|---|---|---|---|
| 1–2 | 23 Oct – 6 Nov | Foundation | Finalise scope (`02`); create Supabase dev project; run `001_schema.sql` and `002_policies.sql`; Next.js PWA skeleton on Vercel preview; brand basics | Login works on a phone; RLS tests pass |
| 1–4 | 23 Oct – 20 Nov | Content and legal kickoff (parallel) | Content v1: 3 doshas × food, routine, yoga, skin (target 60 items); quiz questions reviewed by 2 BAMS/MD reviewers; lawyer briefed on `06` | Reviewers have signed off on quiz and 30+ items |
| 3–5 | 6 Nov – 27 Nov | Core loop | Quiz, result, daily plan (rules v1), symptom log, trend view | A test user can complete quiz → plan → log for 7 days |
| 4–7 | 13 Nov – 11 Dec | Consultation | Practitioner onboarding and verification queue; availability; hold → Razorpay test order → webhook → confirmation; video room; reminders | All acceptance tests in `04` §14 pass in staging |
| 6–8 | 27 Nov – 25 Dec | Subscription and admin | Plus subscription (test mode); admin panel; refunds queue; data export and delete | Subscribe, cancel, export and delete work end to end |
| 8–9 | 18 Dec – 8 Jan | Closed beta | 50–100 invited users; 5+ verified practitioners; first consults | 10+ completed consults; no open P1 bugs |
| 10–12 | 8 Jan – 29 Jan | Public beta | Open waitlist; creator launch; referral; measure KPIs | Meets beta gate (§3) |

Note: the holiday season falls inside this plan. Plan the closed beta around it, or move it by two weeks.

## 2. Milestones

| Milestone | Target | Why it matters |
|---|---|---|
| M1 — Content v1 approved | Week 4 | No product without trusted content |
| M2 — Core loop works | Week 5 | Proves the daily habit idea |
| M3 — First paid consult | Week 8 | Proves the consult flow with real money (test mode first, then live) |
| M4 — Closed beta live | Week 9 | Real users, real feedback |
| M5 — First 100 paid subscribers or 50 paid consults (whichever comes first) | Week 14 | First evidence for pricing |
| M6 — Clinic pilot signed | Month 6 | B2B proof |

## 3. Beta gate (go / no-go for public launch)

All must hold for 4 consecutive weeks:

| Metric | Target |
|---|---|
| Quiz completion (started → result) | ≥ 60% |
| D7 retention (active on day 7 after sign-up) | ≥ 25% |
| Logs per active user per week | ≥ 3 |
| Plan opened on at least 4 days in a week | ≥ 40% of weekly actives |
| Consult booking rate (viewed a practitioner → booked) | ≥ 5% |
| Consult completion (confirmed → completed) | ≥ 85% |
| Practitioner no-show rate | ≤ 5% |
| Consult refund rate (excluding practitioner cancellations) | ≤ 10% |
| Average consult rating | ≥ 4.3 |
| Safety triggers reviewed within 48h | 100% |
| Open P1 bugs | 0 |

If the gate fails, do not expand marketing. Fix the metric that failed, then re-measure.

## 4. KPI dashboard (what to track weekly)

### Acquisition
- Visitors → sign-ups → quiz started → quiz completed
- Source of sign-up (creator, SEO, referral, direct)
- CAC by channel (once paid spend starts)

### Engagement
- DAU, WAU, MAU
- D1, D7, D30 retention
- Plan opened, items completed per plan
- Logs per week; share of users logging 3+ times
- Trend view opened

### Monetisation
- Free → Plus conversion
- Plus churn (monthly)
- ARPU (blended)
- Consult bookings per week; consult revenue; platform share
- Clinic accounts and their revenue (from month 6)
- LTV:CAC (measured, not assumed)

### Supply (practitioners)
- Applications → verified → listed → first booking
- Availability hours per practitioner per week
- Practitioner rating and no-show rate
- Payout accuracy (no disputes)

### Trust and safety
- Red-flag triggers per 1,000 logs
- Time to review a safety trigger
- Reviews hidden by moderation
- Data export and deletion requests and time to complete

### Content
- Items approved; items in review; items retired
- Share of plans using approved content (should be 100%)

## 5. Experiments to run in beta

| Question | Experiment | Decision rule |
|---|---|---|
| Is ₹249 the right Plus price? | Show two prices to random new users for 2 weeks | Choose the higher price if conversion difference is under 20% |
| Is ₹699 the right consult price? | Test ₹499 and ₹699 on separate practitioner listings | Choose the price with higher revenue per profile view |
| Does the trend view matter? | Compare log frequency with and without the trend view | Keep if logs per week rise by 20% or more |
| Do reminders help consults? | 24h reminder on vs off for a random half of bookings | Keep if completion rises by 5 points or more |
| Does the quiz blend result confuse people? | Ask 50 users to explain their result in their own words | Revise wording if fewer than 80% explain it correctly |

## 6. Risk register

| # | Risk | Likelihood | Impact | Mitigation | Owner |
|---|---|---|---|---|---|
| 1 | Regulatory: consultations or ads found to breach rules | Medium | High | Lawyer review (`06` §2–3); no disease claims; no prescriptions in v1; pause consults if advised | Founder |
| 2 | Medical harm: user ignores a serious symptom | Low | Very high | Red-flag layer; emergency message; disclaimer everywhere; reviewed word list | Founder + medical reviewer |
| 3 | Content quality: wrong or contested Ayurvedic advice | Medium | High | Reviewer sign-off; citations; disagreement holds content back | Content lead |
| 4 | Practitioner fraud or fake registration | Medium | High | Council register checks; document review; delisting process | Admin |
| 5 | Practitioner supply too thin for consults | High early | Medium | Start with 15–20 practitioners; online-only; time-zone-flexible slots | Founder |
| 6 | Payment failure or webhook bug causes double booking or missing confirmation | Medium | High | Partial unique index; idempotent webhooks; reconciliation job; acceptance tests | Founder |
| 7 | Data breach of health data | Low | Very high | RLS; encryption of notes; least privilege; audit logs; breach process | Founder |
| 8 | Low retention: users log once and leave | High | High | Plan-led daily loop; reminders; trend insight; measure D7 early | Product |
| 9 | Channel dependency on one creator | Medium | Medium | Multiple creators; SEO pages; referral | Growth |
| 10 | Solo founder bandwidth | High | High | Narrow v1; contract developer in phase 1; freeze scope with `02` | Founder |
| 11 | Store rejection (health-app policy) | Medium | Medium | Stay PWA until beta is proven; read store health policies before wrapping | Founder |
| 12 | Cost creep from video and messaging | Medium | Medium | Usage caps; reminders only for booked sessions; monthly cost review | Founder |
| 13 | Platform disputes with practitioners over payouts | Medium | Medium | Clear contract; weekly settlement statements; dispute window | Admin |
| 14 | Naming or trademark clash for "Sthamly" | Unknown | High | Trademark search before printing branded material | Founder |

## 7. Post-beta roadmap (high level)

| Version | Timing | Main additions |
|---|---|---|
| v1.1 | 1–2 months after beta | Hindi UI; WhatsApp reminders; recipe servings scaler; practitioner session notes UI polish |
| v2 | Months 4–6 | Family profiles (with child-consent design); recipe weekly planner; clinic accounts; AI Q&A over approved content (optional); store wrapper if beta is strong |
| v3 | Months 7–12 | Pattern insights from logs (practitioner-reviewed); sponsored partner listings (labelled); ranking personalisation |
