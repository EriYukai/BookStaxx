// 사용자 설정 기본값
const defaultSettings = {
  bookmarkButton: {
    position: { top: '100px', left: '10px' },
    size: { width: '40px', height: '40px' },
    image: null, // 기본 이미지는 CSS에서 처리
    visible: true // 북마크 버튼 표시 여부 설정 추가
  },
  bookmarkBar: {
    position: 'top', // top, left, right, bottom
    displayStyle: 'smallIconsOnly', // smallIconsOnly, smallIconsWithText, largeIconsOnly, largeIconsWithText
    hideChrome: false, // 추가된 hideChrome 옵션
    design: {
      opacity: 100,
      backgroundColor: '#f1f3f4',
      padding: 'medium',
      border: 'thin'
    }
  }
};

// 사용자 설정 로드
let userSettings = {};

// 통합 설정 객체
let settings = {
  showBookmarkButton: true,
  bookmarkBarPosition: 'top',
  showBookmarkText: false
};

// 북마크 버튼 요소
let bookmarkButton = null;

// 북마크 바 요소
let bookmarkBar = null;

// 초기화 완료 플래그
let isInitialized = false;

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

// 설정 로드 함수
function loadSettings(callback) {
  console.log('설정 로드 시작');
  
  // 로컬 스토리지에서 설정 로드
  chrome.storage.local.get(['settings', 'bookStaxxSettings'], (localData) => {
    if (chrome.runtime.lastError) {
      console.error('설정 로드 오류:', chrome.runtime.lastError.message);
      userSettings = JSON.parse(JSON.stringify(defaultSettings));
    } else if (localData.settings) {
      userSettings = localData.settings;
      console.log('로컬 스토리지에서 설정 로드됨 (settings 키)');
    } else if (localData.bookStaxxSettings) {
      userSettings = localData.bookStaxxSettings;
      console.log('로컬 스토리지에서 설정 로드됨 (bookStaxxSettings 키)');
      
      // 설정을 새 키로 마이그레이션
      chrome.storage.local.set({ 'settings': userSettings }, () => {
        console.log('설정을 새 키로 마이그레이션했습니다.');
      });
    } else {
      // 동기화 스토리지에서 설정 로드 시도
      chrome.storage.sync.get(['settings', 'bookStaxxSettings'], (syncData) => {
        if (syncData.settings) {
          userSettings = syncData.settings;
          console.log('동기화 스토리지에서 설정 로드됨 (settings 키)');
          
          // 설정을 로컬 스토리지로 마이그레이션
          chrome.storage.local.set({ 'settings': userSettings }, () => {
            console.log('설정을 로컬 스토리지로 마이그레이션했습니다.');
          });
        } else if (syncData.bookStaxxSettings) {
          userSettings = syncData.bookStaxxSettings;
          console.log('동기화 스토리지에서 설정 로드됨 (bookStaxxSettings 키)');
          
          // 설정을 로컬 스토리지로 마이그레이션
          chrome.storage.local.set({ 'settings': userSettings }, () => {
            console.log('설정을 로컬 스토리지로 마이그레이션했습니다.');
          });
        } else {
          userSettings = JSON.parse(JSON.stringify(defaultSettings));
          console.log('기본 설정 사용');
        }
        
        // 통합 설정 객체 업데이트
        updateSettings();
        
        if (callback) callback();
      });
      return; // 동기화 스토리지 로드 중에는 여기서 종료
    }
    
    // 통합 설정 객체 업데이트
    updateSettings();
    
    if (callback) callback();
  });
}

