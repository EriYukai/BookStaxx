// Added console logs to debug the "No SW" error message
console.log("------ BookStaxx background service worker initialization starting -------");
console.log("Service Worker Object:", self);
console.log("Chrome API available:", typeof chrome !== 'undefined');
console.log("Chrome bookmarks API available:", chrome?.bookmarks !== undefined);
console.log("BookStaxx background service worker started.");

// Try-catch block around initialization to better diagnose issues
const BOOKSTAXX_FOLDER_NAME = "BookStaxx";
let bookStaxxFolderId = null;
let isInitializing = true; // Flag to track initialization status

// --- Initialization Function ---
async function initializeBookStaxx() {
  console.log("Initializing BookStaxx: Finding or creating folder...");
  isInitializing = true;
  try {
    // 더 철저한 API 사용 가능 여부 체크
    if (typeof chrome === 'undefined') {
      throw new Error("Chrome API is not available");
    }
    
    if (!chrome.bookmarks) {
      throw new Error("Chrome bookmarks API is not available");
    }
    
    // 확장 프로그램 권한 확인 추가
    if (!chrome.permissions) {
      console.warn("Permissions API is not available, skipping permission check");
    } else {
      try {
        const hasPermission = await chrome.permissions.contains({permissions: ['bookmarks']});
        if (!hasPermission) {
          throw new Error("BookStaxx needs bookmarks permission");
        }
        console.log("Bookmarks permission confirmed");
      } catch (permError) {
        console.error("Error checking permissions:", permError);
      }
    }
    
    // 지연 추가하여 API가 완전히 로드될 시간 확보
    await new Promise(resolve => setTimeout(resolve, 500));
    console.log("Starting BookStaxx folder search...");
    
    const results = await chrome.bookmarks.search({ title: BOOKSTAXX_FOLDER_NAME });
    console.log("Search results for BookStaxx folder:", results);
    
    if (results.length > 0) {
      bookStaxxFolderId = results[0].id;
      console.log(`Initialization complete. Found BookStaxx folder ID: ${bookStaxxFolderId}`);
    } else {
      console.log("No BookStaxx folder found, creating one...");
      
      // 북마크 트리 구조 가져와서 기본 폴더에 생성
      const tree = await chrome.bookmarks.getTree();
      const bookmarkBar = tree[0]?.children?.[0]; // 북마크 바
      
      if (!bookmarkBar || !bookmarkBar.id) {
        console.error("Cannot find bookmark bar folder");
        // 기본 북마크 위치에 생성 시도
        const newFolder = await chrome.bookmarks.create({ title: BOOKSTAXX_FOLDER_NAME });
        bookStaxxFolderId = newFolder.id;
      } else {
        // 북마크 바에 폴더 생성
        const newFolder = await chrome.bookmarks.create({ 
          parentId: bookmarkBar.id,
          title: BOOKSTAXX_FOLDER_NAME 
        });
        bookStaxxFolderId = newFolder.id;
      }
      
      console.log(`Initialization complete. Created BookStaxx folder ID: ${bookStaxxFolderId}`);
    }
  } catch (error) {
    // 확장된 오류 정보
    console.error("CRITICAL: Error finding or creating BookStaxx folder during initialization:", error);
    console.error("Error name:", error.name);
    console.error("Error message:", error.message);
    console.error("Stack trace:", error.stack);
    // Keep bookStaxxFolderId as null
  } finally {
    isInitializing = false;
    console.log("BookStaxx initialization finished. Folder ID:", bookStaxxFolderId || "null (not created)");
  }
}

// 즉시 초기화 시작
initializeBookStaxx().catch(err => {
  console.error("Top-level initialization error:", err);
});

// --- Helper: Get Bookmarks (Moved before listener) ---
async function getBookmarksFromFolder(folderId) {
    if (!folderId) {
        throw new Error("Cannot get bookmarks, folder ID is null.");
    }
    try {
        const children = await chrome.bookmarks.getChildren(folderId);
        const bookmarks = children.filter(node => node.url);
        console.log(`Retrieved ${bookmarks.length} bookmarks from folder ${folderId}`);
        return bookmarks;
    } catch (error) {
        console.error(`Error getting bookmarks from folder ${folderId}:`, error);
        throw error; // Re-throw the error to be caught by the caller
    }
}


