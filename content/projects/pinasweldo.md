---
id: "e4b9f3f36d82"
parentId: null
title: "PinaSweldo"
slug: "pinasweldo"
dek: "My friend's first payslip, and the salary calculator I built because of it."
icon: null
authors: [{"name":"John Nazarene Dela Pisa","email":"jannazarene09@gmail.com","avatar":"/avatar-1024.webp"}]
fonts: null
page: true
ogImage: null
tags: ["#BuildInPublic","#AIAgents","#FilipinoDeveloper"]
cover: {"src":"/media/2026/4bak45tu5pgjb8hq-2048x1280.webp","alt":"PinaSweldo website and mobile app screenshots showing take-home pay calculator with ₱26,542.60 monthly income and ₱30,000 net","caption":"","width":2048,"height":1280}
publishedAt: "2026-11-06T01:54:37.487Z"
updatedAt: "2026-11-06T01:54:37.487Z"
redirectFrom: []
kind: "project"
project: null
---

> **Project at a glance** **Role:** Designer and developer (solo, working with AI agents)
>
> **Timeline:** Idea in 2024 · Coding started Oct 19, 2026 · Launched Oct 21, 2026 **Built with:** Next.js, Tailwind CSS, Cloudflare · Claude Code (Opus 5.5) and other AI agents **Links:** [pinasweldo.com](http://pinasweldo.com) · [Changelog](https://pinasweldo.com/changelog)

## It started with a payslip

Back in 2024, I was about to graduate. One of my friends got a job before I did. When their first payslip came, we looked at it together and neither of us really understood it. There was the salary, then a list of deductions: tax, SSS, PhilHealth, Pag-IBIG. The number at the bottom was smaller than we expected, and we couldn't explain why.

My friend had heard about a website from people they knew: [sweldongpinoy.com](https://www.sweldongpinoy.com/). We typed in the salary and, for the first time, the deductions made sense. It helped us a lot, and I'm still thankful for it.

But I'm a designer at heart. While using it, a small thought stayed with me: *what if I made one, the way I would design it?* Something calm and simple, with less clutter, and motion that is smooth and has a reason to be there.

I kept that idea for two years.

## Why another salary calculator?

Salary rules in the Philippines change almost every year. SSS raised its rate in 2025. Pag-IBIG raised its cap in 2024. The tax table changed in 2023. When my friend and I first looked, many calculators online still used old numbers, and most of them didn't say where their numbers came from.

Some have caught up since then. But when I checked seven popular calculators in November 2026, three of them were labelled "2026" and still used old SSS, Pag-IBIG or tax rates. If you trust one of those, your "take-home pay" can be off by hundreds of pesos a month.

So I gave PinaSweldo two simple rules:

1. **Every number can be checked.** Each deduction shows its formula and the law behind it.
2. **Your salary stays with you.** The math runs on your own device. Nothing about your pay is sent anywhere.

<img src="/media/2026/5c23c6b435a74372a8211610-2048x1280.webp" alt="PinaSweldo salary calculator screenshots, version 0.1.0 and 1.30.0, showing take-home pay calculation for ₱30,000 salary" width="880" height="550">

## Designing something calm

Money is stressful, so I wanted the screen to feel quiet. I called the style "ink on paper": mostly black and white, thin edges, and lots of space. The only colors on the page are for the four places your money goes. Tax is red, SSS is blue, PhilHealth is green and Pag-IBIG is gold. Your take-home pay is never colored. It's the biggest thing on the screen, because it's the number you came for.

Motion follows the same idea. Buttons press down a little when you tap them. Numbers roll into place. Nothing takes longer than about a third of a second, and if your phone is set to reduce motion, everything stays still.

<img src="/media/2026/85b653bdaeb346cead3a115a-2048x1280.webp" alt="Three mobile phone screenshots of PinaSweldo's payroll breakdown in light and dark mode" width="880" height="550">

Every line has a "Why?" you can open. It explains the deduction in one plain sentence first. The law and the full formula come after, for people who want them.

<img src="/media/2026/f2eb6e0adaef448f9b7908ad-2048x1280.webp" alt="Three mobile phone screens displaying PinaSweldo income breakdowns in light and dark mode" width="880" height="550">

## How I worked with AI agents

I have a background in UI/UX design and AI-assisted development, but no background in accounting or law. So I built PinaSweldo with AI agents, and I treated them like a small team.

<img src="/media/2026/b44443a2f9a34653b7c7a354-2048x1280.webp" alt="Diagram showing collaboration with AI agents, including roles of Me, Claude Code, Opus 5.5, Design skills, MCPs" width="880" height="550">

Most of the building happened in **Claude Code with Opus 5.5**. It planned the work, wrote and tested the code, and ran smaller helper agents for separate jobs. Along the way I also tried other agents, **GPT-6 Astra, Gemini Argon and Gemini Flash 3.8**, to compare answers and get second opinions.

A few things made the biggest difference:

- **Design skills.** These are written rules the agent follows for layout, motion, writing and accessibility. They kept the work looking like *my* design instead of a generic template.
- **MCPs.** These connect the agent to real tools: current documentation, a real browser for screenshots and checks, and the hosting platform.
- **Agents as researchers.** Since I'm not an accountant or a lawyer, I asked agents to act like one. They read the actual rules from BIR, SSS, PhilHealth, Pag-IBIG and DOLE, and every rate in the app links to its source. Today the app cites 60 laws, circulars and wage orders.
- **Separate reviewers.** Different agents checked the work and tried to break it.

> 💡 **For builders:** the agent was fast, but speed was never the hard part. The hard part was knowing what "right" looks like, and that part was still my job.

Coding started on October 19. Two days later, PinaSweldo was live. Over the next two weeks it grew to 55 releases, 16 languages besides English, and about 500 automated tests.

## Launching, and listening

I shared PinaSweldo on Reddit, X, Threads and Facebook groups. Not everything went well. Moderators removed most of my Reddit posts. One post survived, and it reached **29,000 views**, mostly from the Philippines.

<img src="/media/2026/43e63604d7194d018e943d83-2048x1050.webp" alt="Reddit post screenshot, r/buhaydigital, 29k views, &quot;Kaya pala parang lagi kulang ang ₱30k ko as freelancer&quot;" width="880" height="451">

The comments were mixed. Some people asked if it was an ad. One called it "AI slop". I didn't argue. I answered kindly: it's a free personal project, with no ads and no sign-up. And whenever people asked, I was open that I built it with AI tools.

Then came the comments that made the app better. Someone said the motion felt shaky and the numbers spilled past the input box, so I rebuilt the motion to be calmer. A close friend looked at it on their phone and said there was way too much text, so every explanation now opens on one line. Another friend, a physical therapist, asked about pay that includes incentives, so I added incentives and commissions. People in Facebook groups asked for a "last updated" note on the rates, an HMO deduction, and easier ways to find dark mode and other languages. All of those shipped.

<img src="/media/2026/2ddd641ff0c1409fb2475fcb-2048x1331.webp" alt="Comments from users on Reddit, Facebook, and in person about PinaSweldo, with responses on changes made" width="880" height="572">

In its first month, Cloudflare counted about **6,200 unique visitors**. That count includes some bots, so the real number of people is a bit lower, but it was far more than I expected.

<img src="/media/2026/2c451e8cbfd143e0a9bb59c8-2048x768.webp" alt="Cloudflare graph showing 6.23k unique visitors over 30 days from 7 October to 4 November" width="880" height="330">

<details>
<summary>See all 21 pieces of feedback, and what changed</summary>

| What people said                                                   | Where                         | What changed                                                                   |
| ------------------------------------------------------------------ | ----------------------------- | ------------------------------------------------------------------------------ |
| Most calculators are built once and never updated                  | Reddit                        | Every rate is dated and sourced, with a "what changed" list (v1.11.0, v1.26.0) |
| "Is this an ad?"                                                   | Reddit                        | Replied: a free personal project, no ads, no sign-up                           |
| "AI slop", the text is too perfect                                 | Reddit                        | No reply needed; kept building                                                 |
| It's vibe coded and the design looks generic                       | Reddit                        | No change; kept improving the design                                           |
| The motion feels shaky, numbers run past the box, no loaders       | Reddit                        | Calmer motion, digits that shrink to fit, loading outlines (v1.17.0, v1.22.0)  |
| Posting the same thing in two subreddits is spam                   | Reddit                        | Lesson learned: one angle per community, then stop                             |
| What font is that? Is this vibe coding?                            | Facebook dev group            | Answered: Inter, built with AI tools and checked by me                         |
| Text pops up everywhere, hard to focus; can it handle incentives?  | A friend (physical therapist) | One-line explainers; incentives and commissions (v1.24.0)                      |
| Way too much text                                                  | A close friend                | The same "less to read" pass, plus a mobile pass (v1.24.0)                     |
| My own wish list after those talks                                 | Me                            | Custom paydays, a "my day" story, a clearer offer comparison (v1.24.0)         |
| SSS should count all your pay, not just basic                      | A former classmate, now a CPA | SSS and Pag-IBIG count all pay; PhilHealth stays on basic (v1.24.1)            |
| Show when the rates were last updated                              | Facebook dev group            | A "Rates as of" line, linked to every source (v1.26.0)                         |
| The income band should start with a household of one               | Me                            | Changed the default to one person (v1.24.2)                                    |
| Add translation and dark mode                                      | IT Philippines                | Both existed but were hard to find; made them easier to find (v1.28.0)         |
| There's no HMO deduction                                           | IT Philippines                | A full loans and deductions list (v1.28.0)                                     |
| Add hazard pay and LGU rates                                       | Facebook dev group            | Already there; noted as hard to find                                           |
| Add sign-ups and job titles to sell salary data                    | IT Philippines                | Declined on purpose: no accounts, and your salary never leaves your device     |
| Can I pay more into PhilHealth?                                    | Threads                       | Explained voluntary options; saved for a future update                         |
| Love that the salary stays on the device                           | X and Threads                 | Privacy became the main message in later posts                                 |
| The tax should use the BIR table each payday, not a yearly average | A CPA in a Facebook dev group | Rebuilt the tax to follow RR 11-2018 (v1.30.0)                                 |
| Say clearly that this isn't reviewed by a CPA                      | CPA friends                   | Added a plain disclaimer to every result (v1.30.0)                             |

</details>

## Where the AI was wrong

This is the part I'm most thankful for.

A former high school classmate, now a CPA, messaged me after trying the app. They said it was mostly accurate, then pointed out a mistake: SSS should be based on *all* your pay, not just your basic salary. PhilHealth is the one that uses basic pay only. The AI had treated them the same way. I fixed it right away.

A few days later, a CPA in a Facebook developer group pointed out a bigger one. The app worked out tax by spreading the whole year's tax evenly across twelve months. The rule (Revenue Regulations 11-2018) says payroll should use BIR's tax table every payday, and only work out the yearly total in December. In their words, the two methods are "not options, they are steps."

I had asked my agents to check every rule against the law, and they had marked this one as correct. The numbers matched for a steady salary, so no test caught it. But the *method* was wrong. When I went back to the actual text of the regulation, the CPA was right.

<img src="/media/2026/18dc7d4ff313457aa33f2fdd-2048x870.webp" alt="Two quotes from CPAs on social media, one stating SSS should be based on all pay and the other explaining BIR tables and tax" width="880" height="374">

I didn't argue. I fixed it, and I added an honest note to every result:

> *Estimates only, not legal, tax or accounting advice, and not reviewed by a CPA or lawyer. Your payroll has the final word.*

<img src="/media/2026/fa297201a9034f3ead0f011f-2048x1152.webp" alt="PinaSweldo source code page explaining code privacy and functions" width="880" height="495">

Every fix is public in the changelog, so anyone can see what changed and when.

<img src="/media/2026/d7d560fc8c0d46b6b4d56c84-2048x1280.webp" alt="PinaSweldo changelog page listing software releases and changes, with version 1.30.0 details" width="880" height="550">

Next, I'm planning a stricter review: separate agents that only read and report, checking every rule against the law line by line, with no power to change the code. And when I can, a review by a real CPA.

## What I learned

**1. AI made building fast, but getting it right was still my job.**
Agents can write code and read laws, but people with real experience caught what they missed. AI is a tool and an assistant. The ideas, the design choices, the motion and the care still come from people.

**2. Ship early, and listen to everything.**
Even the harshest comments usually had a useful point inside. Most of PinaSweldo's best features came from someone telling me what was wrong.

**3. People feel the design before they read the numbers.**
Calm, clear and smooth is what made people trust it enough to try it. Trust came first. The numbers came after.

## Try it

<img src="/media/2026/9a0132921c6547a2b277aa1a-1620x2025.webp" alt="Two smartphones showing PinaSweldo salary calculator with ₱30,000 monthly basic pay and ₱26,542.60 take-home pay" width="880" height="1100">

PinaSweldo is free, with no ads and no sign-up, and your salary never leaves your device. Try it at [**pinasweldo.com**](https://pinasweldo.com).

Thank you to my friend and their first payslip, to sweldongpinoy.com for the spark, to everyone who left a comment (even the harsh ones), and to the two CPAs who kept me honest.
