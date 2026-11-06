/** Адрес без языка, который не обработал middleware. */
export default function RootNotFound() {
  return (
    <html lang="ky">
      <body style={{ fontFamily: 'system-ui', padding: '4rem', textAlign: 'center' }}>
        <h1>404</h1>
        <a href="/">OKU24</a>
      </body>
    </html>
  );
}
