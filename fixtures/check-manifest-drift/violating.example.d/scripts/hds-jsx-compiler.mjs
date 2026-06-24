// Minimal stub for check-manifest-drift fixture (violating case).
// HdsGhost is referenced in INSTANCE_TAGS but absent from the manifest → drift.
const FRAME_TAGS = new Set(['HdsGhost']);
const TEXT_TAGS = new Set([]);
const INSTANCE_TAGS = new Set([]);
const ICON_TAGS = new Set([]);
