# Ìjènkéọ́mā Pitch Deck

## Community-powered transport intelligence for Lagos

Helping commuters discover routes, compare fares and navigate Lagos with better local information.

Live platform: [ijenkeoma.com](https://ijenkeoma.com/)

---

## 1. The problem

Lagos commuters often depend on fragmented, informal transport knowledge.

- Routes are difficult to discover online.
- Fares vary by vehicle, time and negotiation.
- Transfer points and stops are not consistently documented.
- Safety and road-condition information changes frequently.
- Existing navigation tools often underserve informal transport.
- Every commuter repeatedly solves the same route-information problem.

**Result:** wasted time, unexpected fares, uncertainty and avoidable travel stress.

---

## 2. Our solution

Ìjènkéọ́mā converts local commuter knowledge into structured, searchable transport intelligence.

Users can:

- Search routes between Lagos locations.
- Compare fares.
- View stops and transfer points.
- Discover alternative journeys.
- See road-condition and security notes.
- Add corrections and new routes.
- Earn rewards for contributing useful information.

### The core loop

**More contributors → more route data → better commuter decisions → more users → more contributors.**

---

## 3. Product

Ìjènkéọ́mā is a mobile-first web application and installable PWA.

### Current capabilities

- Route and destination lookup.
- Base, peak and off-peak fare information.
- Danfo, korope, BRT, keke, okada, hitch and sienna coverage.
- Stop-by-stop route records.
- Alternative route suggestions.
- Community comments and voting.
- Contributor XP and leaderboards.
- Referral incentives.
- Push-notification reminders.
- Route editing and duplicate-submission protection.

---

## 4. Early traction

### Live data collected as of 2 November 2026

| Metric | Current figure |
|---|---:|
| Route records | **470** |
| Unique route IDs | **470** |
| Identified contributors | **35** |
| Stop records | **926** |
| Alternative-route records | **143** |
| Average stops per route | **1.97** |
| Routes with stop data | **100%** |
| Routes with condition data | **98.1%** |
| Routes with security notes | **95.7%** |

The data spans from **26 June to 1 November 2026**.

---

## 5. Growth

Compared with the earlier 137-route snapshot:

- Route records increased by **333**.
- The route database grew by approximately **243%**.
- Contributors increased from **26 to 35**.
- Stop records increased from **235 to 926**.
- Alternative routes increased from **28 to 143**.

The network is growing not only in route count, but also in stops, alternatives, conditions and safety information.

---

## 6. Transport coverage

| Transport mode | Routes containing the mode |
|---|---:|
| Danfo | **411** |
| Korope | **143** |
| BRT | **125** |
| Keke | **114** |
| Okada | **71** |
| Sienna | **53** |
| Hitch | **10** |

Ìjènkéọ́mā is designed around the transport modes Lagos commuters actually use, not only formal public transit.

---

## 7. Fare intelligence

Current recorded fare data includes:

- **470** routes with base fare information.
- **468** routes with peak fare information.
- **151** routes with off-peak fare information.
- Average recorded fare value: approximately **₦1,938**.
- Recorded fare range: **₦150–₦30,003**.

Fare data is contextualized by vehicle type, time of day, peak and off-peak periods, negotiability and community notes.

The upper fare outlier should be validated before being presented as representative of normal journeys.

---

## 8. Why the data becomes valuable

Every contribution improves several layers of the platform:

1. **Consumer utility:** better route and fare decisions.
2. **Data network effects:** more contributors create broader route coverage.
3. **Freshness:** local users can update changing fares and conditions.
4. **Structured mobility dataset:** route, stop, fare, vehicle and safety information become machine-readable.
5. **Future intelligence products:** AI route assistance, mobility analytics and transport insights.

---

## 9. Engagement and contribution model

The product is designed to make data contribution repeatable.

### Incentives include

- XP for submitting routes.
- XP for adding alternatives.
- Rewards for useful route conditions and information.
- Comment participation rewards.
- Referral bonuses of approximately **500–1,500 XP**.
- Daily challenges.
- Leaderboards.
- Lucky Window reward mechanics.
- Push reminders encouraging new submissions.

The objective is to transform occasional commuter knowledge into a continuing data-contribution habit.

---

## 10. Technology and defensibility

### Current architecture

- React and Vite frontend.
- Vercel production deployment.
- Google Apps Script API.
- Google Sheets operational data store.
- PWA installation support.
- Web Push notifications.
- Automated route-data export.
- ML dataset-generation pipeline.

### Defensibility

The strongest long-term asset is the proprietary, locally sourced dataset:

- Lagos-specific.
- Community-generated.
- Continuously updated.
- Structured around informal transport.
- Enriched with stops, fares, conditions and safety notes.

---

## 11. AI opportunity

The platform is building the foundation for an AI-powered Lagos route assistant.

The future assistant could answer:

- What is the cheapest way from Ilasamaja to Lekki?
- Which buses should I take?
- Where do I change vehicles?
- What fare should I expect?
- Is this route suitable at night?
- What alternatives are available?

### Current position

The recommended sequence is:

1. Retrieval-augmented route answers.
2. Search and recommendation.
3. Data-quality validation.
4. Continued collection.
5. Fine-tuning after the dataset becomes larger and cleaner.

---

## 12. Market opportunity

Lagos provides a large and recurring use case:

- Millions of urban journeys.
- Heavy reliance on informal and semi-formal transport.
- Frequent fare and route changes.
- High demand for reliable local travel information.
- Large potential user base among commuters, students, workers and visitors.

### Initial market

- Lagos daily commuters.
- Students and first-time travelers.
- Ride-hailing and delivery drivers.
- Employers supporting staff mobility.
- Transport researchers and planners.
- Mobility and logistics companies.

---

## 13. Business model

Potential revenue streams include:

### Consumer products

- Premium route intelligence.
- Fare alerts.
- Saved routes and commute monitoring.
- Sponsored commuter features.

### B2B data products

- Mobility-data APIs.
- Route and fare intelligence for logistics companies.
- Delivery and fleet-planning tools.
- Transport research datasets.
- Institutional mobility dashboards.

### Partnerships

- Employers.
- Universities.
- Mobility startups.
- Transport operators.
- Urban-planning organizations.
- Public-sector transport initiatives.

The immediate priority is adoption and data quality; monetization should follow validated usage patterns.

---

## 14. Current stage

### Live MVP entering early-scale pilot

Ìjènkéọ́mā has moved beyond the concept and prototype stage:

- Live public deployment.
- Working contribution workflow.
- Real route records.
- Community incentives.
- Operational backend.
- Push-notification infrastructure.
- Growing contributor base.
- Automated data pipeline.

### What remains to validate

- Monthly active users.
- Retention.
- Search frequency.
- Route accuracy.
- Geographic coverage.
- Data freshness.
- Contribution-to-user conversion.
- Commercial demand.

---

## 15. Roadmap

### Phase 1: Validate — current

- Grow route coverage.
- Improve route quality.
- Measure user activity.
- Identify high-demand corridors.
- Establish verification workflows.

### Phase 2: Expand

- Increase contributor acquisition.
- Add stronger search and filtering.
- Introduce route freshness scores.
- Expand across Lagos districts.
- Launch structured commuter feedback.

### Phase 3: Intelligence

- Retrieval-based route assistant.
- Personalized route recommendations.
- Fare-change alerts.
- Route confidence scoring.
- API access for partners.

### Phase 4: Scale

- Expand beyond Lagos.
- Build B2B mobility products.
- Develop partnerships with operators, institutions and mobility platforms.

---

## 16. The ask

We are seeking support to move from early pilot to scaled Lagos deployment.

### Funding and partnership would support

- Product and engineering development.
- Community contributor acquisition.
- Route verification and data quality.
- Analytics and user research.
- Infrastructure scaling.
- AI and search development.
- Partnerships with mobility organizations.

### Near-term success targets

- 1,000+ route records.
- 100+ active contributors.
- Wider Lagos geographic coverage.
- Measurable repeat usage.
- Verified route-quality metrics.
- Production retrieval-based route assistant.

---

## 17. Closing

### Lagos moves on local knowledge.

Ìjènkéọ́mā is turning that knowledge into a living transport intelligence network.

> **Better route information for commuters.  
> Better mobility data for Lagos.  
> A stronger foundation for the future of urban transport.**

### Closing traction statement

> **Ìjènkéọ́mā is a live community-powered Lagos transport intelligence platform with 470 route records, 926 mapped stops, 143 alternative journeys and 35 identified contributors. We are now moving from MVP validation into early-scale pilot deployment, with the goal of becoming the trusted information layer for Lagos mobility.**

