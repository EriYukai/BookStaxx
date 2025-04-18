// 서비스 워커 초기화
console.log('BookStaxx 백그라운드 서비스 워커 시작됨');

// 확장 프로그램 설치 및 업데이트 이벤트 리스너
chrome.runtime.onInstalled.addListener((details) => {
  console.log('확장 프로그램 설치/업데이트:', details.reason);
  
  // 기본 설정 초기화
  initializeDefaultSettings();
  
  // 설치 시 웰컴 페이지 표시
  if (details.reason === 'install') {
    chrome.tabs.create({ url: 'options.html' });
  }
});

// 기본 설정 초기화 함수
function initializeDefaultSettings() {
  // 기본 설정 객체
  const defaultSettings = {
    bookmarkButton: {
      show: true,
      position: 'topRight',
      size: 'medium'
    },
    bookmarkBar: {
      position: 'top',
      backgroundColor: '#f1f3f4',
      textColor: '#333333',
      opacity: 100,
      showText: true,
      iconSize: 'medium',
      hideChrome: false
    }
  };
  
  // 기존 설정 확인 후 없으면 기본값 저장
  chrome.storage.sync.get(defaultSettings, (settings) => {
    chrome.storage.sync.set(settings, () => {
      console.log('기본 설정 초기화 완료');
    });
  });
}

// 서비스 워커 활성화 상태 유지
self.addEventListener('install', (event) => {
  console.log('서비스 워커 설치됨');
  self.skipWaiting(); // 즉시 활성화
});

self.addEventListener('activate', (event) => {
  console.log('서비스 워커 활성화됨');
  event.waitUntil(clients.claim()); // 모든 클라이언트에 대한 제어권 획득
});

