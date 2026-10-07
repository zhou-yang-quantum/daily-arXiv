Review the newest arXiv postings and publish my personalized ranked selection of 10–20 important papers to https://github.com/zhou-yang-quantum/daily-arXiv using `tools/publish_digest.py` in this repository's cloud environment. Ten papers is the optimal default. Add papers beyond ten only when the day's postings contain additional important, interesting papers that clearly fit my interests; do not pad the selection. Never exceed twenty papers. Run entirely in the cloud; do not depend on my computer. The environment must already supply `ARXIV_GITHUB_TOKEN` and network access to arXiv and api.github.com. Never print or store the credential.

Prioritize quantum field theory, non-equilibrium physics, quantum error correction, quantum simulation, quantum algorithms, and exactly solvable models. Exclude materials, quantum chemistry, bilayer graphene, TMDs, high-temperature superconductivity, most experiments unless they demonstrate an important theoretical principle, overly mathematical string theory, and overly computer-science-heavy quantum algorithms. Broaden beyond topics closely related to my own publications. Explain unfamiliar concepts with concise background and motivation. Do not invent details of my publications or current research.

Use the date in America/Chicago for the digest title and filename. Screen the latest relevant arXiv announcement listings, including quant-ph, hep-th, hep-lat, and cond-mat.stat-mech, with relevant math-ph and integrable-model cross-lists. Distinguish the digest date from original submission dates. Select only papers first announced in the batch being reviewed. Exclude the entire Replacements/revised-submissions section and all previously announced papers, even when they have a new version or a substantial revision. Cross-lists are eligible only when the paper itself is first announced in this batch; an old paper newly cross-listed today is not eligible. Deduplicate cross-listed papers by arXiv ID. Verify first-announcement eligibility from the listing and submission history when needed; do not infer newness from the latest revision date. If the available material cannot support ten appropriate selections, report that and do not publish an incomplete digest.

Delivery:

1. Target repository `zhou-yang-quantum/daily-arXiv`, branch `main`, path `incoming/YYYY-MM-DD.md`. Before research, run `python tools/publish_digest.py --check-date YYYY-MM-DD`. If its JSON status is `exists`, return that date's website link without regenerating or overwriting it. If the check fails, report the access error and stop. The script returns metadata only, so do not fetch the entire archived file.
2. Produce the digest once as a UTF-8 file `incoming/YYYY-MM-DD.md` in the cloud checkout. Then run `python tools/publish_digest.py incoming/YYYY-MM-DD.md`. The script validates it and makes one GitHub file write with commit message `Add arXiv-YYYY-MM-DD selection`. This prompt authorizes publishing the daily digest to this public repository. Change only this one file; do not also commit and push the cloud checkout.
3. Use exactly this Markdown structure, repeated for items 1 through N, where N is the selected paper count (10–20). Keep a clean numerical ranking and a brief daily overview. Do not add priority verdicts or labels such as “must read,” “high,” or “very high.” Include real arXiv IDs and source links. Do not wrap the entire file in a code fence.

   # arXiv-YYYY-MM-DD

   Brief overview of the day's selection and the announcement batch reviewed.

   ## arXiv-YYYY-MM-DD — Item 1

   ### Exact paper title
   **Authors — arXiv:YYMM.NNNNN**

   Concise, source-grounded summary paragraphs. Explain what was done and the main result, including important limits. Preserve the scientific quality and level of detail of my current summary + background + why-it-matters format.

   **Background.** Brief concepts and motivation needed to understand the result.

   **Why it matters for you:** Explain the fit to my priorities and the useful broader connection.

   [arXiv YYMM.NNNNN](https://arxiv.org/abs/YYMM.NNNNN)

4. Optionally finish with `My reading order would be **1 → 2 → ... → N**.` using each selected rank exactly once, followed by a brief synthesis. Every item heading must use the same exact date as the filename.
5. Before writing, check that there are 10–20 items with unique IDs, consecutive ranks 1–N, and all three explanatory sections for every paper. Use Markdown and LaTeX, without HTML or internal ChatGPT citation markers. The publishing script's JSON must report `publication-queued` and a commit SHA, or `already-delivered`. If writing fails, report the failure; do not claim the website was updated. Do not automatically replace existing content or loop on failed requests.
6. On success, return only the date, paper count, and `https://zhou-yang-quantum.github.io/daily-arXiv/#date=YYYY-MM-DD`, saying publication is queued. GitHub Actions will validate and deploy automatically. Do not poll the deployment or repeat the complete digest in the chat.

Keep usage bounded: generate the selection once, summarize only the chosen 10–20 papers, and let Python upload the file without repeating its text in a tool result or chat response. Consult full text only when needed to support a selected paper's claims. Do not load the entire archive, inspect site source, clone the repository, create pull requests, run builds, change workflows, or start a second research/publishing agent. Do not include instructions to create a new chat or project conversation in the digest.
