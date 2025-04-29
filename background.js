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

// 파비콘 스토리지 키 프리픽스
const FAVICON_STORAGE_PREFIX = 'favicon_';

// BookStaxx 폴더 검색 또는 생성 함수
async function findOrCreateBookStaxxFolder() {
    try {
        console.log("BookStaxx 폴더 검색/생성 시작...");
        
        // API가 준비될 때까지 약간의 지연 (최대 3번 재시도)
        for (let attempt = 0; attempt < 3; attempt++) {
            // 북마크 API가 준비되었는지 확인
            if (!chrome || !chrome.bookmarks) {
                console.warn(`북마크 API를 사용할 수 없습니다. 재시도 ${attempt + 1}/3...`);
                await new Promise(resolve => setTimeout(resolve, 500));
                continue;
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
        }
        
        // 모든 재시도 후에도 API를 사용할 수 없는 경우
        console.error("3번의 재시도 후에도 북마크 API를 사용할 수 없습니다.");
        throw new Error("No SW");
    } catch (error) {
        console.error("BookStaxx 폴더 검색/생성 중 오류:", error);
        throw error;
    }
}

// 북마크와 함께 파비콘을 저장하는 함수
async function saveFaviconForBookmark(bookmarkId, url) {
    try {
        if (!url) {
            console.warn('URL이 제공되지 않아 파비콘을 저장할 수 없습니다.');
            return null;
        }
        
        // URL에서 도메인 추출
        const urlObj = new URL(url);
        const domain = urlObj.hostname;
        
        // 파비콘 URL 생성 - 여러 소스를 시도
        const faviconSources = [
            // 1. Google의 파비콘 서비스 (높은 해상도)
            `https://www.google.com/s2/favicons?domain=${domain}&sz=64`,
            // 2. 도메인에서 직접 가져오기
            `https://${domain}/favicon.ico`,
            // 3. 대체 파비콘 서비스
            `https://icon.horse/icon/${domain}`
        ];
        
        // 각 소스를 순차적으로 시도
        let faviconData = null;
        let lastError = null;
        
        for (const faviconUrl of faviconSources) {
            try {
                console.log(`파비콘 소스 시도: ${faviconUrl}`);
                
                // 파비콘 이미지 가져오기
                const response = await fetch(faviconUrl, { 
                    method: 'GET',
                    headers: { 'Accept': 'image/*' },
                    mode: 'cors',
                    cache: 'force-cache'
                });
                
                if (!response.ok) {
                    console.warn(`파비콘 소스 실패 (${response.status}): ${faviconUrl}`);
                    lastError = new Error(`파비콘 가져오기 실패: ${response.status}`);
                    continue; // 다음 소스 시도
                }
                
                // Blob으로 변환
                const blob = await response.blob();
                
                // 유효한 이미지인지 확인 (크기가 0이 아닌지)
                if (blob.size === 0) {
                    console.warn(`빈 파비콘 이미지: ${faviconUrl}`);
                    lastError = new Error('빈 파비콘 이미지');
                    continue; // 다음 소스 시도
                }
                
                // 유효한 이미지 MIME 타입인지 확인
                if (!blob.type.startsWith('image/')) {
                    console.warn(`유효하지 않은 이미지 타입: ${blob.type}`);
                    lastError = new Error(`유효하지 않은 이미지 타입: ${blob.type}`);
                    continue; // 다음 소스 시도
                }
                
                // Base64로 인코딩
                const reader = new FileReader();
                faviconData = await new Promise((resolve, reject) => {
                    reader.onloadend = () => resolve(reader.result);
                    reader.onerror = reject;
                    reader.readAsDataURL(blob);
                });
                
                // 성공적으로 가져왔으므로 루프 종료
                console.log(`파비콘 소스 성공: ${faviconUrl}`);
                break;
            } catch (error) {
                console.warn(`파비콘 가져오기 오류 (${faviconUrl}):`, error);
                lastError = error;
                // 계속해서 다음 소스 시도
            }
        }
        
        // 모든 소스를 시도했지만 성공하지 못한 경우
        if (!faviconData) {
            console.error('모든 파비콘 소스가 실패했습니다.', lastError);
            
            // 기본 파비콘 사용 - 도메인의 첫 글자를 기반으로 한 컬러 아이콘 생성
            // 이 부분은 개선될 수 있지만, 현재는 null을 반환하여 content.js가 도메인 첫 글자 기반 아이콘을 생성하도록 함
            return null;
        }
        
        // 스토리지에 저장
        const storageKey = `${FAVICON_STORAGE_PREFIX}${bookmarkId}`;
        await chrome.storage.local.set({ [storageKey]: faviconData });
        
        console.log(`북마크 ${bookmarkId}의 파비콘 저장됨: ${domain}`);
        return faviconData;
    } catch (error) {
        console.error('파비콘 저장 중 오류:', error);
        return null;
    }
}

// 저장된 파비콘 가져오기
async function getSavedFavicon(bookmarkId) {
    try {
        const storageKey = `${FAVICON_STORAGE_PREFIX}${bookmarkId}`;
        const result = await chrome.storage.local.get(storageKey);
        return result[storageKey] || null;
    } catch (error) {
        console.error('저장된 파비콘 가져오기 오류:', error);
        return null;
    }
}

// 기존 북마크에서 파비콘 일괄 저장
async function cacheFaviconsForAllBookmarks() {
    try {
        if (!bookStaxxFolderId) {
            console.warn('BookStaxx 폴더 ID가 없어 파비콘을 캐싱할 수 없습니다.');
            return;
        }
        
        // BookStaxx 폴더의 모든 북마크 가져오기
        const bookmarks = await chrome.bookmarks.getChildren(bookStaxxFolderId);
        const bookmarksOnly = bookmarks.filter(item => item.url);
        console.log(`${bookmarksOnly.length}개의 북마크 파비콘 캐싱 시작...`);
        
        // 각 북마크에 대해 파비콘 저장
        const savePromises = bookmarksOnly.map(async (bookmark) => {
            // 이미 저장된 파비콘이 있는지 확인
            const existingFavicon = await getSavedFavicon(bookmark.id);
            if (!existingFavicon && bookmark.url) {
                return saveFaviconForBookmark(bookmark.id, bookmark.url);
            }
            return existingFavicon;
        });
        
        await Promise.all(savePromises);
        console.log('모든 북마크 파비콘 캐싱 완료');
    } catch (error) {
        console.error('북마크 파비콘 캐싱 오류:', error);
    }
}

// BookStaxx 초기화 함수
async function initializeBookStaxx() {
    console.log("BookStaxx 초기화 시작...");
    
    // 최대 3번 재시도
    for (let attempt = 0; attempt < 3; attempt++) {
        try {
            // chrome 객체 확인 전 지연 추가
            await new Promise(resolve => setTimeout(resolve, 300));
            
            // chrome 객체 확인
            if (!chrome) {
                console.warn(`Chrome API를 사용할 수 없습니다. 재시도 ${attempt + 1}/3...`);
                continue;
            }

            // bookmarks API 확인
            if (!chrome.bookmarks) {
                console.warn(`북마크 API를 사용할 수 없습니다. 재시도 ${attempt + 1}/3...`);
                continue;
            }
            
            // 북마크 폴더 검색 또는 생성
            bookStaxxFolderId = await findOrCreateBookStaxxFolder();
            console.log(`BookStaxx 폴더 ID: ${bookStaxxFolderId}`);
            
            // 북마크 데이터 초기화
            initializeBookmarks();
            
            // 기존 북마크 파비콘 캐싱
            await cacheFaviconsForAllBookmarks();
            
            isInitializing = false;
            console.log("BookStaxx 초기화 완료");
            return true;
        } catch (error) {
            console.error(`BookStaxx 초기화 시도 ${attempt + 1}/3 실패:`, error);
            // 마지막 시도가 아니면 계속 진행
            if (attempt < 2) {
                await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)));
                continue;
            }
            // 마지막 시도에서 실패한 경우
            isInitializing = false;
            return false;
        }
    }
    
    // 모든 재시도 실패
    console.error("BookStaxx 초기화 실패: 최대 재시도 횟수 초과");
    isInitializing = false;
    return false;
}

