document.addEventListener('DOMContentLoaded', function () {
    const addButton = document.getElementById('add-button');
    const sortButton = document.getElementById('sort-button');
    const sortCategorySelect = document.getElementById('sort-category-select');
    const autoFillButton = document.getElementById('auto-fill-button');
    const searchInput = document.getElementById('search-input');
    const themeToggle = document.getElementById('theme-toggle');
    const saveChangesButton = document.getElementById('save-changes-button');
    const closeButton = document.querySelector('.close-button');

    let currentEditBookmark = null;

    // Event Listeners
    addButton.addEventListener('click', addBookmark);
    sortButton.addEventListener('click', sortBookmarks);
    sortCategorySelect.addEventListener('change', filterBookmarksByCategory);
    autoFillButton.addEventListener('click', autoFillURL);
    searchInput.addEventListener('input', filterBookmarks);
    themeToggle.addEventListener('change', toggleTheme);
    saveChangesButton.addEventListener('click', saveBookmarkChanges);
    closeButton.addEventListener('click', closeModal);

    function toggleTheme() {
        const body = document.body;
        const isDarkTheme = body.classList.toggle('dark-theme');
        const theme = isDarkTheme ? 'dark-theme' : 'light-theme';
        body.classList.toggle('light-theme', !isDarkTheme);

        chrome.storage.sync.set({ theme: theme });
    }

    function showNotification(message, type) {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;

        document.body.appendChild(notification);

        setTimeout(() => {
            document.body.removeChild(notification);
        }, 3000);
    }

    function autoFillURL() {
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            const currentTab = tabs[0];
            const urlInput = document.getElementById('bookmark-url');
            const titleInput = document.getElementById('bookmark-title');
            urlInput.value = currentTab.url;
            titleInput.value = currentTab.title;
            showNotification('URL and title auto-filled successfully.', 'success');
        });
    }

    function addBookmark() {
        const titleInput = document.getElementById('bookmark-title');
        const urlInput = document.getElementById('bookmark-url');
        const categoryInput = document.getElementById('bookmark-category');
        const title = titleInput.value.trim();
        const url = urlInput.value.trim();
        const category = categoryInput.value;

        if (title && url) {
            const bookmark = { title, url, category };

            chrome.storage.sync.get(['bookmarks'], function (result) {
                const bookmarks = result.bookmarks || [];
                bookmarks.push(bookmark);

                chrome.storage.sync.set({ bookmarks: bookmarks }, function () {
                    addBookmarkToList(bookmark);
                    titleInput.value = '';
                    urlInput.value = '';
                    categoryInput.value = 'general';
                    showNotification('Bookmark added successfully.', 'success');
                });
            });
        } else {
            showNotification('Please fill in both the title and the URL.', 'error');
        }
    }

    // Retrieves the favicon used on the page
    function fetchFavicon(url, callback) {
        const faviconUrl = `https://www.google.com/s2/favicons?sz=64&domain_url=${url}`;
        callback(faviconUrl);
    }

    function addBookmarkToList(bookmark) {
        const bookmarksList = document.getElementById('bookmarks');

        const listItem = document.createElement('li');
        listItem.className = 'bookmark';
        listItem.draggable = true;
        const link = document.createElement('a');
        const favicon = document.createElement('img');
        const category = document.createElement('span');
        const removeButton = document.createElement('button');
        const editButton = document.createElement('button');

        link.href = bookmark.url;
        link.textContent = bookmark.title;
        link.target = '_blank';
        category.textContent = ` [${bookmark.category}]`;

        // Checking if the page has a favicon URL stored
        if (bookmark.faviconUrl) {
            favicon.src = bookmark.faviconUrl;
        
        // If not, fetch the favicon using the function: 'fetchFavicon'
        } else {
            fetchFavicon(bookmark.url, function (faviconUrl) {
                favicon.src = faviconUrl;
            });
        }

        favicon.className = 'favicon';
        category.className = 'category';
        removeButton.textContent = 'X';
        removeButton.className = 'remove-button';
        editButton.textContent = 'Edit';
        editButton.className = 'edit-button';

        removeButton.addEventListener('click', function () {
            removeBookmark(bookmark);
            listItem.parentNode.removeChild(listItem);
            showNotification('Bookmark removed successfully.', 'success');
        });

        editButton.addEventListener('click', function () {
            openEditModal(bookmark);
        });

        listItem.appendChild(favicon);
        listItem.appendChild(link);
        listItem.appendChild(category);
        listItem.appendChild(editButton);
        listItem.appendChild(removeButton);

        bookmarksList.appendChild(listItem);
    }

    function removeBookmark(bookmark) {
        chrome.storage.sync.get(['bookmarks'], function (result) {
            const bookmarks = result.bookmarks || [];
            const filteredBookmarks = bookmarks.filter(b => b.url !== bookmark.url);
            chrome.storage.sync.set({ bookmarks: filteredBookmarks });
        });
    }

    function openEditModal(bookmark) {
        currentEditBookmark = bookmark;
        const modal = document.getElementById('edit-bookmark-modal');
        const titleInput = document.getElementById('edit-bookmark-title');
        const urlInput = document.getElementById('edit-bookmark-url');

        titleInput.value = bookmark.title;
        urlInput.value = bookmark.url;

        modal.style.display = 'block';
    }

    function closeModal() {
        const modal = document.getElementById('edit-bookmark-modal');
        modal.style.display = 'none';
    }

    function saveBookmarkChanges() {
        const titleInput = document.getElementById('edit-bookmark-title');
        const urlInput = document.getElementById('edit-bookmark-url');
        const title = titleInput.value.trim();
        const url = urlInput.value.trim();

        if (title && url) {
            const updatedBookmark = { ...currentEditBookmark, title, url };

            chrome.storage.sync.get(['bookmarks'], function (result) {
                const bookmarks = result.bookmarks || [];
                const bookmarkIndex = bookmarks.findIndex(b => b.url === currentEditBookmark.url);

                // Check if URL has changed
                if (bookmarkIndex !== -1) {
                    bookmarks[bookmarkIndex] = updatedBookmark;
                } else {
                    // If URL changed, remove old bookmark and add new one
                    const oldBookmarkIndex = bookmarks.findIndex(b => b.url === currentEditBookmark.url);
                    if (oldBookmarkIndex !== -1) {
                        bookmarks.splice(oldBookmarkIndex, 1);
                    }
                    bookmarks.push(updatedBookmark);
                }

                fetchFavicon(updatedBookmark.url, function (faviconUrl) {
                    updatedBookmark.faviconUrl = faviconUrl;
                    chrome.storage.sync.set({ bookmarks: bookmarks }, function () {
                        updateBookmarkInList(updatedBookmark);
                        closeModal();
                        showNotification('Bookmark updated successfully.', 'success');
                    });
                });
            });
        } else {
            showNotification('Please fill in both the title and the URL.', 'error');
        }
    }

    function updateBookmarkInList(bookmark) {
        const bookmarksList = document.getElementById('bookmarks');
        const listItem = bookmarksList.querySelector(`a[href="${currentEditBookmark.url}"]`).parentElement;

        const link = listItem.querySelector('a');
        const category = listItem.querySelector('.category');

        link.textContent = bookmark.title;
        link.href = bookmark.url;
        category.textContent = ` [${bookmark.category}]`;

        fetchFavicon(bookmark.url, function (faviconUrl) {
            listItem.querySelector('.favicon').src = faviconUrl;
        });
    }

    function sortBookmarks() {
        chrome.storage.sync.get(['bookmarks'], function (result) {
            const bookmarks = result.bookmarks || [];
            bookmarks.sort((a, b) => a.title.localeCompare(b.title));
            chrome.storage.sync.set({ bookmarks: bookmarks }, function () {
                const bookmarksList = document.getElementById('bookmarks');
                bookmarksList.innerHTML = '';
                bookmarks.forEach(bookmark => addBookmarkToList(bookmark));
            });
        });
    }

    function filterBookmarksByCategory() {
        const selectedCategory = document.getElementById('sort-category-select').value;
        chrome.storage.sync.get(['bookmarks'], function (result) {
            const bookmarks = result.bookmarks || [];
            const filteredBookmarks = selectedCategory === 'all'
                ? bookmarks
                : bookmarks.filter(b => b.category === selectedCategory);
            const bookmarksList = document.getElementById('bookmarks');
            bookmarksList.innerHTML = '';
            filteredBookmarks.forEach(bookmark => addBookmarkToList(bookmark));
        });
    }

    function filterBookmarks() {
        const searchInput = document.getElementById('search-input').value.toLowerCase();
        const bookmarksList = document.getElementById('bookmarks');
        const bookmarks = bookmarksList.getElementsByTagName('li');

        for (let i = 0; i < bookmarks.length; i++) {
            const link = bookmarks[i].getElementsByTagName('a')[0];
            const textValue = link.textContent || link.innerText;
            bookmarks[i].style.display = textValue.toLowerCase().includes(searchInput) ? '' : 'none';
        }
    }
    
    // Load saved theme preference
    chrome.storage.sync.get(['theme'], function (result) {
        const theme = result.theme || 'light-theme';
        document.body.classList.add(theme);
        themeToggle.checked = theme === 'dark-theme';
    });

    // Load bookmarks on startup
    chrome.storage.sync.get(['bookmarks'], function (result) {
        const bookmarks = result.bookmarks || [];
        bookmarks.forEach(bookmark => addBookmarkToList(bookmark));
    });
});
