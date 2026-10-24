import io
import importlib
import zipfile
from xml.etree import ElementTree
import requests
import trafilatura

class ContentExtractor:
    @staticmethod
    def extract_from_url(url: str) -> str:
        """Fetches and extracts clean body text from a webpage URL using Trafilatura."""
        try:
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.5",
                "Referer": "https://www.google.com/"
            }
            
            response = requests.get(url, headers=headers, timeout=15)
            response.raise_for_status()
            
            # Trafilatura cleanly extracts just the main article text
            text = trafilatura.extract(response.text)
            
            if not text or len(text) < 100:
                raise ValueError("Could not extract readable article text. The site might strictly require JavaScript to load its content.")
                
            return text
            
        except requests.exceptions.HTTPError as e:
            if e.response.status_code == 403:
                raise Exception("HTTP 403 Forbidden: This specific website actively blocks automated bots. Use the 'Current Tab' extension button instead.")
            raise Exception(f"Failed to fetch the webpage: {e.response.status_code}")
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