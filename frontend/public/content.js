// public/content.js

function extractArticleText() {
  // Try to find the main article container first
  const articleNode = document.querySelector('article') || document.querySelector('main');
  
  // If an article tag exists, grab its paragraphs. Otherwise, grab all paragraphs on the page.
  const rootNode = articleNode ? articleNode : document;
  const paragraphs = rootNode.querySelectorAll('p, h1, h2, h3, li');
  
  let extractedText = Array.from(paragraphs)
    .map(p => p.innerText.trim())
    .filter(text => text.length > 20) // Ignore tiny UI text snippets
    .join('\n\n');

  return extractedText || "No readable article text found on this page.";
}

// Send the extracted text back to the React popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "EXTRACT_TEXT") {
    sendResponse({ text: extractArticleText() });
  }
});