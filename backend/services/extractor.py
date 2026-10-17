import io
import importlib
from html.parser import HTMLParser
import zipfile
from xml.etree import ElementTree
from urllib.request import Request, urlopen


class _ArticleTextParser(HTMLParser):
    """Collect paragraph text while ignoring non-content elements."""

    SKIP_TAGS = {"script", "style", "nav", "footer", "header", "aside"}
    VOID_TAGS = {
        "area", "base", "br", "col", "embed", "hr", "img", "input", "link",
        "meta", "param", "source", "track", "wbr",
    }

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.paragraphs = []
        self.article_paragraphs = []
        self.article_depth = 0
        self.skip_depth = 0
        self.in_paragraph = False
        self.paragraph_parts = []

    def handle_starttag(self, tag, attrs):
        if self.skip_depth:
            if tag not in self.VOID_TAGS:
                self.skip_depth += 1
            return
        if tag in self.SKIP_TAGS:
            self.skip_depth = 1
        elif tag == "article":
            self.article_depth += 1
        elif tag == "p":
            self.in_paragraph = True
            self.paragraph_parts = []

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        if tag not in self.VOID_TAGS:
            self.handle_endtag(tag)

    def handle_endtag(self, tag):
        if self.skip_depth:
            self.skip_depth -= 1
            return
        if tag == "p" and self.in_paragraph:
            text = "".join(self.paragraph_parts).strip()
            if text:
                self.paragraphs.append(text)
                if self.article_depth:
                    self.article_paragraphs.append(text)
            self.in_paragraph = False
            self.paragraph_parts = []
        elif tag == "article" and self.article_depth:
            self.article_depth -= 1

    def handle_data(self, data):
        if self.in_paragraph and not self.skip_depth:
            self.paragraph_parts.append(data)

class ContentExtractor:
    @staticmethod
    def extract_from_url(url: str) -> str:
        """Fetches and extracts clean body text from a webpage URL."""
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
        request = Request(url, headers=headers)
        with urlopen(request, timeout=10) as response:
            encoding = response.headers.get_content_charset() or "utf-8"
            html = response.read().decode(encoding, errors="replace")

        parser = _ArticleTextParser()
        parser.feed(html)

        # Prioritize standard article containers, fall back to general paragraphs
        paragraphs = parser.article_paragraphs or parser.paragraphs

        clean_text = "\n\n".join([p for p in paragraphs if len(p) > 25])
        if not clean_text:
            raise ValueError("Could not extract readable article text from this URL.")
        return clean_text

    @staticmethod
    def extract_from_file(filename: str, file_bytes: bytes) -> str:
        """Parses PDF, DOCX, or plain TXT files into raw text."""
        extension = filename.lower().split(".")[-1]
        
        if extension == "txt":
            return file_bytes.decode("utf-8", errors="ignore")

        elif extension == "pdf":
            try:
                pdf_module = importlib.import_module("pypdf")
            except ImportError:
                pdf_module = importlib.import_module("PyPDF2")
            PdfReader = pdf_module.PdfReader
            reader = PdfReader(io.BytesIO(file_bytes))
            pages = [page.extract_text() or "" for page in reader.pages]
            return "\n\n".join(pages).strip()

        elif extension == "docx":
            with zipfile.ZipFile(io.BytesIO(file_bytes)) as archive:
                document = ElementTree.fromstring(archive.read("word/document.xml"))

            namespace = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
            paragraphs = []
            for paragraph in document.iter(f"{namespace}p"):
                parts = []
                for element in paragraph.iter():
                    if element.tag == f"{namespace}t":
                        parts.append(element.text or "")
                    elif element.tag == f"{namespace}tab":
                        parts.append("\t")
                    elif element.tag == f"{namespace}br":
                        parts.append("\n")
                text = "".join(parts)
                if text.strip():
                    paragraphs.append(text)
            return "\n\n".join(paragraphs)

        else:
            raise ValueError(f"Unsupported file format: .{extension}. Please upload PDF, DOCX, or TXT.")