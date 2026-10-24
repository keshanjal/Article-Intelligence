import io
import importlib
import zipfile
from xml.etree import ElementTree
from curl_cffi import requests as cffi_requests
import trafilatura

class ContentExtractor:
    @staticmethod
    def extract_from_url(url: str) -> str:
        """Fetches and extracts clean body text, bypassing Cloudflare using Chrome impersonation."""
        try:
            # Force the Pydantic HttpUrl object into a standard Python string
            clean_url = str(url)
            
            # impersonate="chrome120" mimics a real browser's network fingerprint to bypass Cloudflare 403s
            response = cffi_requests.get(clean_url, impersonate="chrome120", timeout=15)
            
            if response.status_code == 403:
                raise Exception("HTTP 403: This site uses enterprise-grade bot protection. Please use your extension's 'Current Tab' button to read it directly from your screen.")
                
            # Trafilatura cleanly extracts just the main article text from the HTML
            text = trafilatura.extract(response.text)
            
            if not text or len(text) < 100:
                raise ValueError("Could not extract readable text. The site might require JavaScript to load its content.")
                
            return text
            
        except Exception as e:
            raise Exception(f"Extraction failed: {str(e)}")

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