// Added console logs to debug the "No SW" error message
console.log("------ BookStaxx background service worker initialization starting -------");
console.log("Service Worker Object:", self);
console.log("Chrome API available:", typeof chrome !== 'undefined');
console.log("Chrome bookmarks API available:", chrome?.bookmarks !== undefined);
console.log("BookStaxx background service worker started.");

// 서비스 워커 시작
console.log("------ BookStaxx 서비스 워커 초기화 시작 -------");

// 전역 변수 정의
const BOOKSTAXX_FOLDER_NAME = "BookStaxx";
let bookStaxxFolderId = null;
let isInitializing = true;
let bookmarks = [];
let bookmarkUsageData = {};

// BookStaxx 폴더 검색 또는 생성 함수
async function findOrCreateBookStaxxFolder() {
    try {
        // 북마크 API가 준비되었는지 확인
        if (!chrome || !chrome.bookmarks) {
            console.error("북마크 API를 사용할 수 없습니다");
            throw new Error("No SW");
        }

        // 북마크 바 검색
        const bookmarkBar = await chrome.bookmarks.getChildren("1");
        
        // BookStaxx 폴더 검색
        for (const node of bookmarkBar) {
            if (node.title === BOOKSTAXX_FOLDER_NAME && !node.url) {
                console.log(`기존 BookStaxx 폴더 발견: ${node.id}`);
                return node.id;
            }
        }
        
        // 폴더가 없으면 생성
        console.log("BookStaxx 폴더를 생성합니다...");
        const newFolder = await chrome.bookmarks.create({
            parentId: "1",
            title: BOOKSTAXX_FOLDER_NAME
        });
        
        console.log(`새 BookStaxx 폴더 생성됨: ${newFolder.id}`);
        return newFolder.id;
    } catch (error) {
        console.error("BookStaxx 폴더 검색/생성 중 오류:", error);
        throw error;
    }
}

// BookStaxx 초기화 함수
async function initializeBookStaxx() {
    console.log("BookStaxx 초기화 시작...");
    
    try {
        // chrome 객체 확인
        if (!chrome) {
            console.error("Chrome API를 사용할 수 없습니다");
            throw new Error("No SW");
        }

        // bookmarks API 확인
        if (!chrome.bookmarks) {
            console.error("북마크 API를 사용할 수 없습니다");
            throw new Error("No SW");
        }
        
        // 북마크 폴더 검색 또는 생성
        bookStaxxFolderId = await findOrCreateBookStaxxFolder();
        console.log(`BookStaxx 폴더 ID: ${bookStaxxFolderId}`);
        
        // 북마크 데이터 초기화
        initializeBookmarks();
        
        isInitializing = false;
        console.log("BookStaxx 초기화 완료");
        return true;
    } catch (error) {
        console.error("BookStaxx 초기화 실패:", error);
        isInitializing = false;
        return false;
    }
}

// 서비스 워커 초기화
async function initializeServiceWorker() {
    try {
        console.log("서비스 워커 초기화 중...");
        
        // Chrome API 사용 가능 여부 확인
        if (typeof chrome === 'undefined') {
            console.error("Chrome API를 사용할 수 없습니다");
            return;
        }
        
        // 필수 API 확인
        console.log("Chrome runtime API 가능:", !!chrome.runtime);
        console.log("Chrome bookmarks API 가능:", !!chrome.bookmarks);
        console.log("Chrome storage API 가능:", !!chrome.storage);
        
        // 서비스 워커 등록 확인
        if (self && self.registration) {
            console.log("서비스 워커 등록 상태:", self.registration.active ? "활성" : "비활성");
        } else {
            console.warn("서비스 워커 등록 상태를 확인할 수 없습니다");
        }
        
        await initializeBookStaxx();
        console.log("서비스 워커 초기화 완료");
    } catch (error) {
        console.error("서비스 워커 초기화 실패:", error);
    }
}

// 즉시 초기화 실행
initializeServiceWorker().catch(err => {
    console.error("서비스 워커 초기화 중 오류 발생:", err);
});

// 확장 프로그램 초기화 시 북마크 데이터 로드
function initializeBookmarks() {
  console.log('BookStaxx: 북마크 초기화 중...');
  
  // 북마크 사용 데이터 로드
  loadBookmarkUsageData();
  
  // 크롬 북마크 데이터 로드
  chrome.bookmarks.getTree(function(bookmarkTree) {
    // 북마크 트리를 평면화하여 모든 북마크를 추출
    bookmarks = flattenBookmarkTree(bookmarkTree);
    console.log('BookStaxx: 북마크 ' + bookmarks.length + '개 로드됨');
  });
}

// 북마크 트리를 평면화하여 모든 북마크 항목 추출
function flattenBookmarkTree(bookmarkTree) {
  let bookmarkList = [];
  
  function processNode(node) {
    // 북마크 폴더인 경우 자식 노드 처리
    if (node.children) {
      node.children.forEach(processNode);
    } 
    // 북마크 항목인 경우 (URL이 있는 경우만 추가)
    else if (node.url) {
      bookmarkList.push({
        id: node.id,
        title: node.title || '',
        url: node.url,
        dateAdded: node.dateAdded
      });
    }
  }
  
  // 북마크 트리 처리 시작
  bookmarkTree.forEach(processNode);
  return bookmarkList;
}

