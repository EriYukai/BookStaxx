// 서비스 워커 초기화
console.log('BookStaxx 백그라운드 서비스 워커 시작됨');

// 서비스 워커 활성화 상태 유지
self.addEventListener('install', (event) => {
  console.log('서비스 워커 설치됨');
  self.skipWaiting(); // 즉시 활성화
});

self.addEventListener('activate', (event) => {
  console.log('서비스 워커 활성화됨');
  event.waitUntil(clients.claim()); // 모든 클라이언트에 대한 제어권 획득
});

// 북마크 추가 메시지를 처리하는 리스너
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('메시지 수신:', message.action);
  
  // ping 메시지 처리 (연결 확인용)
  if (message.action === 'ping') {
    console.log('Ping 요청 수신');
    sendResponse({ pong: true });
    return false; // 동기 응답
  }
  
  if (message.action === 'addBookmark') {
    console.log('북마크 추가 요청 수신:', message);
    
    // 북마크 추가 전에 이미 존재하는지 확인
    chrome.bookmarks.search({url: message.url}, (results) => {
      if (results && results.length > 0) {
        console.log('이미 존재하는 북마크입니다:', results[0]);
        sendResponse({ 
          success: true, 
          bookmark: results[0],
          message: '이미 존재하는 북마크입니다' 
        });
        return;
      }
      
      // 북마크 추가
      chrome.bookmarks.create({
        title: message.title || (sender.tab ? sender.tab.title : ''),
        url: message.url || (sender.tab ? sender.tab.url : '')
      }, (bookmark) => {
        if (chrome.runtime.lastError) {
          console.error('북마크 추가 실패:', chrome.runtime.lastError.message);
          sendResponse({ success: false, error: chrome.runtime.lastError.message });
        } else {
          // 북마크 추가 성공 메시지 전송
          console.log('북마크 추가 성공:', bookmark);
          sendResponse({ success: true, bookmark: bookmark });
          
          // 모든 탭에 북마크 변경 알림
          notifyBookmarkChange();
        }
      });
    });
    
    // 비동기 응답을 위해 true 반환
    return true;
  }
  
  // 북마크 가져오기 메시지 처리
  else if (message.action === 'getBookmarks') {
    // 북마크 바 폴더 가져오기
    chrome.bookmarks.getTree((bookmarkTreeNodes) => {
      // 북마크 바는 일반적으로 첫 번째 노드의 첫 번째 자식
      const bookmarkBar = bookmarkTreeNodes[0].children[0];
      
      if (bookmarkBar && bookmarkBar.children) {
        sendResponse({ success: true, bookmarks: bookmarkBar.children });
      } else {
        sendResponse({ success: false, error: '북마크를 찾을 수 없습니다.' });
      }
    });
    
    // 비동기 응답을 위해 true 반환
    return true;
  }
  
  // 설정 페이지 열기 메시지 처리
  else if (message.action === 'openOptions') {
    chrome.runtime.openOptionsPage();
    sendResponse({ success: true });
    return false;
  }
});

// content script가 로드되었는지 확인하는 함수
function isContentScriptLoaded(tabId) {
  return new Promise((resolve) => {
    try {
      chrome.tabs.sendMessage(tabId, { action: 'ping' }, (response) => {
        if (chrome.runtime.lastError) {
          console.log('Content script가 로드되지 않았습니다', chrome.runtime.lastError);
          resolve(false);
        } else {
          console.log('Content script가 로드되었습니다', response);
          resolve(true);
        }
      });
    } catch (error) {
      console.error('Content script 확인 중 오류 발생:', error);
      resolve(false);
    }
  });
}

