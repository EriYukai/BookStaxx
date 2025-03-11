// BookStaxx 컨텐츠 스크립트
if (!window.BookStaxx) {
  // 전역 객체 초기화
  window.BookStaxx = {
    initialized: false,
    bookmarkBarCreated: false, // 북마크바 생성 여부 추적
    persistBookmarkBar: true   // 북마크바 유지 설정
  };
  
  // 전역 변수 선언
  let isLoadingBookmarks = false;
  let isInitialized = false; // 초기화 완료 플래그 전역 변수로 선언
  
  (function() {
    // 전역 네임스페이스 초기화
    window.BookStaxx = window.BookStaxx || {
      persistBookmarkBar: true,
      bookmarkBarCreated: false,
      offlineMode: false
    };
    
    // 기본 설정 정의
    const defaultSettings = {
      bookmarkBar: {
        show: true,
        position: 'top',
        backgroundColor: '#f1f3f4',
        textColor: '#333333',
        opacity: 100,
        showText: true,
        textMaxLength: 0,
        iconSize: 'medium',
        useChromeStyle: true
      },
      bookmarkButton: {
        show: true,
        position: 'topRight',
        size: 'medium',
        color: '#0077ED',
        textColor: '#FFFFFF'
      },
      persistBookmarkBar: true
    };
    
    // 설정 객체 초기화
    let settings = {};
    
    // 사전 초기화 검사
    function preInit() {
      console.log('BookStaxx 사전 초기화 검사 시작');
      
      // 현재 URL 확인
      const currentUrl = window.location.href;
      
      // 내부 페이지 확인 (매니페스트의 exclude_matches로 처리할 수 없는 경우)
      if (currentUrl.startsWith('chrome://') || 
          currentUrl.startsWith('chrome-extension://') || 
          currentUrl.startsWith('chrome-search://') ||
          currentUrl.startsWith('devtools://') ||
          currentUrl.startsWith('edge://') ||
          currentUrl.startsWith('about:') ||
          currentUrl.startsWith('view-source:') ||
          currentUrl.startsWith('brave://') ||
          currentUrl.includes('chrome.google.com/webstore') ||
          currentUrl.includes('addons.mozilla.org')) {
        console.log('내부 페이지에서는 북마크 바를 초기화하지 않습니다:', currentUrl);
        return false;
      }
      
      // 이미 초기화된 경우 중복 초기화 방지
      if (window.BookStaxxInitialized) {
        console.log('BookStaxx가 이미 초기화되었습니다');
        
        // 북마크 바가 존재하는지 확인
        const bookmarkBar = document.getElementById('bookmark-bar');
        if (bookmarkBar) {
          console.log('북마크 바가 이미 존재합니다. 업데이트만 수행합니다.');
          return 'update-only';
        }
        
        console.log('BookStaxx가 이미 초기화되었지만 북마크 바가 없습니다. 새로 생성합니다.');
      }
      
      // DOM이 준비되었는지 확인
      if (document.readyState === 'loading') {
        console.log('DOM이 아직 준비되지 않았습니다. 이벤트 리스너를 추가합니다.');
        
        // DOMContentLoaded 이벤트 리스너 추가
        document.addEventListener('DOMContentLoaded', function() {
          console.log('DOMContentLoaded 이벤트 발생');
          if (!window.BookStaxxInitialized) {
            initBookmarkBar();
          }
        });
        
        // load 이벤트 리스너 추가
        window.addEventListener('load', function() {
          console.log('load 이벤트 발생');
          if (!window.BookStaxxInitialized) {
            initBookmarkBar();
          }
        });
        
        return false;
      }
      
      // 초기화 진행
      return true;
    }
    
    // 사전 초기화 검사 실행
    if (!preInit()) {
      return; // 초기화 조건이 맞지 않으면 종료
    }
    
    // i18n 메시지 가져오기 함수
    function getMessage(key, substitutions) {
      // 기본 메시지 정의
      const defaultMessages = {
        'edit': '편집',
        'delete': '삭제',
        'deleteConfirmation': '북마크를 삭제하시겠습니까?',
        'editBookmarkTitle': '북마크 제목 편집:',
        'editBookmarkUrl': '북마크 URL 편집:',
        'editBookmarkError': '북마크 편집 중 오류가 발생했습니다.',
        'deleteBookmarkError': '북마크 삭제 중 오류가 발생했습니다.',
        'offlineEditNotSupported': '오프라인 모드에서는 북마크 편집이 지원되지 않습니다.',
        'offlineDeleteNotSupported': '오프라인 모드에서는 북마크 삭제가 지원되지 않습니다.',
        'bookmarkAdded': '북마크가 추가되었습니다.',
        'bookmarkAddError': '북마크 추가 중 오류가 발생했습니다.',
        'bookmarkBarInitialized': '북마크 바가 초기화되었습니다.',
        'bookmarkBarInitError': '북마크 바 초기화 중 오류가 발생했습니다.',
        'loadingBookmarks': '북마크를 불러오는 중...',
        'noBookmarks': '북마크가 없습니다.',
        'contextInvalidated': '확장 프로그램 컨텍스트가 무효화되었습니다.',
        'tryAgainLater': '나중에 다시 시도해 주세요.',
        'offlineMode': '오프라인 모드로 전환되었습니다.',
        'connectionRestored': '연결이 복원되었습니다.'
      };
      
      try {
        // chrome.i18n이 있는 경우 사용
        if (chrome.i18n) {
          try {
            const message = chrome.i18n.getMessage(key, substitutions);
            if (message) {
              return message;
            }
          } catch (i18nError) {
            console.warn(`i18n 메시지 가져오기 실패 (${key}):`, i18nError);
            // i18n 오류 시 기본 메시지로 폴백
          }
        }
        
        // 기본 메시지 반환
        if (defaultMessages[key]) {
          return defaultMessages[key];
        }
        
        // 기본 메시지도 없는 경우 키 자체 반환
        return key;
      } catch (error) {
        console.error(`메시지 가져오기 중 오류 발생 (${key}):`, error);
        return key; // 오류 발생 시 키 자체 반환
      }
    }

    // 북마크 버튼 요소
    var bookmarkButton = null;

    // 북마크 바 요소
    let bookmarkBar = null;

    // 북마크바 로딩 상태
    let isBookmarkBarLoading = false;

    // 페이지 전환 감지용 상태 값
    let lastUrl = location.href;

    // 북마크 캐시 시스템
    const bookmarkCache = {
      data: [],
      lastFetched: 0,
      iconUrls: {}
    };

    // 북마크 데이터 캐싱 관리
    const BookmarkCache = {
      cachedBookmarks: null,
      cachedIcons: {},
      
      // 캐시된 북마크 데이터를 가져오는 함수
      getBookmarks: function() {
        return this.cachedBookmarks;
      },
      
      // 북마크 데이터를 캐시에 저장하는 함수
      setBookmarks: function(bookmarks) {
        this.cachedBookmarks = bookmarks;
        // 로컬 스토리지에도 저장 (영구 보존)
        localStorage.setItem('bookstaxx_cached_bookmarks', JSON.stringify(bookmarks));
        console.log('북마크 데이터가 캐시에 저장됨', bookmarks.length + '개');
      },
      
      // 북마크 아이콘 URL을 캐시에 저장하는 함수
      setCachedIcon: function(url, iconUrl) {
        this.cachedIcons[url] = iconUrl;
        // 로컬 스토리지에 최신 아이콘 캐시 저장
        try {
          localStorage.setItem('bookstaxx_cached_icons', JSON.stringify(this.cachedIcons));
        } catch (e) {
          console.error('아이콘 캐시 저장 중 오류 발생:', e);
          // 스토리지 용량 초과 시 일부 캐시 정리
          this.cleanupIconCache();
        }
      },
      
      // 캐시된 아이콘 URL을 가져오는 함수
      getCachedIcon: function(url) {
        return this.cachedIcons[url];
      },
      
      // 캐시 초기화
      initCache: function() {
        // 로컬 스토리지에서 캐시된 데이터 복원
        try {
          const cachedBookmarks = localStorage.getItem('bookstaxx_cached_bookmarks');
          if (cachedBookmarks) {
            this.cachedBookmarks = JSON.parse(cachedBookmarks);
            console.log('로컬 스토리지에서 북마크 데이터 복원됨', this.cachedBookmarks.length + '개');
          }
          
          const cachedIcons = localStorage.getItem('bookstaxx_cached_icons');
          if (cachedIcons) {
            this.cachedIcons = JSON.parse(cachedIcons);
            console.log('로컬 스토리지에서 아이콘 캐시 복원됨', Object.keys(this.cachedIcons).length + '개');
          }
        } catch (e) {
          console.error('캐시 초기화 중 오류 발생:', e);
          // 오류 발생 시 캐시 리셋
          this.cachedBookmarks = null;
          this.cachedIcons = {};
        }
      },
      
      // 아이콘 캐시 정리 (오래된 항목 제거)
      cleanupIconCache: function() {
        const iconUrls = Object.keys(this.cachedIcons);
        if (iconUrls.length > 500) { // 500개 이상이면 반을 제거
          console.log('아이콘 캐시 정리 시작 - 현재 항목 수:', iconUrls.length);
          const halfLength = Math.floor(iconUrls.length / 2);
          const newCache = {};
          
          // 최근 절반만 유지
          for (let i = halfLength; i < iconUrls.length; i++) {
            newCache[iconUrls[i]] = this.cachedIcons[iconUrls[i]];
          }
          
          this.cachedIcons = newCache;
          console.log('아이콘 캐시 정리 완료 - 정리 후 항목 수:', Object.keys(this.cachedIcons).length);
          
          // 정리된 캐시 저장
          localStorage.setItem('bookstaxx_cached_icons', JSON.stringify(this.cachedIcons));
        }
      }
    };

    // 백그라운드 연결 확인 함수
    function checkBackgroundConnection() {
      return new Promise((resolve, reject) => {
        try {
          // 핑 메시지 전송
          chrome.runtime.sendMessage({ action: 'ping' }, response => {
            // 응답 확인
            if (chrome.runtime.lastError) {
              const errorMessage = chrome.runtime.lastError.message || '';
              console.error('백그라운드 연결 오류:', errorMessage);
              
              // Extension context invalidated 오류 처리
              if (errorMessage.includes('Extension context invalidated')) {
                console.log('확장 프로그램 컨텍스트가 무효화되었습니다. 오프라인 모드로 전환');
                
                // 오프라인 모드 플래그 설정
                window.BookStaxx.offlineMode = true;
                
                // 특별한 오류 객체 생성
                const contextError = new Error('Extension context invalidated');
                contextError.isContextInvalidated = true;
                reject(contextError);
                return;
              }
              
              reject(new Error('백그라운드 스크립트에 연결할 수 없습니다: ' + errorMessage));
              return;
            }
            
            // 오프라인 모드 해제
            window.BookStaxx.offlineMode = false;
            
            if (response && response.success) {
              console.log('백그라운드 스크립트 연결 성공');
              resolve(true);
            } else {
              console.error('백그라운드 스크립트 응답 오류:', response);
              reject(new Error('백그라운드 스크립트 응답이 유효하지 않습니다'));
            }
          });
        } catch (error) {
          console.error('백그라운드 연결 확인 중 오류 발생:', error);
          
          // 오프라인 모드 플래그 설정
          window.BookStaxx.offlineMode = true;
          
          reject(error);
        }
      });
    }

    // 로딩 메시지 표시 함수
    function showLoadingMessage() {
      isLoadingBookmarks = true;
      // 로딩 메시지 숨김 (사용자가 로딩 메시지를 보는 것을 원하지 않음)
      return;
      
      // 아래 코드는 더 이상 실행되지 않음
      /*
      const bookmarkBar = document.getElementById('bookmark-bar');
      if (!bookmarkBar) return;
      
      let loadingMessage = bookmarkBar.querySelector('.loading-message');
      
      if (!loadingMessage) {
        loadingMessage = document.createElement('div');
        loadingMessage.className = 'loading-message';
        loadingMessage.textContent = '북마크 로드 중...';
        
        const container = bookmarkBar.querySelector('.bookmark-container');
        if (container) {
          container.innerHTML = '';
          container.appendChild(loadingMessage);
        } else {
          const newContainer = document.createElement('div');
          newContainer.className = 'bookmark-container';
          newContainer.appendChild(loadingMessage);
          bookmarkBar.appendChild(newContainer);
        }
      }
      */
    }

    // 로딩 메시지 숨기기 함수
    function hideLoadingMessage() {
      isLoadingBookmarks = false;
      
      const container = document.getElementById('bookmark-container');
      if (!container) return;
      
      const loadingMessage = container.querySelector('.bookmark-loading-message');
      if (loadingMessage) {
        loadingMessage.style.display = 'none';
      }
    }

    // 북마크 로드 함수
    function loadBookmarks() {
      try {
        console.log('북마크 로드 시작');
        
        // 이미 로딩 중인 경우 중복 로드 방지
        if (isLoadingBookmarks) {
          console.log('이미 북마크를 로드 중입니다');
          return Promise.resolve([]); // 빈 배열 반환
        }
        
        isLoadingBookmarks = true;
        
        // 로컬 스토리지에서 캐시된 북마크 데이터 확인
        const cachedData = localStorage.getItem('bookmarkCache');
        const cacheTimestamp = localStorage.getItem('bookmarkCacheTimestamp');
        
        if (cachedData && cacheTimestamp) {
          try {
            const cacheAge = (Date.now() - parseInt(cacheTimestamp)) / (1000 * 60); // 분 단위
            console.log(`캐시된 북마크 데이터 사용 (캐시 기간: ${Math.floor(cacheAge)}분)`);
            
            const bookmarks = JSON.parse(cachedData);
            displayBookmarks(bookmarks);
            
            // 캐시가 5분 이상 지난 경우에만 백그라운드에서 새로운 데이터 가져오기 시도
            if (cacheAge > 5) {
              console.log('캐시가 오래되어 백그라운드에서 최신 데이터를 가져옵니다');
              fetchFreshBookmarks().catch(error => {
                console.error('백그라운드에서 북마크 가져오기 실패:', error);
                // 오류가 발생해도 캐시된 데이터를 이미 표시했으므로 사용자 경험에 영향 없음
              });
            }
            
            isLoadingBookmarks = false;
            return Promise.resolve(bookmarks);
          } catch (error) {
            console.error('캐시된 북마크 데이터 파싱 오류:', error);
            // 파싱 오류 시 계속 진행하여 백그라운드에서 가져오기 시도
          }
        }
        
        // 백그라운드에서 북마크 가져오기
        return fetchFreshBookmarks()
          .then(bookmarks => {
            isLoadingBookmarks = false;
            return bookmarks;
          })
          .catch(error => {
            console.error('북마크 가져오기 실패:', error);
            
            // Extension context invalidated 오류 처리
            if (error && error.message && error.message.includes('Extension context invalidated')) {
              console.log('확장 프로그램 컨텍스트가 무효화되었습니다. 빈 북마크 목록 표시');
              
              // 빈 북마크 목록 표시
              displayBookmarks([]);
            }
            
            isLoadingBookmarks = false;
            return []; // 오류 발생 시 빈 배열 반환
          });
      } catch (error) {
        console.error('북마크 로드 함수 실행 중 오류:', error);
        isLoadingBookmarks = false;
        return Promise.resolve([]); // 오류 발생 시 빈 배열 반환
      }
    }

    // 최신 북마크 데이터 가져오기 (Promise 반환)
    function fetchFreshBookmarksPromise() {
      return new Promise((resolve, reject) => {
        try {
          chrome.runtime.sendMessage({ action: 'getBookmarks' }, function(response) {
            if (chrome.runtime.lastError) {
              console.error('북마크 가져오기 오류:', chrome.runtime.lastError);
              
              // Extension context invalidated 오류 처리
              if (chrome.runtime.lastError.message && chrome.runtime.lastError.message.includes('Extension context invalidated')) {
                console.log('확장 프로그램 컨텍스트가 무효화되었습니다. 오프라인 모드로 전환');
                window.BookStaxx.offlineMode = true;
                reject(new Error('Extension context invalidated'));
                return;
              }
              
              checkBackgroundConnection();
              hideLoadingMessage();
              reject(chrome.runtime.lastError);
              return;
            }
            
            if (response && response.bookmarks) {
              // 북마크 데이터 로컬 스토리지에 저장
              try {
                localStorage.setItem('bookmarkCache', JSON.stringify(response.bookmarks));
                localStorage.setItem('bookmarkCacheTimestamp', Date.now().toString());
                console.log('북마크 데이터가 캐시에 저장됨', response.bookmarks.length + '개');
              } catch (storageError) {
                console.error('북마크 데이터 로컬 스토리지 저장 실패:', storageError);
              }
              
              // 북마크 데이터 chrome.storage에도 저장 (가능한 경우)
              try {
                chrome.storage.local.set({
                  'cachedBookmarks': response.bookmarks,
                  'bookmarkCacheTime': Date.now()
                });
              } catch (chromeStorageError) {
                console.error('북마크 데이터 chrome.storage 저장 실패:', chromeStorageError);
              }
              
              // 북마크 표시 (기존 북마크가 이미 표시되어 있을 수 있음)
              displayBookmarks(response.bookmarks);
              hideLoadingMessage();
              resolve(response.bookmarks);
            } else {
              console.error('북마크 데이터를 가져올 수 없음');
              hideLoadingMessage();
              reject(new Error('북마크 데이터를 가져올 수 없음'));
            }
          });
        } catch (error) {
          console.error('북마크 가져오기 중 예외 발생:', error);
          hideLoadingMessage();
          reject(error);
        }
      });
    }

    // 기존 fetchFreshBookmarks 함수 (하위 호환성 유지)
    function fetchFreshBookmarks() {
      return fetchFreshBookmarksPromise().catch(error => {
        console.error('북마크 가져오기 실패:', error);
        return Promise.reject(error); // 오류를 다시 전파
      });
    }

    // 북마크 표시 함수
    function displayBookmarks(bookmarks) {
      try {
        if (isLoadingBookmarks) {
          console.log('북마크 로딩 중입니다. 중복 로드 방지');
          return;
        }
        
        isLoadingBookmarks = true;
        console.log('북마크 표시 시작');
        
        const container = document.getElementById('bookmark-container');
        if (!container) {
          console.error('북마크 컨테이너를 찾을 수 없습니다');
          isLoadingBookmarks = false;
          return;
        }
        
        // 기존 북마크 제거
        container.innerHTML = '';
        
        // 설정 가져오기
        const showText = settings.bookmarkBar && settings.bookmarkBar.showText !== undefined ? 
                        settings.bookmarkBar.showText : true;
        const textMaxLength = settings.bookmarkBar && settings.bookmarkBar.textMaxLength !== undefined ? 
                            settings.bookmarkBar.textMaxLength : 0;
        
        // 북마크 렌더링 함수
        const renderAllItems = () => {
          // 북마크 항목 생성
          bookmarks.forEach(bookmark => {
            const item = document.createElement('div');
            item.className = 'bookmark-item';
            item.setAttribute('data-url', bookmark.url);
            item.setAttribute('data-id', bookmark.id);
            item.setAttribute('draggable', 'true');
            
            // 아이콘 요소 생성
            const icon = document.createElement('div');
            icon.className = 'bookmark-icon';
            item.appendChild(icon);
            
            // 텍스트 요소 생성
            if (showText) {
              const text = document.createElement('div');
              text.className = 'bookmark-text';
              
              // 텍스트 길이 제한 적용
              if (textMaxLength > 0 && bookmark.title.length > textMaxLength) {
                text.textContent = bookmark.title.substring(0, textMaxLength) + '...';
                text.setAttribute('title', bookmark.title); // 툴팁으로 전체 제목 표시
              } else {
                text.textContent = bookmark.title;
              }
              
              item.appendChild(text);
            }
            
            // 클릭 이벤트 추가
            item.addEventListener('click', (event) => {
              if (event.target.closest('.bookmark-context-menu')) {
                return; // 컨텍스트 메뉴 클릭은 무시
              }
              
              // 새 탭에서 열기 (Ctrl 키 또는 중간 버튼 클릭)
              if (event.ctrlKey || event.metaKey || event.button === 1) {
                chrome.runtime.sendMessage({
                  action: 'openBookmark',
                  url: bookmark.url,
                  newTab: true
                });
              } else {
                // 현재 탭에서 열기
                chrome.runtime.sendMessage({
                  action: 'openBookmark',
                  url: bookmark.url,
                  newTab: false
                });
              }
            });
            
            // 컨텍스트 메뉴 이벤트 추가
            item.addEventListener('contextmenu', (event) => {
              event.preventDefault();
              showBookmarkContextMenu(event, bookmark);
            });
            
            // 드래그 기능 추가
            addDragFunctionality(item);
            
            // 아이콘 설정
            setBookmarkIcon(icon, bookmark.url);
            
            // 컨테이너에 추가
            container.appendChild(item);
          });
          
          // 스크롤 기능 추가
          const isVertical = settings.bookmarkBar && settings.bookmarkBar.position === 'left' || 
                           settings.bookmarkBar && settings.bookmarkBar.position === 'right';
          addScrollFunctionality(isVertical);
          
          // 로딩 상태 업데이트
          isLoadingBookmarks = false;
          console.log('북마크 표시 완료');
        };
        
        // 북마크 렌더링 실행
        renderAllItems();
      } catch (error) {
        console.error('북마크 표시 중 오류 발생:', error);
        isLoadingBookmarks = false;
      }
    }

    // 드래그 기능 추가 함수
    function addDragFunctionality(item) {
      // 드래그 시작 이벤트
      item.setAttribute('draggable', 'true');
      
      item.addEventListener('dragstart', (event) => {
        // 드래그 데이터 설정
        const bookmarkId = item.getAttribute('data-id');
        const bookmarkUrl = item.getAttribute('data-url');
        
        event.dataTransfer.setData('text/plain', bookmarkUrl);
        event.dataTransfer.setData('application/x-bookmark', JSON.stringify({
          id: bookmarkId,
          url: bookmarkUrl
        }));
        
        // 드래그 효과 설정
        event.dataTransfer.effectAllowed = 'move';
        
        // 드래그 중인 항목 스타일 변경
        item.style.opacity = '0.5';
      });
      
      // 드래그 종료 이벤트
      item.addEventListener('dragend', () => {
        // 스타일 복원
        item.style.opacity = '1';
      });
      
      // 드래그 오버 이벤트
      item.addEventListener('dragover', (event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        
        // 드래그 오버 스타일 적용
        item.style.backgroundColor = 'rgba(0, 0, 0, 0.1)';
        
        // 다크 모드인 경우 스타일 조정
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
          item.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
        }
      });
      
      // 드래그 떠남 이벤트
      item.addEventListener('dragleave', () => {
        // 스타일 복원
        item.style.backgroundColor = 'transparent';
      });
      
      // 드롭 이벤트
      item.addEventListener('drop', (event) => {
        event.preventDefault();
        
        // 스타일 복원
        item.style.backgroundColor = 'transparent';
        
        // 드롭된 북마크 데이터 가져오기
        const bookmarkData = event.dataTransfer.getData('application/x-bookmark');
        if (!bookmarkData) return;
        
        try {
          const draggedBookmark = JSON.parse(bookmarkData);
          const targetBookmarkId = item.getAttribute('data-id');
          
          // 같은 항목이면 무시
          if (draggedBookmark.id === targetBookmarkId) return;
          
          // 북마크 순서 변경 메시지 전송
          chrome.runtime.sendMessage({
            action: 'moveBookmark',
            bookmarkId: draggedBookmark.id,
            targetId: targetBookmarkId
          }, (response) => {
            if (response && response.success) {
              console.log('북마크 순서 변경 성공');
              // 북마크 다시 로드
              loadBookmarks();
            } else {
              console.error('북마크 순서 변경 실패:', response ? response.error : '알 수 없는 오류');
            }
          });
        } catch (error) {
          console.error('드롭 이벤트 처리 중 오류 발생:', error);
        }
      });
    }

    // 북마크 바 업데이트 함수
    function updateBookmarkBar() {
      console.log('북마크 바 업데이트 시작');
      
      // 북마크 바 요소 찾기
      const bookmarkBar = document.getElementById('bookmark-bar');
      if (!bookmarkBar) {
        console.log('북마크 바가 없어 새로 생성합니다');
        initBookmarkBar();
        return;
      }
      
      // 설정에 따라 북마크 바 스타일 업데이트
      applyBookmarkBarStyles(bookmarkBar);
      
      // 북마크 다시 로드
      loadBookmarks();
      
      console.log('북마크 바 업데이트 완료');
    }
    
    // 북마크 바 스타일 적용 함수
    function applyBookmarkBarStyles(bookmarkBar) {
      try {
        if (!bookmarkBar) {
          console.error('북마크 바 요소가 없어 스타일을 적용할 수 없습니다');
          return;
        }
        
        // 기본 스타일 설정
        bookmarkBar.style.position = 'fixed';
        bookmarkBar.style.zIndex = '2147483647'; // 최대 z-index 값
        bookmarkBar.style.display = 'flex';
        bookmarkBar.style.alignItems = 'center';
        bookmarkBar.style.justifyContent = 'flex-start';
        bookmarkBar.style.padding = '0 8px';
        bookmarkBar.style.boxSizing = 'border-box';
        bookmarkBar.style.transition = 'all 0.3s cubic-bezier(0.25, 0.1, 0.25, 1)';
        bookmarkBar.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
        bookmarkBar.style.visibility = 'visible';
        bookmarkBar.style.opacity = '1';
        
        // 설정에서 스타일 가져오기
        const barSettings = settings.bookmarkBar || {};
        
        // 위치 설정 초기화
        bookmarkBar.style.top = 'auto';
        bookmarkBar.style.right = 'auto';
        bookmarkBar.style.bottom = 'auto';
        bookmarkBar.style.left = 'auto';
        bookmarkBar.style.width = 'auto';
        bookmarkBar.style.height = 'auto';
        bookmarkBar.style.flexDirection = 'row';
        
        // 위치 설정
        const position = barSettings.position || 'top';
        
        switch (position) {
          case 'top':
            bookmarkBar.style.top = '0';
            bookmarkBar.style.left = '0';
            bookmarkBar.style.width = '100%';
            bookmarkBar.style.height = 'auto';
            bookmarkBar.style.minHeight = '28px';
            break;
            
          case 'right':
            bookmarkBar.style.top = '0';
            bookmarkBar.style.right = '0';
            bookmarkBar.style.height = '100%';
            bookmarkBar.style.width = 'auto';
            bookmarkBar.style.minWidth = '28px';
            bookmarkBar.style.flexDirection = 'column';
            break;
            
          case 'bottom':
            bookmarkBar.style.bottom = '0';
            bookmarkBar.style.left = '0';
            bookmarkBar.style.width = '100%';
            bookmarkBar.style.height = 'auto';
            bookmarkBar.style.minHeight = '28px';
            break;
            
          case 'left':
            bookmarkBar.style.top = '0';
            bookmarkBar.style.left = '0';
            bookmarkBar.style.height = '100%';
            bookmarkBar.style.width = 'auto';
            bookmarkBar.style.minWidth = '28px';
            bookmarkBar.style.flexDirection = 'column';
            break;
            
          case 'topRight':
            bookmarkBar.style.top = '0';
            bookmarkBar.style.right = '0';
            bookmarkBar.style.width = '50%';
            bookmarkBar.style.height = 'auto';
            bookmarkBar.style.minHeight = '28px';
            break;
            
          case 'topLeft':
            bookmarkBar.style.top = '0';
            bookmarkBar.style.left = '0';
            bookmarkBar.style.width = '50%';
            bookmarkBar.style.height = 'auto';
            bookmarkBar.style.minHeight = '28px';
            break;
            
          case 'bottomRight':
            bookmarkBar.style.bottom = '0';
            bookmarkBar.style.right = '0';
            bookmarkBar.style.width = '50%';
            bookmarkBar.style.height = 'auto';
            bookmarkBar.style.minHeight = '28px';
            break;
            
          case 'bottomLeft':
            bookmarkBar.style.bottom = '0';
            bookmarkBar.style.left = '0';
            bookmarkBar.style.width = '50%';
            bookmarkBar.style.height = 'auto';
            bookmarkBar.style.minHeight = '28px';
            break;
        }
        
        // 크롬 UI 스타일 사용 여부
        const useChromeStyle = barSettings.useChromeStyle !== undefined ? barSettings.useChromeStyle : true;
        
        if (useChromeStyle) {
          // 크롬 스타일 적용
          bookmarkBar.style.backgroundColor = '#f1f3f4';
          bookmarkBar.style.borderBottom = '1px solid rgba(0, 0, 0, 0.1)';
          bookmarkBar.style.boxShadow = 'none';
          
          // 다크 모드 감지 및 적용
          if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            bookmarkBar.style.backgroundColor = '#292a2d';
            bookmarkBar.style.borderBottom = '1px solid rgba(255, 255, 255, 0.1)';
            bookmarkBar.style.color = '#e8eaed';
          } else {
            bookmarkBar.style.color = '#202124';
          }
          
          // 북마크 컨테이너 스타일 설정
          const container = bookmarkBar.querySelector('.bookmark-container');
          if (container) {
            container.style.display = 'flex';
            container.style.alignItems = 'center';
            container.style.overflow = 'auto';
            container.style.width = '100%';
            container.style.height = '100%';
            container.style.padding = '4px 0';
            
            // 스크롤바 숨기기
            container.style.scrollbarWidth = 'none'; // Firefox
            container.style.msOverflowStyle = 'none'; // IE/Edge
            container.style.webkitOverflowScrolling = 'touch'; // iOS 모멘텀 스크롤
            
            // 스크롤바 숨기기 (WebKit)
            const styleSheet = document.createElement('style');
            styleSheet.textContent = `
              #bookmark-container::-webkit-scrollbar {
                display: none;
              }
            `;
            document.head.appendChild(styleSheet);
          }
        } else {
          // 사용자 정의 스타일 적용
          const backgroundColor = barSettings.backgroundColor || '#f1f3f4';
          const textColor = barSettings.textColor || '#333333';
          const opacity = barSettings.opacity !== undefined ? barSettings.opacity / 100 : 1;
          
          bookmarkBar.style.backgroundColor = convertToRGBA(backgroundColor, opacity);
          bookmarkBar.style.color = textColor;
          bookmarkBar.style.backdropFilter = 'blur(5px)';
          bookmarkBar.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.12)';
          bookmarkBar.style.borderBottom = '1px solid rgba(0, 0, 0, 0.1)';
          
          // 다크 모드 감지 및 적용
          if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            bookmarkBar.style.borderBottom = '1px solid rgba(255, 255, 255, 0.1)';
          }
          
          // 북마크 컨테이너 스타일 설정
          const container = bookmarkBar.querySelector('.bookmark-container');
          if (container) {
            container.style.display = 'flex';
            container.style.alignItems = 'center';
            container.style.overflow = 'auto';
            container.style.width = '100%';
            container.style.height = '100%';
            container.style.padding = '4px 0';
          }
        }
      } catch (error) {
        console.error('북마크 바 스타일 적용 중 오류 발생:', error);
        
        // 오류 발생 시 기본 스타일 적용
        try {
          if (bookmarkBar) {
            bookmarkBar.style.position = 'fixed';
            bookmarkBar.style.top = '0';
            bookmarkBar.style.left = '0';
            bookmarkBar.style.width = '100%';
            bookmarkBar.style.height = '28px';
            bookmarkBar.style.backgroundColor = '#f1f3f4';
            bookmarkBar.style.zIndex = '2147483647';
            bookmarkBar.style.display = 'flex';
            bookmarkBar.style.alignItems = 'center';
            bookmarkBar.style.padding = '0 8px';
            bookmarkBar.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
            bookmarkBar.style.visibility = 'visible';
            bookmarkBar.style.opacity = '1';
            
            // 다크 모드 감지 및 적용
            if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
              bookmarkBar.style.backgroundColor = '#292a2d';
              bookmarkBar.style.color = '#e8eaed';
            }
          }
        } catch (fallbackError) {
          console.error('기본 스타일 적용 중 오류 발생:', fallbackError);
        }
      }
    }

    // 색상을 RGBA로 변환하는 함수
    function convertToRGBA(color, opacity) {
      // 이미 rgba 형식인 경우
      if (color.startsWith('rgba(')) {
        return color;
      }
      
      // rgb 형식인 경우
      if (color.startsWith('rgb(')) {
        const rgb = color.match(/\d+/g);
        return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${opacity})`;
      }
      
      // hex 형식인 경우
      if (color.startsWith('#')) {
        let hex = color.substring(1);
        
        // 3자리 hex를 6자리로 변환
        if (hex.length === 3) {
          hex = hex.split('').map(h => h + h).join('');
        }
        
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        
        return `rgba(${r}, ${g}, ${b}, ${opacity})`;
      }
      
      // 기본값 반환
      return `rgba(241, 243, 244, ${opacity})`;
    }

    // body 패딩 조정 함수
    function adjustBodyPadding() {
      try {
        // 북마크 바 요소 찾기
        const bookmarkBar = document.getElementById('bookmark-bar');
        if (!bookmarkBar) {
          console.log('북마크 바가 없어 body 패딩을 조정할 수 없습니다');
          return;
        }
        
        // 북마크 바가 표시되지 않는 경우 패딩 제거
        if (bookmarkBar.style.display === 'none' || bookmarkBar.style.visibility === 'hidden') {
          document.body.style.paddingTop = '';
          document.body.style.paddingRight = '';
          document.body.style.paddingBottom = '';
          document.body.style.paddingLeft = '';
          return;
        }
        
        // 북마크 바 높이 계산
        const barHeight = bookmarkBar.offsetHeight;
        const barWidth = bookmarkBar.offsetWidth;
        
        // 설정에서 위치 가져오기
        const barSettings = settings.bookmarkBar || {};
        const position = barSettings.position || 'top';
        
        // 기존 패딩 초기화
        document.body.style.paddingTop = '';
        document.body.style.paddingRight = '';
        document.body.style.paddingBottom = '';
        document.body.style.paddingLeft = '';
        
        // 위치에 따라 패딩 조정
        switch (position) {
          case 'top':
            document.body.style.paddingTop = `${barHeight}px`;
            break;
            
          case 'right':
            document.body.style.paddingRight = `${barWidth}px`;
            break;
            
          case 'bottom':
            document.body.style.paddingBottom = `${barHeight}px`;
            break;
            
          case 'left':
            document.body.style.paddingLeft = `${barWidth}px`;
            break;
            
          // 코너 위치의 경우 패딩을 적용하지 않음
          case 'topRight':
          case 'topLeft':
          case 'bottomRight':
          case 'bottomLeft':
            // 코너 위치는 패딩을 적용하지 않음
            break;
        }
        
        console.log(`body 패딩 조정 완료 (위치: ${position}, 높이: ${barHeight}px, 너비: ${barWidth}px)`);
      } catch (error) {
        console.error('body 패딩 조정 중 오류 발생:', error);
      }
    }

    // 문자열에서 일관된 색상 생성 (파비콘에 사용)
    function getColorFromString(str) {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
      }
      
      // 밝은 색상만 사용하기 위해 조정
      const hue = Math.abs(hash) % 360;
      const saturation = 65 + (Math.abs(hash) % 20); // 65% ~ 85%
      const lightness = 45 + (Math.abs(hash) % 10);  // 45% ~ 55%
      
      return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
    }

    // 북마크바 스크롤 기능 추가
    function addScrollFunctionality(isVertical) {
      const container = document.getElementById('bookmark-container');
      if (!container) return;
      
      // 기존 스크롤 버튼 제거
      const existingButtons = document.querySelectorAll('.bookmark-scroll-button');
      existingButtons.forEach(button => button.remove());
      
      // 스크롤 필요한지 확인
      const needsScroll = isVertical 
        ? container.scrollHeight > container.clientHeight
        : container.scrollWidth > container.clientWidth;
      
      if (!needsScroll) return;
      
      // 스크롤 버튼 생성
      if (isVertical) {
        // 위로 스크롤 버튼
        const upButton = createScrollButton('up');
        container.parentNode.appendChild(upButton);
        
        // 아래로 스크롤 버튼
        const downButton = createScrollButton('down');
        container.parentNode.appendChild(downButton);
        
        // 스크롤 위치에 따른 버튼 표시 업데이트
        updateScrollButtonsVisibility(container, upButton, downButton, true);
        
        // 스크롤 이벤트 리스너
        container.addEventListener('scroll', () => {
          updateScrollButtonsVisibility(container, upButton, downButton, true);
        });
        
        // 마우스 위치에 따른 자동 스크롤 영역 생성
        const topScrollZone = document.createElement('div');
        topScrollZone.className = 'bookmark-scroll-zone bookmark-scroll-zone-top';
        topScrollZone.style.position = 'absolute';
        topScrollZone.style.top = '0';
        topScrollZone.style.left = '0';
        topScrollZone.style.width = '100%';
        topScrollZone.style.height = '30px';
        topScrollZone.style.zIndex = '2147483646';
        container.parentNode.appendChild(topScrollZone);
        
        const bottomScrollZone = document.createElement('div');
        bottomScrollZone.className = 'bookmark-scroll-zone bookmark-scroll-zone-bottom';
        bottomScrollZone.style.position = 'absolute';
        bottomScrollZone.style.bottom = '0';
        bottomScrollZone.style.left = '0';
        bottomScrollZone.style.width = '100%';
        bottomScrollZone.style.height = '30px';
        bottomScrollZone.style.zIndex = '2147483646';
        container.parentNode.appendChild(bottomScrollZone);
        
        // 자동 스크롤 이벤트
        let scrollInterval;
        
        topScrollZone.addEventListener('mouseenter', () => {
          scrollInterval = setInterval(() => {
            container.scrollTop -= 5;
          }, 16);
        });
        
        topScrollZone.addEventListener('mouseleave', () => {
          clearInterval(scrollInterval);
        });
        
        bottomScrollZone.addEventListener('mouseenter', () => {
          scrollInterval = setInterval(() => {
            container.scrollTop += 5;
          }, 16);
        });
        
        bottomScrollZone.addEventListener('mouseleave', () => {
          clearInterval(scrollInterval);
        });
      } else {
        // 좌측 스크롤 버튼
        const leftButton = createScrollButton('left');
        container.parentNode.appendChild(leftButton);
        
        // 우측 스크롤 버튼
        const rightButton = createScrollButton('right');
        container.parentNode.appendChild(rightButton);
        
        // 스크롤 위치에 따른 버튼 표시 업데이트
        updateScrollButtonsVisibility(container, leftButton, rightButton, false);
        
        // 스크롤 이벤트 리스너
        container.addEventListener('scroll', () => {
          updateScrollButtonsVisibility(container, leftButton, rightButton, false);
        });
        
        // 마우스 위치에 따른 자동 스크롤 영역 생성
        const leftScrollZone = document.createElement('div');
        leftScrollZone.className = 'bookmark-scroll-zone bookmark-scroll-zone-left';
        leftScrollZone.style.position = 'absolute';
        leftScrollZone.style.top = '0';
        leftScrollZone.style.left = '0';
        leftScrollZone.style.width = '30px';
        leftScrollZone.style.height = '100%';
        leftScrollZone.style.zIndex = '2147483646';
        container.parentNode.appendChild(leftScrollZone);
        
        const rightScrollZone = document.createElement('div');
        rightScrollZone.className = 'bookmark-scroll-zone bookmark-scroll-zone-right';
        rightScrollZone.style.position = 'absolute';
        rightScrollZone.style.top = '0';
        rightScrollZone.style.right = '0';
        rightScrollZone.style.width = '30px';
        rightScrollZone.style.height = '100%';
        rightScrollZone.style.zIndex = '2147483646';
        container.parentNode.appendChild(rightScrollZone);
        
        // 자동 스크롤 이벤트
        let scrollInterval;
        
        leftScrollZone.addEventListener('mouseenter', () => {
          scrollInterval = setInterval(() => {
            container.scrollLeft -= 5;
          }, 16);
        });
        
        leftScrollZone.addEventListener('mouseleave', () => {
          clearInterval(scrollInterval);
        });
        
        rightScrollZone.addEventListener('mouseenter', () => {
          scrollInterval = setInterval(() => {
            container.scrollLeft += 5;
          }, 16);
        });
        
        rightScrollZone.addEventListener('mouseleave', () => {
          clearInterval(scrollInterval);
        });
      }
    }

    // 스크롤 버튼 생성
    function createScrollButton(direction) {
      const button = document.createElement('div');
      button.className = `bookmark-scroll-button bookmark-scroll-${direction}`;
      
      // 화살표 아이콘
      const arrow = document.createElement('div');
      arrow.className = 'bookmark-scroll-arrow';
      button.appendChild(arrow);
      
      // 클릭 이벤트
      button.addEventListener('click', () => {
        const container = document.getElementById('bookmark-container');
        if (!container) return;
        
        const isVertical = direction === 'up' || direction === 'down';
        const scrollAmount = isVertical ? container.clientHeight / 2 : container.clientWidth / 2;
        
        if (direction === 'up') {
          container.scrollTop -= scrollAmount;
        } else if (direction === 'down') {
          container.scrollTop += scrollAmount;
        } else if (direction === 'left') {
          container.scrollLeft -= scrollAmount;
        } else if (direction === 'right') {
          container.scrollLeft += scrollAmount;
        }
      });
      
      // 마우스 오버 시 계속 스크롤
      let scrollInterval;
      
      button.addEventListener('mouseenter', () => {
        const container = document.getElementById('bookmark-container');
        if (!container) return;
        
        const isVertical = direction === 'up' || direction === 'down';
        const scrollAmount = isVertical ? 20 : 20;
        
        scrollInterval = setInterval(() => {
          if (direction === 'up') {
            container.scrollTop -= scrollAmount;
          } else if (direction === 'down') {
            container.scrollTop += scrollAmount;
          } else if (direction === 'left') {
            container.scrollLeft -= scrollAmount;
          } else if (direction === 'right') {
            container.scrollLeft += scrollAmount;
          }
          
          // 버튼 표시 상태 업데이트
          const otherButton = document.querySelector(`.bookmark-scroll-${direction === 'up' ? 'down' : direction === 'down' ? 'up' : direction === 'left' ? 'right' : 'left'}`);
          updateScrollButtonsVisibility(container, direction === 'up' || direction === 'left' ? button : otherButton, direction === 'down' || direction === 'right' ? button : otherButton, isVertical);
        }, 50);
      });
      
      button.addEventListener('mouseleave', () => {
        clearInterval(scrollInterval);
      });
      
      return button;
    }

    // 스크롤 버튼 표시 업데이트
    function updateScrollButtonsVisibility(container, startButton, endButton, isVertical) {
      if (isVertical) {
        // 세로 스크롤
        startButton.style.display = container.scrollTop > 5 ? 'flex' : 'none';
        endButton.style.display = (container.scrollHeight - container.scrollTop - container.clientHeight) > 5 ? 'flex' : 'none';
      } else {
        // 가로 스크롤
        startButton.style.display = container.scrollLeft > 5 ? 'flex' : 'none';
        endButton.style.display = (container.scrollWidth - container.scrollLeft - container.clientWidth) > 5 ? 'flex' : 'none';
      }
    }

    // 북마크 컨텍스트 메뉴 표시 함수
    function showBookmarkContextMenu(event, bookmark) {
      // 기존 컨텍스트 메뉴 제거
      removeExistingContextMenu();
      
      // 새 컨텍스트 메뉴 생성
      const contextMenu = document.createElement('div');
      contextMenu.id = 'bookmark-context-menu';
      contextMenu.className = 'bookmark-context-menu';
      contextMenu.style.position = 'fixed';
      contextMenu.style.zIndex = '2147483648';
      contextMenu.style.backgroundColor = '#fff';
      contextMenu.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.2)';
      contextMenu.style.borderRadius = '4px';
      contextMenu.style.padding = '8px 0';
      contextMenu.style.minWidth = '150px';
      
      // 메뉴 위치 설정
      contextMenu.style.left = `${event.clientX}px`;
      contextMenu.style.top = `${event.clientY}px`;
      
      // 메뉴 항목: 편집
      const editItem = createMenuItem(getMessage('edit'), () => {
        editBookmark(bookmark);
      });
      
      // 메뉴 항목: 삭제
      const deleteItem = createMenuItem(getMessage('delete'), () => {
        if (confirm(`"${bookmark.title}" ${getMessage('deleteConfirmation')}`)) {
          removeBookmark(bookmark);
        }
      });
      
      // 메뉴에 항목 추가
      contextMenu.appendChild(editItem);
      contextMenu.appendChild(deleteItem);
      
      // body에 컨텍스트 메뉴 추가
      document.body.appendChild(contextMenu);
      
      // 다른 곳 클릭 시 메뉴 닫기
      setTimeout(() => {
        document.addEventListener('click', removeExistingContextMenu);
      }, 0);
      
      // 화면 벗어날 경우 위치 조정
      adjustContextMenuPosition(contextMenu);
    }

    // 컨텍스트 메뉴 항목 생성 함수
    function createMenuItem(text, onClick) {
      const menuItem = document.createElement('div');
      menuItem.className = 'bookmark-context-menu-item';
      menuItem.textContent = text;
      menuItem.style.padding = '8px 16px';
      menuItem.style.cursor = 'pointer';
      menuItem.style.transition = 'background-color 0.2s';
      
      menuItem.addEventListener('mouseenter', () => {
        menuItem.style.backgroundColor = '#f5f5f5';
      });
      
      menuItem.addEventListener('mouseleave', () => {
        menuItem.style.backgroundColor = 'transparent';
      });
      
      menuItem.addEventListener('click', onClick);
      
      return menuItem;
    }

    // 기존 컨텍스트 메뉴 제거 함수
    function removeExistingContextMenu() {
      const existingMenu = document.getElementById('bookmark-context-menu');
      if (existingMenu) {
        existingMenu.remove();
        document.removeEventListener('click', removeExistingContextMenu);
      }
    }

    // 컨텍스트 메뉴 위치 조정 함수
    function adjustContextMenuPosition(menuElement) {
      setTimeout(() => {
        const rect = menuElement.getBoundingClientRect();
        
        // 화면 우측을 벗어나는 경우
        if (rect.right > window.innerWidth) {
          menuElement.style.left = `${window.innerWidth - rect.width - 5}px`;
        }
        
        // 화면 하단을 벗어나는 경우
        if (rect.bottom > window.innerHeight) {
          menuElement.style.top = `${window.innerHeight - rect.height - 5}px`;
        }
      }, 0);
    }

    // 북마크바 DOM 감시 설정
    function setupBookmarkBarObserver() {
      // 이미 설정된 경우 중복 설정 방지
      if (window.bookmarkBarObserverSetup) {
        return;
      }
      window.bookmarkBarObserverSetup = true;
      
      // 북마크바 유지 설정이 활성화된 경우에만 감시
      if (!window.BookStaxx.persistBookmarkBar) {
        return;
      }
      
      try {
        // document.body가 없는 경우 처리
        if (!document.body) {
          console.log('document.body가 없습니다. DOM이 로드될 때까지 대기합니다.');
          
          const setupObserverWhenReady = () => {
            if (document.body) {
              console.log('DOM이 로드되었습니다. 북마크바 감시를 설정합니다.');
              setupBookmarkBarObserver();
              document.removeEventListener('DOMContentLoaded', setupObserverWhenReady);
              window.removeEventListener('load', setupObserverWhenReady);
            }
          };
          
          document.addEventListener('DOMContentLoaded', setupObserverWhenReady);
          window.addEventListener('load', setupObserverWhenReady);
          return;
        }
        
        // MutationObserver 설정
        const observer = new MutationObserver((mutations) => {
          // 북마크바 유지 설정이 비활성화된 경우 감시 중단
          if (!window.BookStaxx.persistBookmarkBar) {
            observer.disconnect();
            window.bookmarkBarObserverSetup = false;
            return;
          }
          
          // 북마크바가 이미 생성되어 있는 경우에만 처리
          if (!window.BookStaxx.bookmarkBarCreated) {
            return;
          }
          
          // 북마크바 요소 확인
          const bookmarkBar = document.getElementById('bookmark-bar');
          
          // 북마크바가 DOM에서 제거된 경우 다시 추가
          if (!bookmarkBar || !document.body.contains(bookmarkBar)) {
            console.log('북마크바가 DOM에서 제거되었습니다. 다시 추가합니다.');
            
            // 설정을 로드하고 북마크바 다시 생성
            loadSettings().then(() => {
              const newBookmarkBar = createBookmarkBar();
              
              // 문서에 북마크 바 추가
              if (document.body) {
                // 북마크 바를 body의 첫 번째 자식으로 추가
                if (document.body.firstChild) {
                  document.body.insertBefore(newBookmarkBar, document.body.firstChild);
                } else {
                  document.body.appendChild(newBookmarkBar);
                }
                
                // 북마크 바 스타일 적용
                applyBookmarkBarStyles(newBookmarkBar);
                
                // 북마크 로드
                loadBookmarks();
                
                // 바디 패딩 조정
                adjustBodyPadding();
              }
            }).catch(err => {
              console.error('북마크바 재생성 중 오류 발생:', err);
            });
          }
        });
        
        // 감시 시작 - childList와 subtree 모두 true로 설정하여 더 깊은 DOM 변경도 감지
        observer.observe(document.body, {
          childList: true,
          subtree: true,
          attributes: false,
          characterData: false
        });
        
        // 추가: 페이지 가시성 변경 감지 (탭 전환 등)
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') {
            // 페이지가 다시 보이게 되면 북마크바 존재 확인
            const bookmarkBar = document.getElementById('bookmark-bar');
            if (!bookmarkBar || !document.body.contains(bookmarkBar)) {
              console.log('페이지 가시성 변경 후 북마크바가 없습니다. 다시 추가합니다.');
              initBookmarkBar();
            }
          }
        });
        
        console.log('북마크바 DOM 감시가 설정되었습니다.');
      } catch (error) {
        console.error('북마크바 DOM 감시 설정 중 오류 발생:', error);
      }
    }

    // 북마크 바 초기화 함수
    function initBookmarkBar() {
      try {
        console.log('북마크 바 초기화 시작');
        
        // 이미 초기화된 경우 중복 초기화 방지
        if (window.BookStaxxInitialized) {
          console.log('북마크 바가 이미 초기화되어 있습니다');
          return;
        }
        
        // 초기화 플래그 설정
        window.BookStaxxInitialized = true;
        
        // DOM이 준비되지 않은 경우 이벤트 리스너 추가
        if (!document.body) {
          console.log('DOM이 아직 준비되지 않았습니다. 이벤트 리스너를 추가합니다.');
          
          const initWhenReady = () => {
            if (document.body) {
              console.log('DOM이 로드되었습니다. 북마크 바를 초기화합니다.');
              initBookmarkBar();
              document.removeEventListener('DOMContentLoaded', initWhenReady);
              window.removeEventListener('load', initWhenReady);
            }
          };
          
          document.addEventListener('DOMContentLoaded', initWhenReady);
          window.addEventListener('load', initWhenReady);
          return;
        }
        
        // 설정 로드
        loadSettings()
          .then(() => {
            // 북마크 바 생성
            createBookmarkBar();
            
            // 북마크 바 DOM 감시 설정
            setupBookmarkBarObserver();
            
            // URL 변경 감지 설정
            setupUrlChangeDetection();
            
            // 북마크 로드
            return loadBookmarks()
              .then(() => {
                console.log('북마크 바 초기화 완료');
              })
              .catch(error => {
                console.error('북마크 로드 중 오류 발생:', error);
                // 북마크 로드 실패해도 초기화는 완료된 것으로 처리
                console.log('북마크 로드 실패했지만 북마크 바 초기화는 완료');
              });
          })
          .catch(error => {
            console.error('북마크 바 초기화 중 오류 발생:', error);
            
            // Extension context invalidated 오류 처리
            if (error && error.message && error.message.includes('Extension context invalidated')) {
              console.log('확장 프로그램 컨텍스트가 무효화되었습니다. 로컬 데이터로 초기화 시도');
              
              try {
                // 기본 설정 사용
                settings = defaultSettings;
                
                // 북마크 바 생성
                createBookmarkBar();
                
                // 북마크 바 DOM 감시 설정
                setupBookmarkBarObserver();
                
                // URL 변경 감지 설정
                setupUrlChangeDetection();
                
                // 로컬 스토리지에서 캐시된 북마크 데이터 확인
                const cachedData = localStorage.getItem('bookmarkCache');
                if (cachedData) {
                  try {
                    const bookmarks = JSON.parse(cachedData);
                    displayBookmarks(bookmarks);
                  } catch (parseError) {
                    console.error('캐시된 북마크 데이터 파싱 오류:', parseError);
                    // 파싱 오류 시 빈 북마크 목록 표시
                    displayBookmarks([]);
                  }
                } else {
                  // 캐시된 데이터가 없는 경우 빈 북마크 목록 표시
                  displayBookmarks([]);
                }
                
                console.log('로컬 데이터로 북마크 바 초기화 완료');
              } catch (fallbackError) {
                console.error('로컬 데이터로 초기화 중 오류 발생:', fallbackError);
                window.BookStaxxInitialized = false; // 초기화 실패 시 플래그 재설정
              }
            } else {
              window.BookStaxxInitialized = false; // 초기화 실패 시 플래그 재설정
            }
          });
      } catch (error) {
        console.error('북마크 바 초기화 함수 실행 중 오류:', error);
        window.BookStaxxInitialized = false; // 초기화 실패 시 플래그 재설정
      }
    }
    
    // URL 변경 감지 설정 함수
    function setupUrlChangeDetection() {
      try {
        // 이미 설정된 경우 중복 설정 방지
        if (window.urlChangeDetectionSetup) {
          return;
        }
        window.urlChangeDetectionSetup = true;
        
        console.log('URL 변경 감지 설정');
        
        // 현재 URL 저장
        let lastUrl = window.location.href;
        
        // URL 변경 처리 함수
        const handleUrlChange = () => {
          try {
            const currentUrl = window.location.href;
            
            // URL이 변경된 경우에만 처리
            if (currentUrl !== lastUrl) {
              console.log('URL 변경 감지:', lastUrl, '->', currentUrl);
              lastUrl = currentUrl;
              
              // 북마크바가 이미 존재하는지 확인
              const existingBar = document.getElementById('bookmark-bar');
              
              // 북마크바가 없거나 오프라인 모드인 경우 북마크바 재생성
              if (!existingBar || window.BookStaxx.offlineMode) {
                console.log('URL 변경 후 북마크바 재생성');
                
                // 약간의 지연 후 북마크바 초기화 (DOM이 업데이트될 시간 제공)
                setTimeout(() => {
                  try {
                    // 초기화 플래그 재설정
                    window.BookStaxxInitialized = false;
                    
                    // 북마크바 초기화
                    initBookmarkBar();
                  } catch (initError) {
                    console.error('URL 변경 후 북마크바 초기화 중 오류 발생:', initError);
                  }
                }, 300);
              } else {
                console.log('URL 변경 후 북마크바가 이미 존재함');
              }
            }
          } catch (error) {
            console.error('URL 변경 처리 중 오류 발생:', error);
          }
        };
        
        // history API 감시
        const originalPushState = history.pushState;
        const originalReplaceState = history.replaceState;
        
        // pushState 오버라이드
        history.pushState = function() {
          originalPushState.apply(this, arguments);
          handleUrlChange();
        };
        
        // replaceState 오버라이드
        history.replaceState = function() {
          originalReplaceState.apply(this, arguments);
          handleUrlChange();
        };
        
        // popstate 이벤트 리스너 추가
        window.addEventListener('popstate', handleUrlChange);
        
        // hashchange 이벤트 리스너 추가
        window.addEventListener('hashchange', handleUrlChange);
        
        // 주기적으로 URL 변경 확인 (SPA에서 history API를 사용하지 않는 경우 대비)
        setInterval(handleUrlChange, 1000);
        
        console.log('URL 변경 감지 설정 완료');
      } catch (error) {
        console.error('URL 변경 감지 설정 중 오류 발생:', error);
        window.urlChangeDetectionSetup = false;
      }
    }

    // 북마크 바 생성 함수
    function createBookmarkBar() {
      try {
        console.log('북마크 바 생성 시작');
        
        // 이미 존재하는 북마크 바 확인
        let bookmarkBar = document.getElementById('bookmark-bar');
        if (bookmarkBar) {
          console.log('북마크 바가 이미 존재합니다. 기존 북마크 바를 사용합니다.');
          return bookmarkBar;
        }
        
        // 북마크 바 생성
        bookmarkBar = document.createElement('div');
        bookmarkBar.id = 'bookmark-bar';
        bookmarkBar.className = 'bookmark-bar';
        
        // 북마크 컨테이너 생성
        const container = document.createElement('div');
        container.id = 'bookmark-container';
        container.className = 'bookmark-container';
        bookmarkBar.appendChild(container);
        
        // 북마크 바를 body에 추가
        if (document.body) {
          // 북마크 바를 body의 첫 번째 자식으로 추가 (z-index 문제 해결)
          if (document.body.firstChild) {
            document.body.insertBefore(bookmarkBar, document.body.firstChild);
          } else {
            document.body.appendChild(bookmarkBar);
          }
          
          // 북마크 바 스타일 적용
          applyBookmarkBarStyles(bookmarkBar);
          
          // body 패딩 조정
          adjustBodyPadding();
          
          // 북마크 바 생성 플래그 설정
          window.BookStaxx.bookmarkBarCreated = true;
          
          console.log('북마크 바 생성 완료');
        } else {
          console.error('document.body가 없어 북마크 바를 추가할 수 없습니다');
        }
        
        return bookmarkBar;
      } catch (error) {
        console.error('북마크 바 생성 중 오류 발생:', error);
        
        // 오류 발생 시 기본 북마크 바 생성 시도
        try {
          const fallbackBar = document.createElement('div');
          fallbackBar.id = 'bookmark-bar';
          fallbackBar.className = 'bookmark-bar';
          fallbackBar.style.position = 'fixed';
          fallbackBar.style.top = '0';
          fallbackBar.style.left = '0';
          fallbackBar.style.width = '100%';
          fallbackBar.style.height = '28px';
          fallbackBar.style.backgroundColor = '#f1f3f4';
          fallbackBar.style.zIndex = '2147483647';
          fallbackBar.style.display = 'flex';
          fallbackBar.style.alignItems = 'center';
          fallbackBar.style.padding = '0 8px';
          fallbackBar.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
          
          const fallbackContainer = document.createElement('div');
          fallbackContainer.id = 'bookmark-container';
          fallbackContainer.className = 'bookmark-container';
          fallbackContainer.style.display = 'flex';
          fallbackContainer.style.alignItems = 'center';
          fallbackContainer.style.overflowX = 'auto';
          fallbackContainer.style.width = '100%';
          fallbackContainer.style.height = '100%';
          
          fallbackBar.appendChild(fallbackContainer);
          
          if (document.body) {
            if (document.body.firstChild) {
              document.body.insertBefore(fallbackBar, document.body.firstChild);
            } else {
              document.body.appendChild(fallbackBar);
            }
            
            window.BookStaxx.bookmarkBarCreated = true;
            console.log('기본 북마크 바 생성 완료 (오류 복구)');
          }
          
          return fallbackBar;
        } catch (fallbackError) {
          console.error('기본 북마크 바 생성 중 오류 발생:', fallbackError);
          return null;
        }
      }
    }

    // 설정 로드 함수
    function loadSettings() {
      try {
        console.log('설정 로드 시작');
        
        // 로컬 스토리지에서 캐시된 설정 확인
        const cachedSettings = localStorage.getItem('bookstaxxSettings');
        if (cachedSettings) {
          try {
            const parsedSettings = JSON.parse(cachedSettings);
            console.log('로컬 스토리지에서 설정 로드:', parsedSettings);
            settings = parsedSettings;
            return Promise.resolve(parsedSettings);
          } catch (parseError) {
            console.error('캐시된 설정 파싱 오류:', parseError);
            // 파싱 오류 시 계속 진행하여 chrome.storage에서 로드 시도
          }
        }
        
        // chrome.storage에서 설정 로드
        return new Promise((resolve, reject) => {
          try {
            chrome.storage.sync.get(null, function(items) {
              if (chrome.runtime.lastError) {
                console.error('설정 로드 중 오류 발생:', chrome.runtime.lastError);
                
                // Extension context invalidated 오류 처리
                if (chrome.runtime.lastError.message.includes('Extension context invalidated')) {
                  console.log('확장 프로그램 컨텍스트가 무효화되었습니다. 기본 설정 사용');
                  
                  // 기본 설정 사용
                  settings = defaultSettings;
                  
                  // 로컬 스토리지에 기본 설정 캐시
                  try {
                    localStorage.setItem('bookstaxxSettings', JSON.stringify(defaultSettings));
                  } catch (storageError) {
                    console.error('로컬 스토리지에 설정 저장 실패:', storageError);
                  }
                  
                  resolve(defaultSettings);
                  return;
                }
                
                reject(chrome.runtime.lastError);
                return;
              }
              
              console.log('설정 로드 완료:', items);
              settings = items;
              
              // 로컬 스토리지에 설정 캐시
              try {
                localStorage.setItem('bookstaxxSettings', JSON.stringify(items));
              } catch (storageError) {
                console.error('로컬 스토리지에 설정 저장 실패:', storageError);
              }
              
              resolve(items);
            });
          } catch (error) {
            console.error('설정 로드 중 예외 발생:', error);
            
            // 오류 발생 시 기본 설정 사용
            settings = defaultSettings;
            
            // 로컬 스토리지에 기본 설정 캐시
            try {
              localStorage.setItem('bookstaxxSettings', JSON.stringify(defaultSettings));
            } catch (storageError) {
              console.error('로컬 스토리지에 설정 저장 실패:', storageError);
            }
            
            resolve(defaultSettings);
          }
        });
      } catch (error) {
        console.error('설정 로드 함수 실행 중 오류:', error);
        return Promise.resolve(defaultSettings);
      }
    }

    // 북마크 아이콘 설정 함수
    function setBookmarkIcon(iconElement, url) {
      if (!iconElement || !url) return;
      
      try {
        // 기본 스타일 설정
        iconElement.style.width = '16px';
        iconElement.style.height = '16px';
        iconElement.style.display = 'inline-block';
        iconElement.style.marginRight = '6px';
        iconElement.style.backgroundSize = 'contain';
        iconElement.style.backgroundPosition = 'center';
        iconElement.style.backgroundRepeat = 'no-repeat';
        iconElement.style.borderRadius = '3px';
        
        // 캐시된 아이콘 URL 확인
        chrome.storage.local.get(['iconCache'], function(result) {
          const iconCache = result.iconCache || {};
          
          // 캐시에 아이콘이 있는 경우
          if (iconCache[url]) {
            const cachedIcon = iconCache[url];
            const img = new Image();
            
            // 이미지 로드 오류 처리
            img.onerror = function() {
              console.log('캐시된 아이콘 로드 실패:', url);
              // 기본 아이콘으로 대체
              setDefaultIcon(iconElement, url);
            };
            
            img.onload = function() {
              iconElement.style.backgroundImage = `url(${cachedIcon})`;
            };
            
            img.src = cachedIcon;
            return;
          }
          
          // 내장 아이콘 사용 시도 (확장 프로그램 내부 아이콘)
          try {
            // URL에서 도메인 추출
            let domain = '';
            try {
              const urlObj = new URL(url);
              domain = urlObj.hostname.replace('www.', '');
            } catch (error) {
              console.warn('URL 파싱 실패:', url);
              domain = url;
            }
            
            // 일반적인 도메인에 대한 내장 아이콘 경로
            const commonIcons = {
              'google.com': 'images/icons/google.png',
              'youtube.com': 'images/icons/youtube.png',
              'github.com': 'images/icons/github.png',
              'naver.com': 'images/icons/naver.png',
              'gmail.com': 'images/icons/gmail.png',
              'mail.google.com': 'images/icons/gmail.png'
            };
            
            // 도메인에 맞는 내장 아이콘이 있는지 확인
            for (const [key, iconPath] of Object.entries(commonIcons)) {
              if (domain.includes(key)) {
                const internalIconUrl = chrome.runtime.getURL(iconPath);
                iconElement.style.backgroundImage = `url(${internalIconUrl})`;
                
                // 아이콘 캐시에 저장
                if (settings.bookmarkBar && settings.bookmarkBar.cacheIcons) {
                  iconCache[url] = internalIconUrl;
                  chrome.storage.local.set({ 'iconCache': iconCache });
                }
                
                return;
              }
            }
          } catch (error) {
            console.warn('내장 아이콘 설정 실패:', error);
          }
          
          // URL 파싱 시도
          let faviconUrl;
          try {
            const urlObj = new URL(url);
            faviconUrl = urlObj.origin + '/favicon.ico';
          } catch (error) {
            console.warn('잘못된 URL 형식:', url, error);
            setDefaultIcon(iconElement, url);
            return;
          }
          
          // 파비콘 이미지 로드 시도 (data URL로 변환하여 CSP 우회)
          try {
            // 파비콘을 가져와 data URL로 변환하는 함수
            const fetchFaviconAsDataUrl = (faviconUrl) => {
              return new Promise((resolve, reject) => {
                // 백그라운드 스크립트에 요청
                chrome.runtime.sendMessage({
                  action: 'fetchFavicon',
                  url: faviconUrl
                }, (response) => {
                  if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                    return;
                  }
                  
                  if (response && response.success && response.dataUrl) {
                    resolve(response.dataUrl);
                  } else {
                    reject(new Error('파비콘 가져오기 실패'));
                  }
                });
              });
            };
            
            // 파비콘 로드 시도
            fetchFaviconAsDataUrl(faviconUrl)
              .then(dataUrl => {
                iconElement.style.backgroundImage = `url(${dataUrl})`;
                
                // 아이콘 캐시에 저장
                if (settings.bookmarkBar && settings.bookmarkBar.cacheIcons) {
                  iconCache[url] = dataUrl;
                  chrome.storage.local.set({ 'iconCache': iconCache });
                }
              })
              .catch(() => {
                // favicon.ico 실패 시 favicon.png 시도
                console.log('favicon.ico 로드 실패, favicon.png 시도:', url);
                const pngUrl = faviconUrl.replace('.ico', '.png');
                
                fetchFaviconAsDataUrl(pngUrl)
                  .then(dataUrl => {
                    iconElement.style.backgroundImage = `url(${dataUrl})`;
                    
                    // 아이콘 캐시에 저장
                    if (settings.bookmarkBar && settings.bookmarkBar.cacheIcons) {
                      iconCache[url] = dataUrl;
                      chrome.storage.local.set({ 'iconCache': iconCache });
                    }
                  })
                  .catch(() => {
                    // 모든 시도 실패 시 기본 아이콘 사용
                    console.log('favicon.png 로드 실패, 기본 아이콘 사용:', url);
                    setDefaultIcon(iconElement, url);
                  });
              });
          } catch (error) {
            console.error('파비콘 로드 중 오류 발생:', error);
            setDefaultIcon(iconElement, url);
          }
        });
      } catch (error) {
        console.error('아이콘 설정 중 오류 발생:', error);
        setDefaultIcon(iconElement, url);
      }
    }
    
    // 기본 아이콘 설정 함수
    function setDefaultIcon(iconElement, url) {
      if (!iconElement) return;
      
      // URL에서 색상 생성
      const color = getColorFromString(url);
      
      // 도메인 첫 글자 추출
      let initial = '';
      try {
        const urlObj = new URL(url);
        initial = urlObj.hostname.charAt(0).toUpperCase();
      } catch (error) {
        initial = url.charAt(0).toUpperCase();
      }
      
      // 배경색 설정
      iconElement.style.backgroundColor = color;
      iconElement.style.backgroundImage = 'none';
      
      // 텍스트 설정
      iconElement.textContent = initial;
      iconElement.style.color = '#ffffff';
      iconElement.style.display = 'flex';
      iconElement.style.justifyContent = 'center';
      iconElement.style.alignItems = 'center';
      iconElement.style.fontWeight = 'bold';
    }

    // 메시지 리스너 설정
    chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
      try {
        // 메시지 유효성 검사
        if (!message || typeof message !== 'object') {
          console.warn('유효하지 않은 메시지 형식:', message);
          sendResponse({ success: false, error: '유효하지 않은 메시지 형식' });
          return;
        }
        
        // 메시지 액션에 따른 처리
        switch (message.action) {
          case 'ping':
            // 핑 메시지 응답
            console.log('핑 메시지 수신');
            sendResponse({ success: true, message: 'BookStaxx 컨텐츠 스크립트가 활성화되어 있습니다.' });
            break;
            
          case 'settingsUpdated':
            // 설정 업데이트 처리
            console.log('설정 업데이트 메시지 수신:', message.settings);
            
            // 북마크바 유지 설정 업데이트
            if (message.settings && message.settings.persistBookmarkBar !== undefined) {
              window.BookStaxx.persistBookmarkBar = message.settings.persistBookmarkBar;
              console.log('북마크바 유지 설정이 업데이트되었습니다:', window.BookStaxx.persistBookmarkBar);
            }
            
            // 북마크바 업데이트
            updateBookmarkBar();
            
            sendResponse({ success: true });
            break;
            
          case 'initBookmarkBar':
            // 북마크바 초기화 요청
            console.log('북마크바 초기화 요청 수신');
            initBookmarkBar();
            sendResponse({ success: true });
            break;
            
          default:
            // 알 수 없는 액션
            console.warn('알 수 없는 메시지 액션:', message.action);
            sendResponse({ success: false, error: '알 수 없는 액션' });
            break;
        }
      } catch (error) {
        console.error('메시지 처리 중 오류 발생:', error);
        sendResponse({ success: false, error: error.message });
      }
      
      return true; // 비동기 응답 지원
    });

    // 북마크 열기 함수
    function openBookmark(url, newTab = false) {
      try {
        // 백그라운드 스크립트에 메시지 전송
        chrome.runtime.sendMessage({
          action: 'openBookmark',
          url: url,
          newTab: newTab
        }, response => {
          if (chrome.runtime.lastError) {
            console.error('북마크 열기 메시지 전송 오류:', chrome.runtime.lastError);
            // 백그라운드 연결 실패 시 직접 열기 시도
            if (newTab) {
              window.open(url, '_blank');
            } else {
              window.location.href = url;
            }
            return;
          }
          
          if (!response || !response.success) {
            console.error('북마크 열기 실패:', response);
            // 백그라운드 응답 실패 시 직접 열기 시도
            if (newTab) {
              window.open(url, '_blank');
            } else {
              window.location.href = url;
            }
          }
        });
      } catch (error) {
        console.error('북마크 열기 중 오류 발생:', error);
        // 오류 발생 시 직접 열기 시도
        if (newTab) {
          window.open(url, '_blank');
        } else {
          window.location.href = url;
        }
      }
    }

    // 북마크 편집 함수
    function editBookmark(bookmark) {
      try {
        // 새 제목 입력 받기
        const newTitle = prompt(getMessage('editBookmarkTitle'), bookmark.title);
        if (newTitle === null) return; // 취소한 경우
        
        // 새 URL 입력 받기
        const newUrl = prompt(getMessage('editBookmarkUrl'), bookmark.url);
        if (newUrl === null) return; // 취소한 경우
        
        // 백그라운드에 편집 요청 전송
        if (window.BookStaxx.offlineMode) {
          console.log('오프라인 모드에서는 북마크 편집이 지원되지 않습니다');
          alert(getMessage('offlineEditNotSupported'));
          return;
        }
        
        chrome.runtime.sendMessage({
          action: 'editBookmark',
          id: bookmark.id,
          title: newTitle,
          url: newUrl
        }, response => {
          if (chrome.runtime.lastError) {
            console.error('북마크 편집 오류:', chrome.runtime.lastError);
            alert(getMessage('editBookmarkError'));
            return;
          }
          
          if (response && response.success) {
            console.log('북마크 편집 성공');
            
            // 로컬 스토리지에서 캐시된 북마크 데이터 업데이트
            const cachedData = localStorage.getItem('bookmarkCache');
            if (cachedData) {
              try {
                const bookmarks = JSON.parse(cachedData);
                const updatedBookmarks = bookmarks.map(b => {
                  if (b.id === bookmark.id) {
                    return { ...b, title: newTitle, url: newUrl };
                  }
                  return b;
                });
                
                localStorage.setItem('bookmarkCache', JSON.stringify(updatedBookmarks));
                localStorage.setItem('bookmarkCacheTimestamp', Date.now().toString());
                
                // 북마크 다시 표시
                displayBookmarks(updatedBookmarks);
              } catch (error) {
                console.error('캐시된 북마크 데이터 업데이트 오류:', error);
                // 오류 발생 시 북마크 다시 로드
                loadBookmarks();
              }
            } else {
              // 캐시된 데이터가 없는 경우 북마크 다시 로드
              loadBookmarks();
            }
          } else {
            console.error('북마크 편집 실패:', response);
            alert(getMessage('editBookmarkError'));
          }
        });
      } catch (error) {
        console.error('북마크 편집 중 오류 발생:', error);
        alert(getMessage('editBookmarkError'));
      }
    }
    
    // 북마크 삭제 함수
    function removeBookmark(bookmark) {
      try {
        // 백그라운드에 삭제 요청 전송
        if (window.BookStaxx.offlineMode) {
          console.log('오프라인 모드에서는 북마크 삭제가 지원되지 않습니다');
          alert(getMessage('offlineDeleteNotSupported'));
          return;
        }
        
        chrome.runtime.sendMessage({
          action: 'removeBookmark',
          id: bookmark.id
        }, response => {
          if (chrome.runtime.lastError) {
            console.error('북마크 삭제 오류:', chrome.runtime.lastError);
            alert(getMessage('deleteBookmarkError'));
            return;
          }
          
          if (response && response.success) {
            console.log('북마크 삭제 성공');
            
            // 로컬 스토리지에서 캐시된 북마크 데이터 업데이트
            const cachedData = localStorage.getItem('bookmarkCache');
            if (cachedData) {
              try {
                const bookmarks = JSON.parse(cachedData);
                const updatedBookmarks = bookmarks.filter(b => b.id !== bookmark.id);
                
                localStorage.setItem('bookmarkCache', JSON.stringify(updatedBookmarks));
                localStorage.setItem('bookmarkCacheTimestamp', Date.now().toString());
                
                // 북마크 다시 표시
                displayBookmarks(updatedBookmarks);
              } catch (error) {
                console.error('캐시된 북마크 데이터 업데이트 오류:', error);
                // 오류 발생 시 북마크 다시 로드
                loadBookmarks();
              }
            } else {
              // 캐시된 데이터가 없는 경우 북마크 다시 로드
              loadBookmarks();
            }
          } else {
            console.error('북마크 삭제 실패:', response);
            alert(getMessage('deleteBookmarkError'));
          }
        });
      } catch (error) {
        console.error('북마크 삭제 중 오류 발생:', error);
        alert(getMessage('deleteBookmarkError'));
      }
    }
  })();
}

