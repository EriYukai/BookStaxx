// 서비스 워커 초기화 시 로그
console.log("BookStaxx 서비스 워커 초기화 시작");

// 서비스 워커 활성화 상태 유지
(() => {
  // 서비스 워커 비활성화 방지
  if ('serviceWorker' in navigator) {
    console.log("서비스 워커 등록 유지 기능 활성화");
    
    // 서비스 워커 활성 상태 주기적 확인
    setInterval(() => {
      console.log("서비스 워커 활성 상태 유지 중...");
    }, 25000); // 25초마다 로그 출력하여 서비스 워커 활성 상태 유지
  }
})();

// 전역 변수
const BOOKSTAXX_FOLDER_NAME = "BookStaxx";
let bookStaxxFolderId = null;
let isInitialized = false;

// 컨텍스트 메뉴 ID
const CONTEXT_MENU_ID = "bookstaxx-showBookmarkBar";
let contextMenuCreated = false;

// 설정 기본값
const DEFAULT_SETTINGS = {
    maxBookmarks: 20,
    openInNewTab: true,
    focusNewTab: true,
    autoCloseAfterSelect: true,
    bookmarkIconSize: 48,
    bookmarkFontSize: 12,
    bookmarkLayoutMode: 'circle',
    titleLengthLimit: 6
};

// 활성 상태 탭 ID 추적
let activeTabId = null;

// 컨텍스트 무효화 추적 객체
const invalidatedContexts = {};

// 향상된 디버깅을 위한 로그 함수
function logDebug(message, data) {
    const timestamp = new Date().toISOString();
    const logMessage = `[BookStaxx ${timestamp}] ${message}`;
    
    if (data) {
        console.log(logMessage, data);
    } else {
        console.log(logMessage);
    }
}

// 초기화 함수
function initialize() {
  return new Promise((resolve, reject) => {
    console.log("BookStaxx 서비스 워커 초기화 중...");
    
    // BookStaxx 폴더 초기화
    initBookStaxxFolder()
      .then(() => {
        console.log("BookStaxx 초기화 완료, 폴더 ID:", bookStaxxFolderId);
        isInitialized = true;
        
        // 컨텍스트 메뉴 생성
        createContextMenu()
          .then(() => resolve())
          .catch(error => {
            console.error("컨텍스트 메뉴 생성 중 오류:", error);
            // 메뉴 생성 실패해도 초기화는 성공으로 처리
            resolve();
          });
      })
      .catch(error => {
        console.error("BookStaxx 초기화 실패:", error);
        reject(error);
      });
  });
}

// BookStaxx 폴더 초기화 (Promise로 변환)
function initBookStaxxFolder() {
  return new Promise((resolve, reject) => {
    try {
      chrome.bookmarks.getChildren("1", function(bookmarks) {
        if (chrome.runtime.lastError) {
          console.error("북마크 가져오기 실패:", chrome.runtime.lastError);
          reject(chrome.runtime.lastError);
          return;
        }
        
        // 기존 BookStaxx 폴더 찾기
        let found = false;
        
        for (let i = 0; i < bookmarks.length; i++) {
          if (bookmarks[i].title === BOOKSTAXX_FOLDER_NAME && !bookmarks[i].url) {
            bookStaxxFolderId = bookmarks[i].id;
            found = true;
            console.log("기존 BookStaxx 폴더 발견:", bookStaxxFolderId);
            resolve(bookStaxxFolderId);
            return;
          }
        }
        
        // 폴더가 없으면 생성
        if (!found) {
          chrome.bookmarks.create({
            parentId: "1",
            title: BOOKSTAXX_FOLDER_NAME
          }, function(result) {
            if (chrome.runtime.lastError) {
              console.error("BookStaxx 폴더 생성 실패:", chrome.runtime.lastError);
              reject(chrome.runtime.lastError);
              return;
            }
            
            bookStaxxFolderId = result.id;
            console.log("새 BookStaxx 폴더 생성됨:", bookStaxxFolderId);
            resolve(bookStaxxFolderId);
          });
        }
      });
    } catch (error) {
      console.error("북마크 폴더 초기화 오류:", error);
      reject(error);
    }
  });
}

