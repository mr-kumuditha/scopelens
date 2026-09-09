𝐀 𝐬𝐦𝐚𝐥𝐥 𝐫𝐞𝐪𝐮𝐢𝐫𝐞𝐦𝐞𝐧𝐭 𝐜𝐡𝐚𝐧𝐠𝐞 𝐜𝐚𝐧 𝐜𝐫𝐞𝐚𝐭𝐞 𝐚 𝐛𝐢𝐠 𝐫𝐢𝐩𝐩𝐥𝐞.

Imagine a client says:

“Customers can cancel a booking at any time.”

Later, that becomes:

“Customers can cancel only up to 24 hours before the appointment.”

It looks like one sentence changed. But that change may affect an API rule, a boundary test, a booking screen, and the team’s original understanding of the requirement.

That engineering problem inspired my latest internship portfolio project.

𝗜𝗻𝘁𝗿𝗼𝗱𝘂𝗰𝗶𝗻𝗴 𝗦𝗰𝗼𝗽𝗲𝗟𝗲𝗻𝘀 🔍

ScopeLens is an evidence-first requirement change workbench that helps teams understand what changed, what may be affected, and what evidence supports each review decision.

With ScopeLens, a user can:

🧾 Trace every requirement back to an exact source excerpt

🕒 Preserve immutable requirement versions and change reasons

🔗 Connect APIs, tests, screens, and related work using exact evidence

🧠 Run impact analysis with deterministic links and optional, bounded AI suggestions

✅ Accept or dismiss each impact through explicit human review

🛡️ Prevent lost updates and block decisions based on stale analysis

📚 Follow the complete decision history through an activity log

𝗘𝗻𝗴𝗶𝗻𝗲𝗲𝗿𝗶𝗻𝗴 𝗳𝗼𝘂𝗻𝗱𝗮𝘁𝗶𝗼𝗻 ⚙️

Frontend: React 19, TypeScript and Vite

Backend: NestJS and Express

Data: PGlite for lightweight local persistence, with an external PostgreSQL adapter

Quality: Vitest, Playwright, Axe accessibility checks and GitHub Actions

Deployment: Vercel

The verified project checks include 13 domain/database tests and 4 end-to-end browser workflows. The public deployment uses fictional, resettable demonstration data, so no real client or personal information should be entered there.

𝗪𝗵𝗮𝘁 𝗜 𝗹𝗲𝗮𝗿𝗻𝗲𝗱 💡

Strong software engineering is not measured only by project size. It is also visible in how clearly a system handles evidence, data integrity, concurrency, failure states, human decisions, testing boundaries, and honest technical limitations.

🌐 Live demo: https://scopelens.tharinda.dev

💻 Source code: https://github.com/mr-kumuditha/scopelens

📘 Project handbook: https://github.com/mr-kumuditha/scopelens/blob/main/docs/ScopeLens-Project-Handbook.pdf

I would be happy to hear feedback from software engineers, product thinkers, and fellow developers. 🚀

#SoftwareEngineering #RequirementsEngineering #FullStackDevelopment #React #TypeScript #NestJS #PostgreSQL #Vercel #WebDevelopment #InternshipJourney
