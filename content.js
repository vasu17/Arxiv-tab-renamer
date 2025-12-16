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

        // Prevent infinite loops if fetching fails repeatedly
        const retryCount = parseInt(sessionStorage.getItem('arxiv_retry_count') || '0', 10);
        if (retryCount > 2) {
            console.warn("ArXiv Title Fixer: Too many failures, disabling for this tab.");
            return;
        }

        // --- STOP LOADING & START WRAPPER ---
        window.stop(); 

        let currentTitle = "Loading Paper...";

        // UI Builder
        const setPageContent = (srcUrl) => {
            document.documentElement.innerHTML = `
                <html>
                <head>
                    <title>${currentTitle}</title>
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
                            currentTitle = titleNode.textContent.replace(/\s+/g, ' ').trim();
                            document.title = currentTitle;
                        }
                    }
                }
            });
        }

        // 1. Start Title Fetch Immediately
        if (arxivId) {
            askBackgroundForTitle(arxivId);
        }

        // 2. Fetch Blob (Bypass ArXiv Headers)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

        fetch(CURRENT_URL, { signal: controller.signal })
            .then(response => {
                clearTimeout(timeoutId);
                if (!response.ok) throw new Error("Network response was not ok");
                return response.blob();
            })
            .then(blob => {
                sessionStorage.removeItem('arxiv_retry_count');
                const blobUrl = URL.createObjectURL(blob);
                setPageContent(blobUrl);
            })
            .catch(err => {
                console.error("Blob load failed:", err);
                const retries = parseInt(sessionStorage.getItem('arxiv_retry_count') || '0', 10);
                sessionStorage.setItem('arxiv_retry_count', retries + 1);
                // Fallback: reload page normally if fetch fails
                window.location.reload();
            });
    }

})();