// 컨텍스트 메뉴 생성 함수
function createContextMenu() {
  return new Promise((resolve, reject) => {
    try {
      // 이미 생성된 경우 바로 성공 반환
      if (contextMenuCreated) {
        console.log("컨텍스트 메뉴가 이미 생성됨");
        resolve();
        return;
      }
      
      // 기존 메뉴 제거 후 새로 생성
      chrome.contextMenus.removeAll(function() {
        if (chrome.runtime.lastError) {
          console.error("컨텍스트 메뉴 제거 중 오류:", chrome.runtime.lastError);
        }
        
        try {
          chrome.contextMenus.create({
            id: CONTEXT_MENU_ID,
            title: "BookStaxx 북마크 바 열기",
            contexts: ["page"]
          }, function() {
            if (chrome.runtime.lastError) {
              console.error("컨텍스트 메뉴 생성 실패:", chrome.runtime.lastError);
              reject(chrome.runtime.lastError);
            } else {
              console.log("컨텍스트 메뉴 생성 성공");
              contextMenuCreated = true;
              resolve();
            }
          });
        } catch (error) {
          console.error("컨텍스트 메뉴 생성 중 예외 발생:", error);
          reject(error);
        }
      });
    } catch (error) {
      console.error("createContextMenu 함수 실행 중 오류:", error);
      reject(error);
    }
  });
}

// 확장 프로그램 설치/업데이트 시 실행
chrome.runtime.onInstalled.addListener(function(details) {
  logDebug("확장 프로그램 설치/업데이트 감지:", details.reason);
  
  // 기본 설정 저장
  chrome.storage.sync.get('settings', function(data) {
    if (!data.settings) {
      // 설정이 없는 경우 기본값 저장
      chrome.storage.sync.set({ settings: DEFAULT_SETTINGS }, function() {
        logDebug("기본 설정이 저장되었습니다");
      });
    }
  });
  
  // 업데이트 또는 설치 시 옵션 페이지 열기 여부 확인
  if (details.reason === "install") {
    // 확장 프로그램 첫 설치 시 옵션 페이지 열기
    chrome.tabs.create({ url: "options.html" });
    logDebug("첫 설치로 인해 옵션 페이지가 열렸습니다");
  } else if (details.reason === "update") {
    // 주요 버전 업데이트인 경우에만 옵션 페이지 열기
    const previousVersion = details.previousVersion || "0.0.0";
    const currentVersion = chrome.runtime.getManifest().version;
    
    const previousMajor = parseInt(previousVersion.split('.')[0]);
    const currentMajor = parseInt(currentVersion.split('.')[0]);
    
    if (currentMajor > previousMajor) {
      chrome.tabs.create({ url: "options.html?updated=true" });
      logDebug(`메이저 버전 업데이트 (${previousVersion} -> ${currentVersion})로 인해 옵션 페이지가 열렸습니다`);
    } else {
      logDebug(`확장 프로그램이 업데이트되었습니다: ${previousVersion} -> ${currentVersion}`);
    }
  }
  initialize();
});

// 서비스 워커 활성화 시 실행
chrome.runtime.onStartup.addListener(function() {
  console.log("브라우저 시작 시 BookStaxx 서비스 워커 활성화");
  initialize();
});

// 컨텍스트 메뉴 클릭 이벤트
chrome.contextMenus.onClicked.addListener(function(info, tab) {
  if (info.menuItemId === CONTEXT_MENU_ID) {
    chrome.tabs.sendMessage(tab.id, { action: "showBookmarkBar" });
  }
});

// 탭 활성화 추적 (현재 활성 탭 ID 기록)
chrome.tabs.onActivated.addListener(function(activeInfo) {
    activeTabId = activeInfo.tabId;
    logDebug("활성 탭 변경됨:", activeTabId);
});

