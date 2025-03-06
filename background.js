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

// 북마크 추가 메시지를 처리하는 리스너
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('메시지 수신:', message, '발신자:', sender);
  
  // 북마크 추가 요청 처리
  if (message.action === 'addBookmark') {
    addBookmark(message.title, message.url)
      .then(result => {
        sendResponse({ success: true, bookmark: result });
      })
      .catch(error => {
        sendResponse({ success: false, error: error.message });
      });
    return true; // 비동기 응답을 위해 true 반환
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
  
  // 기본 응답
  sendResponse({ success: false, error: 'Unknown action' });
  return true;
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
  return new Promise((resolve, reject) => {
    // 먼저 콘텐츠 스크립트가 이미 로드되었는지 확인
    isContentScriptLoaded(tabId).then(isLoaded => {
      if (isLoaded) {
        console.log(`콘텐츠 스크립트가 이미 로드되어 있습니다 (탭 ${tabId})`);
        resolve(true);
        return;
      }
      
      // 먼저 탭 정보 확인
      chrome.tabs.get(tabId, (tab) => {
        if (chrome.runtime.lastError) {
          console.error(`탭 정보 가져오기 실패 (탭 ${tabId}):`, chrome.runtime.lastError.message);
          reject(chrome.runtime.lastError);
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
            url === '') {
          console.log(`주입 불가능한 URL: ${url} (탭 ${tabId})`);
          reject(new Error(`Cannot inject content script to ${url}`));
          return;
        }
        
        // 안전한 URL이라면 CSS 주입
        chrome.scripting.insertCSS({
          target: { tabId: tabId },
          files: ['content.css']
        })
        .then(() => {
          console.log(`CSS 주입 성공 (탭 ${tabId})`);
          
          // 그 다음 JS 주입
          return chrome.scripting.executeScript({
            target: { tabId: tabId },
            files: ['content.js']
          });
        })
        .then(() => {
          console.log(`JS 주입 성공 (탭 ${tabId})`);
          resolve(true);
        })
        .catch(error => {
          console.error(`스크립트 주입 오류 (탭 ${tabId}):`, error);
          reject(error);
        });
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
        url.startsWith('view-source:') ||
        url.startsWith('devtools://') ||
        url === '') {
      console.log('메시지를 보낼 수 없는 페이지입니다', url);
      return { success: false, error: 'Cannot access this URL type' };
    }
    
    // content script가 로드되었는지 확인
    let isLoaded = await isContentScriptLoaded(tabId).catch(() => false);
    
    // 로드되지 않았다면 주입 시도
    if (!isLoaded) {
      console.log('Content script가 로드되지 않아 주입을 시도합니다');
      try {
        const injected = await injectContentScript(tabId);
        if (injected) {
          // 주입 후 다시 확인
          isLoaded = await isContentScriptLoaded(tabId).catch(() => false);
        }
      } catch (error) {
        console.error('Content script 주입 실패:', error);
        return { success: false, error: error.message };
      }
    }
    
    if (!isLoaded) {
      console.log('Content script가 로드되지 않아 메시지를 보낼 수 없습니다.');
      return { success: false, error: 'Content script not loaded' };
    }
    
    // 탭이 존재하고 content script가 로드되었으면 메시지 전송 시도
    return new Promise((resolve) => {
      chrome.tabs.sendMessage(tabId, message, (response) => {
        if (chrome.runtime.lastError) {
          console.log('메시지 전송 실패:', chrome.runtime.lastError.message);
          resolve({ success: false, error: chrome.runtime.lastError.message });
        } else {
          console.log('메시지 전송 성공, 응답:', response);
          resolve({ success: true, response });
        }
      });
    });
  } catch (error) {
    console.error('메시지 전송 중 오류 발생:', error);
    return { success: false, error: error.message };
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
  
  // 모든 탭에 북마크 변경 알림
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach(tab => {
      chrome.tabs.sendMessage(tab.id, { action: 'bookmarkChanged' })
        .catch(error => {
          // 오류 무시 (일부 탭에서는 콘텐츠 스크립트가 로드되지 않았을 수 있음)
          console.log(`탭 ${tab.id}에 알림 실패:`, error);
        });
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

// 탭 업데이트 이벤트 리스너 (페이지 로드 감지)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // 로딩 상태 또는 완료 상태일 때 북마크 바 초기화 시도
  if (changeInfo.status === 'loading' || changeInfo.status === 'complete') {
    console.log(`탭 ${tabId} 상태 변경: ${changeInfo.status}`);
    
    // 북마크 바 초기화 메시지 전송
    initializeBookmarkBar(tabId);
  }
});

// 북마크 바 초기화 함수
function initializeBookmarkBar(tabId) {
  // 먼저 탭 정보 확인
  chrome.tabs.get(tabId, (tab) => {
    if (chrome.runtime.lastError) {
      console.error(`탭 정보 가져오기 실패 (탭 ${tabId}):`, chrome.runtime.lastError.message);
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
        url === '') {
      console.log(`북마크 바를 초기화할 수 없는 URL: ${url} (탭 ${tabId})`);
      return;
    }
    
    // 콘텐츠 스크립트에 메시지 전송
    chrome.tabs.sendMessage(tabId, { action: 'initBookmarkBar' }, (response) => {
      // 응답이 없거나 오류가 발생한 경우 (콘텐츠 스크립트가 로드되지 않았을 수 있음)
      if (chrome.runtime.lastError) {
        console.log(`탭 ${tabId}에 콘텐츠 스크립트 주입 필요:`, chrome.runtime.lastError.message);
        
        // 콘텐츠 스크립트 주입 시도
        injectContentScript(tabId)
          .then(() => {
            // 주입 성공 후 약간의 지연을 두고 다시 초기화 시도
            setTimeout(() => {
              chrome.tabs.sendMessage(tabId, { action: 'initBookmarkBar' }, (response) => {
                if (chrome.runtime.lastError) {
                  console.log(`재시도 후에도 초기화 실패:`, chrome.runtime.lastError.message);
                } else {
                  console.log(`북마크 바 초기화 성공 (재시도 후):`, response);
                }
              });
            }, 500);
          })
          .catch(error => {
            console.error(`콘텐츠 스크립트 주입 실패:`, error);
          });
      } else if (response) {
        console.log(`북마크 바 초기화 성공:`, response);
      }
    });
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
    // 'BookStaxx' 폴더 찾기
    chrome.bookmarks.search({ title: 'BookStaxx' }, (results) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      
      // 폴더가 없는 경우 빈 배열 반환
      const folder = results.find(b => !b.url);
      if (!folder) {
        resolve([]);
        return;
      }
      
      // 폴더 내 북마크 가져오기
      chrome.bookmarks.getChildren(folder.id, (bookmarks) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(bookmarks);
        }
      });
    });
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
    
    // 유효한 URL인 경우에만 처리
    if (tab.url && tab.url.startsWith('http')) {
      // 콘텐츠 스크립트가 로드되었는지 확인하고 북마크바 초기화 메시지 전송
      isContentScriptLoaded(activeInfo.tabId)
        .then(loaded => {
          if (loaded) {
            // 콘텐츠 스크립트에 북마크바 초기화 메시지 전송
            sendMessageToTab(activeInfo.tabId, { action: 'initBookmarkBar' })
              .then(response => {
                console.log('탭 활성화 시 북마크바 초기화 메시지 전송 성공:', response);
              })
              .catch(error => {
                console.error('탭 활성화 시 북마크바 초기화 메시지 전송 실패:', error);
                
                // 에러가 발생하면 약간 지연 후 다시 시도
                setTimeout(() => {
                  sendMessageToTab(activeInfo.tabId, { action: 'initBookmarkBar' })
                    .catch(err => console.log('재시도 실패:', err));
                }, 300);
              });
          } else {
            console.log(`탭 ${activeInfo.tabId}에 콘텐츠 스크립트가 로드되지 않음, 주입 시도...`);
            injectContentScript(activeInfo.tabId)
              .then(injected => {
                if (injected) {
                  // 주입 성공 후 약간의 지연을 두고 북마크바 초기화 메시지 전송
                  setTimeout(() => {
                    sendMessageToTab(activeInfo.tabId, { action: 'initBookmarkBar' })
                      .catch(err => console.log('주입 후 초기화 실패:', err));
                  }, 100);
                }
              });
          }
        });
    }
  });
}); 
