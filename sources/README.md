# Announcement snapshots

These immutable, dated JSON files preserve arXiv announcement batches and v1
title/author/abstract metadata. The free GitHub Actions collector records them
without model calls, allowing the local Plus-backed generator to catch up while
the computer has been off. Submission timestamps are not used to guess
announcement dates. Version 2 snapshots additionally require a dated new listing
in the paper's primary category; late cross-lists of older papers are recorded as
excluded. Replacements are absent from these new-announcement listings.

The original October 7 and October 8 version 1 snapshots retain the complete
candidate catalogs used in the first trials, including a few old cross-lists.
All papers selected in those trials were newly announced on the respective day.
Existing snapshots are never refreshed to newer paper versions.

The first-announcement audit removed arXiv:2610.05589 from the October 7 digest:
it was originally announced in quant-ph on October 6 before being cross-listed
into math-ph on October 7. The original candidate snapshot remains as provenance.