// 메시지 리스너 설정
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  console.log('백그라운드 스크립트에서 메시지 수신:', message);
  
  // ping 메시지 처리 (연결 확인용)
  if (message.action === 'ping') {
    console.log('Ping 메시지 수신, 응답 전송');
    sendResponse({ success: true, message: 'Background script is active' });
    return true;
  }
  
  // 북마크 추가 메시지 처리
  if (message.action === 'addBookmark') {
    console.log('북마크 추가 메시지 수신:', message.url, message.title);
    
    // 북마크 추가
    addBookmark(message.title, message.url)
      .then(bookmark => {
        console.log('북마크 추가 성공:', bookmark);
        
        // 모든 탭에 북마크 변경 알림
        notifyBookmarkChange();
        
        // 성공 응답
        sendResponse({ success: true, bookmark: bookmark });
      })
      .catch(error => {
        console.error('북마크 추가 실패:', error);
        
        // 실패 응답
        sendResponse({ success: false, error: error.message });
      });
    
    // 비동기 응답을 위해 true 반환
    return true;
  }
  
  // 북마크 바 초기화 메시지 처리
  if (message.action === 'initBookmarkBar') {
    console.log('북마크 바 초기화 메시지 수신:', message.tabId);
    
    // 탭 ID 확인
    const tabId = message.tabId;
    if (!tabId) {
      sendResponse({ success: false, error: '탭 ID가 없습니다' });
      return;
    }
    
    // 북마크 바 초기화
    initializeBookmarkBar(tabId)
      .then(result => {
        console.log('북마크 바 초기화 결과:', result);
        sendResponse({ success: true });
      })
      .catch(error => {
        console.error('북마크 바 초기화 실패:', error);
        sendResponse({ success: false, error: error.message });
      });
    
    // 비동기 응답을 위해 true 반환
    return true;
  }
  
  // 북마크 목록 요청 처리
  if (message.action === 'getBookmarks') {
    getBookmarks()
      .then(bookmarks => {
        sendResponse({ success: true, bookmarks: bookmarks });
      })
      .catch(error => {
        sendResponse({ success: false, error: error.message });
      });
    return true; // 비동기 응답을 위해 true 반환
  }
  
  // 파비콘 가져오기 요청 처리
  if (message.action === 'fetchFavicon') {
    fetchFaviconAsDataUrl(message.url)
      .then(dataUrl => {
        sendResponse({ success: true, dataUrl: dataUrl });
      })
      .catch(error => {
        console.error('파비콘 가져오기 실패:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true; // 비동기 응답을 위해 true 반환
  }
  
  // 크롬 북마크 가져오기 처리
  if (message.action === 'importBookmarks') {
    console.log('크롬 북마크 가져오기 요청 수신:', message.bookmarks.length + '개');
    
    // 기존 북마크 가져오기
    getBookmarks()
      .then(existingBookmarks => {
        // 중복 북마크 필터링 (URL 기준)
        const existingUrls = new Set(existingBookmarks.map(b => b.url));
        const uniqueNewBookmarks = message.bookmarks.filter(b => !existingUrls.has(b.url));
        
        console.log('추가될 새 북마크:', uniqueNewBookmarks.length + '개');
        
        // 새 북마크 추가
        const addPromises = uniqueNewBookmarks.map(bookmark => 
          addBookmark(bookmark.title, bookmark.url)
        );
        
        return Promise.all(addPromises);
      })
      .then(results => {
        console.log('북마크 추가 완료:', results.length + '개');
        
        // 모든 탭에 북마크 업데이트 알림
        chrome.tabs.query({}, (tabs) => {
          tabs.forEach(tab => {
            sendMessageToTab(tab.id, { action: 'bookmarksUpdated' })
              .catch(error => {
                console.log('탭에 메시지 전송 실패:', error);
              });
          });
        });
        
        sendResponse({ 
          success: true, 
          count: results.length
        });
      })
      .catch(error => {
        console.error('북마크 가져오기 실패:', error);
        sendResponse({ 
          success: false, 
          error: error.message 
        });
      });
    
    return true; // 비동기 응답을 위해 true 반환
  }
  
  // 설정 변경 알림 처리
  if (message.action === 'settingsUpdated') {
    // 모든 탭에 설정 변경 알림
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, { 
          action: 'settingsUpdated',
          settings: message.settings
        }).catch(() => {
          // 오류 무시 (일부 탭에서는 콘텐츠 스크립트가 로드되지 않았을 수 있음)
        });
      });
    });
    
    sendResponse({ success: true });
    return true;
  }
  
  // Chrome 설정 페이지 열기 처리
  if (message.action === 'openChromeSettings') {
    // 북마크 설정 페이지 URL (보안상의 이유로 직접 chrome:// URL을 열 수 없음)
    chrome.tabs.create({ url: 'hide-chrome-bar.html' });
    sendResponse({ success: true });
    return true;
  }
  
  // 북마크 열기 처리
  if (message.action === 'openBookmark') {
    console.log('북마크 열기 요청:', message.url, message.newTab);
    
    try {
      if (message.newTab) {
        // 새 탭에서 열기
        chrome.tabs.create({ url: message.url }, (tab) => {
          console.log('새 탭에서 북마크 열기 성공:', tab.id);
          sendResponse({ success: true });
        });
      } else {
        // 현재 탭에서 열기
        chrome.tabs.update(sender.tab.id, { url: message.url }, (tab) => {
          console.log('현재 탭에서 북마크 열기 성공:', tab.id);
          sendResponse({ success: true });
        });
      }
    } catch (error) {
      console.error('북마크 열기 실패:', error);
      sendResponse({ success: false, error: error.message });
    }
    
    return true; // 비동기 응답을 위해 true 반환
  }
  
  // 북마크 편집 처리
  if (message.action === 'editBookmark') {
    console.log('북마크 편집 요청 수신:', message.id, message.title, message.url);
    
    // 북마크 ID 확인
    if (!message.id) {
      sendResponse({ success: false, error: '북마크 ID가 없습니다' });
      return true;
    }
    
    // 북마크 편집
    editBookmark(message.id, message.title, message.url)
      .then(bookmark => {
        console.log('북마크 편집 성공:', bookmark);
        
        // 모든 탭에 북마크 변경 알림
        notifyBookmarkChange();
        
        // 성공 응답
        sendResponse({ success: true, bookmark: bookmark });
      })
      .catch(error => {
        console.error('북마크 편집 실패:', error);
        
        // 실패 응답
        sendResponse({ success: false, error: error.message });
      });
    
    // 비동기 응답을 위해 true 반환
    return true;
  }
  
  // 북마크 삭제 처리
  if (message.action === 'removeBookmark') {
    console.log('북마크 삭제 요청 수신:', message.id);
    
    // 북마크 ID 확인
    if (!message.id) {
      sendResponse({ success: false, error: '북마크 ID가 없습니다' });
      return true;
    }
    
    // 북마크 삭제
    removeBookmark(message.id)
      .then(result => {
        console.log('북마크 삭제 성공:', result);
        
        // 모든 탭에 북마크 변경 알림
        notifyBookmarkChange();
        
        // 성공 응답
        sendResponse(result);
      })
      .catch(error => {
        console.error('북마크 삭제 실패:', error);
        
        // 실패 응답
        sendResponse({ success: false, error: error.message });
      });
    
    // 비동기 응답을 위해 true 반환
    return true;
  }
  
  // 기본 응답
  sendResponse({ success: false, error: 'Unknown action' });
  return true;
});

