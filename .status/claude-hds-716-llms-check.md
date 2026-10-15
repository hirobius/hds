- generate-llms-txt --check builds the component prop data from source in memory instead of reading the gitignored component-api.json, so pretest and pre-push no longer fail after a branch switch (hds#716).
  The subprocess tests that run the check get a 90s timeout since it now builds the prop data.
