# Fix Step 1 data checks so every rule is tested properly

## What is wrong today
1. **Rule 2 always fires for pipeline transactions.** The made-up account history sets the average daily credit to Rs 200 or Rs 1,000, so almost any amount over Rs 5,000 is "2x the average". The screenshot shows Rs 2,60,000 vs Rs 200/day = 1300x.
2. **Rule 3 can never fire there.** The amount is split into equal credits (e.g. 5 x Rs 52,000), so the largest credit is always exactly 20%, never "more than 20%". The line also says "Largest Rs 2,60,000 of Rs 2,60,000 = 20%", which doesn't add up.
3. **Rules 2 and 3 skip when an earlier rule fires.** If the Negative Database hits, rules 2 and 3 show "Pass" even though they were never checked. That hides what really happened.

## What changes
1. **All three rules checked every time.** Each rule shows Fired, Pass or "Also true (not needed)" when an earlier rule already blocked. The result is still Red if any rule fires.
2. **Rule 3 follows the sheet:** this transaction's amount compared to all credits in the last 2 days (earlier credits plus this one). The line shows the real numbers, e.g. "Rs 52,000 of Rs 1,10,000 = 47%".
3. **Account history you can see and change.** The Transaction pipeline form gets two new fields: "Average daily credit (Rs)" and "Other credits in last 2 days (Rs)". Each preset fills in sensible values:
   - Classic money mule: Negative Database hit -> Rule 1
   - Dormant account spike: low average -> Rule 2
   - Scam victim inflow: average fine, but one credit is most of the 2-day credits -> Rule 3
   - Clean salary credit: no rule fires -> goes to the voice call
4. **Same fix for the I4C & Model tab**, since both tabs use the same checker.

## Technical details
- `src/lib/edd-flow.ts` `dataChecks`: evaluate C1-C3 independently; add `status: "fired" | "pass" | "also"`; C3 share = `alert.amount / (amount + prior2dCredits)`. Keep thresholds (Rs 5,000, 2x, 20%).
- `TxnInput` gets `avgDailyCredit` and `prior2dCredits`; `toWorkbook()` uses them instead of guessed values; presets updated as above. Composer in `ClassicSimulator.tsx` shows the two fields; `WorkbookFlow` step 1 card renders the new status.
- Tests: update `edd-flow.test.ts` and `scenarios.test.ts` with one test per rule and per preset (mule -> C1, dormant -> C2, scam -> C3, clean -> Amber), plus boundary tests (exactly 2x fires, exactly 20% does not).
- Re-check the 7 built-in sample cases still give the same Step 1 result; adjust sample data if the sheet expects otherwise.