// 통합 설정 객체 업데이트 함수
function updateSettings() {
  // 기본 설정과 사용자 설정을 통합
  settings = {
    // 북마크 버튼 표시 여부
    showBookmarkButton: userSettings.bookmarkButton?.visible !== false,
    
    // 북마크 바 위치
    bookmarkBarPosition: userSettings.bookmarkBar?.position || 'top',
    
    // 북마크 표시 스타일
    displayStyle: userSettings.bookmarkBar?.displayStyle || 'smallIconsOnly',
    
    // 북마크 텍스트 표시 여부
    showBookmarkText: userSettings.bookmarkBar?.displayStyle?.includes('WithText') || false,
    
    // 북마크 아이콘 크기
    largeIcons: userSettings.bookmarkBar?.displayStyle?.includes('large') || false,
    
    // 텍스트 위치 (아래에 표시 여부)
    textBelow: userSettings.bookmarkBar?.displayStyle?.includes('WithText') || false,
    
    // Chrome 북마크 바 숨김 여부
    hideChromeBookmarkBar: userSettings.bookmarkBar?.hideChrome !== false,
    
    // 북마크 바 디자인
    design: {
      opacity: userSettings.bookmarkBar?.design?.opacity ?? 100,
      backgroundColor: userSettings.bookmarkBar?.design?.backgroundColor || '#f1f3f4',
      padding: userSettings.bookmarkBar?.design?.padding || 'medium',
      border: userSettings.bookmarkBar?.design?.border || 'thin'
    },
    
    // 북마크 버튼 위치 및 크기
    bookmarkButtonPosition: userSettings.bookmarkButton?.position || { top: '100px', left: '10px' },
    bookmarkButtonSize: userSettings.bookmarkButton?.size || { width: '40px', height: '40px' }
  };
  
  // Chrome 북마크 바 숨김 처리
  toggleChromeBookmarkBar();
  
  console.log('설정 업데이트 완료:', settings);
}

// Chrome 북마크 바 숨김 처리 함수
function toggleChromeBookmarkBar() {
  // Chrome 북마크 바를 숨기는 CSS 추가/제거
  let style = document.getElementById('bookstaxx-hide-chrome-bar');
  
  if (!style) {
    style = document.createElement('style');
    style.id = 'bookstaxx-hide-chrome-bar';
    document.head.appendChild(style);
  }
  
  if (settings.hideChromeBookmarkBar) {
    // Chrome 북마크 바 숨기기
    style.textContent = `
      /* Chrome 북마크 바 숨기기 */
      .bookmark-bar {
        display: none !important;
      }
    `;
  } else {
    // 숨김 해제
    style.textContent = '';
  }
}

// 초기화 함수
function init() {
  if (isInitialized) {
    console.log('이미 초기화되었습니다.');
    return;
  }
  
  console.log('BookStaxx 초기화 시작');
  
  // 설정 로드
  loadSettings(() => {
    console.log('설정 로드 완료:', settings);
    
    // 북마크 버튼 표시 여부 확인
    if (settings.showBookmarkButton) {
      // 북마크 버튼 생성
      createBookmarkButton();
    }
    
    // 북마크 바 생성
    createBookmarkBar();
    
    // 북마크 로드
    loadBookmarks();
    
    // 초기화 완료 표시
    isInitialized = true;
    console.log('BookStaxx 초기화 완료');
  });
}

// 북마크 로드 함수
function loadBookmarks() {
  console.log('북마크 로드 시작');
  
  // 먼저 백그라운드 연결 확인
  checkBackgroundConnection()
    .then(() => {
      // 연결 성공 시 북마크 요청
      chrome.runtime.sendMessage({ action: 'getBookmarks' }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('북마크 로드 실패:', chrome.runtime.lastError.message);
          // 오류 발생 시 빈 북마크 배열로 표시
          displayBookmarks([]);
          
          // 3초 후 다시 시도
          setTimeout(() => {
            console.log('북마크 로드 재시도...');
            loadBookmarks();
          }, 3000);
          return;
        }
        
        if (response && response.bookmarks) {
          console.log(`${response.bookmarks.length}개의 북마크 로드됨`);
          displayBookmarks(response.bookmarks);
        } else {
          console.error('북마크 로드 실패: 응답이 없거나 북마크가 없습니다.');
          displayBookmarks([]);
        }
      });
    })
    .catch(error => {
      console.error('백그라운드 연결 실패로 북마크 로드 불가:', error);
      displayBookmarks([]);
      
      // 5초 후 다시 시도
      setTimeout(() => {
        console.log('백그라운드 연결 및 북마크 로드 재시도...');
        loadBookmarks();
      }, 5000);
    });
}

