// 전역 BookStaxx 객체가 이미 존재하는지 확인 (중복 실행 방지)
if (window.BookStaxx) {
  console.log('BookStaxx가 이미 초기화되었습니다. 중복 실행을 건너뜁니다.');
} else {
  // BookStaxx 전역 객체 생성
  window.BookStaxx = {};

  // 스크립트 실행
  (function() {
    // i18n 메시지 가져오기 함수
    function getMessage(key, substitutions) {
      return chrome.i18n.getMessage(key, substitutions) || key;
    }

    // 기본 설정값 정의 (전역 변수로 선언)
    var defaultSettings = {
      bookmarkButton: {
        show: true,
        position: 'bottomRight',
        size: '40px',
        backgroundColor: '#4285F4',
        textColor: '#FFFFFF',
        customImage: null
      },
      bookmarkBar: {
        position: 'top',
        backgroundColor: '#f1f3f4',
        textColor: '#333333',
        opacity: 100,
        iconSize: 'medium',
        textSize: 'medium',
        maxTextLength: 15,
        showText: true,
        style: 'normal',
        hideChrome: false,
        adjustBodyPadding: true,
        cacheIcons: true,
        persistAcrossNavigation: true
      }
    };

    // 사용자 설정을 저장할 변수
    var userSettings = {};

    // 전역 설정 객체
    var settings = {};

    // 북마크 버튼 요소
    var bookmarkButton = null;

    // 북마크 바 요소
    let bookmarkBar = null;

    // 초기화 완료 플래그
    let isInitialized = false;

    // 북마크바 로딩 상태
    let isLoadingBookmarks = false;

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
          chrome.runtime.sendMessage({ action: 'ping' }, (response) => {
            if (chrome.runtime.lastError) {
              console.warn('백그라운드 연결 실패:', chrome.runtime.lastError.message);
              reject(chrome.runtime.lastError);
            } else if (response && response.pong) {
              console.log('백그라운드 연결 성공');
              resolve(true);
            } else {
              console.warn('백그라운드 응답 없음');
              reject(new Error('백그라운드 응답 없음'));
            }
          });
        } catch (error) {
          console.error('백그라운드 연결 확인 중 오류:', error);
          reject(error);
        }
      });
    }

    // 로딩 메시지 표시 함수
    function showLoadingMessage() {
      // 이미 로딩 중이면 중복 표시 방지
      if (isLoadingBookmarks) return;
      
      isLoadingBookmarks = true;
      
      const container = document.getElementById('bookmark-container');
      if (!container) return;
      
      // 기존 로딩 메시지 확인
      let loadingMessage = container.querySelector('.bookmark-loading-message');
      
      // 로딩 메시지가 없으면 생성
      if (!loadingMessage) {
        loadingMessage = document.createElement('div');
        loadingMessage.className = 'bookmark-loading-message';
        loadingMessage.textContent = getMessage('loadingBookmarks');
        container.appendChild(loadingMessage);
      }
      
      // 로딩 메시지 표시
      loadingMessage.style.display = 'flex';
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
      console.log('북마크 로드 시작');
      
      // 안전하게 설정 확인
      chrome.storage.sync.get(defaultSettings, (data) => {
        const bookmarkSettings = data || defaultSettings;
        const bookmarkBarSettings = bookmarkSettings.bookmarkBar || {};
        const useCachedIcons = bookmarkBarSettings.cacheIcons !== false;
        
        // 캐시된 북마크가 있는지 확인
        const cachedBookmarks = BookmarkCache.getBookmarks();
        if (cachedBookmarks && useCachedIcons) {
          console.log('캐시된 북마크 데이터 사용');
          displayBookmarks(cachedBookmarks);
          // 백그라운드에서 최신 데이터 로드 (UI 블록킹 없이)
          setTimeout(() => {
            fetchFreshBookmarks();
          }, 1000);
        } else {
          // 캐시된 데이터가 없거나 캐싱이 비활성화된 경우 직접 로드
          fetchFreshBookmarks();
        }
      });
    }

    // 최신 북마크 데이터 가져오기
    function fetchFreshBookmarks() {
      chrome.runtime.sendMessage({ action: 'getBookmarks' }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('북마크 데이터 요청 중 오류:', chrome.runtime.lastError.message);
          return;
        }
        
        if (response && response.bookmarks) {
          // 캐시에 최신 데이터 저장
          BookmarkCache.setBookmarks(response.bookmarks);
          
          // 현재 표시된 북마크와 다른 경우에만 UI 업데이트
          const currentBookmarks = BookmarkCache.getBookmarks();
          if (!currentBookmarks || JSON.stringify(currentBookmarks) !== JSON.stringify(response.bookmarks)) {
            displayBookmarks(response.bookmarks);
          }
        }
      });
    }

    // 북마크 표시 함수
    function displayBookmarks(bookmarks) {
      console.log(`북마크 ${bookmarks.length}개 렌더링 시작`);
      
      const container = document.getElementById('bookmark-container');
      if (!container) {
        console.error('북마크 컨테이너를 찾을 수 없음');
        return;
      }
      
      // 컨테이너 내용 초기화
      container.innerHTML = '';
      
      // 북마크가 없는 경우
      if (!bookmarks || bookmarks.length === 0) {
        const emptyMessage = document.createElement('div');
        emptyMessage.className = 'empty-bookmark-message';
        emptyMessage.textContent = getMessage('noBookmarks');
        
        // 북마크 추가 버튼 생성
        const addButton = document.createElement('button');
        addButton.className = 'add-bookmark-btn';
        addButton.innerHTML = '+';
        addButton.title = getMessage('addBookmark');
        addButton.style.marginLeft = '10px';
        addButton.addEventListener('click', addCurrentPageToBookmarks);
        
        // 메시지와 버튼을 포함할 컨테이너
        const messageContainer = document.createElement('div');
        messageContainer.style.display = 'flex';
        messageContainer.style.alignItems = 'center';
        messageContainer.style.justifyContent = 'center';
        messageContainer.style.padding = '5px';
        
        messageContainer.appendChild(emptyMessage);
        messageContainer.appendChild(addButton);
        
        container.appendChild(messageContainer);
        return;
      }
      
      // 북마크 바 설정 로드
      chrome.storage.sync.get(defaultSettings, (settings) => {
        // 북마크 바 스타일 체크
        const bar = document.getElementById('bookmark-bar');
        const isVertical = bar && (bar.classList.contains('left') || bar.classList.contains('right'));
        
        // 스타일 설정 가져오기
        const showText = settings.bookmarkBar.showText !== false;
        const textSize = settings.bookmarkBar.textSize || 'medium';
        const maxTextLength = parseInt(settings.bookmarkBar.maxTextLength) || 15;
        const iconSize = settings.bookmarkBar.iconSize || 'medium';
        
        // 스타일 클래스 적용
        if (bar) {
          bar.classList.remove('icon-small', 'icon-medium', 'icon-large');
          bar.classList.add(`icon-${iconSize}`);
          
          bar.classList.remove('text-small', 'text-medium', 'text-large');
          bar.classList.add(`text-${textSize}`);
          
          if (!showText) {
            bar.classList.add('hide-text');
          } else {
            bar.classList.remove('hide-text');
          }
          
          // 투명도 설정
          const barStyle = settings.bookmarkBar.style || 'normal';
          bar.classList.remove('transparent', 'semi-transparent');
          if (barStyle === 'transparent') {
            bar.style.backgroundColor = 'transparent';
          } else if (barStyle === 'semi-transparent') {
            bar.style.backgroundColor = 'rgba(241, 243, 244, 0.8)';
            bar.style.backdropFilter = 'blur(5px)';
          }
        }
        
        // 북마크 아이템 생성
        bookmarks.forEach(bookmark => {
          const bookmarkItem = document.createElement('a');
          bookmarkItem.className = 'bookmark-item';
          bookmarkItem.href = bookmark.url;
          bookmarkItem.title = bookmark.title;
          bookmarkItem.target = '_blank';
          bookmarkItem.rel = 'noopener noreferrer';
          
          // 아이콘 컨테이너 추가
          const iconElement = document.createElement('img');
          iconElement.className = 'bookmark-icon';
          iconElement.alt = '';
          
          // 기본 아이콘 설정
          iconElement.src = 'images/default-favicon.png';
          
          // 텍스트 요소 추가
          const textElement = document.createElement('span');
          textElement.className = 'bookmark-text';
          
          // 텍스트 길이 제한
          let displayTitle = bookmark.title;
          if (maxTextLength > 0 && displayTitle.length > maxTextLength) {
            displayTitle = displayTitle.substring(0, maxTextLength) + '...';
          }
          
          textElement.textContent = displayTitle;
          
          // 아이콘과 텍스트를 북마크에 추가
          bookmarkItem.appendChild(iconElement);
          bookmarkItem.appendChild(textElement);
          
          // 컨텍스트 메뉴 이벤트 리스너 추가 (우클릭 메뉴)
          bookmarkItem.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            showBookmarkContextMenu(e, bookmark);
          });
          
          // 북마크 컨테이너에 아이템 추가
          container.appendChild(bookmarkItem);
          
          // 아이콘 로드 (비동기)
          loadIconForBookmark(bookmark, iconElement);
        });
        
        // 스크롤 기능 추가 (필요 시)
        addScrollFunctionality(isVertical);
      });
    }

    // 스크롤 기능 추가
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

    // 북마크바 생성 함수
    function createBookmarkBar(settings) {
      // 이미 존재하는지 확인
      const existingBar = document.getElementById('bookmark-bar');
      if (existingBar) {
        return existingBar;
      }

      // 설정값이 없으면 기본값 사용
      if (!settings) {
        chrome.storage.sync.get(defaultSettings, (data) => {
          if (chrome.runtime.lastError) {
            console.error('설정 로드 오류:', chrome.runtime.lastError);
            // 기본 설정 사용
            createBookmarkBarWithSettings(defaultSettings);
          } else {
            createBookmarkBarWithSettings(data);
          }
        });
        return;
      } else {
        return createBookmarkBarWithSettings(settings);
      }
    }

    // 설정을 적용한 북마크 바 생성 함수
    function createBookmarkBarWithSettings(data) {
      console.log('북마크 바 생성 (설정 적용):', data);
      
      // 전역 settings 업데이트
      settings = data || defaultSettings;
      
      // 기존 북마크 바 제거
      const existingBar = document.getElementById('bookmark-bar');
      if (existingBar) {
        existingBar.remove();
      }
      
      // 북마크 바 생성
      const bar = createBookmarkBar(settings);
      
      // 현재 문서에 추가
      document.body.appendChild(bar);
      
      // 위치에 따른 스타일 적용
      adjustBarPositionAndPadding(settings.bookmarkBar.position || 'top');
      
      return bar;
    }

    // 북마크 바 위치 및 패딩 조정
    function adjustBarPositionAndPadding(position) {
      console.log('북마크 바 위치 조정:', position);
      
      const bar = document.getElementById('bookmark-bar');
      if (!bar) {
        console.error('북마크 바 요소를 찾을 수 없음');
        return;
      }
      
      // 모든 위치 클래스 제거
      bar.classList.remove('top', 'bottom', 'left', 'right');
      // 새 위치 클래스 추가
      bar.classList.add(position);
      
      // 스타일 초기화
      bar.style.top = '';
      bar.style.bottom = '';
      bar.style.left = '';
      bar.style.right = '';
      bar.style.width = '';
      bar.style.height = '';
      bar.style.flexDirection = '';
      
      // 위치별 특정 스타일 적용
      if (position === 'top') {
        bar.style.top = '0';
        bar.style.left = '0';
        bar.style.right = '0';
        bar.style.width = '100%';
        bar.style.height = 'auto';
        bar.style.zIndex = '2147483647';
        bar.style.flexDirection = 'row';
        document.body.style.paddingTop = bar.offsetHeight + 'px';
      } else if (position === 'bottom') {
        bar.style.bottom = '0';
        bar.style.left = '0';
        bar.style.right = '0';
        bar.style.width = '100%';
        bar.style.height = 'auto';
        bar.style.zIndex = '2147483647';
        bar.style.flexDirection = 'row';
        document.body.style.paddingBottom = bar.offsetHeight + 'px';
      } else if (position === 'left') {
        bar.style.top = '0';
        bar.style.left = '0';
        bar.style.bottom = '0';
        bar.style.width = 'auto';
        bar.style.minWidth = '40px';
        bar.style.height = '100%';
        bar.style.zIndex = '2147483647';
        bar.style.flexDirection = 'column';
        document.body.style.paddingLeft = bar.offsetWidth + 'px';
        
        // 왼쪽 배치를 위한 추가 스타일
        const bookmarks = bar.querySelectorAll('.bookmark-item');
        bookmarks.forEach(bookmark => {
          bookmark.style.margin = '5px 0';
          bookmark.style.width = '100%';
          bookmark.style.justifyContent = 'center';
        });
      } else if (position === 'right') {
        bar.style.top = '0';
        bar.style.right = '0';
        bar.style.bottom = '0';
        bar.style.width = 'auto';
        bar.style.minWidth = '40px';
        bar.style.height = '100%';
        bar.style.zIndex = '2147483647';
        bar.style.flexDirection = 'column';
        document.body.style.paddingRight = bar.offsetWidth + 'px';
        
        // 오른쪽 배치를 위한 추가 스타일
        const bookmarks = bar.querySelectorAll('.bookmark-item');
        bookmarks.forEach(bookmark => {
          bookmark.style.margin = '5px 0';
          bookmark.style.width = '100%';
          bookmark.style.justifyContent = 'center';
        });
      }
      
      // 아이템 정렬도 위치에 맞게 변경
      setTimeout(() => {
        const newPadding = position === 'left' ? bar.offsetWidth : 
                          position === 'right' ? bar.offsetWidth : 
                          position === 'top' ? bar.offsetHeight : 
                          position === 'bottom' ? bar.offsetHeight : 0;
                            
        // 안전하게 설정 확인
        chrome.storage.sync.get(defaultSettings, (data) => {
          // 전역 설정 사용
          const localSettings = data || settings;
          const bookmarkBarSettings = localSettings.bookmarkBar || {};
          const shouldAdjustPadding = bookmarkBarSettings.adjustBodyPadding !== false;
          
          if (shouldAdjustPadding) {
            if (position === 'top') document.body.style.paddingTop = newPadding + 'px';
            if (position === 'bottom') document.body.style.paddingBottom = newPadding + 'px';
            if (position === 'left') document.body.style.paddingLeft = newPadding + 'px';
            if (position === 'right') document.body.style.paddingRight = newPadding + 'px';
          }
        });
      }, 100);
    }

    // 설정 변경 이벤트 리스너
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      console.log('콘텐츠 스크립트 메시지 수신:', message);
      
      // ping 메시지에 응답 (스크립트가 로드되었는지 확인)
      if (message.action === 'ping') {
        sendResponse({ success: true, loaded: true });
        return true;
      }
      
      // 북마크 바 초기화 요청
      if (message.action === 'initBookmarkBar') {
        initBookmarkBar();
        sendResponse({ success: true });
        return true;
      }
      
      // 설정 업데이트 요청
      if (message.action === 'settingsUpdated') {
        if (message.settings) {
          applySettings(message.settings);
          sendResponse({ success: true });
        } else {
          sendResponse({ success: false, error: 'Settings not provided' });
        }
        return true;
      }
      
      // 북마크 변경 알림
      if (message.action === 'bookmarksChanged') {
        fetchFreshBookmarks();
        sendResponse({ success: true });
        return true;
      }
      
      // 알 수 없는 메시지
      sendResponse({ success: false, error: 'Unknown message action' });
      return true;
    });

    // URL 변경 감지 기능 - 개선 (중복 선언 수정)
    let urlCheckInterval;

    function startUrlChangeDetection() {
      // 이미 실행 중인 인터벌이 있으면 중지
      if (urlCheckInterval) {
        clearInterval(urlCheckInterval);
      }
      
      // URL 변경 주기적 확인
      urlCheckInterval = setInterval(checkForURLChanges, 1000);
    }

    function checkForURLChanges() {
      if (location.href !== lastUrl) {
        console.log('URL 변경 감지:', lastUrl, '->', location.href);
        lastUrl = location.href;
        
        // 페이지 전환 시 북마크 바가 없으면 재생성
        const bookmarkBar = document.getElementById('bookmark-bar');
        if (!bookmarkBar) {
          console.log('북마크 바 없음, 재생성');
          createBookmarkBar();
        }
        
        // 북마크 재로드 (캐시 사용)
        loadBookmarks();
      }
    }

    // MutationObserver 설정 함수
    function setupMutationObserver() {
      console.log('MutationObserver 설정 중...');
      
      // 기존 Observer가 있으면 연결 해제
      if (window.bookmarkBarObserver) {
        window.bookmarkBarObserver.disconnect();
      }
      
      // DOM 변경 감지를 위한 MutationObserver 생성
      const observer = new MutationObserver((mutations) => {
        // body가 제거되거나 북마크 바가 제거되었는지 확인
        const bookmarkBar = document.getElementById('bookmark-bar');
        const bookmarkButton = document.getElementById('bookmark-button');
        
        // 북마크 바가 없으면 재생성
        if (!bookmarkBar && document.body) {
          console.log('MutationObserver: 북마크 바가 제거됨, 재생성');
          createBookmarkBar();
        }
        
        // 북마크 버튼이 없으면 재생성
        if (!bookmarkButton && document.body) {
          console.log('MutationObserver: 북마크 버튼이 제거됨, 재생성');
          const button = createBookmarkButton(settings);
          document.body.appendChild(button);
        }
      });
      
      // 전체 문서의 변경 사항 관찰 (특히 북마크 바나 버튼이 제거되는 경우)
      observer.observe(document, {
        childList: true, // 자식 노드 추가/제거 감지
        subtree: true    // 하위 트리 변경 감지
      });
      
      // 인스턴스를 전역 변수에 저장 (나중에 연결 해제를 위해)
      window.bookmarkBarObserver = observer;
      
      console.log('MutationObserver 설정 완료');
    }

    // CSS 스타일 적용 함수 - CSS 클래스 이름 일관성 확보
    function applyStyles() {
      console.log('북마크 바 스타일 적용');
      
      // 설정 로드
      chrome.storage.sync.get(defaultSettings, (data) => {
        // 전역 settings 변수 사용 대신 로컬 변수 사용
        const styleSettings = data || defaultSettings;
        
        // 북마크 바 요소
        const bar = document.getElementById('bookmark-bar');
        if (!bar) {
          console.error('북마크 바 요소를 찾을 수 없음');
          return;
        }

        // 설정된 스타일 적용
        const barSettings = styleSettings.bookmarkBar || {};
        
        // 배경색 적용
        if (barSettings.backgroundColor) {
          bar.style.backgroundColor = barSettings.backgroundColor;
        }
        
        // 불투명도 적용
        if (typeof barSettings.opacity === 'number') {
          bar.style.opacity = barSettings.opacity / 100;
        }
        
        // 스타일 모드 적용 (투명/반투명)
        if (barSettings.style === 'transparent') {
          bar.style.backgroundColor = 'transparent';
          bar.style.boxShadow = 'none';
        } else if (barSettings.style === 'translucent') {
          let bgColor = barSettings.backgroundColor || '#f1f3f4';
          
          // RGBA 형태로 변환 (투명도 적용)
          if (bgColor.startsWith('#')) {
            const r = parseInt(bgColor.substr(1, 2), 16);
            const g = parseInt(bgColor.substr(3, 2), 16);
            const b = parseInt(bgColor.substr(5, 2), 16);
            const a = (barSettings.opacity || 80) / 100;
            
            bgColor = `rgba(${r}, ${g}, ${b}, ${a})`;
            bar.style.backgroundColor = bgColor;
          }
          
          bar.style.backdropFilter = 'blur(5px)';
        }
        
        // 북마크 아이템 스타일 적용
        const bookmarkItems = bar.querySelectorAll('.bookmark-item');
        bookmarkItems.forEach(item => {
          // 텍스트 색상 적용
          const text = item.querySelector('.bookmark-text');
          if (text && barSettings.textColor) {
            text.style.color = barSettings.textColor;
          }
          
          // 텍스트 숨김/표시 설정
          if (text) {
            text.style.display = barSettings.showText !== false ? 'block' : 'none';
          }
          
          // 아이콘 크기 설정
          const icon = item.querySelector('img');
          if (icon) {
            let iconSize = '16px'; // 중간 크기 (기본값)
            
            if (barSettings.iconSize === 'small') {
              iconSize = '12px';
            } else if (barSettings.iconSize === 'large') {
              iconSize = '20px';
            }
            
            icon.style.width = iconSize;
            icon.style.height = iconSize;
          }
          
          // 텍스트 크기 설정
          if (text && barSettings.textSize) {
            let fontSize = '13px'; // 중간 크기 (기본값)
            
            if (barSettings.textSize === 'small') {
              fontSize = '11px';
            } else if (barSettings.textSize === 'large') {
              fontSize = '15px';
            }
            
            text.style.fontSize = fontSize;
          }
        });
        
        // Chrome 북마크 바 숨김/표시 설정 적용
        toggleChromeBookmarkBar(barSettings.hideChrome === true);
      });
    }

    // 현재 페이지를 북마크에 추가하는 함수
    function addCurrentPageToBookmarks() {
      console.log('현재 페이지를 북마크에 추가 시도');
      
      // 현재 페이지 정보 가져오기
      const title = document.title;
      const url = window.location.href;
      
      console.log('북마크 추가 메시지 전송:', { title, url });
      
      // 백그라운드 스크립트에 북마크 추가 요청
      chrome.runtime.sendMessage(
        { 
          action: "addBookmark", 
          title: title, 
          url: url 
        }, 
        function(response) {
          if (chrome.runtime.lastError) {
            console.error('북마크 추가 실패:', chrome.runtime.lastError);
            alert(getMessage('bookmarkAddFailed') + ': ' + chrome.runtime.lastError.message);
            return;
          }
          
          if (response && response.success) {
            console.log('북마크 추가 성공:', response.bookmark);
            
            // 북마크 추가 성공 알림
            const notification = document.createElement('div');
            notification.className = 'bookstaxx-notification';
            notification.textContent = getMessage('bookmarkAdded');
            document.body.appendChild(notification);
            
            // 알림 자동 제거
            setTimeout(() => {
              notification.classList.add('fade-out');
              setTimeout(() => {
                notification.remove();
              }, 500);
            }, 2000);
            
            // 북마크 목록 새로고침 (약간의 지연 후)
            setTimeout(() => {
              // 캐시 만료 처리
              bookmarkCache.lastFetched = 0;
              loadBookmarks();
            }, 500);
          } else if (response && response.exists) {
            console.log('북마크가 이미 존재함:', response.bookmark);
            
            // 이미 존재하는 북마크 알림
            const notification = document.createElement('div');
            notification.className = 'bookstaxx-notification';
            notification.textContent = getMessage('bookmarkExists');
            document.body.appendChild(notification);
            
            // 알림 자동 제거
            setTimeout(() => {
              notification.classList.add('fade-out');
              setTimeout(() => {
                notification.remove();
              }, 500);
            }, 2000);
          } else {
            console.error('북마크 추가 실패:', response);
            alert(getMessage('bookmarkAddFailed'));
          }
        }
      );
    }

    // 북마크 삭제 함수
    function removeBookmark(bookmark) {
      // 북마크 삭제 메시지 업데이트
      showNotification(getMessage('bookmarkRemoved'));
      
      // 백그라운드 스크립트에 북마크 삭제 요청
      chrome.runtime.sendMessage(
        { 
          action: "removeBookmark", 
          title: bookmark.title, 
          url: bookmark.url 
        }, 
        function(response) {
          if (chrome.runtime.lastError) {
            console.error('북마크 삭제 실패:', chrome.runtime.lastError);
            alert(getMessage('bookmarkRemoveFailed') + ': ' + chrome.runtime.lastError.message);
          } else {
            console.log('북마크 삭제 성공:', response.success);
            
            // 북마크 목록 새로고침 (약간의 지연 후)
            setTimeout(() => {
              // 캐시 만료 처리
              bookmarkCache.lastFetched = 0;
              loadBookmarks();
            }, 500);
          }
        }
      );
    }

    // 알림 표시 함수
    function showNotification(message) {
      const notification = document.createElement('div');
      notification.className = 'bookstaxx-notification';
      notification.textContent = message;
      document.body.appendChild(notification);
      
      // 알림 자동 제거
      setTimeout(() => {
        notification.classList.add('fade-out');
        setTimeout(() => {
          notification.remove();
        }, 500);
      }, 2000);
    }

    function applySettings(settings) {
      console.log('설정 적용:', settings);
      
      // 북마크 바 요소 확인
      const bookmarkBar = document.getElementById('bookmark-bar');
      
      if (bookmarkBar) {
        // 북마크 바 설정 적용
        if (settings.bookmarkBar) {
          // 위치 변경
          if (settings.bookmarkBar.position) {
            repositionBookmarkBar(settings.bookmarkBar.position);
          }
          
          // 배경색 적용
          if (settings.bookmarkBar.backgroundColor) {
            bookmarkBar.style.backgroundColor = settings.bookmarkBar.backgroundColor;
          }
          
          // 텍스트 색상 적용
          if (settings.bookmarkBar.textColor) {
            bookmarkBar.style.color = settings.bookmarkBar.textColor;
          }
          
          // 투명도 적용
          if (settings.bookmarkBar.opacity !== undefined) {
            bookmarkBar.style.opacity = settings.bookmarkBar.opacity / 100;
          }
          
          // 스타일 모드 적용 (일반/투명/반투명)
          bookmarkBar.classList.remove('transparent', 'semi-transparent');
          if (settings.bookmarkBar.style === 'transparent') {
            bookmarkBar.classList.add('transparent');
          } else if (settings.bookmarkBar.style === 'semi-transparent') {
            bookmarkBar.classList.add('semi-transparent');
          }
          
          // 아이콘 크기 적용
          if (settings.bookmarkBar.iconSize) {
            bookmarkBar.classList.remove('icon-small', 'icon-medium', 'icon-large');
            bookmarkBar.classList.add(`icon-${settings.bookmarkBar.iconSize}`);
          }
          
          // 텍스트 크기 적용
          if (settings.bookmarkBar.textSize) {
            bookmarkBar.classList.remove('text-small', 'text-medium', 'text-large');
            bookmarkBar.classList.add(`text-${settings.bookmarkBar.textSize}`);
          }
          
          // 텍스트 표시 여부 적용
          if (settings.bookmarkBar.showText === false) {
            bookmarkBar.classList.add('hide-text');
          } else {
            bookmarkBar.classList.remove('hide-text');
          }
          
          // Chrome 북마크 바 숨김 설정 적용
          if (settings.bookmarkBar.hideChrome) {
            toggleChromeBookmarkBar(true);
          } else {
            toggleChromeBookmarkBar(false);
          }
        }
      }
      
      // 북마크 버튼 설정 적용
      createBookmarkButton(settings);
      
      // 북마크 다시 로드 (새 설정 적용)
      loadBookmarks();
    }

    // Chrome 북마크 바 숨김 CSS 추가
    function toggleChromeBookmarkBar(hideChrome) {
      console.log('Chrome 북마크 바 표시 설정:', hideChrome ? '숨김' : '표시');
      
      // Chrome 북마크 바를 숨기기 위한 스타일 요소 찾거나 생성
      let chromeStyle = document.getElementById('chrome-bookmarks-hiding-style');
      if (!chromeStyle) {
        chromeStyle = document.createElement('style');
        chromeStyle.id = 'chrome-bookmarks-hiding-style';
        document.head.appendChild(chromeStyle);
      }
      
      if (hideChrome) {
        // Chrome 북마크 바를 숨기는 CSS 규칙 추가
        chromeStyle.textContent = `
          /* Chrome 북마크 바 숨기기 */
          .bookmark-bar {
            display: none !important;
          }
          
          /* 자동 생성되는 북마크 관련 요소 숨기기 */
          #bookmarks-bar,
          #bookmark-bar-chrome,
          .browser-toolbar[bookmarkbar="true"],
          #PersonalToolbar,
          #bookmarksToolbar {
            display: none !important;
          }
          
          /* 북마크 바를 위한 여백 제거 */
          body.with-bookmarks-bar {
            margin-top: 0 !important;
          }
        `;
        console.log('Chrome 북마크 바 숨김 스타일 적용됨');
      } else {
        // 스타일 제거
        chromeStyle.textContent = '';
        console.log('Chrome 북마크 바 숨김 스타일 제거됨');
      }
    }

    // Chrome 설정 페이지로 이동하는 링크 생성 함수
    function createChromeSettingsLink() {
      // 안내 메시지 생성
      const message = document.createElement('div');
      message.className = 'chrome-settings-message';
      message.innerHTML = `
        <p>Chrome 기본 북마크 바를 숨기려면 다음 단계를 따라주세요:</p>
        <ol>
          <li>Chrome 메뉴(⋮) > 설정 > 모양 > 북마크 바 표시 옵션을 비활성화합니다</li>
        </ol>
        <p>또는 아래 버튼을 클릭하여 안내 페이지로 이동할 수 있습니다.</p>
        <button id="go-to-chrome-settings">북마크 바 숨기기 안내</button>
      `;
      
      // 버튼 클릭 이벤트 처리
      const button = message.querySelector('#go-to-chrome-settings');
      if (button) {
        button.addEventListener('click', () => {
          // 백그라운드 스크립트에 메시지 전송하여 탭 열기
          chrome.runtime.sendMessage({ 
            action: 'openChromeSettings'
          });
        });
      }
      
      return message;
    }

    // 북마크 동기화 관련 정보 메시지 표시 함수
    function showBookmarkSyncInfo() {
      // 기존 메시지가 있으면 제거
      const existingInfo = document.getElementById('bookmark-sync-info');
      if (existingInfo) {
        existingInfo.remove();
      }
      
      // 새 정보 메시지 생성
      const infoBox = document.createElement('div');
      infoBox.id = 'bookmark-sync-info';
      infoBox.className = 'bookmark-info-message';
      infoBox.innerHTML = `
        <div class="info-header">
          <span class="info-icon">ℹ️</span>
          <span class="info-title">북마크 연동 정보</span>
          <span class="close-btn">&times;</span>
        </div>
        <div class="info-content">
          <p>BookStaxx는 Chrome 북마크와 자동으로 연동됩니다.</p>
          <p>북마크 추가/편집/삭제가 Chrome 북마크에 자동 반영됩니다.</p>
          <p>Chrome 기본 북마크 바를 숨기는 방법:</p>
          <div id="chrome-settings-link-container"></div>
        </div>
      `;
      
      // Chrome 설정 링크 추가
      const linkContainer = infoBox.querySelector('#chrome-settings-link-container');
      linkContainer.appendChild(createChromeSettingsLink());
      
      // 닫기 버튼 이벤트 추가
      const closeBtn = infoBox.querySelector('.close-btn');
      closeBtn.addEventListener('click', () => {
        infoBox.remove();
      });
      
      // 메시지 스타일 추가
      const style = document.createElement('style');
      style.textContent = `
        .bookmark-info-message {
          position: fixed;
          top: 10px;
          right: 10px;
          width: 320px;
          background: #fff;
          border: 1px solid #ddd;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          z-index: 2147483647;
          font-family: Arial, sans-serif;
          font-size: 14px;
          color: #333;
        }
        
        .info-header {
          display: flex;
          align-items: center;
          padding: 10px;
          background: #f5f5f5;
          border-bottom: 1px solid #ddd;
          border-radius: 8px 8px 0 0;
        }
        
        .info-icon {
          margin-right: 8px;
        }
        
        .info-title {
          flex-grow: 1;
          font-weight: bold;
        }
        
        .close-btn {
          cursor: pointer;
          font-size: 18px;
        }
        
        .info-content {
          padding: 15px;
        }
        
        #go-to-chrome-settings {
          background: #4285F4;
          color: white;
          border: none;
          padding: 8px 12px;
          border-radius: 4px;
          cursor: pointer;
          margin-top: 10px;
        }
        
        #go-to-chrome-settings:hover {
          background: #3367D6;
        }
      `;
      
      document.head.appendChild(style);
      document.body.appendChild(infoBox);
      
      // 10초 후 자동으로 닫히도록 설정
      setTimeout(() => {
        if (document.body.contains(infoBox)) {
          infoBox.style.opacity = '0';
          infoBox.style.transition = 'opacity 0.5s ease';
          setTimeout(() => {
            if (document.body.contains(infoBox)) {
              infoBox.remove();
            }
          }, 500);
        }
      }, 10000);
    }

    // 북마크 바 초기화 시 Chrome 북마크 바 설정 적용
    function initBookmarkBar() {
      console.log('북마크 바 초기화 시작');
      
      // Chrome 북마크 숨김 설정 가져오기
      chrome.storage.sync.get(defaultSettings, (data) => {
        const settings = data || defaultSettings;
        
        // Chrome 북마크 바 숨김 설정 적용
        if (settings.bookmarkBar && settings.bookmarkBar.hideChrome) {
          toggleChromeBookmarkBar(true);
        } else {
          toggleChromeBookmarkBar(false);
        }
        
        // 북마크 연동 정보 메시지 표시 (초기 설치 시)
        chrome.storage.local.get(['showSyncInfo'], (data) => {
          if (data.showSyncInfo !== false) {
            showBookmarkSyncInfo();
            // 다음에는 표시하지 않도록 설정
            chrome.storage.local.set({ showSyncInfo: false });
          }
        });
        
        // 북마크 바 생성 (없는 경우에만)
        const existingBar = document.getElementById('bookmark-bar');
        if (!existingBar && document.body) {
          console.log('북마크 바 생성 (초기화 중)');
          createBookmarkBar(settings);
          
          // MutationObserver 설정 (페이지 변화 감지)
          setupMutationObserver();
          
          // URL 변경 감지 시작
          startUrlChangeDetection();
        }
      });
    }

    // 사전 초기화 함수
    function preInit() {
      // 문서 로드 전에 기본 북마크 바 생성
      console.log('BookStaxx 사전 초기화 시작');

      // 현재 설정 불러오기 (기본값 사용)
      chrome.storage.sync.get(defaultSettings, (data) => {
        // 전역 settings 업데이트
        settings = data || defaultSettings;
        
        // BookmarkCache 객체가 정의되어 있는지 확인
        if (typeof BookmarkCache !== 'undefined') {
          BookmarkCache.initCache();
        } else {
          console.warn('BookmarkCache 객체가 정의되지 않았습니다. 캐시 초기화를 건너뜁니다.');
        }
        
        // 로딩 시작 시간 기록
        const startTime = performance.now();
        
        // DOM이 완전히 로드되기 전에 북마크 바를 추가하기 위한 함수
        function appendBarToBody() {
          if (document.body) {
            console.log('Body 요소 발견, 북마크 바 추가 시작');
            
            // 기존에 있던 북마크 바 제거
            const existingBar = document.getElementById('bookmark-bar');
            if (existingBar) {
              existingBar.remove();
            }

            // 기본 북마크 바 생성
            const barPosition = settings.bookmarkBar.position || 'top';

            // 북마크 바 컨테이너 생성
            const bar = document.createElement('div');
            bar.id = 'bookmark-bar';
            bar.className = `${barPosition}`;

            // 북마크 바 스타일 설정
            bar.style.position = 'fixed';
            bar.style.zIndex = '2147483647';
            bar.style.backgroundColor = settings.bookmarkBar.backgroundColor || '#f1f3f4';
            bar.style.opacity = (settings.bookmarkBar.opacity || 100) / 100;
            bar.style.display = 'flex';
            bar.style.transition = 'all 0.3s ease';
            
            // 투명 모드 설정
            if (settings.bookmarkBar.style === 'transparent') {
              bar.style.backgroundColor = 'transparent';
              bar.style.boxShadow = 'none';
            } else if (settings.bookmarkBar.style === 'translucent') {
              bar.style.backgroundColor = 'rgba(241, 243, 244, 0.8)';
              bar.style.backdropFilter = 'blur(5px)';
            }

            // 위치에 따른 스타일 설정
            if (barPosition === 'top') {
              bar.style.top = '0';
              bar.style.left = '0';
              bar.style.right = '0';
              bar.style.width = '100%';
              bar.style.flexDirection = 'row';
            } else if (barPosition === 'bottom') {
              bar.style.bottom = '0';
              bar.style.left = '0';
              bar.style.right = '0';
              bar.style.width = '100%';
              bar.style.flexDirection = 'row';
            } else if (barPosition === 'left') {
              bar.style.top = '0';
              bar.style.left = '0';
              bar.style.bottom = '0';
              bar.style.width = 'auto';
              bar.style.height = '100%';
              bar.style.flexDirection = 'column';
              bar.style.minWidth = '40px';
            } else if (barPosition === 'right') {
              bar.style.top = '0';
              bar.style.right = '0';
              bar.style.bottom = '0';
              bar.style.width = 'auto';
              bar.style.minWidth = '40px';
              bar.style.height = '100%';
              bar.style.flexDirection = 'column';
              bar.style.minWidth = '40px';
            }

            // 북마크 컨테이너 생성
            const container = document.createElement('div');
            container.id = 'bookmark-container';
            container.style.display = 'flex';
            container.style.flexWrap = 'wrap';
            container.style.overflow = 'auto';
            container.style.flex = '1';
            
            // 위치에 따른 컨테이너 방향 설정
            if (barPosition === 'left' || barPosition === 'right') {
              container.style.flexDirection = 'column';
              container.style.alignItems = 'center';
            } else {
              container.style.flexDirection = 'row';
              container.style.alignItems = 'center';
            }
            
            // 컨테이너를 바에 추가
            bar.appendChild(container);
            
            // 로딩 메시지 추가
            const loadingMsg = document.createElement('div');
            loadingMsg.id = 'bookmark-loading';
            loadingMsg.textContent = '북마크 로드 중...';
            loadingMsg.style.padding = '10px';
            loadingMsg.style.color = settings.bookmarkBar.textColor || '#333333';
            loadingMsg.style.textAlign = 'center';
            loadingMsg.style.width = '100%';
            container.appendChild(loadingMsg);

            // 북마크 바를 body에 추가
            document.body.appendChild(bar);
            
            // Chrome 북마크 바 숨김 설정 적용
            if (settings.bookmarkBar && settings.bookmarkBar.hideChrome) {
              toggleChromeBookmarkBar(true);
            }
            
            // 북마크 버튼 생성 및 추가
            if (settings.bookmarkButton && settings.bookmarkButton.show !== false) {
              const button = createBookmarkButton(settings);
              document.body.appendChild(button);
            }
            
            // 캐시된 북마크 데이터가 있으면 즉시 표시
            let cachedBookmarks = null;
            if (typeof BookmarkCache !== 'undefined') {
              cachedBookmarks = BookmarkCache.getBookmarks();
            }
            
            const useCachedIcons = settings.bookmarkBar && settings.bookmarkBar.cacheIcons !== false;
            
            if (cachedBookmarks && useCachedIcons) {
              console.log('캐시된 북마크 데이터 사용 (빠른 로드)');
              setTimeout(() => {
                displayBookmarks(cachedBookmarks);
                
                // 로딩 시간 측정 및 로그
                const loadTime = performance.now() - startTime;
                console.log(`북마크 바 초기 로드 완료: ${loadTime.toFixed(2)}ms`);
                
                // 백그라운드에서 최신 데이터 로드
                setTimeout(() => {
                  fetchFreshBookmarks();
                }, 1000);
              }, 0);
            } else {
              // 캐시된 데이터가 없으면 직접 로드
              fetchFreshBookmarks();
            }
            
            // MutationObserver 설정
            setupMutationObserver();
            
            // URL 변경 감지 시작
            startUrlChangeDetection();
            
            console.log('북마크 바 사전 초기화 완료');
            
            // 이벤트 리스너 제거
            if (document.removeEventListener) {
              document.removeEventListener('DOMContentLoaded', appendBarToBody);
            }
            clearInterval(checkInterval);
          }
        }

        // body 요소가 생성되는지 주기적으로 확인
        const checkInterval = setInterval(appendBarToBody, 10);
        
        // DOMContentLoaded 이벤트에도 리스너 추가 (백업)
        document.addEventListener('DOMContentLoaded', appendBarToBody);
        
        // 이미 body가 있으면 즉시 실행
        if (document.body) {
          appendBarToBody();
        }
      });
    }

    // 북마크 추가 버튼 생성 함수
    function createBookmarkButton(settings) {
      // 설정 확인
      const buttonSettings = settings.bookmarkButton || {};
      
      // 버튼 표시 여부 체크
      if (buttonSettings.show === false) {
        // 기존 버튼 제거
        const existingButton = document.getElementById('add-bookmark-button');
        if (existingButton) {
          existingButton.remove();
        }
        return null;
      }
      
      // 기존 버튼 확인
      bookmarkButton = document.getElementById('add-bookmark-button');
      
      // 새 버튼 생성
      if (!bookmarkButton) {
        bookmarkButton = document.createElement('button');
        bookmarkButton.id = 'add-bookmark-button';
        bookmarkButton.className = 'add-bookmark-button';
        bookmarkButton.title = getMessage('addBookmark');
        
        // 클릭 이벤트 리스너
        bookmarkButton.addEventListener('click', addCurrentPageToBookmarks);
      }
      
      // 버튼 스타일 설정
      const size = buttonSettings.size || '40px';
      bookmarkButton.style.position = 'fixed';
      bookmarkButton.style.zIndex = '2147483646';
      bookmarkButton.style.width = size;
      bookmarkButton.style.height = size;
      bookmarkButton.style.borderRadius = '50%';
      bookmarkButton.style.cursor = 'pointer';
      bookmarkButton.style.boxShadow = '0 2px 5px rgba(0, 0, 0, 0.3)';
      bookmarkButton.style.transition = 'all 0.3s ease';
      bookmarkButton.style.border = 'none';
      bookmarkButton.style.backgroundColor = buttonSettings.backgroundColor || '#4285F4';
      bookmarkButton.style.color = buttonSettings.textColor || 'white';
      bookmarkButton.style.fontSize = parseInt(size) * 0.5 + 'px';
      bookmarkButton.style.fontWeight = 'bold';
      
      // 위치 설정
      const position = buttonSettings.position || 'bottomRight';
      const margin = '20px';
      
      // 모든 위치 초기화
      bookmarkButton.style.top = '';
      bookmarkButton.style.bottom = '';
      bookmarkButton.style.left = '';
      bookmarkButton.style.right = '';
      
      // 위치별 스타일 적용
      switch (position) {
        case 'topLeft':
          bookmarkButton.style.top = margin;
          bookmarkButton.style.left = margin;
          break;
        case 'topRight':
          bookmarkButton.style.top = margin;
          bookmarkButton.style.right = margin;
          break;
        case 'bottomLeft':
          bookmarkButton.style.bottom = margin;
          bookmarkButton.style.left = margin;
          break;
        case 'bottomRight':
        default:
          bookmarkButton.style.bottom = margin;
          bookmarkButton.style.right = margin;
          break;
      }
      
      // 커스텀 이미지 설정
      if (buttonSettings.customImage) {
        bookmarkButton.innerHTML = '';
        bookmarkButton.style.backgroundImage = `url(${buttonSettings.customImage})`;
        bookmarkButton.style.backgroundSize = 'cover';
        bookmarkButton.style.backgroundPosition = 'center';
      } else {
        bookmarkButton.innerHTML = '+';
        bookmarkButton.style.backgroundImage = '';
      }
      
      // 드래그로 위치 조정 기능 추가
      addDragFunctionality(bookmarkButton);
      
      return bookmarkButton;
    }

    // 드래그 기능 추가 함수
    function addDragFunctionality(element) {
      let isDragging = false;
      let startX, startY;
      let elementX, elementY;
      
      // 요소를 드래그할 수 있도록 설정
      element.style.cursor = 'move';
      
      // 드래그 시작
      element.addEventListener('mousedown', (e) => {
        // 좌클릭인 경우에만 드래그 허용 (우클릭 메뉴 방지)
        if (e.button !== 0) return;
        
        e.preventDefault();
        
        // 현재 위치 저장
        startX = e.clientX;
        startY = e.clientY;
        
        // 요소의 현재 위치 가져오기
        const rect = element.getBoundingClientRect();
        elementX = rect.left;
        elementY = rect.top;
        
        isDragging = true;
        
        // 임시 스타일 적용 (드래그 중 표시)
        element.style.opacity = '0.8';
      });
      
      // 드래그 중
      document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        
        // 이동 거리 계산
        const deltaX = e.clientX - startX;
        const deltaY = e.clientY - startY;
        
        // 새 위치 계산
        const newX = elementX + deltaX;
        const newY = elementY + deltaY;
        
        // 화면 경계 확인 (완전히 화면 밖으로 나가지 않도록)
        const maxX = window.innerWidth - element.offsetWidth;
        const maxY = window.innerHeight - element.offsetHeight;
        
        const boundedX = Math.max(0, Math.min(newX, maxX));
        const boundedY = Math.max(0, Math.min(newY, maxY));
        
        // 위치 업데이트
        element.style.left = boundedX + 'px';
        element.style.top = boundedY + 'px';
      });
      
      // 드래그 종료
      document.addEventListener('mouseup', () => {
        if (!isDragging) return;
        
        isDragging = false;
        
        // 스타일 복원
        element.style.opacity = '1';
        
        // 새 위치 저장 (옵션)
        if (element.id === 'bookmark-button') {
          const rect = element.getBoundingClientRect();
          const position = {
            top: rect.top,
            left: rect.left
          };
          
          // 설정 업데이트
          chrome.storage.sync.get(defaultSettings, (data) => {
            const updatedSettings = { ...data };
            
            // 버튼 위치 저장
            if (!updatedSettings.bookmarkButton) {
              updatedSettings.bookmarkButton = {};
            }
            updatedSettings.bookmarkButton.customPosition = position;
            
            // 설정 저장
            chrome.storage.sync.set(updatedSettings);
          });
        }
      });
      
      // 좌표가 이미 저장되어 있다면 적용
      if (element.id === 'bookmark-button') {
        chrome.storage.sync.get(defaultSettings, (data) => {
          if (data.bookmarkButton && data.bookmarkButton.customPosition) {
            const pos = data.bookmarkButton.customPosition;
            element.style.top = pos.top + 'px';
            element.style.left = pos.left + 'px';
          }
        });
      }
    }

    // 전역 객체에 필요한 함수 노출
    window.BookStaxx.createBookmarkBar = createBookmarkBar;
    window.BookStaxx.loadBookmarks = loadBookmarks;
    window.BookStaxx.applySettings = applySettings;
    window.BookStaxx.initBookmarkBar = initBookmarkBar;
    window.BookStaxx.createBookmarkButton = createBookmarkButton;
    
    // 메시지 리스너 설정
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      // ... existing code ...
    });
    
    // 초기화 함수 호출
    preInit();
    
  })();
}