// 메시지 리스너
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  logDebug("메시지 수신:", { action: request.action, sender: sender.tab ? sender.tab.url : "확장 프로그램" });
  
  try {
    // 확장 프로그램 재초기화 요청 처리
    if (request.action === "reinitialize") {
      logDebug("재초기화 요청 수신됨");
      
      try {
        const tabId = sender.tab ? sender.tab.id : null;
        const tabUrl = sender.tab ? sender.tab.url : null;
        
        if (!tabId || !tabUrl) {
          logDebug("재초기화 실패: 유효한 탭 ID 또는 URL 없음");
          sendResponse({ success: false, error: "유효한 탭 정보 없음" });
          return true;
        }
        
        // 컨텍스트 무효화 상태 추적
        const contextKey = `${tabId}:${tabUrl}`;
        invalidatedContexts[contextKey] = {
          timestamp: Date.now(),
          recoveryAttempt: request.recoveryAttempt || 1,
          isIframe: request.isIframe || false,
          isRestrictedSite: request.isRestrictedSite || false
        };
        
        // 제한된 사이트에서는 컨텍스트 재주입을 적게 시도
        const isRestrictedSite = request.isRestrictedSite;
        if (isRestrictedSite && request.recoveryAttempt > 2) {
          logDebug(`제한된 사이트에서 과도한 재초기화 요청 제한 (시도: ${request.recoveryAttempt})`, { tabId, tabUrl });
          sendResponse({ 
            success: false, 
            limited: true, 
            message: "제한된 사이트에서 재초기화 횟수 제한" 
          });
          return true;
        }
        
        // 탭이 존재하는지 확인
        chrome.tabs.get(tabId, function(tab) {
          if (chrome.runtime.lastError) {
            logDebug(`재초기화 실패: 탭을 찾을 수 없음 (${tabId})`, chrome.runtime.lastError);
            sendResponse({ success: false, error: "탭을 찾을 수 없음" });
            return;
          }
          
          // 탭이 유효하고 로드된 상태인지 확인
          if (!tab || tab.status !== 'complete') {
            logDebug(`재초기화 실패: 탭이 완전히 로드되지 않음 (${tabId}, 상태: ${tab ? tab.status : '없음'})`);
            sendResponse({ success: false, error: "탭이 완전히 로드되지 않음" });
            return;
          }
          
          // content script 재주입 시도
          chrome.scripting.executeScript({
            target: { tabId: tabId },
            files: ['content.js']
          }, function(results) {
            if (chrome.runtime.lastError) {
              logDebug(`컨텐츠 스크립트 재주입 실패: ${chrome.runtime.lastError.message}`);
              sendResponse({ success: false, error: chrome.runtime.lastError.message });
              return;
            }
            
            // CSS 재주입 (인터페이스가 제대로 보이도록)
            chrome.scripting.insertCSS({
              target: { tabId: tabId },
              files: ['styles.css']
            }, function() {
              if (chrome.runtime.lastError) {
                logDebug(`CSS 재주입 실패: ${chrome.runtime.lastError.message}`);
                // CSS 실패는 치명적이지 않으므로 성공으로 처리
              }
              
              logDebug(`탭 ${tabId}에 컨텐츠 스크립트 재주입 성공`);
              sendResponse({ success: true });
            });
          });
        });
        
        return true; // 비동기 응답을 위해 true 반환
      } catch (error) {
        logDebug("재초기화 중 예외 발생:", error);
        sendResponse({ success: false, error: error.message });
        return true;
      }
    }
    
    // 컨텍스트 유효성 확인을 위한 핑
    if (request.action === "ping") {
      logDebug("핑 요청 수신됨");
      try {
        // 핑 요청에 대해 더 많은 정보 제공
        setTimeout(() => {
          try {
            sendResponse({ 
              success: true, 
              message: "pong",
              initialized: isInitialized,
              folderId: bookStaxxFolderId,
              timestamp: Date.now(),
              version: chrome.runtime.getManifest().version
            });
          } catch (responseError) {
            console.error("핑 응답 중 오류:", responseError);
            // 실패한 경우 간단한 객체 반환
            sendResponse({ success: false, error: responseError.message });
          }
        }, 0);
      } catch (error) {
        console.error("핑 처리 중 예외 발생:", error);
        sendResponse({ success: false, error: error.message });
      }
      return true;
    }
    
    // 북마크 가져오기
    if (request.action === "getBookmarks") {
      try {
        chrome.bookmarks.getTree(function(bookmarkTree) {
          if (chrome.runtime.lastError) {
            console.error("북마크 트리 가져오기 실패:", chrome.runtime.lastError);
            sendResponse({ success: false, error: chrome.runtime.lastError.message });
            return;
          }
          
          const bookmarks = processBookmarks(bookmarkTree);
          sendResponse({ success: true, bookmarks: bookmarks });
        });
      } catch (error) {
        console.error("북마크 가져오기 처리 중 오류:", error);
        sendResponse({ success: false, error: error.message || "북마크 처리 중 오류가 발생했습니다." });
      }
      return true; // 비동기 응답을 위해 true 반환
    }
    
    // 북마크 열기
    if (request.action === "openBookmark") {
      const openInNewTab = request.openInNewTab !== false;
      const focusNewTab = request.focusNewTab !== false;
      
      if (openInNewTab) {
        chrome.tabs.create({ url: request.url, active: focusNewTab });
      } else {
        chrome.tabs.update({ url: request.url });
      }
      
      sendResponse({ success: true });
      return true;
    }
    
    // 북마크 추가
    if (request.action === "addBookmark") {
      if (!request.url || !request.title) {
        sendResponse({ success: false, error: "URL과 제목이 필요합니다." });
        return true;
      }
      
      // BookStaxx 폴더가 초기화되지 않은 경우
      if (!bookStaxxFolderId) {
        initBookStaxxFolder().then((folderId) => {
          // 북마크 추가
          addBookmarkToFolder(request.title, request.url, function(result) {
            if (result.success) {
              sendResponse({ success: true, bookmark: result.bookmark });
            } else {
              sendResponse({ success: false, error: result.error });
            }
          });
        }).catch(error => {
          sendResponse({ success: false, error: "BookStaxx 폴더 초기화 실패: " + error.message });
        });
      } else {
        // 북마크 추가
        addBookmarkToFolder(request.title, request.url, function(result) {
          if (result.success) {
            sendResponse({ success: true, bookmark: result.bookmark });
          } else {
            sendResponse({ success: false, error: result.error });
          }
        });
      }
      
      return true; // 비동기 응답을 위해 true 반환
    }
    
    // 설정 가져오기
    if (request.action === "getSettings") {
      chrome.storage.sync.get('settings', function(data) {
        const settings = data.settings || DEFAULT_SETTINGS;
        logDebug("설정 요청에 응답:", settings);
        sendResponse({ success: true, settings: settings });
      });
      
      return true; // 비동기 응답을 위해 true 반환
    }
    
    // 최상위 북마크 폴더 가져오기
    if (request.action === "getTopLevelFolders") {
      // 초기화 되지 않은 경우 처리
      if (!isInitialized || !bookStaxxFolderId) {
        console.log("서비스 워커가 초기화되지 않았습니다. 초기화를 시도합니다...");
        
        initBookStaxxFolder()
          .then(() => {
            console.log("지연된 초기화 완료, 이제 폴더를 로드합니다.");
            isInitialized = true;
            loadAllBookmarkFolders(sendResponse);
          })
          .catch(error => {
            console.error("지연된 초기화 실패:", error);
            sendResponse({ 
              success: false, 
              error: "BookStaxx 폴더 초기화에 실패했습니다. 오류: " + (error.message || "알 수 없는 오류") 
            });
          });
      } else {
        // 이미 초기화된 경우 정상 처리
        loadAllBookmarkFolders(sendResponse);
      }
      return true; // 비동기 응답을 위해 true 반환
    }
    
    // 북마크 초기 가져오기
    if (request.action === "importInitialBookmarks") {
      if (!request.sourceFolderIds || !Array.isArray(request.sourceFolderIds) || request.sourceFolderIds.length === 0) {
        sendResponse({ success: false, error: "가져올 폴더 ID가 올바르지 않습니다." });
        return true;
      }
      
      // BookStaxx 폴더가 없으면 초기화
      if (!bookStaxxFolderId) {
        initBookStaxxFolder();
      }
      
      let importedCount = 0;
      let processedFolders = 0;
      let totalBookmarks = 0;
      
      // 각 소스 폴더를 처리
      for (const folderId of request.sourceFolderIds) {
        chrome.bookmarks.getChildren(folderId, function(bookmarks) {
          // URL이 있는 북마크 카운트
          const bookmarksToImport = bookmarks.filter(bookmark => bookmark.url);
          totalBookmarks += bookmarksToImport.length;
          
          // 북마크 생성 카운터
          let createdBookmarks = 0;
          
          // 폴더에 북마크가 없는 경우 바로 처리 완료로 표시
          if (bookmarksToImport.length === 0) {
            processedFolders++;
            
            // 모든 폴더 처리 완료 시 응답
            if (processedFolders === request.sourceFolderIds.length) {
              sendResponse({ 
                success: true,
                count: importedCount
              });
            }
            return;
          }
          
          // 각 북마크를 처리
          for (const bookmark of bookmarksToImport) {
            // 북마크를 BookStaxx 폴더에 복사
            chrome.bookmarks.create({
              parentId: bookStaxxFolderId,
              title: bookmark.title,
              url: bookmark.url
            }, function(newBookmark) {
              if (chrome.runtime.lastError) {
                console.error("북마크 생성 실패:", chrome.runtime.lastError, bookmark.url);
              } else {
                importedCount++;
              }
              
              createdBookmarks++;
              
              // 현재 폴더의 모든 북마크 처리 완료 시
              if (createdBookmarks === bookmarksToImport.length) {
                processedFolders++;
                
                // 모든 폴더 처리 완료 시 응답
                if (processedFolders === request.sourceFolderIds.length) {
                  sendResponse({ 
                    success: true,
                    count: importedCount
                  });
                }
              }
            });
          }
        });
      }
      
      return true; // 비동기 응답을 위해 true 반환
    }
    
  } catch (error) {
    console.error("메시지 처리 중 오류:", error);
    try {
      sendResponse({ success: false, error: "메시지 처리 중 오류: " + (error.message || "알 수 없는 오류") });
    } catch (responseError) {
      console.error("응답 전송 중 오류:", responseError);
    }
    return true;
  }
});