// content script가 로드되었는지 확인하는 함수
function isContentScriptLoaded(tabId) {
  return new Promise((resolve) => {
    try {
      // 탭 존재 여부 확인
      chrome.tabs.get(tabId, (tab) => {
        if (chrome.runtime.lastError) {
          console.warn(`탭 ${tabId} 정보 가져오기 실패:`, chrome.runtime.lastError);
          resolve(false);
          return;
        }
        
        // 주입 불가능한 URL 확인
        const url = tab.url || '';
        if (url.startsWith('chrome://') || 
            url.startsWith('chrome-extension://') || 
            url.startsWith('about:') || 
            url.startsWith('edge://') || 
            url.startsWith('brave://') ||
            url.startsWith('view-source:') ||
            url.startsWith('devtools://') ||
            url.includes('chrome.google.com/webstore') ||
            url === '') {
          console.log(`주입 불가능한 URL: ${url} (탭 ${tabId})`);
          resolve(false);
          return;
        }
        
        // 핑 메시지 전송으로 콘텐츠 스크립트 로드 여부 확인
        chrome.tabs.sendMessage(tabId, { action: 'ping' }, (response) => {
          if (chrome.runtime.lastError) {
            console.log(`콘텐츠 스크립트가 로드되지 않음 (탭 ${tabId}):`, chrome.runtime.lastError.message);
            resolve(false);
          } else if (!response) {
            console.log(`콘텐츠 스크립트 응답 없음 (탭 ${tabId})`);
            resolve(false);
          } else {
            console.log(`콘텐츠 스크립트 로드됨 (탭 ${tabId}):`, response);
            resolve(true);
          }
        });
      });
    } catch (error) {
      console.error(`콘텐츠 스크립트 확인 중 예외 발생 (탭 ${tabId}):`, error);
      resolve(false);
    }
  });
}

// content script를 주입하는 함수
function injectContentScript(tabId) {
  return new Promise((resolve, reject) => {
    try {
      console.log(`콘텐츠 스크립트 주입 시작 (탭 ${tabId})`);
      
      // 먼저 콘텐츠 스크립트가 이미 로드되었는지 확인
      isContentScriptLoaded(tabId)
        .then(isLoaded => {
          if (isLoaded) {
            console.log(`콘텐츠 스크립트가 이미 로드되어 있습니다 (탭 ${tabId})`);
            resolve(true);
            return;
          }
          
          // 탭 정보 확인
          chrome.tabs.get(tabId, (tab) => {
            if (chrome.runtime.lastError) {
              const error = `탭 정보 가져오기 실패 (탭 ${tabId}): ${chrome.runtime.lastError.message}`;
              console.error(error);
              resolve(false); // 실패해도 Promise는 resolve하여 상위 호출자가 처리할 수 있게 함
              return;
            }
            
            // 주입 불가능한 URL 확인
            const url = tab.url || '';
            if (url.startsWith('chrome://') || 
                url.startsWith('chrome-extension://') || 
                url.startsWith('about:') || 
                url.startsWith('edge://') || 
                url.startsWith('brave://') ||
                url.startsWith('view-source:') ||
                url.startsWith('devtools://') ||
                url.includes('chrome.google.com/webstore') ||
                url === '') {
              console.log(`주입 불가능한 URL: ${url} (탭 ${tabId})`);
              resolve(false);
              return;
            }
            
            // 안전한 URL이라면 CSS 주입 시도
            console.log(`CSS 주입 시작 (탭 ${tabId})`);
            chrome.scripting.insertCSS({
              target: { tabId: tabId },
              files: ['content.css']
            })
            .then(() => {
              console.log(`CSS 주입 성공 (탭 ${tabId})`);
              
              // 그 다음 JS 주입 시도
              console.log(`JS 주입 시작 (탭 ${tabId})`);
              return chrome.scripting.executeScript({
                target: { tabId: tabId },
                files: ['content.js']
              });
            })
            .then(() => {
              console.log(`JS 주입 성공 (탭 ${tabId})`);
              
              // 주입 후 로드 확인 (추가 검증)
              return new Promise(resolveCheck => {
                setTimeout(() => {
                  isContentScriptLoaded(tabId)
                    .then(isNowLoaded => {
                      if (isNowLoaded) {
                        console.log(`주입 후 콘텐츠 스크립트 로드 확인됨 (탭 ${tabId})`);
                        resolveCheck(true);
                      } else {
                        console.warn(`주입했으나 콘텐츠 스크립트가 로드되지 않음 (탭 ${tabId})`);
                        resolveCheck(false);
                      }
                    });
                }, 500); // 주입 후 0.5초 대기 후 확인
              });
            })
            .then(finalResult => {
              resolve(finalResult);
            })
            .catch(error => {
              console.error(`스크립트 주입 오류 (탭 ${tabId}):`, error);
              resolve(false); // 실패해도 Promise는 resolve하여 상위 호출자가 처리할 수 있게 함
            });
          });
        })
        .catch(error => {
          console.error(`콘텐츠 스크립트 로드 확인 중 오류 발생 (탭 ${tabId}):`, error);
          resolve(false);
        });
    } catch (error) {
      console.error(`콘텐츠 스크립트 주입 중 예외 발생 (탭 ${tabId}):`, error);
      resolve(false);
    }
  });
}

