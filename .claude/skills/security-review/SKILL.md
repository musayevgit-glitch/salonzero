---
name: security-review
description: Apply for threat modeling, security audit, pre-release review, and review of authentication, authorization, uploads, exports, logging, reservations, and administrative features.
---

Review:

- broken access control;
- tenant escape;
- IDOR/BOLA;
- privilege escalation;
- mass assignment;
- injection;
- XSS;
- CSRF;
- SSRF;
- insecure redirects;
- unsafe uploads;
- authentication enumeration;
- session fixation and cookie configuration;
- rate limiting and abuse;
- secrets exposure;
- sensitive logging;
- insecure error messages;
- cache leaks;
- unsafe exports;
- race conditions;
- reservation double booking;
- dependency and supply-chain risks.

Output findings with:
- severity;
- affected component;
- attack scenario;
- evidence;
- recommended fix;
- regression test.

Do not modify code until the audit report is approved unless explicitly instructed.