// --- Message Listener (Refactored to be async) ---
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log(`Message received: action=${request.action}, sender=${sender.tab?.id || 'unknown'}`);

  // Use an immediately-invoked async function expression (IIAFE)
  // to handle async operations cleanly and ensure sendResponse is called.
  (async () => {
    // Wait if initialization is still in progress
    if (isInitializing) {
        console.log("Initialization in progress, waiting...");
        // Simple wait loop (consider a more robust promise-based approach if needed)
        while (isInitializing) {
            await new Promise(resolve => setTimeout(resolve, 100)); // Wait 100ms
        }
        console.log("Initialization completed, proceeding with message.");
    }

    // Re-check folder ID after potentially waiting
    if (!bookStaxxFolderId && request.action !== "getTopLevelFolders") { // Allow getTopLevelFolders even if BookStaxx fails
         console.error("Action requires BookStaxx folder, but ID is still null after initialization attempt.");
         // Attempt re-initialization once more? Or send error immediately?
         // Let's try re-init once more for robustness.
         console.log("Attempting re-initialization...");
         await initializeBookStaxx(); // Await the re-attempt
         if (!bookStaxxFolderId) {
            sendResponse({ error: "BookStaxx folder ID is missing or could not be created." });
            return; // Exit IIAFE
         }
         console.log("Re-initialization successful.");
    }

    console.log(`Processing action: ${request.action}`);
    try {
      switch (request.action) {
        case "getBookmarks":
          const bookmarks = await getBookmarksFromFolder(bookStaxxFolderId);
          sendResponse({ bookmarks: bookmarks });
          break;

        case "addBookmark":
          try {
            const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tabs.length === 0) {
              // throw new Error("Could not get active tab information."); 
              sendResponse({ success: false, reason: "no_active_tab" }); // Specific reason
              return; // Exit IIAFE
            }
            const currentTab = tabs[0];
            
            // 수정된 URL 검증 로직: 더 광범위한 URL 유형 지원
            if (!currentTab.url) {
              console.warn("Attempted to bookmark a page without URL");
              sendResponse({ success: false, reason: "invalid_page" });
              return;
            }
            
            // chrome:// URL만 차단하고 다른 모든 URL 유형 허용 (네이버, 구글 등)
            if (currentTab.url.startsWith('chrome://') || 
                currentTab.url.startsWith('chrome-extension://') || 
                currentTab.url.startsWith('devtools://')) {
              console.warn("Attempted to bookmark a restricted browser page:", currentTab.url);
              sendResponse({ success: false, reason: "invalid_page" });
              return;
            }
            
            // 디버그 정보 추가
            console.log("Attempting to bookmark valid page:", currentTab.url);
            
            // Proceed with bookmark creation
            const newBookmark = await chrome.bookmarks.create({
              parentId: bookStaxxFolderId,
              title: currentTab.title || 'Untitled',
              url: currentTab.url
            });
            console.log("Bookmark added:", newBookmark);
            sendResponse({ success: true, bookmark: newBookmark });
          } catch (error) {
              // Catch errors during tab query or bookmark creation
              console.error("Error during addBookmark process:", error);
              sendResponse({ success: false, reason: "creation_failed", error: error.message });
          }
          break;

        case "goBack":
          // Wrap in try-catch as API calls can fail
          try {
              if (!sender.tab || !sender.tab.id) {
                throw new Error("Cannot go back, sender tab information missing.");
              }
              await chrome.tabs.goBack(sender.tab.id);
              console.log("Navigated back on tab:", sender.tab.id);
              sendResponse({ success: true });
          } catch (error) {
              console.error("Error during goBack process:", error);
              sendResponse({ success: false, reason: "navigation_failed", error: error.message });
          }
          break;

        case "openInNewTab":
           // Wrap in try-catch
           try {
              if (!request.url) {
                throw new Error("URL missing for openInNewTab action.");
              }
              const newTab = await chrome.tabs.create({ url: request.url, active: false });
              console.log("Opened URL in new background tab:", request.url);
              sendResponse({ success: true, tabId: newTab.id });
           } catch (error) {
               console.error("Error during openInNewTab process:", error);
               sendResponse({ success: false, reason: "tab_creation_failed", error: error.message });
           }
          break;

        case "importInitialBookmarks":
          // Wrap in try-catch although internal errors are handled by Promise.allSettled
          try {
              if (!request.sourceFolderIds) {
                  throw new Error("Source folder IDs missing for import.");
              }
              console.log("Initial bookmark import requested from folders:", request.sourceFolderIds);
              let totalCopied = 0;
              const results = await Promise.allSettled(
                  request.sourceFolderIds.map(id => copyBookmarksRecursive(id, bookStaxxFolderId))
              );
              
              results.forEach(result => {
                  if (result.status === 'fulfilled') {
                      totalCopied += result.value;
                  } else {
                      console.warn("Error copying from one of the folders:", result.reason);
                  }
              });

              console.log(`Bookmark import process finished. Copied ${totalCopied} bookmarks.`);
              sendResponse({ success: true, count: totalCopied });
          } catch (error) {
              console.error("Error during importInitialBookmarks process:", error);
              sendResponse({ success: false, reason: "import_failed", error: error.message });
          }
          break;

        case "getTopLevelFolders":
            try {
                const folders = await getTopLevelBookmarkFolders();
                sendResponse({ folders: folders });
            } catch (error) {
                console.error("Error during getTopLevelFolders process:", error);
                sendResponse({ success: false, reason: "folder_fetch_failed", error: error.message });
            }
            break;

        default:
          console.warn(`Unknown action received: ${request.action}`);
          sendResponse({ error: `Unknown action: ${request.action}` });
          break;
      }
       console.log(`Successfully processed action: ${request.action}`); // May log even if success was false internally, adjust if needed

    } catch (error) {
       // This top-level catch handles errors thrown before or outside the switch cases
      console.error(`Unhandled error processing action ${request.action}:`, error);
      sendResponse({ success: false, error: error.message || "An unknown top-level error occurred." });
    }
  })(); // End of IIAFE

  // Return true IMMEDIATELY to indicate that sendResponse will be called asynchronously.
  return true;
});