// 탭에 메시지를 안전하게 보내는 함수
async function sendMessageToTab(tabId, message) {
  return new Promise((resolve, reject) => {
    try {
      // 탭 존재 여부 확인
      chrome.tabs.get(tabId, (tab) => {
        if (chrome.runtime.lastError) {
          console.error(`탭 ${tabId} 정보 가져오기 실패:`, chrome.runtime.lastError);
          reject(new Error(`탭 ${tabId}가 존재하지 않습니다: ${chrome.runtime.lastError.message}`));
          return;
        }
        
        // 주입 불가능한 URL 확인
        const url = tab.url || '';
        if (url.startsWith('chrome://') || 
            url.startsWith('chrome-extension://') || 
            url.startsWith('about:') || 
            url.startsWith('edge://') || 
            url.startsWith('brave://') ||
            url.startsWith('view-source:') ||
            url.startsWith('devtools://') ||
            url.includes('chrome.google.com/webstore') ||
            url === '') {
          console.warn(`메시지를 보낼 수 없는 URL: ${url} (탭 ${tabId})`);
          resolve({ success: false, error: `메시지를 보낼 수 없는 URL: ${url}` });
          return;
        }
        
        // 메시지 전송
        try {
          chrome.tabs.sendMessage(tabId, message, (response) => {
            if (chrome.runtime.lastError) {
              console.error(`메시지 전송 오류 (탭 ${tabId}):`, chrome.runtime.lastError);
              
              // Content script not loaded 오류 처리
              if (chrome.runtime.lastError.message.includes('content script not loaded')) {
                resolve({ success: false, error: 'Content script not loaded', needsInjection: true });
              } else {
                resolve({ success: false, error: chrome.runtime.lastError.message });
              }
              return;
            }
            
            if (!response) {
              console.warn(`응답 없음 (탭 ${tabId})`);
              resolve({ success: false, error: '응답 없음' });
              return;
            }
            
            resolve(response);
          });
        } catch (sendError) {
          console.error(`메시지 전송 중 예외 발생 (탭 ${tabId}):`, sendError);
          resolve({ success: false, error: sendError.message || '메시지 전송 중 예외 발생' });
        }
      });
    } catch (error) {
      console.error('메시지 전송 함수 실행 중 예외 발생:', error);
      resolve({ success: false, error: error.message || '메시지 전송 함수 실행 중 예외 발생' });
    }
  });
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

// 북마크 변경 이벤트 리스너
chrome.bookmarks.onCreated.addListener((id, bookmark) => {
  notifyBookmarkChange();
});

chrome.bookmarks.onRemoved.addListener((id, removeInfo) => {
  notifyBookmarkChange();
});

chrome.bookmarks.onChanged.addListener((id, changeInfo) => {
  notifyBookmarkChange();
});

chrome.bookmarks.onMoved.addListener((id, moveInfo) => {
  notifyBookmarkChange();
});

// 북마크 변경 알림 함수
function notifyBookmarkChange() {
  console.log('북마크 변경 감지, 모든 탭에 알림');
  
  try {
    // 모든 탭에 북마크 변경 알림
    chrome.tabs.query({}, (tabs) => {
      if (chrome.runtime.lastError) {
        console.error('탭 목록 가져오기 실패:', chrome.runtime.lastError);
        return;
      }
      
      if (!tabs || !tabs.length) {
        console.log('알림을 보낼 탭이 없습니다');
        return;
      }
      
      console.log(`${tabs.length}개의 탭에 북마크 변경 알림 전송`);
      
      // 각 탭에 메시지 전송
      tabs.forEach(tab => {
        // 주입 불가능한 URL 확인
        const url = tab.url || '';
        if (url.startsWith('chrome://') || 
            url.startsWith('chrome-extension://') || 
            url.startsWith('about:') || 
            url.startsWith('edge://') || 
            url.startsWith('brave://') ||
            url.startsWith('view-source:') ||
            url.startsWith('devtools://') ||
            url.includes('chrome.google.com/webstore') ||
            url === '') {
          // 주입 불가능한 URL은 건너뜀
          return;
        }
        
        // 안전하게 메시지 전송
        try {
          chrome.tabs.sendMessage(tab.id, { action: 'bookmarkChanged' }, (response) => {
            if (chrome.runtime.lastError) {
              // 오류 무시 (일부 탭에서는 콘텐츠 스크립트가 로드되지 않았을 수 있음)
              console.log(`탭 ${tab.id}에 알림 실패: ${chrome.runtime.lastError.message}`);
            } else if (response) {
              console.log(`탭 ${tab.id}에 알림 성공:`, response);
            }
          });
        } catch (error) {
          console.log(`탭 ${tab.id}에 알림 중 예외 발생:`, error);
        }
      });
    });
  } catch (error) {
    console.error('북마크 변경 알림 중 예외 발생:', error);
  }
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

// 초기화된 탭 추적을 위한 객체
const initializedTabs = {};

// 탭 업데이트 이벤트 리스너 (페이지 로드 감지)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // 완료 상태일 때만 북마크 바 초기화 시도 (로딩 상태는 제외)
  if (changeInfo.status === 'complete') {
    console.log(`탭 ${tabId} 로드 완료`);
    
    // 주입 불가능한 URL 확인
    const url = tab.url || '';
    if (url.startsWith('chrome://') || 
        url.startsWith('chrome-extension://') || 
        url.startsWith('about:') || 
        url.startsWith('edge://') || 
        url.startsWith('brave://') ||
        url.startsWith('view-source:') ||
        url.startsWith('devtools://') ||
        url.includes('chrome.google.com/webstore') ||
        url === '') {
      console.log(`북마크 바를 초기화할 수 없는 URL: ${url} (탭 ${tabId})`);
      return;
    }
    
    // 이미 초기화된 탭인지 확인
    if (initializedTabs[tabId]) {
      console.log(`탭 ${tabId}는 이미 초기화되었습니다. 북마크 바 상태만 확인합니다.`);
      
      // 북마크 바 상태 확인 (핑 메시지 전송)
      sendMessageToTab(tabId, { action: 'ping' })
        .then(response => {
          if (response && response.success) {
            console.log(`탭 ${tabId}의 북마크 바가 정상 작동 중입니다.`);
          } else {
            console.log(`탭 ${tabId}의 북마크 바 상태 확인 실패, 재초기화합니다.`);
            // 초기화 상태 재설정
            delete initializedTabs[tabId];
            // 북마크 바 초기화 (지연 적용)
            setTimeout(() => {
              initializeBookmarkBar(tabId);
            }, 500);
          }
        })
        .catch(error => {
          console.log(`탭 ${tabId}의 북마크 바 상태 확인 중 오류 발생, 재초기화합니다:`, error);
          // 초기화 상태 재설정
          delete initializedTabs[tabId];
          // 북마크 바 초기화 (지연 적용)
          setTimeout(() => {
            initializeBookmarkBar(tabId);
          }, 500);
        });
      
      return;
    }
    
    // 북마크 바 초기화 메시지 전송 (지연 적용)
    setTimeout(() => {
      initializeBookmarkBar(tabId);
    }, 1000); // 1초 지연 (페이지 로드 완료 후 충분한 시간 확보)
  }
});