// 북마크 표시 함수
function displayBookmarks(bookmarks) {
  console.log('북마크 표시 시작');
  
  // 북마크 바가 없으면 생성
  if (!document.getElementById('bookstaxx-bookmark-bar')) {
    createBookmarkBar();
  }
  
  const bookmarkBar = document.getElementById('bookstaxx-bookmark-bar');
  const bookmarkContainer = document.getElementById('bookstaxx-bookmark-container');
  
  if (!bookmarkBar || !bookmarkContainer) {
    console.error('북마크 바 또는 컨테이너를 찾을 수 없습니다.');
    return;
  }
  
  // 기존 북마크 항목 제거
  const existingItems = bookmarkContainer.querySelectorAll('.bookstaxx-bookmark-item');
  existingItems.forEach(item => item.remove());
  
  // 스크롤 화살표 제거 (새로 생성할 예정)
  const existingArrows = bookmarkBar.querySelectorAll('.bookstaxx-scroll-button');
  existingArrows.forEach(arrow => arrow.remove());
  
  // 북마크가 없는 경우 메시지 표시
  if (!bookmarks || bookmarks.length === 0) {
    const emptyMessage = document.createElement('div');
    emptyMessage.className = 'bookstaxx-empty-message';
    emptyMessage.textContent = '북마크가 없습니다.';
    bookmarkContainer.appendChild(emptyMessage);
    return;
  }
  
  // 북마크 표시
  bookmarks.forEach(bookmark => {
    if (bookmark.url) {  // 폴더가 아닌 북마크만 표시
      const bookmarkItem = document.createElement('a');
      bookmarkItem.className = 'bookstaxx-bookmark-item';
      bookmarkItem.href = bookmark.url;
      bookmarkItem.title = bookmark.title;
      
      // 아이콘 생성
      const icon = document.createElement('img');
      icon.className = 'bookstaxx-bookmark-icon';
      
      try {
        // URL에서 도메인 추출
        let domain = new URL(bookmark.url).hostname;
        // www. 접두사 제거
        domain = domain.replace(/^www\./, '');
        
        // 기본 아이콘 URL 설정
        const defaultIconUrl = chrome.runtime.getURL('images/default-favicon.png');
        
        // 파비콘 URL 생성
        if (bookmark.url.startsWith('chrome://')) {
          // Chrome 내부 페이지는 기본 아이콘 사용
          icon.src = defaultIconUrl;
        } else {
          // Google의 favicon 서비스 사용 (더 안정적인 방식으로 변경)
          icon.src = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
        }
        
        // 오류 발생 시 기본 아이콘으로 대체
        icon.onerror = () => {
          console.warn(`아이콘 로드 실패: ${domain}, 기본 아이콘 사용`);
          icon.src = defaultIconUrl;
        };
      } catch (error) {
        console.error('URL 파싱 오류:', error);
        icon.src = chrome.runtime.getURL('images/default-favicon.png');
      }
      
      bookmarkItem.appendChild(icon);
      
      // 설정에 따라 텍스트 표시 여부 결정
      if (settings.showBookmarkText) {
        const text = document.createElement('span');
        text.className = 'bookstaxx-bookmark-text';
        text.textContent = bookmark.title;
        bookmarkItem.appendChild(text);
      }
      
      bookmarkContainer.appendChild(bookmarkItem);
    }
  });
  
  // 스크롤 기능 추가
  addScrollFunctionality(bookmarkBar, bookmarkContainer);
  
  console.log('북마크 표시 완료');
}