// 북마크 사용 데이터 로드
function loadBookmarkUsageData() {
  chrome.storage.local.get('bookmarkUsageData', function(result) {
    if (result.bookmarkUsageData) {
      bookmarkUsageData = result.bookmarkUsageData;
      console.log('BookStaxx: 북마크 사용 데이터 로드됨');
    } else {
      bookmarkUsageData = {};
      console.log('BookStaxx: 북마크 사용 데이터가 없음, 새로 생성됨');
      // 초기 데이터 저장
      saveBookmarkUsageData();
    }
  });
}

// 북마크 사용 데이터 저장
function saveBookmarkUsageData() {
  chrome.storage.local.set({ 'bookmarkUsageData': bookmarkUsageData }, function() {
    if (chrome.runtime.lastError) {
      console.error('BookStaxx: 북마크 사용 데이터 저장 실패:', chrome.runtime.lastError);
    } else {
      console.log('BookStaxx: 북마크 사용 데이터 저장됨');
    }
  });
}

// 북마크 사용 횟수 증가
function incrementBookmarkUsage(url) {
  if (!url) return;
  
  // URL이 이미 존재하는지 확인
  if (!bookmarkUsageData[url]) {
    bookmarkUsageData[url] = { count: 0, lastUsed: 0 };
  }
  
  // 사용 횟수 증가 및 마지막 사용 시간 업데이트
  bookmarkUsageData[url].count += 1;
  bookmarkUsageData[url].lastUsed = Date.now();
  
  // 변경된 데이터 저장
  saveBookmarkUsageData();
}

// 북마크 변경 이벤트 리스너
chrome.bookmarks.onCreated.addListener(function(id, bookmark) {
  console.log('BookStaxx: 북마크 생성됨', bookmark.title);
  initializeBookmarks(); // 북마크 목록 갱신
});

chrome.bookmarks.onRemoved.addListener(function(id, removeInfo) {
  console.log('BookStaxx: 북마크 삭제됨', id);
  initializeBookmarks(); // 북마크 목록 갱신
});

chrome.bookmarks.onChanged.addListener(function(id, changeInfo) {
  console.log('BookStaxx: 북마크 변경됨', id, changeInfo);
  initializeBookmarks(); // 북마크 목록 갱신
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
            
            // 강제 추가 옵션이 있는 경우 (특수 사이트용)
            if (request.forceAdd && request.url && request.title) {
              console.log("Using forced bookmark data:", request.url, request.title);
              try {
                const newBookmark = await chrome.bookmarks.create({
                  parentId: bookStaxxFolderId,
                  title: request.title,
                  url: request.url
                });
                console.log("Bookmark force-added:", newBookmark);
                sendResponse({ success: true, bookmark: newBookmark });
                return;
              } catch (error) {
                console.error("Error during forced bookmark creation:", error);
                sendResponse({ success: false, reason: "creation_failed", error: error.message });
                return;
              }
            }
            
            // 수정된 URL 검증 로직: 더 광범위한 URL 유형 지원
            if (!currentTab.url) {
              console.warn("Attempted to bookmark a page without URL");
              sendResponse({ success: false, reason: "invalid_page" });
              return;
            }
            
            // 더 상세한 로깅 추가
            console.log("Attempting to bookmark tab:", {
              url: currentTab.url,
              title: currentTab.title,
              tabId: currentTab.id,
              windowId: currentTab.windowId
            });
            
            // 보다 유연한 URL 검증 - 크롬 내부 페이지만 차단하고 나머지는 허용
            const restrictedPrefixes = ['chrome://', 'chrome-extension://', 'devtools://'];
            const isRestricted = restrictedPrefixes.some(prefix => currentTab.url.startsWith(prefix));
            
            if (isRestricted) {
              console.warn("Attempted to bookmark a restricted browser page:", currentTab.url);
              sendResponse({ success: false, reason: "invalid_page" });
              return;
            }
            
            // URL 유효성 추가 검사
            try {
              new URL(currentTab.url); // URL 구문 분석 시도
            } catch (error) {
              console.error("Invalid URL format:", currentTab.url, error);
              // 강제 북마크 추가 시도
              try {
                console.log("Attempting alternate bookmark method for:", currentTab.url);
                const newBookmark = await chrome.bookmarks.create({
                  parentId: bookStaxxFolderId,
                  title: currentTab.title || 'Untitled',
                  url: currentTab.url
                });
                console.log("Bookmark force-added with alternate method:", newBookmark);
                sendResponse({ success: true, bookmark: newBookmark });
                return;
              } catch (createError) {
                console.error("Alternate bookmark method failed:", createError);
                sendResponse({ success: false, reason: "invalid_url_format", error: error.message });
                return;
              }
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

    // 컨텍스트 메뉴 생성
    chrome.contextMenus.create({
        id: 'showBookmarkBar',
        title: 'BookStaxx 북마크 바 열기',
        contexts: ['page']
    });
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

// 컨텍스트 메뉴 클릭 처리
chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === 'showBookmarkBar') {
        chrome.tabs.sendMessage(tab.id, { action: 'showBookmarkBar' });
    }
}); 