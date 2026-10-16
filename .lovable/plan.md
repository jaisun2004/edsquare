# Real WhatsApp and AI voice calls in the Demo Simulator

During a demo, the Engagement step in the Demo Simulator can reach a real phone. It sends a real WhatsApp message and places a real AI voice call. The customer's replies show up live in the case.

## What the presenter sees
1. In **Demo Simulator**, a new "Customer phone" field takes any number, with a country code.
2. At the **Engagement** step, there are two buttons: **Send WhatsApp** and **Place AI call**. A "Live" badge shows that the message or call is real and not simulated.
3. **WhatsApp:** the customer gets a verification message asking them to confirm the source of a recent credit. A live chat panel shows each message's status (sent, delivered, read) and the customer's replies as they arrive.
4. **AI call:** the phone rings, and an AI agent introduces itself as the bank's verification line. It asks 3 or 4 questions about the source of funds and the account's use, then ends the call. The transcript and an AI summary appear in the case.
5. The replies are scored by AI, for example "inconsistent explanation", and the case risk updates. The presenter still makes the final decision ("AI prioritises. Bank experts decide.").
6. If the live services are not set up, the existing simulated engagement still works, so the demo never breaks.

## What you'll need to set up
- **WhatsApp Business:** you already have a number, so you connect it once from a card in chat. Meta's rules mean the first message to a new customer must use an approved template, and approval can take up to 48 hours. I'll create the "verification" template right away. Until it's approved, you can test by messaging the business number from your phone first, since replies within 24 hours need no template.
- **AI voice calls:** this needs a Twilio account with a voice phone number, connected from a card in chat. The voice agent runs on ElevenLabs, which is already linked for the video. Calls cost a small amount per minute on your Twilio account.
- **Lovable Cloud:** this is turned on to store messages, call transcripts and delivery updates.

## Safeguards (since any number can be entered)
- The presenter confirms the number before each send or call.
- Each number is limited to a few messages and calls per hour, and there is a daily cap overall.
- The number is partly hidden in the Audit Trail.
- After Twilio is connected, I'll recommend turning on its fraud protection (SMS pumping protection and limiting which countries can be called).

## Technical details
- Enable Lovable Cloud. The tables are `whatsapp_webhook_events` (a durable inbox), `engagement_messages` (outbound and inbound records with the Meta message id and status), `voice_calls` (call id, status, transcript, summary) and `engagement_limits`.
- Server functions in `src/lib/engagement.functions.ts`: `sendWhatsApp` (sends a template or free-form message through the WhatsApp connector gateway) and `placeAiCall` (starts an outbound call with an ElevenLabs agent over a Twilio number). Both check the rate limits.
- Webhooks:
  - `POST /api/public/whatsapp/webhook`: verified with `@lovable.dev/webhooks-js`, stores events idempotently, matches status updates by message id, and saves inbound replies.
  - `POST /api/public/voice/webhook`: receives the post-call transcript from ElevenLabs, checked with a signature.
- After a reply or a finished call, the Lovable AI Gateway classifies the answer, and the result feeds the existing engagement re-score in `edd-store`.
- The simulator checks the database every few seconds while an engagement is live and merges results into the session case timeline.
- Callbacks need the WhatsApp connection's "Incoming messages" destination set to this project. Live replies only fully work on the published site.