// 스크롤 기능 추가
function addScrollFunctionality(bookmarkBar, bookmarkContainer) {
  // 북마크 바 위치 확인
  const isVertical = settings.bookmarkBarPosition === 'left' || settings.bookmarkBarPosition === 'right';
  
  // 스크롤이 필요한지 확인
  let needsScrolling;
  if (isVertical) {
    needsScrolling = bookmarkContainer.scrollHeight > bookmarkBar.clientHeight;
  } else {
    needsScrolling = bookmarkContainer.scrollWidth > bookmarkBar.clientWidth;
  }
  
  if (needsScrolling) {
    console.log('스크롤 화살표 추가');
    
    // 화살표 생성
    const firstArrow = document.createElement('div');
    const secondArrow = document.createElement('div');
    
    if (isVertical) {
      // 세로 방향일 때 위/아래 화살표
      firstArrow.className = 'bookstaxx-scroll-button top';
      firstArrow.innerHTML = '&uarr;';
      
      secondArrow.className = 'bookstaxx-scroll-button bottom';
      secondArrow.innerHTML = '&darr;';
    } else {
      // 가로 방향일 때 좌/우 화살표
      firstArrow.className = 'bookstaxx-scroll-button left';
      firstArrow.innerHTML = '&lt;';
      
      secondArrow.className = 'bookstaxx-scroll-button right';
      secondArrow.innerHTML = '&gt;';
    }
    
    // 클릭 이벤트 추가
    firstArrow.addEventListener('click', () => {
      if (isVertical) {
        bookmarkContainer.scrollTop -= 100;
      } else {
        bookmarkContainer.scrollLeft -= 100;
      }
      updateArrowVisibility();
      showScrollAnimation(isVertical ? 'top' : 'left');
    });
    
    secondArrow.addEventListener('click', () => {
      if (isVertical) {
        bookmarkContainer.scrollTop += 100;
      } else {
        bookmarkContainer.scrollLeft += 100;
      }
      updateArrowVisibility();
      showScrollAnimation(isVertical ? 'bottom' : 'right');
    });
    
    // 자동 스크롤 기능
    let scrollInterval;
    let scrollAnimationTimeout;
    
    // 마우스 오버 시 자동 스크롤
    firstArrow.addEventListener('mouseenter', () => {
      showScrollAnimation(isVertical ? 'top' : 'left');
      
      scrollInterval = setInterval(() => {
        if (isVertical) {
          bookmarkContainer.scrollTop -= 10;
        } else {
          bookmarkContainer.scrollLeft -= 10;
        }
        updateArrowVisibility();
        
        if ((isVertical && bookmarkContainer.scrollTop <= 0) || 
            (!isVertical && bookmarkContainer.scrollLeft <= 0)) {
          clearInterval(scrollInterval);
        }
      }, 50);
    });
    
    firstArrow.addEventListener('mouseleave', () => {
      clearInterval(scrollInterval);
    });
    
    secondArrow.addEventListener('mouseenter', () => {
      showScrollAnimation(isVertical ? 'bottom' : 'right');
      
      scrollInterval = setInterval(() => {
        if (isVertical) {
          bookmarkContainer.scrollTop += 10;
        } else {
          bookmarkContainer.scrollLeft += 10;
        }
        updateArrowVisibility();
        
        if ((isVertical && bookmarkContainer.scrollTop + bookmarkContainer.clientHeight >= bookmarkContainer.scrollHeight) || 
            (!isVertical && bookmarkContainer.scrollLeft + bookmarkContainer.clientWidth >= bookmarkContainer.scrollWidth)) {
          clearInterval(scrollInterval);
        }
      }, 50);
    });
    
    secondArrow.addEventListener('mouseleave', () => {
      clearInterval(scrollInterval);
    });
    
    // 북마크 바에 화살표 추가
    bookmarkBar.appendChild(firstArrow);
    bookmarkBar.appendChild(secondArrow);
    
    // 스크롤 이벤트 리스너 추가
    bookmarkContainer.addEventListener('scroll', updateArrowVisibility);
    
    // 화살표 가시성 업데이트 함수
    function updateArrowVisibility() {
      if (isVertical) {
        // 위쪽 화살표는 스크롤이 0보다 크면 활성화
        firstArrow.style.opacity = bookmarkContainer.scrollTop > 0 ? '1' : '0.3';
        
        // 아래쪽 화살표는 스크롤이 끝에 도달하지 않았으면 활성화
        const isAtEnd = bookmarkContainer.scrollTop + bookmarkContainer.clientHeight >= bookmarkContainer.scrollHeight - 5;
        secondArrow.style.opacity = isAtEnd ? '0.3' : '1';
      } else {
        // 왼쪽 화살표는 스크롤이 0보다 크면 활성화
        firstArrow.style.opacity = bookmarkContainer.scrollLeft > 0 ? '1' : '0.3';
        
        // 오른쪽 화살표는 스크롤이 끝에 도달하지 않았으면 활성화
        const isAtEnd = bookmarkContainer.scrollLeft + bookmarkContainer.clientWidth >= bookmarkContainer.scrollWidth - 5;
        secondArrow.style.opacity = isAtEnd ? '0.3' : '1';
      }
    }
    
    // 초기 화살표 가시성 설정
    updateArrowVisibility();
  }
}