// 북마크 처리 함수
function processBookmarks(bookmarkTree) {
  const result = [];
  
  function traverse(nodes) {
    for (const node of nodes) {
      if (node.children) {
        // 폴더인 경우
        const folder = {
          id: node.id,
          title: node.title || "북마크",
          type: "folder",
          children: []
        };
        
        // 자식 노드 처리
        for (const child of node.children) {
          if (child.url) {
            // 북마크인 경우
            folder.children.push({
              id: child.id,
              title: child.title || "제목 없음",
              url: child.url,
              type: "bookmark"
            });
          } else if (child.children) {
            // 하위 폴더인 경우
            const subFolder = {
              id: child.id,
              title: child.title || "폴더",
              type: "folder",
              children: []
            };
            
            // 하위 폴더 내 북마크 처리
            for (const grandChild of child.children) {
              if (grandChild.url) {
                subFolder.children.push({
                  id: grandChild.id,
                  title: grandChild.title || "제목 없음",
                  url: grandChild.url,
                  type: "bookmark"
                });
              }
            }
            
            // 북마크가 있는 폴더만 추가
            if (subFolder.children.length > 0) {
              folder.children.push(subFolder);
            }
          }
        }
        
        // 북마크가 있는 폴더만 추가
        if (folder.children.length > 0) {
          result.push(folder);
        }
      }
    }
  }
  
  traverse(bookmarkTree);
  return result;
}

