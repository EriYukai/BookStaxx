// 전역 변수
let bookmarkBar = null;
let isShiftKeyDown = false;
let isDragging = false;
let initialX, initialY, initialLeft, initialTop;
let theme = 'light'; // 기본 테마는 라이트

// 북마크 바 생성
function createBookmarkBar() {
  // 이미 존재하면 제거
  removeBookmarkBar();
  
  // 새로운 북마크 바 생성
  bookmarkBar = document.createElement('div');
  bookmarkBar.id = 'bookstaxx-bookmark-bar';
  bookmarkBar.className = `bookstaxx-bookmark-bar bookstaxx-${theme}-theme`;
  
  // 위치 설정 (기본값)
  bookmarkBar.style.left = '20px';
  bookmarkBar.style.top = '20px';
  
  // 저장된 위치 가져오기
  chrome.storage.local.get(['position', 'theme'], (result) => {
    if (result.position) {
      bookmarkBar.style.left = result.position.left;
      bookmarkBar.style.top = result.position.top;
    }
    
    if (result.theme) {
      theme = result.theme;
      bookmarkBar.className = `bookstaxx-bookmark-bar bookstaxx-${theme}-theme`;
    }
  });
  
  // 컨테이너 생성
  const container = document.createElement('div');
  container.className = 'bookstaxx-container';
  
  // 헤더 (드래그 영역)
  const header = document.createElement('div');
  header.className = 'bookstaxx-search-container';
  header.style.cursor = 'move';
  
  // 헤더에 드래그 이벤트 추가
  header.addEventListener('mousedown', startDrag);
  
  // 검색 입력 필드
  const searchInput = document.createElement('input');
  searchInput.type = 'text';
  searchInput.className = 'bookstaxx-search-input';
  searchInput.placeholder = '북마크 검색...';
  searchInput.addEventListener('click', (e) => e.stopPropagation());
  searchInput.addEventListener('input', handleSearch);
  
  // 북마크 컨테이너
  const bookmarkContainer = document.createElement('div');
  bookmarkContainer.className = 'bookstaxx-bookmark-container';
  
  // 로딩 메시지
  const loadingMessage = document.createElement('div');
  loadingMessage.className = 'bookstaxx-loading';
  loadingMessage.textContent = '북마크 로딩 중...';
  bookmarkContainer.appendChild(loadingMessage);
  
  // 요소 조합
  header.appendChild(searchInput);
  container.appendChild(header);
  container.appendChild(bookmarkContainer);
  bookmarkBar.appendChild(container);
  
  // 문서에 추가
  document.body.appendChild(bookmarkBar);
  
  // 북마크 데이터 로드
  loadBookmarks(bookmarkContainer);
  
  // 북마크 바 외부 클릭 감지 설정
  document.addEventListener('click', handleOutsideClick);
  
  // 북마크 바 표시
  bookmarkBar.style.visibility = 'visible';
  
  return bookmarkBar;
}

// 북마크 바 제거
function removeBookmarkBar() {
  if (bookmarkBar && bookmarkBar.parentNode) {
    document.removeEventListener('click', handleOutsideClick);
    bookmarkBar.parentNode.removeChild(bookmarkBar);
    bookmarkBar = null;
  }
}

// 북마크 데이터 로드
function loadBookmarks(container) {
  chrome.runtime.sendMessage({ action: 'getBookmarks' }, (response) => {
    // 컨테이너 비우기
    container.innerHTML = '';
    
    if (!response || !response.success) {
      const errorMessage = document.createElement('div');
      errorMessage.className = 'bookstaxx-error';
      errorMessage.textContent = '북마크를 로드할 수 없습니다. 확장 프로그램을 다시 로드해 주세요.';
      container.appendChild(errorMessage);
      return;
    }
    
    const bookmarks = response.bookmarks;
    
    if (!bookmarks || bookmarks.length === 0) {
      const emptyMessage = document.createElement('div');
      emptyMessage.className = 'bookstaxx-loading';
      emptyMessage.textContent = '북마크가 없습니다.';
      container.appendChild(emptyMessage);
      return;
    }
    
    // 북마크 렌더링
    renderBookmarks(bookmarks, container);
  });
}