// 북마크 추가 함수
function addBookmark() {
  const title = document.title;
  const url = window.location.href;
  
  console.log(`북마크 추가 시도: ${title} - ${url}`);
  
  // 먼저 백그라운드 연결 확인
  checkBackgroundConnection()
    .then(() => {
      // background.js에 북마크 추가 요청 메시지 전송
      console.log('북마크 추가 메시지 전송 중...');
      chrome.runtime.sendMessage(
        { action: 'addBookmark', title: title, url: url },
        (response) => {
          if (chrome.runtime.lastError) {
            console.error('북마크 추가 실패 (lastError):', chrome.runtime.lastError.message);
            showNotification('북마크 추가에 실패했습니다.');
            return;
          }
          
          console.log('북마크 추가 응답:', response);
          
          if (response && response.success) {
            console.log('북마크 추가 성공:', response.bookmark);
            showNotification('북마크가 추가되었습니다!');
            
            // 북마크 바 업데이트
            setTimeout(() => {
              console.log('북마크 목록 다시 로드 중...');
              loadBookmarks();
            }, 500); // 약간의 지연을 두어 북마크 시스템이 업데이트될 시간을 줍니다
          } else {
            console.error('북마크 추가 실패:', response ? response.error : '응답 없음');
            showNotification('북마크 추가에 실패했습니다.');
          }
        }
      );
    })
    .catch(error => {
      console.error('백그라운드 연결 실패:', error);
      showNotification('확장 프로그램 연결에 실패했습니다.');
    });
}

// 알림 표시 함수
function showNotification(message) {
  const notification = document.createElement('div');
  notification.className = 'bookstaxx-notification';
  notification.textContent = message;
  
  // 알림 스타일 설정
  notification.style.cssText = 'position: fixed; top: 20px; right: 20px; background-color: #4285f4; color: white; padding: 10px 20px; border-radius: 4px; z-index: 10000; box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2); transition: opacity 0.3s;';
  
  document.body.appendChild(notification);
  
  // 3초 후 알림 제거
  setTimeout(() => {
    notification.style.opacity = '0';
    setTimeout(() => {
      notification.remove();
    }, 300);
  }, 3000);
}