// 모든 북마크 폴더 로드 함수
function loadAllBookmarkFolders(sendResponse) {
  console.log("모든 북마크 폴더 로드 시작");
  
  // 모든 북마크 트리 가져오기
  chrome.bookmarks.getTree(function(bookmarkTree) {
    if (chrome.runtime.lastError) {
      console.error("북마크 트리 로드 실패:", chrome.runtime.lastError);
      sendResponse({ success: false, error: chrome.runtime.lastError.message });
      return;
    }
    
    // 모든 폴더를 저장할 배열
    const allFolders = [];
    
    // 북마크 트리 순회 함수
    function traverseBookmarkTree(nodes, level = 0) {
      for (const node of nodes) {
        // 북마크 바(id: "1") 또는 기타 북마크(id: "2")이거나 폴더인 경우 (URL이 없는 경우)
        if ((node.id === "1" || node.id === "2" || !node.url) && node.id !== "0") {
          // BookStaxx 폴더는 제외
          if (node.title !== BOOKSTAXX_FOLDER_NAME) {
            // 폴더 경로 구성 (상위 폴더 표시를 위한 데이터)
            let folderPath = node.title;
            if (level > 0) {
              folderPath = `${folderPath} (${level}단계)`;
            }
            
            allFolders.push({
              id: node.id,
              title: node.title,
              parentId: node.parentId,
              level: level,
              path: folderPath
            });
          }
        }
        
        // 자식 노드가 있는 경우 재귀적으로 순회
        if (node.children && node.children.length > 0) {
          traverseBookmarkTree(node.children, level + 1);
        }
      }
    }
    
    // 북마크 트리 순회 시작
    traverseBookmarkTree(bookmarkTree);
    
    // 폴더 정렬 (레벨별로 먼저, 그 다음 알파벳순)
    allFolders.sort((a, b) => {
      if (a.level !== b.level) return a.level - b.level; // 레벨 오름차순
      return a.title.localeCompare(b.title); // 같은 레벨에서는 알파벳순
    });
    
    // 북마크 바(id: "1")와 기타 북마크(id: "2")를 최상단에 배치
    const bookmarkBar = allFolders.find(folder => folder.id === "1");
    const otherBookmarks = allFolders.find(folder => folder.id === "2");
    
    const sortedFolders = [];
    
    // 북마크 바를 최상단에 배치 (있는 경우)
    if (bookmarkBar) {
      sortedFolders.push(bookmarkBar);
      // 북마크 바를 allFolders에서 제거
      const index = allFolders.findIndex(folder => folder.id === "1");
      if (index !== -1) allFolders.splice(index, 1);
    }
    
    // 기타 북마크를 두 번째로 배치 (있는 경우)
    if (otherBookmarks) {
      sortedFolders.push(otherBookmarks);
      // 기타 북마크를 allFolders에서 제거
      const index = allFolders.findIndex(folder => folder.id === "2");
      if (index !== -1) allFolders.splice(index, 1);
    }
    
    // 나머지 폴더들 추가
    sortedFolders.push(...allFolders);
    
    console.log(`북마크 폴더 ${sortedFolders.length}개 로드 완료`);
    
    // 응답 반환
    sendResponse({ 
      success: true, 
      folders: sortedFolders 
    });
  });
}