// content script를 주입하는 함수
function injectContentScript(tabId) {
  return new Promise((resolve) => {
    // 먼저 탭이 유효한지 확인
    chrome.tabs.get(tabId, (tab) => {
      if (chrome.runtime.lastError) {
        console.log('탭을 찾을 수 없습니다:', chrome.runtime.lastError);
        resolve(false);
        return;
      }
      
      // chrome:// 페이지나 확장 프로그램 페이지 등 주입이 불가능한 페이지 확인
      const url = tab.url || '';
      if (url.startsWith('chrome://') || 
          url.startsWith('chrome-extension://') || 
          url.startsWith('about:') || 
          url.startsWith('edge://') || 
          url.startsWith('brave://') ||
          url === '') {
        console.log('주입이 불가능한 페이지입니다', url);
        resolve(false);
        return;
      }
      
      // 스크립트 주입 시도
      chrome.scripting.executeScript({
        target: { tabId: tabId },
        files: ['content.js']
      }, (results) => {
        if (chrome.runtime.lastError) {
          console.error('Content script 주입 실패:', chrome.runtime.lastError.message);
          resolve(false);
        } else {
          console.log('Content script 주입 성공:', results);
          // CSS도 주입
          chrome.scripting.insertCSS({
            target: { tabId: tabId },
            files: ['content.css']
          }, () => {
            if (chrome.runtime.lastError) {
              console.error('CSS 주입 실패:', chrome.runtime.lastError.message);
            } else {
              console.log('CSS 주입 성공');
            }
            // 약간의 지연 후에 성공으로 처리 (스크립트 초기화 시간 고려)
            setTimeout(() => resolve(true), 500);
          });
        }
      });
    });
  });
}

// 탭에 메시지를 안전하게 보내는 함수
async function sendMessageToTab(tabId, message) {
  try {
    // 먼저 탭이 존재하는지 확인
    const tab = await new Promise((resolve, reject) => {
      chrome.tabs.get(tabId, (tab) => {
        if (chrome.runtime.lastError) {
          console.log('탭을 찾을 수 없습니다:', chrome.runtime.lastError.message);
          reject(chrome.runtime.lastError);
        } else {
          resolve(tab);
        }
      });
    });
    
    // chrome:// 페이지나 확장 프로그램 페이지 등 주입이 불가능한 페이지 확인
    const url = tab.url || '';
    if (url.startsWith('chrome://') || 
        url.startsWith('chrome-extension://') || 
        url.startsWith('about:') || 
        url.startsWith('edge://') || 
        url.startsWith('brave://') ||
        url === '') {
      console.log('메시지를 보낼 수 없는 페이지입니다', url);
      return;
    }
    
    // content script가 로드되었는지 확인
    let isLoaded = await isContentScriptLoaded(tabId);
    
    // 로드되지 않았다면 주입 시도
    if (!isLoaded) {
      console.log('Content script가 로드되지 않아 주입을 시도합니다');
      const injected = await injectContentScript(tabId);
      if (injected) {
        // 주입 후 다시 확인
        isLoaded = await isContentScriptLoaded(tabId);
      }
    }
    
    if (!isLoaded) {
      console.log('Content script가 로드되지 않아 메시지를 보낼 수 없습니다.');
      return;
    }
    
    // 탭이 존재하고 content script가 로드되었으면 메시지 전송 시도
    chrome.tabs.sendMessage(tabId, message, (response) => {
      if (chrome.runtime.lastError) {
        console.log('메시지 전송 실패:', chrome.runtime.lastError.message);
        // 오류가 발생해도 무시하고 계속 진행
      } else if (response) {
        console.log('메시지 전송 성공, 응답:', response);
      }
    });
  } catch (error) {
    console.error('메시지 전송 중 오류 발생:', error);
  }
}

