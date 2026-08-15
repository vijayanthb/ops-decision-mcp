# Incident Escalation Policy

## Severity Levels

**SEV-1 (Critical):** Full outage of a customer-facing system, data loss risk, or safety-related hardware fault (e.g. GPU thermal runaway, power distribution failure). Page on-call lead immediately. Notify VP Ops within 15 minutes. War room opens automatically.

**SEV-2 (High):** Significant degradation affecting a subset of customers or a single site. Page on-call engineer. Notify team lead within 30 minutes. Status page updated within 1 hour.

**SEV-3 (Medium):** Non-urgent issue with a workaround available. File a ticket, no page required. Resolve within 3 business days.

**SEV-4 (Low):** Cosmetic or informational. Backlog item.

## Escalation Path

1. On-call engineer triages and assigns severity within 10 minutes of alert.
2. If unresolved in 30 minutes (SEV-1) or 2 hours (SEV-2), escalate to team lead.
3. If unresolved in 1 hour (SEV-1), escalate to VP Ops and open a war room in #incident-response.
4. All SEV-1 and SEV-2 incidents require a postmortem within 48 hours of resolution, owned by the incident commander.

## Who to Page

- Compute Production issues → #compute-oncall
- Network/fabric issues → #network-oncall
- Facilities/power issues → #facilities-oncall
- Vendor-caused outages → notify Vendor Relations before paging engineering, unless SEV-1