// 북마크를 특정 폴더에 추가하는 헬퍼 함수
function addBookmarkToFolder(title, url, callback) {
  // URL이 유효한지 확인
  if (!url || typeof url !== 'string' || !url.startsWith('http')) {
    callback({
      success: false,
      error: "유효하지 않은 URL입니다."
    });
    return;
  }
  
  // 제목이 없으면 URL에서 도메인 추출
  if (!title || title.trim() === '') {
    try {
      title = new URL(url).hostname;
    } catch (e) {
      title = "새 북마크";
    }
  }
  
  // 북마크 중복 체크
  chrome.bookmarks.search({ url: url }, (results) => {
    let isInBookStaxxFolder = false;
    
    // BookStaxx 폴더에 이미 있는지 확인
    for (const bookmark of results) {
      if (bookmark.parentId === bookStaxxFolderId) {
        isInBookStaxxFolder = true;
        break;
      }
    }
    
    if (isInBookStaxxFolder) {
      // 이미 BookStaxx 폴더에 있는 경우
      callback({
        success: true,
        message: "이미 북마크에 추가되어 있습니다."
      });
    } else {
      // 새 북마크 추가
      chrome.bookmarks.create({
        parentId: bookStaxxFolderId,
        title: title,
        url: url
      }, (newBookmark) => {
        if (chrome.runtime.lastError) {
          callback({
            success: false,
            error: chrome.runtime.lastError.message
          });
        } else {
          callback({
            success: true,
            bookmark: newBookmark
          });
        }
      });
    }
  });
}

// 매시간마다 컨텍스트 무효화 추적 정보 정리
setInterval(() => {
    const now = Date.now();
    const expiredKeys = [];
    
    // 24시간 이상 된 항목 찾기
    for (const key in invalidatedContexts) {
        const context = invalidatedContexts[key];
        if (now - context.timestamp > 24 * 60 * 60 * 1000) {
            expiredKeys.push(key);
        }
    }
    
    // 만료된 항목 삭제
    expiredKeys.forEach(key => {
        delete invalidatedContexts[key];
    });
    
    if (expiredKeys.length > 0) {
        logDebug(`${expiredKeys.length}개의 만료된 컨텍스트 추적 항목 정리됨`);
    }
}, 60 * 60 * 1000); // 1시간마다 실행

// 확장 프로그램 시작 로그
logDebug("BookStaxx 백그라운드 스크립트 로드됨", {
    version: chrome.runtime.getManifest().version
}); 