// 북마크 버튼 생성 함수
function createBookmarkButton() {
  // 이미 존재하는 버튼이 있으면 제거
  const existingButton = document.getElementById('bookstaxx-bookmark-button');
  if (existingButton) {
    existingButton.remove();
  }
  
  // 새 버튼 생성
  const button = document.createElement('div');
  button.id = 'bookstaxx-bookmark-button';
  button.className = 'bookstaxx-bookmark-button';
  
  // 버튼 스타일 설정
  button.style.position = 'fixed';
  button.style.zIndex = '9998';
  button.style.cursor = 'pointer';
  button.style.width = settings.bookmarkButtonSize.width;
  button.style.height = settings.bookmarkButtonSize.height;
  button.style.top = settings.bookmarkButtonPosition.top;
  button.style.left = settings.bookmarkButtonPosition.left;
  button.style.backgroundColor = '#4285f4';
  button.style.borderRadius = '50%';
  button.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.2)';
  button.style.display = 'flex';
  button.style.alignItems = 'center';
  button.style.justifyContent = 'center';
  button.style.color = 'white';
  button.style.fontSize = '24px';
  button.style.fontWeight = 'bold';
  button.innerHTML = '+';
  
  // 호버 효과
  button.onmouseover = () => {
    button.style.backgroundColor = '#5294ff';
    button.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)';
  };
  
  button.onmouseout = () => {
    button.style.backgroundColor = '#4285f4';
    button.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.2)';
  };
  
  // 클릭 이벤트 추가
  button.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    addBookmark();
  });
  
  // 드래그 가능하게 설정
  makeDraggable(button);
  
  // 크기 조절 가능하게 설정
  makeResizable(button);
  
  // 문서에 버튼 추가
  document.body.appendChild(button);
  
  // 버튼 참조 저장
  bookmarkButton = button;
}

// 북마크 바 생성 함수
function createBookmarkBar() {
  // 이미 존재하는 바가 있으면 제거
  const existingBar = document.getElementById('bookstaxx-bookmark-bar');
  if (existingBar) {
    existingBar.remove();
  }
  
  // 새 북마크 바 생성
  const bookmarkBar = document.createElement('div');
  bookmarkBar.id = 'bookstaxx-bookmark-bar';
  bookmarkBar.className = 'bookstaxx-bookmark-bar';
  
  // 위치 클래스 추가
  const barPosition = settings.bookmarkBarPosition || 'top';
  bookmarkBar.classList.add(`position-${barPosition}`);
  
  // 아이콘 크기 클래스 추가
  if (settings.largeIcons) {
    bookmarkBar.classList.add('large-icons');
  }
  
  // 텍스트 위치 클래스 추가
  if (settings.textBelow) {
    bookmarkBar.classList.add('text-below');
  }
  
  // 북마크 컨테이너 생성
  const bookmarkContainer = document.createElement('div');
  bookmarkContainer.id = 'bookstaxx-bookmark-container';
  bookmarkContainer.className = 'bookstaxx-bookmark-container';
  
  // 북마크 바에 컨테이너 추가
  bookmarkBar.appendChild(bookmarkContainer);
  
  // 디자인 옵션 적용 (컨테이너가 추가된 후에 적용)
  applyDesignOptions(bookmarkBar);
  
  // 문서에 북마크 바 추가
  document.body.appendChild(bookmarkBar);
  
  return bookmarkBar;
}