// 북마크 렌더링
function renderBookmarks(bookmarks, container) {
  bookmarks.forEach(bookmark => {
    if (bookmark.type === 'folder') {
      // 폴더 렌더링
      const folderElement = createFolderElement(bookmark);
      container.appendChild(folderElement);
    } else if (bookmark.type === 'bookmark') {
      // 북마크 렌더링
      const bookmarkElement = createBookmarkElement(bookmark);
      container.appendChild(bookmarkElement);
    }
  });
}

// 폴더 요소 생성
function createFolderElement(folder) {
  const folderElement = document.createElement('div');
  folderElement.className = 'bookstaxx-folder';
  folderElement.dataset.id = folder.id;
  
  // 폴더 헤더
  const folderHeader = document.createElement('div');
  folderHeader.className = 'bookstaxx-folder-header';
  
  // 폴더 아이콘
  const folderIcon = document.createElement('div');
  folderIcon.className = 'bookstaxx-folder-icon';
  
  // 폴더 제목
  const folderTitle = document.createElement('div');
  folderTitle.className = 'bookstaxx-folder-title';
  folderTitle.textContent = folder.title;
  
  // 폴더 컨텐츠 (자식 요소들)
  const folderContent = document.createElement('div');
  folderContent.className = 'bookstaxx-folder-content';
  
  // 폴더 자식 요소 렌더링
  if (folder.children && folder.children.length > 0) {
    renderBookmarks(folder.children, folderContent);
  }
  
  // 폴더 토글 이벤트
  folderHeader.addEventListener('click', (e) => {
    e.stopPropagation();
    folderElement.classList.toggle('bookstaxx-folder-expanded');
  });
  
  // 요소 조합
  folderHeader.appendChild(folderIcon);
  folderHeader.appendChild(folderTitle);
  folderElement.appendChild(folderHeader);
  folderElement.appendChild(folderContent);
  
  return folderElement;
}

// 북마크 요소 생성
function createBookmarkElement(bookmark) {
  const bookmarkElement = document.createElement('div');
  bookmarkElement.className = 'bookstaxx-bookmark';
  bookmarkElement.dataset.id = bookmark.id;
  bookmarkElement.dataset.url = bookmark.url;
  
  // 파비콘 컨테이너
  const faviconContainer = document.createElement('div');
  faviconContainer.className = 'bookstaxx-favicon-container';
  
  // 파비콘 (실제 이미지)
  const favicon = document.createElement('img');
  favicon.className = 'bookstaxx-favicon';
  favicon.src = `chrome://favicon/size/16@1x/${bookmark.url}`;
  favicon.onerror = () => {
    favicon.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="%23666" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>';
  };
  
  // 북마크 제목
  const bookmarkTitle = document.createElement('div');
  bookmarkTitle.className = 'bookstaxx-bookmark-title';
  bookmarkTitle.textContent = bookmark.title || new URL(bookmark.url).hostname;
  
  // 북마크 클릭 이벤트
  bookmarkElement.addEventListener('click', (e) => {
    e.stopPropagation();
    openBookmark(bookmark.url);
  });
  
  // 요소 조합
  faviconContainer.appendChild(favicon);
  bookmarkElement.appendChild(faviconContainer);
  bookmarkElement.appendChild(bookmarkTitle);
  
  return bookmarkElement;
}

// 북마크 열기
function openBookmark(url) {
  chrome.runtime.sendMessage({ action: 'openBookmark', url }, (response) => {
    if (response && response.success) {
      removeBookmarkBar();
    }
  });
}

// 검색 처리
function handleSearch(e) {
  const query = e.target.value.toLowerCase();
  const bookmarkItems = document.querySelectorAll('.bookstaxx-bookmark');
  const folderItems = document.querySelectorAll('.bookstaxx-folder');
  
  if (!query) {
    // 검색어가 없으면 모든 항목 표시
    bookmarkItems.forEach(item => item.style.display = '');
    folderItems.forEach(folder => {
      folder.style.display = '';
      folder.classList.remove('bookstaxx-folder-expanded');
    });
    return;
  }
  
  // 검색 로직
  bookmarkItems.forEach(item => {
    const title = item.querySelector('.bookstaxx-bookmark-title').textContent.toLowerCase();
    const url = item.dataset.url.toLowerCase();
    
    if (title.includes(query) || url.includes(query)) {
      item.style.display = '';
      
      // 상위 폴더 모두 펼치기
      let parent = item.parentElement;
      while (parent && !parent.classList.contains('bookstaxx-bookmark-container')) {
        if (parent.classList.contains('bookstaxx-folder-content')) {
          parent.parentElement.classList.add('bookstaxx-folder-expanded');
          parent.parentElement.style.display = '';
        }
        parent = parent.parentElement;
      }
    } else {
      item.style.display = 'none';
    }
  });
  
  // 빈 폴더 숨기기
  folderItems.forEach(folder => {
    const content = folder.querySelector('.bookstaxx-folder-content');
    const visibleItems = content.querySelectorAll('.bookstaxx-bookmark[style=""], .bookstaxx-folder[style=""]');
    
    if (visibleItems.length === 0) {
      folder.style.display = 'none';
    } else {
      folder.style.display = '';
      folder.classList.add('bookstaxx-folder-expanded');
    }
  });
}