// 북마크 바 초기화 함수
function initializeBookmarkBar(tabId) {
  return new Promise((resolve, reject) => {
    try {
      console.log(`북마크 바 초기화 시작 (탭 ${tabId})`);
      
      // 이미 초기화된 탭인지 확인
      if (initializedTabs[tabId]) {
        console.log(`탭 ${tabId}는 이미 초기화되었습니다`);
        resolve({ success: true, message: '이미 초기화됨' });
        return;
      }
      
      // 콘텐츠 스크립트가 로드되었는지 확인
      isContentScriptLoaded(tabId)
        .then(isLoaded => {
          if (!isLoaded) {
            console.log(`콘텐츠 스크립트가 로드되지 않았습니다. 주입 시도 (탭 ${tabId})`);
            return injectContentScript(tabId);
          }
          return true;
        })
        .then(injected => {
          if (!injected) {
            throw new Error(`콘텐츠 스크립트 주입 실패 (탭 ${tabId})`);
          }
          
          // 북마크 바 초기화 메시지 전송
          return sendMessageToTab(tabId, { action: 'initBookmarkBar', tabId: tabId })
            .catch(error => {
              console.error(`북마크 바 초기화 메시지 전송 실패 (탭 ${tabId}):`, error);
              
              // 메시지 전송 실패 시 다시 한 번 콘텐츠 스크립트 주입 시도
              return injectContentScript(tabId)
                .then(reinjected => {
                  if (!reinjected) {
                    throw new Error(`콘텐츠 스크립트 재주입 실패 (탭 ${tabId})`);
                  }
                  
                  // 재주입 후 다시 메시지 전송
                  return sendMessageToTab(tabId, { action: 'initBookmarkBar', tabId: tabId });
                });
            });
        })
        .then(result => {
          if (result && result.success) {
            console.log(`북마크 바 초기화 성공 (탭 ${tabId})`);
            // 초기화 성공 시 탭 상태 저장
            initializedTabs[tabId] = true;
            resolve(result);
          } else {
            console.warn(`북마크 바 초기화 실패 (탭 ${tabId}):`, result ? result.error : '알 수 없는 오류');
            // 실패해도 일단 초기화 시도한 것으로 간주
            initializedTabs[tabId] = true;
            resolve({ success: false, error: result ? result.error : '북마크 바 초기화 실패' });
          }
        })
        .catch(error => {
          console.error(`북마크 바 초기화 중 오류 발생 (탭 ${tabId}):`, error);
          // 오류가 발생해도 일단 초기화 시도한 것으로 간주
          initializedTabs[tabId] = true;
          resolve({ success: false, error: error.message || '북마크 바 초기화 중 오류 발생' });
        });
    } catch (error) {
      console.error('북마크 바 초기화 중 예외 발생:', error);
      resolve({ success: false, error: error.message || '북마크 바 초기화 중 예외 발생' });
    }
  });
}

