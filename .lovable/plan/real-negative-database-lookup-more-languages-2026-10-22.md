# Real Negative Database lookup + more languages

## 1. Remove the "Negative Database hit" switch
- Remove the switch from both simulator tabs (I4C & Model alert flow, Transaction pipeline).
- Step 1 instead looks up the account number, UPI handle and customer mobile in the same Negative Database shown on the Negative Database page.
- The engine console and step log show what was searched and the result, e.g. "Match: rahul.v88@okbank, Betting, Web crawl (NB-09)" or "No match for 9120303030 / 9876543210".
- The case evidence gets the matching entry (category, source, evidence text), so the case links to that Negative Database record.

## 2. New Negative Database entries for the scenarios
Added to the Negative Database page with category, source, evidence and linked identifiers:
- **Classic money mule** (Transaction pipeline): UPI `rahul.v88@okbank` + account XXXX4821, Betting, Web crawl, so it still stops on rule 1.
- **Sailee (I4C #2 / Model alerts)**: account 9120303032, Job Scam, Victim complaint, so a sheet alert stops at Step 1 because of a real match.
- **Spare decoy**: a mule mobile number linked to Investment scam that no preset uses, so presenters can type it as the contact to show a hit live.

Ranga, Narang, Sneha, Mohan and Anita have no entries, so their current results stay the same (Sneha keeps rule 3, Mohan rule 2, Anita clears).
Note: Sailee's sample results move to Step 1 Red. If you'd rather keep Sailee as-is, I'll use a new made-up account instead.

## 3. Language dropdown
- Usable: English, Hindi (unchanged).
- Greyed out and not selectable, marked "coming soon": Bengali, Telugu, Marathi, Tamil, Gujarati, Kannada, Malayalam, Odia, Punjabi, Assamese.
- Applies wherever the customer contact box appears (simulator and case "Contact customer").

## Technical details
- New pure `negbaseLookup(records, { account, upi, mobile })` in `src/lib/edd-flow.ts` (matches the identifier or `associated` list, ignoring case and spaces); `dataChecks` callers pass its boolean result; tests updated, plus new tests for hit/no-hit per scenario.
- `WorkbookFlow` reads `negbase` from `useEDD()`; the `custom.negbase` prop and `TxnInput.negbaseHit` are replaced by the lookup (`toAttrs` gets the looked-up result).
- Seed entries added to `negbase` in `src/data/edd.ts`; the UPI is passed through `toWorkbook` so the lookup can use it.
- `ContactBox` language list rendered from a constant with `disabled` items.