// 바깥쪽 클릭 처리
function handleOutsideClick(e) {
  if (bookmarkBar && !bookmarkBar.contains(e.target)) {
    removeBookmarkBar();
  }
}

// 드래그 시작
function startDrag(e) {
  if (e.target.tagName.toLowerCase() === 'input') {
    return; // 입력 필드에서는 드래그 금지
  }
  
  e.preventDefault();
  isDragging = true;
  initialX = e.clientX;
  initialY = e.clientY;
  
  const rect = bookmarkBar.getBoundingClientRect();
  initialLeft = rect.left;
  initialTop = rect.top;
  
  document.addEventListener('mousemove', handleDrag);
  document.addEventListener('mouseup', stopDrag);
}

// 드래그 처리
function handleDrag(e) {
  if (!isDragging) return;
  
  e.preventDefault();
  
  const dx = e.clientX - initialX;
  const dy = e.clientY - initialY;
  
  const newLeft = initialLeft + dx;
  const newTop = initialTop + dy;
  
  // 화면 경계 확인
  const maxX = window.innerWidth - bookmarkBar.offsetWidth;
  const maxY = window.innerHeight - bookmarkBar.offsetHeight;
  
  bookmarkBar.style.left = `${Math.max(0, Math.min(maxX, newLeft))}px`;
  bookmarkBar.style.top = `${Math.max(0, Math.min(maxY, newTop))}px`;
}

// 드래그 중지
function stopDrag() {
  if (!isDragging) return;
  
  isDragging = false;
  document.removeEventListener('mousemove', handleDrag);
  document.removeEventListener('mouseup', stopDrag);
  
  // 위치 저장
  chrome.storage.local.set({
    position: {
      left: bookmarkBar.style.left,
      top: bookmarkBar.style.top
    }
  });
}

// 키보드 이벤트 리스너
document.addEventListener('keydown', (e) => {
  if (e.key === 'Shift') {
    isShiftKeyDown = true;
  }
  
  // Shift + B 북마크 바 토글
  if (isShiftKeyDown && e.key.toLowerCase() === 'b') {
    e.preventDefault();
    toggleBookmarkBar();
  }
  
  // ESC 키로 북마크 바 닫기
  if (e.key === 'Escape' && bookmarkBar) {
    removeBookmarkBar();
  }
});

document.addEventListener('keyup', (e) => {
  if (e.key === 'Shift') {
    isShiftKeyDown = false;
  }
});

// 북마크 바 토글
function toggleBookmarkBar() {
  if (bookmarkBar) {
    removeBookmarkBar();
  } else {
    createBookmarkBar();
  }
}

// 테마 변경
function changeTheme(newTheme) {
  theme = newTheme;
  if (bookmarkBar) {
    bookmarkBar.className = `bookstaxx-bookmark-bar bookstaxx-${theme}-theme`;
  }
  chrome.storage.local.set({ theme });
}

// 확장 프로그램 메시지 리스너
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'toggleBookmarks') {
    toggleBookmarkBar();
    sendResponse({ success: true });
  }
  
  if (request.action === 'changeTheme') {
    changeTheme(request.theme);
    sendResponse({ success: true });
  }
  
  if (request.action === 'showBookmarkBar') {
    createBookmarkBar();
    sendResponse({ success: true });
  }
  
  return true;
});

// 자동으로 다크 모드 감지
function detectColorScheme() {
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    changeTheme('dark');
  } else {
    changeTheme('light');
  }
}

// 초기화
detectColorScheme();

// 다크 모드 변경 감지
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', detectColorScheme); 