// 디자인 옵션 적용 함수
function applyDesignOptions(bookmarkBar) {
  if (!settings.design) return;
  
  // 투명도 적용
  if (settings.design.opacity !== undefined) {
    bookmarkBar.style.opacity = settings.design.opacity / 100;
  }
  
  // 배경색 적용
  if (settings.design.backgroundColor) {
    if (settings.design.backgroundColor === 'transparent') {
      bookmarkBar.style.backgroundColor = 'transparent';
      bookmarkBar.style.boxShadow = 'none';
    } else {
      bookmarkBar.style.backgroundColor = settings.design.backgroundColor;
    }
  }
  
  // 여백 적용
  if (settings.design.padding) {
    const bookmarkContainer = bookmarkBar.querySelector('.bookstaxx-bookmark-container');
    if (bookmarkContainer) {
      switch (settings.design.padding) {
        case 'small':
          bookmarkContainer.style.padding = '2px 20px';
          break;
        case 'medium':
          bookmarkContainer.style.padding = '5px 20px';
          break;
        case 'large':
          bookmarkContainer.style.padding = '10px 20px';
          break;
      }
      
      // 세로 방향일 경우 패딩 방향 조정
      if (settings.bookmarkBarPosition === 'left' || settings.bookmarkBarPosition === 'right') {
        switch (settings.design.padding) {
          case 'small':
            bookmarkContainer.style.padding = '20px 2px';
            break;
          case 'medium':
            bookmarkContainer.style.padding = '20px 5px';
            break;
          case 'large':
            bookmarkContainer.style.padding = '20px 10px';
            break;
        }
      }
    }
  }
  
  // 테두리 적용
  if (settings.design.border) {
    switch (settings.design.border) {
      case 'none':
        bookmarkBar.style.borderTop = 'none';
        bookmarkBar.style.borderBottom = 'none';
        bookmarkBar.style.borderLeft = 'none';
        bookmarkBar.style.borderRight = 'none';
        break;
      case 'thin':
        if (settings.bookmarkBarPosition === 'top') {
          bookmarkBar.style.borderBottom = '1px solid #dadce0';
        } else if (settings.bookmarkBarPosition === 'bottom') {
          bookmarkBar.style.borderTop = '1px solid #dadce0';
        } else if (settings.bookmarkBarPosition === 'left') {
          bookmarkBar.style.borderRight = '1px solid #dadce0';
        } else if (settings.bookmarkBarPosition === 'right') {
          bookmarkBar.style.borderLeft = '1px solid #dadce0';
        }
        break;
      case 'medium':
        if (settings.bookmarkBarPosition === 'top') {
          bookmarkBar.style.borderBottom = '2px solid #dadce0';
        } else if (settings.bookmarkBarPosition === 'bottom') {
          bookmarkBar.style.borderTop = '2px solid #dadce0';
        } else if (settings.bookmarkBarPosition === 'left') {
          bookmarkBar.style.borderRight = '2px solid #dadce0';
        } else if (settings.bookmarkBarPosition === 'right') {
          bookmarkBar.style.borderLeft = '2px solid #dadce0';
        }
        break;
      case 'thick':
        if (settings.bookmarkBarPosition === 'top') {
          bookmarkBar.style.borderBottom = '3px solid #dadce0';
        } else if (settings.bookmarkBarPosition === 'bottom') {
          bookmarkBar.style.borderTop = '3px solid #dadce0';
        } else if (settings.bookmarkBarPosition === 'left') {
          bookmarkBar.style.borderRight = '3px solid #dadce0';
        } else if (settings.bookmarkBarPosition === 'right') {
          bookmarkBar.style.borderLeft = '3px solid #dadce0';
        }
        break;
    }
  }
}

// 요소를 드래그 가능하게 만드는 함수
function makeDraggable(element) {
  let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
  
  element.onmousedown = dragMouseDown;
  
  function dragMouseDown(e) {
    e.preventDefault();
    
    // 마우스 위치 가져오기
    pos3 = e.clientX;
    pos4 = e.clientY;
    document.onmouseup = closeDragElement;
    document.onmousemove = elementDrag;
  }
  
  function elementDrag(e) {
    e.preventDefault();
    
    // 새 위치 계산
    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;
    
    // 요소 위치 설정
    element.style.top = (element.offsetTop - pos2) + "px";
    element.style.left = (element.offsetLeft - pos1) + "px";
  }
  
  function closeDragElement() {
    // 드래그 중지
    document.onmouseup = null;
    document.onmousemove = null;
    
    // 설정 업데이트
    settings.bookmarkButtonPosition = {
      top: element.style.top,
      left: element.style.left
    };
    
    // 설정 저장
    saveSettings();
  }
}

