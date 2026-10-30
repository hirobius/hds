Codemods take release text from the ledger (hds#956): lib/removals.mjs; patterns-subpath scans every entry its steps touch (a /patterns namespace read of a removed name is reported); move/rename take from/to; jsx-fold `foldRule` data rules (NotFoundPattern).
A /patterns or root namespace read of a removed name is marked `gone` (not `removed`), so the upgrade command lists it too.
