# Workbook-driven demo: I4C complaints and Model alerts

## What the workbook says

| Sheet | Contents | How it is used |
|---|---|---|
| scenarios | A 5-step flow for 2 alert types (I4C, Internal/Model), with Red/Amber/Green outcomes | Becomes the step engine in the Demo Simulator and on cases |
| Scripts | 4 question sets: I4C voice script, Model voice script, Model "Debits and Credits" script, and I4C/Model questionnaires (Bitly links) | Voice bot and WhatsApp/self-service questions |
| Alert Samples | 3 I4C complaints (Ranga, Sailee, Narang) and 2 Model alerts (Ranga, Sailee) | Replace the simulator presets and seed the Alert Inbox |
| Core Bank DB Sample | Profiles for accounts 9120303030 / 032 / 034: averages, 75th percentiles, balance, pin code, risk, past blocks | The new "Core Banking" data source the checks read from |
| Bank or Airtel DB | Empty template with the same fields (60-day EOD summary) | Shown as a second, not-yet-connected source in Data Sources |

## The flow (from the scenarios sheet)

```text
Step 1 Data checks -> Step 2 Voice bot (3 tries/day) -> Step 3 WhatsApp questionnaire
 -> Step 4 Email & app alert -> Step 5 Exit (I4C: continue block) / Manual queue (Model)
 -> Human in the loop: summary, then block or unblock
Each step returns: Red = continue block, Amber = next step, Green = unblock, Manual = review queue
```

**Step 1 data checks (in order)**
1. Found in the mFilterIt Negative Database: Red, continue block.
2. Reported amount over Rs 5,000 and at least 2x the average daily credit: continue block.
3. Transaction over 20% of the sum of credits: continue block.
4. Otherwise go to Step 2.

**Steps 2 to 4 (answers to the script)**
- Response flag over 10: continue block.
- Response flag 8 to 10 and not a merchant account: continue block.
- Merchant account: send to the Manual review queue.
- Below 8: Green (unblock recommendation, still confirmed by a person).
- No answer or call dropped counts as no response. The voice bot retries up to 3 times, then moves to the next step.

**Response flag (my assumption, please confirm):** each answer earns risk points when it does not match core banking. Examples: the employment answer differs from the recorded employment, the pin code differs from the mailing pin code, the customer does not know the sender, or the reason does not fit the account type. The total is the flag.

## What gets built

1. **Sample data from the workbook.** The 5 alerts and 3 core banking profiles are added exactly as given. Workbook typos in names stay as they are; only the obvious spelling mistakes in labels get fixed.
2. **Demo Simulator update.** The presets become the 5 workbook alerts, grouped as I4C complaint and Model alert. The step tracker follows the 5 steps above. Each step shows which check fired, the actual values (such as "Rs 1,00,000 vs average Rs 1,000/day = 100x"), and its colour outcome.
3. **Interactive voice bot and questionnaire.** The presenter plays the customer and picks answers from the script options (Business / Friendly transfer / Fees, etc.), or picks "No response". The response flag adds up live. The correct script is chosen automatically: I4C, Model, or Model with debits when the alert has outgoing payments.
4. **Step 4 and Step 5.** Simulated email and in-app notifications. I4C runs exit with "continue block" plus a self-service link. Model alerts go to the Manual review queue.
5. **Human-in-the-loop summary.** An AI-written case summary (checks, answers, flag, profile mismatches) with Block / Unblock buttons. Every step is written to the Audit Trail.
6. **Rules in the Decision Manager.** The Step 1 checks and the flag thresholds appear as editable rules, so the thresholds (5,000, 2x, 20%, 8 and 10) can be changed live in the demo.
7. **Data Sources.** "Core Banking (CBS)" is filled in with the sample fields. "Bank / Airtel 60-day summary" appears as a pending source.

## Questions to confirm (defaults used if you don't answer)
- Is the response-flag scoring above right? Or do you have point values per answer?
- Rule 3 says "sum of credits in last two account". I read this as the last 2 days of credits.
- Is Narang (I4C #3, no model alert and no Step 1 hit expected) meant to be the clean or Green case?

## Technical details
- New `src/data/workbook.ts` holds the alerts, CBS profiles and scripts. Scripts are structured as questions with options and points per option.
- New pure `src/lib/edd-flow.ts` holds the step engine (checks, flag thresholds, retries). It reads thresholds from the policy rules so the Decision Manager stays the source of truth, and it reuses `rule-engine` where possible.
- Add Vitest tests for each workbook rule: Negative Database hit means Red; Rs 5,000 and 2x means block; 20% means block; flag over 10, 8 to 10 with non-merchant, merchant goes to manual; 3 voice retries.
- The AI summary uses a server function in `rule-ai.functions.ts`, with a fallback template if AI is unavailable.
- Real WhatsApp and voice calling stay out of scope (the earlier plan was skipped). Both are simulated.
