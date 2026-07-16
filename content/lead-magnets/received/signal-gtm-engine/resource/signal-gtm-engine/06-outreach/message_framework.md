# Message Framework — generic 3-touch, signal-anchored

> This is a **structure**, not copy. There is **no client wording here** on
> purpose — you fill it per campaign, per persona, per signal type. The job of
> this file is to keep every touch obeying the Stage 06 message principle:
> **anchor on a real detected signal, ≤ 100 words, ONE question, signal-shaped
> CTA.**

The merge variables below match the columns `export_campaigns.py` writes, so
whatever you draft here drops straight into Smartlead / HeyReach / Instantly:

```
{{first_name}}        {{company}}        {{title}}
{{signal_type}}       {{signal_summary}} {{signal_date}}   {{signal_url}}
```

`{{signal_summary}}` is the load-bearing one. If your draft does not reference it
in the **first line**, the draft is wrong — go back.

---

## The arc

Three touches, each with a different job. Do not collapse them into one long
email. Do not pitch in touch 1.

```
M1  SCENE / SIGNAL       — "I saw the thing." Earn a reply. No pitch.
M2  WHY IT MATTERS       — connect the signal to a problem they likely now have.
M3  SOFT OFFER           — the lightest possible next step, shaped by the signal.
```

A reply at any stage ends the sequence and hands off to a human.

---

## M1 — Scene / Signal  (the only touch that must exist)

**Job:** prove you are reacting to *them*, not blasting a list. Open on
`{{signal_summary}}`. Ask one question that is genuinely about the signal.

**Shape (fill the blanks — keep it under ~60 words for M1):**

```
Hi {{first_name}} — saw {{signal_summary}}.

[ one sentence connecting that observation to a plausible consequence ]

[ ONE question, shaped by {{signal_type}} — see the CTA bank below ]
```

**Rules for M1**
- First line names the signal. Not "I came across {{company}}." The *specific*
  thing.
- ≤ 100 words total; aim ~60 for the LinkedIn-connect variant.
- Exactly one question mark.
- No calendar link. No "15 minutes." No deck. No "we help companies like yours."
- No more than one sentence of "us" — ideally zero in M1.

---

## M2 — Why it matters  (sent only if no reply to M1)

**Job:** show you understand the *implication* of the signal, with one concrete,
verifiable point of proof. Still one question. Still no hard pitch.

**Shape:**

```
Following up on the {{signal_type}} note —

[ the implication: when teams do X (the signal), Y usually becomes the bottleneck ]

[ one proof point: a pattern you've seen / a number / a comparable situation —
  no names of other clients, keep it generic ]

[ ONE question that invites them to confirm or correct your read ]
```

**Rules for M2**
- Reference the M1 signal again so the thread stays coherent.
- One proof point only. Don't list five.
- The question should let them say "yes that's us" or "no, actually…" — both are
  good replies.

---

## M3 — Soft offer  (sent only if no reply to M1/M2)

**Job:** the lightest viable next step, *shaped by the signal*. This is where an
ask lives — but it is signal-shaped, never a generic "book a demo."

**Shape:**

```
Last note on this, {{first_name}}.

[ the offer, framed as useful regardless of buying: a teardown, a relevant
  example, a short async answer — tied to {{signal_type}} ]

[ ONE low-friction ask — reply "yes" / "send it" / a single yes-no question ]
```

**Rules for M3**
- The offer must be valuable even if they never buy (a teardown, a benchmark, a
  short Loom answering their exact situation).
- Still one question. "Want me to send it?" beats "Do you have 30 minutes
  Tuesday or Thursday?"
- If still no reply, the account goes back to nurture — it is not dead, it is
  early. Re-enter on the next fresh signal.

---

## Signal-shaped CTA bank (the part most people get wrong)

The CTA must match `{{signal_type}}`. A generic "book 15 min" throws away the
entire reason this account is in the queue. Map the signal to the ask:

| `signal_type` | what they did | signal-shaped ask (pick / adapt) |
|---|---|---|
| `hiring` | opened roles in your area | "Solving \<problem\> with the new hire, or with tooling alongside them?" |
| `launch` | shipped / announced something | "Is \<new thing\> aimed at \<segment\>, or broader than that?" |
| `funding` | raised / expanded | "Where does the new capital point first — \<A\> or \<B\>?" |
| `topic_spike` | posting / commenting on a theme | "Curious what pushed \<topic\> up the list this quarter?" |
| `tech_change` | adopted / switched a tool | "How's \<new tool\> landing with the team so far?" |
| `engagement` | engaged a relevant post/thread | "Saw your take on \<thread\> — is that a live project or just on the radar?" |
| `leadership_change` | new exec / role change | "New seat usually means a new priority — what's top of yours right now?" |

> Replace every `\<...\>` with specifics drawn from `{{signal_summary}}`. If you
> can't fill the brackets from the actual signal, you do not understand the
> signal well enough to send — go read `{{signal_url}}` first.

---

## Do / Don't

**Do**
- Open every M1 on `{{signal_summary}}`.
- Keep one question per message.
- Match the CTA to the signal type.
- Let any reply end the automation and hand to a human.
- Vary phrasing across personas — an economic buyer and a technical evaluator
  do not read the same sentence the same way.

**Don't**
- Don't send if `{{signal_summary}}` is empty. No signal, no send.
- Don't pitch in M1.
- Don't stack questions ("Also, are you the right person, and do you have
  budget, and…").
- Don't use "book 15 minutes" / "quick call" / "hop on a call" as the CTA.
- Don't multi-thread the same account on day one — that's what the
  `secondary_contacts` sidecar and later touches are for.
- Don't reference other clients by name as proof. Keep proof generic.
- Don't let M3 turn into a four-paragraph pitch. It is the *lightest* step.

---

## Length check (do this before you ship a sequence)

For each touch, paste the rendered message (with a real signal merged in) and
confirm:

- [ ] First line references the actual signal
- [ ] ≤ 100 words
- [ ] Exactly one `?`
- [ ] CTA matches `signal_type` (not a generic calendar ask)
- [ ] No pitch in M1
- [ ] No other-client names used as proof

If any box is unchecked, the message is not ready. Fix it before it enters a
sender.
