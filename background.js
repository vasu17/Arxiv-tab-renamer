chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "FETCH_ARXIV_DATA") {
    
    const apiUrl = `https://export.arxiv.org/api/query?id_list=${request.id}`;
    
    fetch(apiUrl)
      .then(response => response.text())
      .then(data => {
        sendResponse({ success: true, data: data });
      })
      .catch(error => {
        console.error("ArXiv Fetch Error:", error);
        sendResponse({ success: false, error: error.toString() });
      });

    return true; // Keep channel open for async response
  }
});
