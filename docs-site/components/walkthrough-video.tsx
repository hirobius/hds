/**
 * The scripted walkthrough on the case study page (hds#1148). The files are
 * written by scripts/walkthrough/record.mjs into docs-site/public/walkthrough/;
 * re-record with `pnpm walkthrough:record` after `pnpm docs:build`.
 *
 * It never autoplays (so reduced motion is respected without a media query),
 * downloads nothing until the viewer presses play (preload none, a poster
 * instead), and is muted: the video has no sound. Captions are burned in; the
 * WebVTT track repeats them for assistive tech and is off by default so the
 * two do not stack.
 */
export const WALKTHROUGH = {
  video: '/walkthrough/walkthrough.mp4',
  poster: '/walkthrough/poster.jpg',
  captions: '/walkthrough/walkthrough.vtt',
} as const;

export function WalkthroughVideo() {
  return (
    <figure className="hds-walkthrough">
      <video
        className="hds-walkthrough-video"
        controls
        muted
        playsInline
        preload="none"
        poster={WALKTHROUGH.poster}
        width={1440}
        height={900}
        aria-label="HDS walkthrough, about 80 seconds, no sound"
      >
        <source src={WALKTHROUGH.video} type="video/mp4" />
        <track kind="captions" src={WALKTHROUGH.captions} srcLang="en" label="English" />
      </video>
      <figcaption>
        Six chapters: the case study, a component page, the token to Figma sync, a gate catching a
        mistake, the release path, and the results.
      </figcaption>
    </figure>
  );
}
