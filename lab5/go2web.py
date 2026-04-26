#!/usr/bin/env python3
"""go2web - HTTP over TCP sockets command line tool.

This program intentionally avoids built-in/third-party HTTP clients.
It uses raw TCP sockets (and TLS via ssl for HTTPS) to send HTTP requests.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import socket
import ssl
import sys
import time
from dataclasses import dataclass
from html import unescape
from html.parser import HTMLParser
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from urllib.parse import parse_qs, quote_plus, unquote, urljoin, urlparse

USER_AGENT = "go2web/1.0"
DEFAULT_TIMEOUT = 15
MAX_REDIRECTS = 5
DEFAULT_CACHE_TTL = 120


class Go2WebError(Exception):
    """Raised for user-facing operational errors."""


@dataclass
class HttpResponse:
    url: str
    status_code: int
    reason: str
    headers: Dict[str, str]
    body_bytes: bytes
    from_cache: bool = False

    @property
    def content_type(self) -> str:
        return self.headers.get("content-type", "")

    def body_text(self) -> str:
        charset = _extract_charset(self.content_type)
        for encoding in (charset, "utf-8", "latin-1"):
            if not encoding:
                continue
            try:
                return self.body_bytes.decode(encoding, errors="replace")
            except LookupError:
                continue
        return self.body_bytes.decode("utf-8", errors="replace")


class CacheStore:
    """Simple file cache for GET responses."""

    def __init__(self, root: Optional[Path] = None) -> None:
        base = root or (Path.home() / ".go2web_cache")
        self.root = base
        self.root.mkdir(parents=True, exist_ok=True)

    def _path_for(self, key: str) -> Path:
        digest = hashlib.sha256(key.encode("utf-8")).hexdigest()
        return self.root / f"{digest}.json"

    def get(self, key: str) -> Optional[HttpResponse]:
        path = self._path_for(key)
        if not path.exists():
            return None

        try:
            payload = json.loads(path.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            return None

        created_at = payload.get("created_at", 0)
        ttl = payload.get("ttl", 0)
        if time.time() > (created_at + ttl):
            return None

        try:
            return HttpResponse(
                url=payload["url"],
                status_code=int(payload["status_code"]),
                reason=payload.get("reason", ""),
                headers=payload.get("headers", {}),
                body_bytes=bytes.fromhex(payload.get("body_hex", "")),
                from_cache=True,
            )
        except (KeyError, ValueError):
            return None

    def set(self, key: str, response: HttpResponse, ttl: int) -> None:
        if ttl <= 0:
            return

        payload = {
            "url": response.url,
            "status_code": response.status_code,
            "reason": response.reason,
            "headers": response.headers,
            "body_hex": response.body_bytes.hex(),
            "created_at": int(time.time()),
            "ttl": int(ttl),
        }

        try:
            self._path_for(key).write_text(json.dumps(payload), encoding="utf-8")
        except OSError:
            pass


class HttpClient:
    def __init__(self, timeout: int = DEFAULT_TIMEOUT, cache: Optional[CacheStore] = None) -> None:
        self.timeout = timeout
        self.cache = cache or CacheStore()

    def get(self, url: str, follow_redirects: bool = True) -> HttpResponse:
        current_url = _normalize_url(url)
        redirect_count = 0

        while True:
            cached = self.cache.get(current_url)
            if cached:
                return cached

            response = self._single_get(current_url)

            ttl = _cache_ttl_from_headers(response.headers)
            self.cache.set(current_url, response, ttl)

            if (
                follow_redirects
                and response.status_code in {301, 302, 303, 307, 308}
                and "location" in response.headers
            ):
                if redirect_count >= MAX_REDIRECTS:
                    raise Go2WebError("Too many redirects")

                next_url = urljoin(current_url, response.headers["location"])
                current_url = _normalize_url(next_url)
                redirect_count += 1
                continue

            return response

    def _single_get(self, url: str) -> HttpResponse:
        parsed = urlparse(url)
        if parsed.scheme not in {"http", "https"}:
            raise Go2WebError("Only http and https URLs are supported")

        host = parsed.hostname
        if not host:
            raise Go2WebError("Invalid URL: missing host")

        port = parsed.port or (443 if parsed.scheme == "https" else 80)
        target = parsed.path or "/"
        if parsed.params:
            target += f";{parsed.params}"
        if parsed.query:
            target += f"?{parsed.query}"

        request_headers = [
            f"GET {target} HTTP/1.1",
            f"Host: {host}",
            f"User-Agent: {USER_AGENT}",
            "Accept: application/json,text/html;q=0.9,text/plain;q=0.8,*/*;q=0.7",
            "Accept-Encoding: identity",
            "Connection: close",
            "",
            "",
        ]
        request_data = "\r\n".join(request_headers).encode("utf-8")

        try:
            with socket.create_connection((host, port), timeout=self.timeout) as sock:
                if parsed.scheme == "https":
                    context = ssl.create_default_context()
                    with context.wrap_socket(sock, server_hostname=host) as tls_sock:
                        tls_sock.sendall(request_data)
                        raw_response = _recv_all(tls_sock)
                else:
                    sock.sendall(request_data)
                    raw_response = _recv_all(sock)
        except (socket.timeout, socket.gaierror, ConnectionError, ssl.SSLError) as exc:
            raise Go2WebError(f"Network error: {exc}") from exc

        return _parse_raw_response(url, raw_response)


class HtmlToTextParser(HTMLParser):
    """Converts HTML to readable plain text."""

    BLOCK_TAGS = {
        "address",
        "article",
        "aside",
        "blockquote",
        "br",
        "div",
        "dl",
        "dt",
        "dd",
        "fieldset",
        "figcaption",
        "figure",
        "footer",
        "form",
        "h1",
        "h2",
        "h3",
        "h4",
        "h5",
        "h6",
        "header",
        "hr",
        "li",
        "main",
        "nav",
        "ol",
        "p",
        "pre",
        "section",
        "table",
        "tr",
        "ul",
    }

    def __init__(self) -> None:
        super().__init__()
        self._parts: List[str] = []
        self._skip_depth = 0

    def handle_starttag(self, tag: str, attrs: List[Tuple[str, Optional[str]]]) -> None:
        if tag in {"script", "style", "noscript"}:
            self._skip_depth += 1
            return

        if self._skip_depth:
            return

        if tag in self.BLOCK_TAGS:
            self._parts.append("\n")

    def handle_endtag(self, tag: str) -> None:
        if tag in {"script", "style", "noscript"}:
            if self._skip_depth:
                self._skip_depth -= 1
            return

        if self._skip_depth:
            return

        if tag in self.BLOCK_TAGS:
            self._parts.append("\n")

    def handle_data(self, data: str) -> None:
        if self._skip_depth:
            return

        self._parts.append(unescape(data))

    def get_text(self) -> str:
        raw = "".join(self._parts)
        lines = [re.sub(r"\s+", " ", line).strip() for line in raw.splitlines()]
        filtered = [line for line in lines if line]
        return "\n".join(filtered)


class DuckDuckGoResultParser(HTMLParser):
    """Extracts search titles + links from DuckDuckGo HTML results."""

    def __init__(self) -> None:
        super().__init__()
        self.results: List[Tuple[str, str]] = []
        self._capture_anchor = False
        self._current_href = ""
        self._title_parts: List[str] = []

    def handle_starttag(self, tag: str, attrs: List[Tuple[str, Optional[str]]]) -> None:
        if tag != "a":
            return

        attrs_map = {k: (v or "") for k, v in attrs}
        classes = attrs_map.get("class", "")
        if "result__a" not in classes:
            return

        self._capture_anchor = True
        self._current_href = attrs_map.get("href", "")
        self._title_parts = []

    def handle_data(self, data: str) -> None:
        if self._capture_anchor:
            self._title_parts.append(data)

    def handle_endtag(self, tag: str) -> None:
        if tag != "a" or not self._capture_anchor:
            return

        title = re.sub(r"\s+", " ", "".join(self._title_parts)).strip()
        if title and self._current_href:
            self.results.append((unescape(title), self._current_href))

        self._capture_anchor = False
        self._current_href = ""
        self._title_parts = []


def _normalize_url(url: str) -> str:
    trimmed = url.strip()
    if not trimmed:
        raise Go2WebError("URL cannot be empty")

    parsed = urlparse(trimmed)
    if not parsed.scheme:
        trimmed = "http://" + trimmed
        parsed = urlparse(trimmed)

    if parsed.scheme not in {"http", "https"}:
        raise Go2WebError("Only http and https URLs are supported")

    if not parsed.netloc:
        raise Go2WebError("Invalid URL")

    return trimmed


def _extract_charset(content_type: str) -> Optional[str]:
    match = re.search(r"charset=([^;\s]+)", content_type, flags=re.IGNORECASE)
    if not match:
        return None
    return match.group(1).strip('"\'')


def _recv_all(sock_obj: socket.socket) -> bytes:
    chunks: List[bytes] = []
    while True:
        data = sock_obj.recv(4096)
        if not data:
            break
        chunks.append(data)
    return b"".join(chunks)


def _parse_raw_response(url: str, raw: bytes) -> HttpResponse:
    sep = b"\r\n\r\n"
    pos = raw.find(sep)
    if pos == -1:
        raise Go2WebError("Invalid HTTP response")

    head = raw[:pos].decode("iso-8859-1", errors="replace")
    body = raw[pos + len(sep) :]

    lines = head.split("\r\n")
    if not lines:
        raise Go2WebError("Malformed response status line")

    status_match = re.match(r"^HTTP/\d\.\d\s+(\d{3})\s*(.*)$", lines[0])
    if not status_match:
        raise Go2WebError("Malformed response status line")

    status_code = int(status_match.group(1))
    reason = status_match.group(2).strip()

    headers: Dict[str, str] = {}
    for line in lines[1:]:
        if not line or ":" not in line:
            continue
        key, value = line.split(":", 1)
        headers[key.strip().lower()] = value.strip()

    transfer_encoding = headers.get("transfer-encoding", "")
    if "chunked" in transfer_encoding.lower():
        body = _decode_chunked(body)

    return HttpResponse(
        url=url,
        status_code=status_code,
        reason=reason,
        headers=headers,
        body_bytes=body,
    )


def _decode_chunked(data: bytes) -> bytes:
    i = 0
    out = bytearray()

    while True:
        line_end = data.find(b"\r\n", i)
        if line_end == -1:
            raise Go2WebError("Malformed chunked response")

        size_line = data[i:line_end].decode("ascii", errors="replace")
        size_str = size_line.split(";", 1)[0].strip()
        try:
            size = int(size_str, 16)
        except ValueError as exc:
            raise Go2WebError("Malformed chunk size") from exc

        i = line_end + 2

        if size == 0:
            break

        chunk = data[i : i + size]
        if len(chunk) < size:
            raise Go2WebError("Incomplete chunked body")

        out.extend(chunk)
        i += size

        if data[i : i + 2] != b"\r\n":
            raise Go2WebError("Malformed chunk separator")

        i += 2

    return bytes(out)


def _cache_ttl_from_headers(headers: Dict[str, str]) -> int:
    cache_control = headers.get("cache-control", "").lower()

    if "no-store" in cache_control:
        return 0

    max_age_match = re.search(r"max-age=(\d+)", cache_control)
    if max_age_match:
        return int(max_age_match.group(1))

    return DEFAULT_CACHE_TTL


def html_to_text(html: str) -> str:
    parser = HtmlToTextParser()
    parser.feed(html)
    parser.close()
    return parser.get_text()


def parse_search_results(html: str) -> List[Tuple[str, str]]:
    parser = DuckDuckGoResultParser()
    parser.feed(html)
    parser.close()

    seen = set()
    parsed_results: List[Tuple[str, str]] = []

    for title, href in parser.results:
        normalized = normalize_ddg_link(href)
        key = (title, normalized)
        if key in seen:
            continue
        seen.add(key)
        parsed_results.append((title, normalized))
        if len(parsed_results) == 10:
            break

    return parsed_results


def normalize_ddg_link(href: str) -> str:
    if href.startswith("//"):
        href = "https:" + href

    if href.startswith("/"):
        href = urljoin("https://duckduckgo.com", href)

    parsed = urlparse(href)
    if parsed.netloc.endswith("duckduckgo.com") and parsed.path == "/l/":
        params = parse_qs(parsed.query)
        uddg = params.get("uddg")
        if uddg:
            return unquote(uddg[0])

    return href


def render_response(response: HttpResponse) -> str:
    text = response.body_text()
    content_type = response.content_type.lower()

    if "application/json" in content_type:
        try:
            parsed = json.loads(text)
            body = json.dumps(parsed, indent=2, ensure_ascii=False)
        except json.JSONDecodeError:
            body = text
    elif "html" in content_type:
        body = html_to_text(text)
    else:
        body = text

    source = "cache" if response.from_cache else "network"
    status_line = f"Status: {response.status_code} {response.reason}".strip()

    return (
        f"URL: {response.url}\n"
        f"{status_line}\n"
        f"Content-Type: {response.content_type or 'unknown'}\n"
        f"Source: {source}\n"
        + "-" * 60
        + "\n"
        + body.strip()
    )


def perform_url_request(client: HttpClient, url: str) -> int:
    response = client.get(url)
    print(render_response(response))
    return 0


def perform_search(client: HttpClient, search_term: str) -> int:
    query = quote_plus(search_term)
    search_url = f"https://duckduckgo.com/html/?q={query}"
    response = client.get(search_url)

    html = response.body_text()
    results = parse_search_results(html)

    if not results:
        print(f'No results found for "{search_term}".')
        return 0

    print(f'Top {min(10, len(results))} results for "{search_term}":')
    print("-" * 60)
    for idx, (title, link) in enumerate(results, start=1):
        print(f"{idx}. {title}")
        print(f"   {link}")

    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="go2web",
        description="HTTP over TCP sockets CLI (no HTTP libraries)",
    )

    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("-u", "--url", help="make an HTTP request to URL and print readable response")
    group.add_argument(
        "-s",
        "--search",
        nargs="+",
        metavar="TERM",
        help="search term with DuckDuckGo and print top 10 results",
    )

    return parser


def main(argv: Optional[List[str]] = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    client = HttpClient()

    try:
        if args.url:
            return perform_url_request(client, args.url)

        if args.search:
            return perform_search(client, " ".join(args.search))

        parser.print_help()
        return 0
    except Go2WebError as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 1
    except KeyboardInterrupt:
        print("Interrupted", file=sys.stderr)
        return 130


if __name__ == "__main__":
    raise SystemExit(main())
