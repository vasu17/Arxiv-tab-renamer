(function() {

    // 1. IGNORE LOCAL FILES
    // We immediately exit if this is a local file to avoid errors
    if (window.location.protocol === 'file:') {
        return;
    }

    const CURRENT_URL = window.location.href;
    const isPdf = CURRENT_URL.toLowerCase().endsWith('.pdf') || CURRENT_URL.includes('/pdf/');

    if (window.self === window.top && isPdf) {
        
        // --- DETECT ARXIV ID ---
        const newStyleMatch = CURRENT_URL.match(/(\d{4}\.\d{4,5})(v\d+)?/);
        const oldStyleMatch = CURRENT_URL.match(/([a-z\-]+\/\d{7})/);
        
        let arxivId = null;
        if (newStyleMatch) arxivId = newStyleMatch[1];
        else if (oldStyleMatch) arxivId = oldStyleMatch[1];

        // If it's not an ArXiv paper, we exit and let the browser load it normally
        if (!arxivId) return;

        // --- STOP LOADING & START WRAPPER ---
        window.stop(); 

        const initialTitle = "Loading Paper...";

        // UI Builder
        const setPageContent = (srcUrl, title) => {
            document.documentElement.innerHTML = `
                <html>
                <head>
                    <title>${title}</title>
                    <style>
                        body, html { margin: 0; padding: 0; height: 100%; overflow: hidden; background: #525659; }
                        iframe { width: 100%; height: 100%; border: none; display: block; }
                    </style>
                </head>
                <body>
                    <iframe src="${srcUrl}" id="pdf-frame"></iframe>
                </body>
                </html>
            `;
        };

        // Show loading screen
        document.body.innerHTML = '<h2 style="color:white; text-align:center; margin-top: 20%; font-family:sans-serif;">Loading PDF...</h2>';
        
        // Fetch Blob (Bypass ArXiv Headers)
        fetch(CURRENT_URL)
            .then(response => response.blob())
            .then(blob => {
                const blobUrl = URL.createObjectURL(blob);
                setPageContent(blobUrl, initialTitle);
                
                // Fetch Real Title
                if (arxivId) {
                    askBackgroundForTitle(arxivId);
                }
            })
            .catch(err => {
                console.error("Blob load failed:", err);
                // Fallback: reload page normally if fetch fails
                window.location.reload();
            });

        function askBackgroundForTitle(id) {
            chrome.runtime.sendMessage({ type: "FETCH_ARXIV_DATA", id: id }, (response) => {
                if (response && response.success) {
                    const parser = new DOMParser();
                    const xmlDoc = parser.parseFromString(response.data, "text/xml");
                    const entry = xmlDoc.getElementsByTagName("entry")[0];
                    
                    if (entry) {
                        const titleNode = entry.getElementsByTagName("title")[0];
                        if (titleNode) {
                            // Clean Title: Remove newlines and trim
                            const cleanTitle = titleNode.textContent.replace(/\s+/g, ' ').trim();
                            document.title = cleanTitle;
                        }
                    }
                }
            });
        }
    }

})();