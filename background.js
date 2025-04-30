// 서비스 워커 초기화 시 로그
console.log("BookStaxx 서비스 워커 초기화 시작");

// 전역 변수
const BOOKSTAXX_FOLDER_NAME = "BookStaxx";
let bookStaxxFolderId = null;
let isInitialized = false;

// 초기화 함수
function initialize() {
  console.log("BookStaxx 서비스 워커 초기화 중...");
  
  // BookStaxx 폴더 초기화
  initBookStaxxFolder()
    .then(() => {
      console.log("BookStaxx 초기화 완료, 폴더 ID:", bookStaxxFolderId);
      isInitialized = true;
      
      // 컨텍스트 메뉴 생성
      try {
        // 기존 메뉴 제거 후 새로 생성
        chrome.contextMenus.removeAll(function() {
          chrome.contextMenus.create({
            id: "showBookmarkBar",
            title: "BookStaxx 북마크 바 열기",
            contexts: ["page"]
          });
        });
      } catch (error) {
        console.error("컨텍스트 메뉴 생성 중 오류:", error);
      }
    })
    .catch(error => {
      console.error("BookStaxx 초기화 실패:", error);
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

// 확장 프로그램 설치/업데이트 시 실행
chrome.runtime.onInstalled.addListener(function(details) {
  console.log("BookStaxx 확장 프로그램이 설치/업데이트되었습니다. 이유:", details.reason);
  initialize();
});

// 컨텍스트 메뉴 클릭 이벤트
chrome.contextMenus.onClicked.addListener(function(info, tab) {
  if (info.menuItemId === "showBookmarkBar") {
    chrome.tabs.sendMessage(tab.id, { action: "showBookmarkBar" });
  }
});

// 메시지 리스너
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  // 북마크 가져오기
  if (request.action === "getBookmarks") {
    chrome.bookmarks.getTree(function(bookmarkTree) {
      const bookmarks = processBookmarks(bookmarkTree);
      sendResponse({ success: true, bookmarks: bookmarks });
    });
    return true; // 비동기 응답을 위해 true 반환
  }
  
  // 북마크 열기
  if (request.action === "openBookmark") {
    chrome.tabs.update({ url: request.url });
    sendResponse({ success: true });
    return true;
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
    
    // 각 소스 폴더를 처리
    for (const folderId of request.sourceFolderIds) {
      chrome.bookmarks.getChildren(folderId, function(bookmarks) {
        for (const bookmark of bookmarks) {
          if (bookmark.url) {
            // 북마크를 BookStaxx 폴더에 복사
            chrome.bookmarks.create({
              parentId: bookStaxxFolderId,
              title: bookmark.title,
              url: bookmark.url
            }, function() {
              importedCount++;
            });
          }
        }
        
        processedFolders++;
        
        // 모든 폴더 처리 완료 시 응답
        if (processedFolders === request.sourceFolderIds.length) {
          sendResponse({ 
            success: true,
            count: importedCount
          });
        }
      });
    }
    
    return true; // 비동기 응답을 위해 true 반환
  }

  // 북마크 추가 처리
  if (request.action === "addBookmark") {
    // BookStaxx 폴더가 초기화되지 않았다면 초기화
    if (!bookStaxxFolderId) {
      initBookStaxxFolder()
        .then(() => {
          // 초기화 후 북마크 추가
          addBookmarkToFolder(request.title, request.url, sendResponse);
        })
        .catch(error => {
          console.error("북마크 폴더 초기화 실패:", error);
          sendResponse({
            success: false,
            error: "BookStaxx 폴더를 만들 수 없습니다."
          });
        });
    } else {
      // 이미 초기화된 경우 바로 북마크 추가
      addBookmarkToFolder(request.title, request.url, sendResponse);
    }
    return true; // 비동기 응답을 위해 true 반환
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