// 확장 프로그램 아이콘 클릭 이벤트 처리
chrome.action.onClicked.addListener((tab) => {
  console.log('확장 프로그램 아이콘 클릭:', tab.title, tab.url);
  
  // 현재 탭을 북마크에 추가
  chrome.bookmarks.create({
    title: tab.title,
    url: tab.url
  }, (bookmark) => {
    if (chrome.runtime.lastError) {
      console.error('북마크 추가 실패:', chrome.runtime.lastError.message);
      return;
    }
    
    // 북마크 추가 성공 시 알림 표시 시도
    // 안전한 메시지 전송 함수 사용
    sendMessageToTab(tab.id, { 
      action: 'bookmarkAdded', 
      bookmark: bookmark 
    });
    
    // 사용자에게 북마크가 추가되었음을 알리는 Chrome 알림 표시
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'images/icon48.png',
      title: '북마크 추가됨',
      message: `"${bookmark.title}" 페이지가 북마크에 추가되었습니다`
    });
    
    console.log('북마크가 추가되었습니다', bookmark);
    
    // 모든 탭에 북마크 변경 알림
    notifyBookmarkChange();
  });
});

// 확장 프로그램 설치 또는 업데이트 시 설정 페이지 열기
chrome.runtime.onInstalled.addListener((details) => {
  console.log('BookStaxx 확장 프로그램이 설치되었습니다', details.reason);
  
  // 기본 설정 초기화
  const defaultSettings = {
    bookmarkButton: {
      position: { top: '100px', left: '10px' },
      size: { width: '40px', height: '40px' },
      image: null,
      visible: true
    },
    bookmarkBar: {
      position: 'top',
      displayStyle: 'smallIconsOnly'
    }
  };
  
  // 설정 저장
  chrome.storage.local.set({ 'bookStaxxSettings': defaultSettings }, () => {
    console.log('기본 설정이 저장되었습니다.');
  });
});

// 북마크 변경 이벤트 리스너
chrome.bookmarks.onCreated.addListener(() => {
  console.log('북마크가 생성되었습니다');
  notifyBookmarkChange();
});

chrome.bookmarks.onRemoved.addListener(() => {
  console.log('북마크가 삭제되었습니다');
  notifyBookmarkChange();
});

chrome.bookmarks.onChanged.addListener(() => {
  console.log('북마크가 변경되었습니다');
  notifyBookmarkChange();
});

chrome.bookmarks.onMoved.addListener(() => {
  console.log('북마크가 이동되었습니다');
  notifyBookmarkChange();
});

// 모든 탭에 북마크 변경 알림을 보내는 함수
function notifyBookmarkChange() {
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach(tab => {
      sendMessageToTab(tab.id, { action: 'bookmarksUpdated' });
    });
  });
}

// 북마크를 직접 추가하는 함수 (팝업이나 다른 확장 프로그램에서 호출 가능)
function addBookmarkDirectly(tab) {
  return new Promise((resolve, reject) => {
    chrome.bookmarks.create({
      title: tab.title,
      url: tab.url
    }, (bookmark) => {
      if (chrome.runtime.lastError) {
        console.error('북마크 추가 실패:', chrome.runtime.lastError.message);
        reject(chrome.runtime.lastError);
      } else {
        console.log('북마크 추가 성공:', bookmark);
        
        // 북마크 추가 성공 시 알림 표시 시도
        sendMessageToTab(tab.id, { 
          action: 'bookmarkAdded', 
          bookmark: bookmark 
        });
        
        // 모든 탭에 북마크 변경 알림
        notifyBookmarkChange();
        
        resolve(bookmark);
      }
    });
  });
}

// 북마크 트리를 평면화하는 함수
function flattenBookmarks(bookmarkNode) {
  let bookmarks = [];
  
  if (bookmarkNode.children) {
    for (const child of bookmarkNode.children) {
      if (child.url) {
        // URL이 있으면 북마크
        bookmarks.push({
          id: child.id,
          title: child.title,
          url: child.url
        });
      } else {
        // URL이 없으면 폴더
        const folderBookmarks = flattenBookmarks(child);
        bookmarks = bookmarks.concat(folderBookmarks);
      }
    }
  }
  
  return bookmarks;
} 