// --- Helper: Copy Bookmarks Recursive (Moved before listener) ---
async function copyBookmarksRecursive(sourceFolderId, targetFolderId) {
    let count = 0;
    try {
        const children = await chrome.bookmarks.getChildren(sourceFolderId);
        for (const node of children) {
            if (node.url) {
                // Avoid duplicates? Check if URL already exists in target? (Simple copy for now)
                await chrome.bookmarks.create({ parentId: targetFolderId, title: node.title, url: node.url });
                count++;
            } else if (node.children) {
                // Recursively copy bookmarks from the subfolder, keeping structure flat in BookStaxx
                count += await copyBookmarksRecursive(node.id, targetFolderId);
            }
        }
    } catch (error) {
        console.error(`Error copying bookmarks from folder ${sourceFolderId}:`, error);
        // Don't re-throw here, allow Promise.allSettled to catch it for the specific folder
    }
    return count;
}

// --- Helper: Get Top Level Folders (Moved before listener) ---
async function getTopLevelBookmarkFolders() {
    try {
        const tree = await chrome.bookmarks.getTree();
        if (tree.length > 0 && tree[0].children) {
            const topLevelFolders = tree[0].children.filter(node => !node.url && node.children);
            console.log("Found top-level folders:", topLevelFolders.map(f => ({id: f.id, title: f.title}))); // Log only relevant info
            return topLevelFolders.map(f => ({id: f.id, title: f.title})); // Return only id and title
        }
    } catch (error) {
        console.error("Error getting top-level bookmark folders:", error);
    }
    return [];
}


// --- Lifecycle Listeners ---
chrome.runtime.onInstalled.addListener(async (details) => {
    console.log(`Extension event: ${details.reason}`);
    await initializeBookStaxx(); // Ensure folder exists on install/update

    if (details.reason === "install") {
        // 최초 설치 시 북마크 불러오기를 강조하기 위해 플래그 설정
        chrome.storage.local.set({ 
            'showImportSection': true,  // 북마크 불러오기 섹션 표시 요청 
            'firstInstall': true        // 최초 설치 플래그
        }, () => {
            console.log("First install flags set - showing import section");
        });
        
        // Open the options page ONLY on first install
        chrome.runtime.openOptionsPage();
        console.log("Opened options page for initial setup.");
    }
});

chrome.runtime.onStartup.addListener(async () => {
    console.log("Extension event: onStartup");
    await initializeBookStaxx(); // Ensure folder exists on browser start
    
    // 북마크 수가 0인 경우 사용자에게 알림
    try {
        if (bookStaxxFolderId) {
            const bookmarks = await getBookmarksFromFolder(bookStaxxFolderId);
            if (bookmarks.length === 0) {
                console.log("No bookmarks found in BookStaxx folder. Showing notification or prompt could be useful.");
                // TODO: 향후 북마크가 없을 때 알림 기능 구현 가능
            }
        }
    } catch (error) {
        console.error("Error checking bookmarks count on startup:", error);
    }
}); 