// 서비스 워커 초기화
async function initializeServiceWorker() {
    try {
        console.log("서비스 워커 초기화 중...");
        
        // Chrome API가 준비될 때까지 약간의 지연 추가
        await new Promise(resolve => setTimeout(resolve, 500));
        
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
  // 새 북마크에 파비콘 저장
  if (bookmark.url) {
    saveFaviconForBookmark(id, bookmark.url);
  }
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
          
          // 북마크와 함께 저장된 파비콘 데이터 로드
          const bookmarksWithFavicons = await Promise.all(bookmarks.map(async (bookmark) => {
            const faviconKey = `favicon_${bookmark.id}`;
            const result = await new Promise(resolve => {
              chrome.storage.local.get(faviconKey, resolve);
            });
            
            return {
              ...bookmark,
              savedFavIconUrl: result[faviconKey] || null
            };
          }));
          
          sendResponse({ bookmarks: bookmarksWithFavicons });
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
            
            // 파비콘 저장 추가
            await saveFaviconForBookmark(newBookmark.id, currentTab.url);
            
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

        case "openOptions":
          try {
            if (chrome.runtime.openOptionsPage) {
              await chrome.runtime.openOptionsPage();
              console.log("옵션 페이지 열림");
              sendResponse({ success: true });
            } else {
              // 이전 버전 브라우저를 위한 대체 방법
              const optionsUrl = chrome.runtime.getURL('options.html');
              await chrome.tabs.create({ url: optionsUrl });
              console.log("옵션 페이지 열림 (대체 방법)");
              sendResponse({ success: true });
            }
          } catch (error) {
            console.error("옵션 페이지 열기 오류:", error);
            sendResponse({ success: false, reason: "options_failed", error: error.message });
          }
          break;

        case "reloadFavicons":
          await cacheFaviconsForAllBookmarks();
          sendResponse({ success: true });
          break;

        case "openBookmark":
          try {
            if (!request.url) {
              throw new Error("북마크 URL이 제공되지 않았습니다.");
            }
            
            console.log("북마크 열기 요청:", request.url);
            
            // 새 탭에서 URL 열기
            const newTab = await chrome.tabs.create({ 
              url: request.url, 
              active: true // 새 탭을 즉시 활성화
            });
            
            console.log("북마크가 새 탭에서 열렸습니다:", newTab.id);
            sendResponse({ success: true, tabId: newTab.id });
          } catch (error) {
            console.error("북마크 열기 오류:", error);
            sendResponse({ success: false, error: error.message });
          }
          break;

        case 'saveFavicon':
          try {
            if (!request.bookmarkId || !request.url) {
              throw new Error('북마크 ID 또는 URL이 제공되지 않았습니다.');
            }
            
            const savedFavIconUrl = await saveFaviconForBookmark(request.bookmarkId, request.url);
            sendResponse({ 
              success: true, 
              savedFavIconUrl 
            });
          } catch (error) {
            console.error('파비콘 저장 오류:', error);
            sendResponse({ success: false, error: error.message });
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