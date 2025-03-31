// Saves bookmarks to local storage
function saveBookmarks(bookmarks) {
    chrome.storage.local.set({ bookmarks: bookmarks }, function () {
        console.log('All bookmarks have been saved.');
    });
}

function fetchFavicon(url, callback) {
    // Use Google's favicon service to get the website's favicon
    const faviconUrl = `https://www.google.com/s2/favicons?sz=64&domain_url=${url}`;

    // Pass the generated URL to the callback function 
    callback(faviconUrl);
}

function fetchFaviconsAndSave(bookmarks) {
    const totalBookmarks = bookmarks.length;
    let processedBookmarks = 0;
    
    // Loop through all bookmarks to fetch their favicons
    bookmarks.forEach(function (bookmark, index) {
        fetchFavicon(bookmark.url, function (faviconUrl) {
            // Store the fetched favicon in the bookmark object 
            bookmarks[index].faviconUrl = faviconUrl;
            processedBookmarks++;

            // Oncw all favicons are processed, save the updated bookmarks
            if (processedBookmarks === totalBookmarks) {
                saveBookmarks(bookmarks);
            }
        });
    });
}

/*
 * Recursively collects all bookmark URLs from a tree of bookmark nodes.
 * 
 * @param {Array} nodes - The list of bookmark nodes to process.
 * @param {Array} bookmarks - An array to store the collected bookmarks.
 */

function collectBookmarks(nodes, bookmarks) {
    nodes.forEach(function (node) {
        // If the node has children, it is a folder, so we recursively process its children
        if (node.children) {
            collectBookmarks(node.children, bookmarks);
        } else {
            // If the node is a bookmark (not a folder) and has a URL, store it
            if (node.url) {
                bookmarks.push({ title: node.title, url: node.url });
            }
        }
    });
}

// Imports bookmarks from local storage
function importBookmarks() {
    chrome.bookmarks.getTree(function (bookmarkTreeNodes) {
        const bookmarks = [];
        collectBookmarks(bookmarkTreeNodes, bookmarks);
        fetchFaviconsAndSave(bookmarks);
    });
}

// Handle extension installation
chrome.runtime.onInstalled.addListener(function (details) {
    if (details.reason === 'install' || details.reason === 'update') {
        importBookmarks();
    }
});
