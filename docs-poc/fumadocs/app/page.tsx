// Static export can't run a server-side redirect() at request time, so this
// uses a plain meta-refresh straight to the docs home page. React 19 hoists
// a <meta> rendered anywhere in the tree into <head>, so this is valid even
// though RootLayout already owns the actual <html>/<head>.
export default function Home() {
  return (
    <>
      <meta httpEquiv="refresh" content="0; url=/docs" />
      <p>
        Redirecting to <a href="/docs">the docs</a>…
      </p>
    </>
  );
}
