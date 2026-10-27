# claude/tag-size-role

Main went red when #923 (size-role rule, hds#482) and #929 (Tag dismiss) landed together: tag.tsx used `--primitive-size-40`. The Tag X now uses `--semantic-size-row-compact` (same 40px) until a touch size role exists (hds#750). Patch changeset, impact none.