// 요소의 크기를 조절 가능하게 만드는 함수
function makeResizable(element) {
  // 크기 조절 핸들 생성
  const resizer = document.createElement('div');
  resizer.className = 'bookstaxx-resizer';
  resizer.style.position = 'absolute';
  resizer.style.width = '10px';
  resizer.style.height = '10px';
  resizer.style.right = '0';
  resizer.style.bottom = '0';
  resizer.style.cursor = 'se-resize';
  resizer.style.backgroundColor = 'rgba(255, 255, 255, 0.5)';
  resizer.style.borderRadius = '50%';
  
  element.appendChild(resizer);
  
  let original_width = 0;
  let original_height = 0;
  let original_x = 0;
  let original_y = 0;
  let original_mouse_x = 0;
  let original_mouse_y = 0;
  
  resizer.addEventListener('mousedown', initResize, false);
  
  function initResize(e) {
    e.preventDefault();
    original_width = parseFloat(getComputedStyle(element, null).getPropertyValue('width').replace('px', ''));
    original_height = parseFloat(getComputedStyle(element, null).getPropertyValue('height').replace('px', ''));
    original_x = element.getBoundingClientRect().left;
    original_y = element.getBoundingClientRect().top;
    original_mouse_x = e.pageX;
    original_mouse_y = e.pageY;
    window.addEventListener('mousemove', resize, false);
    window.addEventListener('mouseup', stopResize, false);
  }
  
  function resize(e) {
    const newWidth = e.clientX - element.getBoundingClientRect().left;
    const newHeight = e.clientY - element.getBoundingClientRect().top;
    
    // 최소 크기 제한
    const minSize = 20;
    element.style.width = Math.max(minSize, newWidth) + 'px';
    element.style.height = Math.max(minSize, newHeight) + 'px';
  }
  
  function stopResize() {
    window.removeEventListener('mousemove', resize, false);
    window.removeEventListener('mouseup', stopResize, false);
    
    // 설정 업데이트
    settings.bookmarkButtonSize = {
      width: element.style.width,
      height: element.style.height
    };
    
    // 설정 저장
    saveSettings();
  }
}

// 설정 저장 함수
function saveSettings() {
  // 설정 객체에서 사용자 설정 업데이트
  userSettings.bookmarkButton.position = settings.bookmarkButtonPosition;
  userSettings.bookmarkButton.size = settings.bookmarkButtonSize;
  userSettings.bookmarkButton.visible = settings.showBookmarkButton;
  userSettings.bookmarkBar.position = settings.bookmarkBarPosition;
  userSettings.bookmarkBar.hideChrome = settings.hideChromeBookmarkBar;
  userSettings.bookmarkBar.design = settings.design;
  
  // 로컬 스토리지에 저장
  chrome.storage.local.set({ 'settings': userSettings }, () => {
    console.log('설정 저장 완료');
  });
}

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOMContentLoaded 이벤트 발생');
  init();
});

// 페이지가 완전히 로드된 후 다시 한번 초기화 시도 (일부 페이지에서 DOMContentLoaded가 너무 일찍 발생하는 경우 대비)
window.addEventListener('load', () => {
  console.log('Window load 이벤트 발생');
  init();
});

// 메시지 리스너 등록
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('메시지 수신:', message);
  
  if (message.action === 'bookmarkAdded') {
    // 북마크 추가 알림 표시
    showNotification('북마크가 추가되었습니다!');
    
    // 북마크 바 업데이트
    loadBookmarks();
    
    sendResponse({ success: true });
  } else if (message.action === 'bookmarksUpdated') {
    // 북마크 변경 알림
    console.log('북마크 업데이트 감지, 북마크 바 갱신');
    
    // 북마크 바 업데이트
    loadBookmarks();
    
    sendResponse({ success: true });
  } else if (message.action === 'ping') {
    // 핑 메시지에 응답 (content script가 로드되었는지 확인용)
    console.log('Ping 메시지 수신, 응답 전송');
    sendResponse({ pong: true });
  }
  
  // 비동기 응답을 위해 true 반환
  return true;
});
