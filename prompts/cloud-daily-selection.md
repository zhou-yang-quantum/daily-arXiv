Review the newest arXiv postings and publish my personalized top 10 to https://github.com/zhou-yang-quantum/daily-arXiv using the connected GitHub write tool. Run entirely in the cloud; do not depend on my computer or local files.

Prioritize quantum field theory, non-equilibrium physics, quantum error correction, quantum simulation, quantum algorithms, and exactly solvable models. Exclude materials, quantum chemistry, bilayer graphene, TMDs, high-temperature superconductivity, most experiments unless they demonstrate an important theoretical principle, overly mathematical string theory, and overly computer-science-heavy quantum algorithms. Broaden beyond topics closely related to my own publications. Explain unfamiliar concepts with concise background and motivation. Do not invent details of my publications or current research.

Use the date in America/Chicago for the digest title and filename. Screen the latest relevant arXiv announcement listings, including quant-ph, hep-th, hep-lat, and cond-mat.stat-mech, with relevant math-ph and integrable-model cross-lists. Distinguish the digest date from original submission dates. Select new papers; do not silently substitute old papers or revisions. If the available material cannot support ten appropriate selections, report that and do not publish an incomplete digest.

Delivery:

1. Target repository `zhou-yang-quantum/daily-arXiv`, branch `main`, path `incoming/YYYY-MM-DD.md`. Check only today's file, requesting just its first line where supported. If it already exists, return its website link without regenerating or overwriting it. Distinguish a missing file from an authorization or connection error.
2. Produce the digest directly as the content of one GitHub file-creation call. Create the file with commit message `Add arXiv-YYYY-MM-DD selection`. This prompt authorizes publishing the daily digest to this public repository. Change only this one file.
3. Use exactly this Markdown structure, repeated for items 1 through 10. Include real arXiv IDs and source links. Do not wrap the entire file in a code fence.

   # arXiv-YYYY-MM-DD

   Brief overview of the day's selection and the announcement batch reviewed.

   ## arXiv-YYYY-MM-DD — Item 1

   ### Exact paper title
   **Authors — arXiv:YYMM.NNNNN**
   **Priority: must read / high / exploratory**

   Concise, source-grounded summary paragraphs. Explain what was done and the main result, including important limits. Preserve the scientific quality and level of detail of my current summary + background + why-it-matters format.

   **Background.** Brief concepts and motivation needed to understand the result.

   **Why it matters for you:** Explain the fit to my priorities and the useful broader connection.

   [arXiv YYMM.NNNNN](https://arxiv.org/abs/YYMM.NNNNN)

4. Optionally finish with `My reading order would be **1 → 2 → ... → 10**.` using each rank exactly once, followed by a brief synthesis. Every item heading must use the same exact date as the filename.
5. Before writing, check that all ten items have unique IDs, ranks 1–10, and all three explanatory sections. Use Markdown and LaTeX, without HTML or internal ChatGPT citation markers. The file-creation tool result must confirm the commit succeeded. If writing fails, report the failure; do not claim the website was updated.
6. On success, return only the date, paper count, and `https://zhou-yang-quantum.github.io/daily-arXiv/#date=YYYY-MM-DD`, saying publication is queued. GitHub Actions will validate and deploy automatically. Do not poll the deployment or repeat the complete digest in the chat.

Keep usage bounded: generate the selection once, summarize only the ten chosen papers, and reuse the resulting text for the one write. Consult full text only when needed to support a selected paper's claims. Do not load the entire archive, inspect site source, clone the repository, create pull requests, run builds, change workflows, or start a second research/publishing agent. Do not include instructions to create a new chat or project conversation in the digest.