// 북마크 추가 함수
function addBookmark(title, url) {
  return new Promise((resolve, reject) => {
    // 북마크 폴더 ID 가져오기 (또는 생성)
    getOrCreateBookmarkFolder()
      .then(folderId => {
        // 북마크 생성
        chrome.bookmarks.create({
          parentId: folderId,
          title: title,
          url: url
        }, (bookmark) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(bookmark);
          }
        });
      })
      .catch(reject);
  });
}

// 북마크 폴더 가져오기 또는 생성
function getOrCreateBookmarkFolder() {
  return new Promise((resolve, reject) => {
    // 'BookStaxx' 폴더 찾기
    chrome.bookmarks.search({ title: 'BookStaxx' }, (results) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      
      // 폴더가 이미 존재하는 경우
      const folder = results.find(b => !b.url);
      if (folder) {
        resolve(folder.id);
        return;
      }
      
      // 폴더가 없으면 생성
      chrome.bookmarks.create({
        title: 'BookStaxx'
      }, (newFolder) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(newFolder.id);
        }
      });
    });
  });
}

// 북마크 목록 가져오기
function getBookmarks() {
  return new Promise((resolve, reject) => {
    try {
      // 'BookStaxx' 폴더 찾기
      chrome.bookmarks.search({ title: 'BookStaxx' }, (results) => {
        if (chrome.runtime.lastError) {
          console.error('북마크 폴더 검색 오류:', chrome.runtime.lastError);
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        
        // 폴더가 없는 경우 빈 배열 반환
        const folder = results.find(b => !b.url);
        if (!folder) {
          console.log('BookStaxx 폴더를 찾을 수 없습니다. 빈 배열 반환');
          resolve([]);
          return;
        }
        
        // 폴더 내 북마크 가져오기
        try {
          chrome.bookmarks.getChildren(folder.id, (bookmarks) => {
            if (chrome.runtime.lastError) {
              console.error('북마크 가져오기 오류:', chrome.runtime.lastError);
              reject(new Error(chrome.runtime.lastError.message));
              return;
            }
            
            console.log(`북마크 ${bookmarks.length}개 가져오기 성공`);
            resolve(bookmarks);
          });
        } catch (childrenError) {
          console.error('북마크 가져오기 중 예외 발생:', childrenError);
          reject(childrenError);
        }
      });
    } catch (error) {
      console.error('북마크 목록 가져오기 중 예외 발생:', error);
      reject(error);
    }
  });
}

// 탭 활성화 이벤트 리스너 (탭 전환 감지)
chrome.tabs.onActivated.addListener((activeInfo) => {
  console.log(`탭 ${activeInfo.tabId} 활성화됨`);
  
  // 활성화된 탭 정보 가져오기
  chrome.tabs.get(activeInfo.tabId, (tab) => {
    if (chrome.runtime.lastError) {
      console.error('탭 정보 가져오기 실패:', chrome.runtime.lastError.message);
      return;
    }
    
    // 주입 불가능한 URL 확인
    const url = tab.url || '';
    if (url.startsWith('chrome://') || 
        url.startsWith('chrome-extension://') || 
        url.startsWith('about:') || 
        url.startsWith('edge://') || 
        url.startsWith('brave://') ||
        url.startsWith('view-source:') ||
        url.startsWith('devtools://') ||
        url.includes('chrome.google.com/webstore') ||
        url === '') {
      console.log(`북마크 바를 초기화할 수 없는 URL: ${url} (탭 ${activeInfo.tabId})`);
      return;
    }
    
    // 이미 초기화된 탭인지 확인
    if (initializedTabs[activeInfo.tabId]) {
      console.log(`탭 ${activeInfo.tabId}는 이미 초기화되었습니다. 북마크 바 상태만 확인합니다.`);
      
      // 북마크 바 상태 확인 (핑 메시지 전송)
      sendMessageToTab(activeInfo.tabId, { action: 'ping' })
        .then(response => {
          if (response && response.success) {
            console.log(`탭 ${activeInfo.tabId}의 북마크 바가 정상 작동 중입니다.`);
          } else {
            console.log(`탭 ${activeInfo.tabId}의 북마크 바 상태 확인 실패, 재초기화합니다.`);
            // 초기화 상태 재설정
            delete initializedTabs[activeInfo.tabId];
            // 북마크 바 초기화 (지연 적용)
            setTimeout(() => {
              initializeBookmarkBar(activeInfo.tabId);
            }, 500);
          }
        })
        .catch(error => {
          console.log(`탭 ${activeInfo.tabId}의 북마크 바 상태 확인 중 오류 발생, 재초기화합니다:`, error);
          // 초기화 상태 재설정
          delete initializedTabs[activeInfo.tabId];
          // 북마크 바 초기화 (지연 적용)
          setTimeout(() => {
            initializeBookmarkBar(activeInfo.tabId);
          }, 500);
        });
      
      return;
    }
    
    // 북마크 바 초기화 (지연 적용)
    setTimeout(() => {
      initializeBookmarkBar(activeInfo.tabId);
    }, 1000); // 1초 지연 (탭 활성화 후 충분한 시간 확보)
  });
});

// 탭 제거 이벤트 리스너
chrome.tabs.onRemoved.addListener((tabId) => {
  console.log(`탭 ${tabId} 제거됨`);
  
  // 초기화 상태에서 제거
  if (initializedTabs[tabId]) {
    delete initializedTabs[tabId];
    console.log(`탭 ${tabId}의 초기화 상태가 제거되었습니다.`);
  }
});

// 파비콘을 가져와 data URL로 변환하는 함수
function fetchFaviconAsDataUrl(url) {
  return new Promise((resolve, reject) => {
    try {
      // 파비콘 URL이 유효한지 확인
      if (!url || typeof url !== 'string') {
        reject(new Error('유효하지 않은 URL'));
        return;
      }
      
      // 일반적인 도메인에 대한 내장 아이콘 경로
      const commonIcons = {
        'google.com': 'images/icons/google.png',
        'youtube.com': 'images/icons/youtube.png',
        'github.com': 'images/icons/github.png',
        'naver.com': 'images/icons/naver.png',
        'gmail.com': 'images/icons/gmail.png',
        'mail.google.com': 'images/icons/gmail.png',
        'reddit.com': 'images/icons/reddit.png'
      };
      
      // URL에서 도메인 추출
      let domain = '';
      try {
        const urlObj = new URL(url);
        domain = urlObj.hostname.replace('www.', '');
        
        // 도메인에 맞는 내장 아이콘이 있는지 확인
        for (const [key, iconPath] of Object.entries(commonIcons)) {
          if (domain.includes(key)) {
            const internalIconUrl = chrome.runtime.getURL(iconPath);
            resolve(internalIconUrl);
            return;
          }
        }
      } catch (error) {
        console.warn('URL 파싱 실패:', url, error);
      }
      
      // 파비콘 URL 생성
      let faviconUrl;
      try {
        const urlObj = new URL(url);
        faviconUrl = urlObj.origin + '/favicon.ico';
      } catch (error) {
        console.warn('파비콘 URL 생성 실패:', url, error);
        // 기본 아이콘 반환
        resolve(chrome.runtime.getURL('images/icon16.png'));
        return;
      }
      
      // fetch를 사용하여 파비콘 가져오기
      fetch(faviconUrl, { 
        method: 'GET',
        mode: 'no-cors',
        cache: 'force-cache',
        headers: {
          'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8'
        }
      })
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP 오류: ${response.status}`);
        }
        return response.blob();
      })
      .then(blob => {
        // Blob을 data URL로 변환
        const reader = new FileReader();
        reader.onloadend = () => {
          resolve(reader.result);
        };
        reader.onerror = () => {
          reject(new Error('파비콘 데이터 변환 실패'));
        };
        reader.readAsDataURL(blob);
      })
      .catch(error => {
        console.error('파비콘 가져오기 실패:', error);
        
        // favicon.ico 실패 시 favicon.png 시도
        const pngUrl = faviconUrl.replace('.ico', '.png');
        
        fetch(pngUrl, { 
          method: 'GET',
          mode: 'no-cors',
          cache: 'force-cache',
          headers: {
            'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8'
          }
        })
        .then(response => {
          if (!response.ok) {
            throw new Error(`HTTP 오류: ${response.status}`);
          }
          return response.blob();
        })
        .then(blob => {
          const reader = new FileReader();
          reader.onloadend = () => {
            resolve(reader.result);
          };
          reader.onerror = () => {
            reject(new Error('파비콘 데이터 변환 실패'));
          };
          reader.readAsDataURL(blob);
        })
        .catch(error => {
          console.error('PNG 파비콘 가져오기 실패:', error);
          // 기본 아이콘 반환
          resolve(chrome.runtime.getURL('images/icon16.png'));
        });
      });
    } catch (error) {
      console.error('파비콘 가져오기 중 오류 발생:', error);
      // 기본 아이콘 반환
      resolve(chrome.runtime.getURL('images/icon16.png'));
    }
  });
}

// 북마크 편집 함수
function editBookmark(bookmarkId, title, url) {
  return new Promise((resolve, reject) => {
    try {
      console.log(`북마크 편집 시작 (ID: ${bookmarkId})`);
      
      // 북마크 ID 확인
      if (!bookmarkId) {
        console.error('북마크 ID가 없습니다');
        reject(new Error('북마크 ID가 없습니다'));
        return;
      }
      
      // 북마크 업데이트
      chrome.bookmarks.update(bookmarkId, { title, url }, (updatedBookmark) => {
        if (chrome.runtime.lastError) {
          console.error('북마크 편집 실패:', chrome.runtime.lastError);
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        
        console.log('북마크 편집 성공:', updatedBookmark);
        
        // 모든 탭에 북마크 변경 알림
        notifyBookmarkChange();
        
        resolve(updatedBookmark);
      });
    } catch (error) {
      console.error('북마크 편집 중 예외 발생:', error);
      reject(error);
    }
  });
}

// 북마크 삭제 함수
function removeBookmark(bookmarkId) {
  return new Promise((resolve, reject) => {
    try {
      console.log(`북마크 삭제 시작 (ID: ${bookmarkId})`);
      
      // 북마크 ID 확인
      if (!bookmarkId) {
        console.error('북마크 ID가 없습니다');
        reject(new Error('북마크 ID가 없습니다'));
        return;
      }
      
      // 북마크 삭제
      chrome.bookmarks.remove(bookmarkId, () => {
        if (chrome.runtime.lastError) {
          console.error('북마크 삭제 실패:', chrome.runtime.lastError);
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        
        console.log('북마크 삭제 성공');
        
        // 모든 탭에 북마크 변경 알림
        notifyBookmarkChange();
        
        resolve({ success: true });
      });
    } catch (error) {
      console.error('북마크 삭제 중 예외 발생:', error);
      reject(error);
    }
  });
} 
