// 서비스 워커 초기화 시 로그
console.log("BookStaxx 서비스 워커 초기화 시작");

// 전역 변수
const BOOKSTAXX_FOLDER_NAME = "BookStaxx";
let bookStaxxFolderId = null;

// 확장 프로그램 설치/업데이트 시 실행
chrome.runtime.onInstalled.addListener(function(details) {
  console.log("BookStaxx 확장 프로그램이 설치/업데이트되었습니다.");
  
  // BookStaxx 폴더 초기화
  initBookStaxxFolder();
  
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
});

// BookStaxx 폴더 초기화
function initBookStaxxFolder() {
  chrome.bookmarks.getChildren("1", function(bookmarks) {
    // 기존 BookStaxx 폴더 찾기
    let found = false;
    
    for (let i = 0; i < bookmarks.length; i++) {
      if (bookmarks[i].title === BOOKSTAXX_FOLDER_NAME && !bookmarks[i].url) {
        bookStaxxFolderId = bookmarks[i].id;
        found = true;
        console.log("기존 BookStaxx 폴더 발견:", bookStaxxFolderId);
        break;
      }
    }
    
    // 폴더가 없으면 생성
    if (!found) {
      chrome.bookmarks.create({
        parentId: "1",
        title: BOOKSTAXX_FOLDER_NAME
      }, function(result) {
        bookStaxxFolderId = result.id;
        console.log("새 BookStaxx 폴더 생성됨:", bookStaxxFolderId);
      });
    }
  });
}

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