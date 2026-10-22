# WhatsApp: confirm new template call and add our own short questionnaire links

## What we found
The WhatsApp team's new curl (send-account-blocked with to, account_number, support_number, language "en"/"hi") is exactly what the app already sends. No change is needed to the template call. The support number stays 1800123456 for now.

## What changes
1. **Short link per customer.** Each WhatsApp questionnaire gets a short link such as `https://edsquare.mfilterit.net/s/AB12CD`. Opening it goes straight to that customer's questionnaire. Links are hard to guess (8 random letters/digits) and expire with the questionnaire.
2. **Short link used everywhere.** The WhatsApp message, the case record, the questionnaire popup and the "Link:" line all show the short link instead of the long one.
3. **Details for the WhatsApp team.** On Decision Manager > Integrations, a "Short link for WhatsApp template" box shows the link format, a sample, and a copy button, so the team can add a link variable to the template (e.g. "Please answer here: {{link}}").
4. **Test box.** The existing WhatsApp test card can create a sample short link to check it opens the questionnaire.

## Needed from the WhatsApp team
Once their template accepts a link variable, they share the field name and the app will fill it on every send, so the link always arrives (not only inside the 24-hour chat window).

## Technical details
- Add a `short_code` column (unique) to `questionnaire_sessions` via migration; generated in `questionnaire.functions.ts` when the session is created.
- New public route `src/routes/s.$code.tsx`: looks up the code through a server function and redirects to `/q/$token`; unknown or expired code shows a friendly "link expired" page.
- `RealWhatsAppPanel` builds the link as `${questionnaireOrigin()}/s/${code}`; `QuestionnaireRecord.link` stores it.
- Pure helper `makeShortCode()` in `src/lib/whatsapp.ts` with a Vitest test (8 characters, URL-safe, no look-alike characters).
