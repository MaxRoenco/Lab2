# Lab 5 - HTTP over TCP Sockets (go2web)

This folder contains a CLI tool named go2web that performs HTTP requests using raw TCP sockets (and TLS with ssl) without using HTTP client libraries.

## Implemented CLI

- go2web -u <URL>: fetch URL and print human-readable response.
- go2web -s <search-term>: search with DuckDuckGo and print top 10 results.
- go2web -h: show help.

## Features

- Raw HTTP/1.1 over sockets (socket + optional ssl wrapping for HTTPS).
- Redirect support (`301/302/303/307/308`).
- Chunked transfer decoding.
- Content negotiation and rendering:
  - JSON responses are pretty-printed.
  - HTML responses are converted to plain text.
- Simple file-based HTTP cache (~/.go2web_cache).

## Step-by-step setup (Windows)

1. Open PowerShell.
2. Go to the project root.

```powershell
cd D:\HomeWork\ThirdYear\SecondSemestr\Web\Lab2
```

3. Go to the Lab 5 folder.

```powershell
cd .\lab5
```

4. Verify Python is available.

```powershell
py -3 --version
```

5. Run help to confirm CLI works.

```powershell
py -3 .\go2web.py -h
```

6. Test URL request mode.

```powershell
py -3 .\go2web.py -u https://example.com
```

7. Test search mode.

```powershell
py -3 .\go2web.py -s static site generator
```

8. Test Windows wrapper executable.

```powershell
.\go2web.cmd -h
.\go2web.cmd -u https://example.com
.\go2web.cmd -s http over tcp sockets
```

9. Optional: verify redirect handling.

```powershell
py -3 .\go2web.py -u "https://httpbin.org/redirect-to?url=https://example.com"
```

10. Optional: verify JSON rendering.

```powershell
py -3 .\go2web.py -u https://httpbin.org/json
```

11. Record your terminal demo GIF for README submission requirement.

12. Commit and push with a decent history.

```powershell
cd ..
git add lab5
git commit -m "feat(lab5): add go2web socket-based HTTP CLI"
git push origin master
```

## Run

From this folder:

```bash
python go2web.py -h
python go2web.py -u https://example.com
python go2web.py -s acting academy chisinau
```

## Executable wrappers

- Unix-like: ./go2web
- Windows: go2web.cmd

Examples:

```bash
./go2web -u https://example.com
./go2web -s static site generator
```

```powershell
go2web.cmd -u https://example.com
go2web.cmd -s static site generator
```

## Notes for grading

- No HTTP/HTTPS client library is used.
- Search result links are printed and can be queried back via `-u`.
- Redirect handling is implemented.
- Cache mechanism is implemented.
- Content negotiation for JSON and HTML is implemented.
