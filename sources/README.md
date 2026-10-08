# Announcement snapshots

These immutable, dated JSON files preserve arXiv announcement batches and v1
title/author/abstract metadata. The free GitHub Actions collector records them
without model calls, allowing the local Plus-backed generator to catch up while
the computer has been off. A snapshot's listing date is its eligibility evidence;
submission timestamps are not used to guess announcement dates. Replacements are
excluded by collecting the dated recent-announcement listings. Existing snapshots
are never refreshed to newer paper versions.
