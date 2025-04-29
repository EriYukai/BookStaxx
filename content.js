console.log("BookStaxx content script loaded.");

// 전역 변수 정의
let bookmarkBar = null;      // 현재 활성화된 북마크 바 요소
let preventAutoClose = false;  // 자동 닫힘 방지 플래그
let isInitialized = false;     // 초기화 상태 플래그
let contextInvalidated = false; // 컨텍스트 무효화 상태

// 전역 변수
let bookmarkBarVisible = false;
let bookmarkBarElement = null;
let clickPosition = { x: 0, y: 0 };

// 기본 설정
const defaultSettings = {
    activationMethod: 'both',
    hotkey: 'b',
    hotkeyModifier: 'alt',
    openInNewTab: true,
    focusNewTab: true,
    autoCloseAfterSelect: true,
    positionNearClick: true,
    theme: 'auto'
};

// 현재 설정
let currentSettings = {...defaultSettings};

// 북마크 바 요소 ID
const BOOKMARK_BAR_ID = 'bookstaxx-bookmark-bar';

// 이벤트 리스너 추가
document.addEventListener('DOMContentLoaded', initializeBookStaxx);

// BookStaxx 초기화 함수
function initializeBookStaxx() {
    try {
        console.log("BookStaxx 초기화");
        
        // 설정 로드
        loadAppSettings();
        
        // 이벤트 리스너 등록
        registerEventListeners();
    } catch (error) {
        console.error("BookStaxx 초기화 중 오류:", error);
    }
}

// 설정 로드 함수
function loadAppSettings() {
    try {
        console.log("설정 로드 시작");
        
        // 설정 요청
        chrome.runtime.sendMessage({ action: "getSettings" }, function(response) {
            // 응답이 없는 경우
            if (!response) {
                console.error("설정 로드 실패: 응답 없음");
                currentSettings = {...defaultSettings};
                return;
            }
            
            // 오류 응답
            if (response.error) {
                console.error("설정 로드 실패:", response.error);
                currentSettings = {...defaultSettings};
                return;
            }
            
            // 설정 데이터
            const settings = response.settings || defaultSettings;
            
            // 현재 설정 업데이트
            currentSettings = {...defaultSettings, ...settings};
            
            console.log("설정 로드 완료:", currentSettings);
        });
    } catch (error) {
        console.error("설정 로드 중 오류:", error);
        currentSettings = {...defaultSettings};
    }
}

// 이벤트 리스너 등록 함수
function registerEventListeners() {
    try {
        console.log("이벤트 리스너 등록 시작");
        
        // 키보드 이벤트 리스너 등록
        document.addEventListener('keydown', handleKeyDown);
        
        // 마우스 클릭 이벤트 리스너 등록
        document.addEventListener('click', handleDocumentClick);
        
        // 마우스 우클릭 이벤트 리스너 등록
        document.addEventListener('contextmenu', handleContextMenu);
        
        console.log("이벤트 리스너 등록 완료");
    } catch (error) {
        console.error("이벤트 리스너 등록 중 오류:", error);
    }
}

// 키보드 이벤트 처리 함수
function handleKeyDown(event) {
    try {
        // 현재 설정의 핫키 및 모디파이어
        const hotkey = (currentSettings.hotkey || 'b').toLowerCase();
        const hotkeyModifier = currentSettings.hotkeyModifier || 'alt';
        
        // 핫키 조합 확인
        const isHotkeyPressed = event.key.toLowerCase() === hotkey;
        
        // 모디파이어 키 확인
        let isModifierPressed = false;
        
        // 모디파이어에 따라 확인
        switch (hotkeyModifier) {
            case 'alt':
                isModifierPressed = event.altKey;
                break;
            case 'ctrl':
                isModifierPressed = event.ctrlKey;
                break;
            case 'shift':
                isModifierPressed = event.shiftKey;
                break;
            case 'meta':
                isModifierPressed = event.metaKey;
                break;
            case 'none':
                isModifierPressed = true; // 모디파이어 없음
                break;
            default:
                isModifierPressed = event.altKey; // 기본값
        }
        
        // 핫키와 모디파이어가 모두 눌렸는지 확인
        if (isHotkeyPressed && isModifierPressed) {
            // 활성화 방식 확인
            if (currentSettings.activationMethod === 'both' || currentSettings.activationMethod === 'hotkey') {
                // 북마크 바 토글
                toggleBookmarkBar(event);
                
                // 이벤트 처리 중단
                event.preventDefault();
                event.stopPropagation();
            }
        }
    } catch (error) {
        console.error("키보드 이벤트 처리 중 오류:", error);
    }
}

// 마우스 클릭 이벤트 처리 함수
function handleDocumentClick(event) {
    try {
        // 마우스 오른쪽 버튼 클릭 확인
        const isRightClick = event.button === 2;
        
        // 북마크 바 요소 확인
        const isBookmarkBarElement = event.target.closest(`#${BOOKMARK_BAR_ID}`) !== null;
        const isBookstaxxElement = event.target.getAttribute('data-bookstaxx-element') === 'true';
        
        // 북마크 바 이외의 영역 클릭 시 북마크 바 제거
        if (bookmarkBarVisible && !isBookmarkBarElement && !isBookstaxxElement) {
            removeBookmarkBar();
            return;
        }
        
        // 클릭 위치 저장
        clickPosition = {
            x: event.clientX,
            y: event.clientY
        };
    } catch (error) {
        console.error("마우스 클릭 이벤트 처리 중 오류:", error);
    }
}

// 우클릭 이벤트 처리 함수
function handleContextMenu(event) {
    try {
        // 활성화 방식 확인
        if (currentSettings.activationMethod === 'both' || currentSettings.activationMethod === 'rightclick') {
            // 북마크 바 토글
            toggleBookmarkBar(event);
            
            // 이벤트 처리 중단
            event.preventDefault();
            event.stopPropagation();
        }
    } catch (error) {
        console.error("우클릭 이벤트 처리 중 오류:", error);
    }
}

// 북마크 바 토글 함수
function toggleBookmarkBar(event) {
    try {
        // 북마크 바가 이미 표시되어 있는 경우 제거
        if (bookmarkBarVisible) {
            removeBookmarkBar();
            return;
        }
        
        // 클릭 위치 갱신
        if (event && 'clientX' in event && 'clientY' in event) {
            clickPosition = {
                x: event.clientX,
                y: event.clientY
            };
        }
        
        // 북마크 바 생성
        createBookmarkBar();
    } catch (error) {
        console.error("북마크 바 토글 중 오류:", error);
    }
}

// 북마크 바 생성 함수
function createBookmarkBar() {
    try {
        console.log("북마크 바 생성 시작");
        
        // 중복 생성 방지
        if (bookmarkBarVisible) {
            console.log("북마크 바가 이미 표시되어 있음");
            return;
        }
        
        // 기존 북마크 바 제거
        removeBookmarkBar();
        
        // 북마크 바 요소 생성
        const bookmarkBar = document.createElement('div');
        bookmarkBar.id = BOOKMARK_BAR_ID;
        bookmarkBar.className = 'bookstaxx-bookmark-bar';
        bookmarkBar.setAttribute('data-bookstaxx-element', 'true');
        
        // 테마 적용
        applyTheme(bookmarkBar);
        
        // 북마크 바 내부 컨테이너 생성
        const container = document.createElement('div');
        container.className = 'bookstaxx-container';
        container.setAttribute('data-bookstaxx-element', 'true');
        
        // 검색 컨테이너 생성
        const searchContainer = document.createElement('div');
        searchContainer.className = 'bookstaxx-search-container';
        searchContainer.setAttribute('data-bookstaxx-element', 'true');
        
        // 검색 입력 요소 생성
        const searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.className = 'bookstaxx-search-input';
        searchInput.placeholder = '북마크 검색...';
        searchInput.setAttribute('data-bookstaxx-element', 'true');
        
        // 검색 컨테이너에 검색 입력 요소 추가
        searchContainer.appendChild(searchInput);
        
        // 북마크 컨테이너 생성
        const bookmarkContainer = document.createElement('div');
        bookmarkContainer.className = 'bookstaxx-bookmark-container';
        bookmarkContainer.setAttribute('data-bookstaxx-element', 'true');
        
        // 컨테이너에 요소 추가
        container.appendChild(searchContainer);
        container.appendChild(bookmarkContainer);
        
        // 북마크 바에 컨테이너 추가
        bookmarkBar.appendChild(container);
        
        // body에 북마크 바 추가
        document.body.appendChild(bookmarkBar);
        
        // 북마크 바 위치 설정
        positionBookmarkBar(bookmarkBar);
        
        // 북마크 로드
        loadBookmarks(bookmarkContainer, searchInput);
        
        // 검색 입력 포커스
        setTimeout(() => {
            searchInput.focus();
        }, 100);
        
        // 북마크 바 표시 상태 업데이트
        bookmarkBarVisible = true;
        bookmarkBarElement = bookmarkBar;
        
        console.log("북마크 바 생성 완료");
    } catch (error) {
        console.error("북마크 바 생성 중 오류:", error);
    }
}

// 북마크 바 위치 설정 함수
function positionBookmarkBar(bookmarkBar) {
    try {
        // 클릭 위치 주변에 표시 여부
        const positionNearClick = currentSettings.positionNearClick !== false;
        
        // 기본값: 브라우저 창 중앙
        let left = window.innerWidth / 2 - 200; // 기본 너비 400px 기준
        let top = window.innerHeight / 2 - 150; // 기본 높이 300px 기준
        
        // 클릭 위치 주변에 표시하는 경우
        if (positionNearClick && clickPosition.x !== 0 && clickPosition.y !== 0) {
            left = clickPosition.x;
            top = clickPosition.y;
            
            // 화면 밖으로 나가지 않도록 조정
            if (left + 400 > window.innerWidth) {
                left = window.innerWidth - 420;
            }
            
            if (top + 300 > window.innerHeight) {
                top = window.innerHeight - 320;
            }
            
            if (left < 20) {
                left = 20;
            }
            
            if (top < 20) {
                top = 20;
            }
        }
        
        // 북마크 바 위치 설정
        bookmarkBar.style.left = left + 'px';
        bookmarkBar.style.top = top + 'px';
    } catch (error) {
        console.error("북마크 바 위치 설정 중 오류:", error);
    }
}

// 테마 적용 함수
function applyTheme(element) {
    try {
        // 테마 설정
        const theme = currentSettings.theme || 'auto';
        
        // 현재 시스템 테마 확인
        const prefersDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        
        // 테마 클래스 적용
        if (theme === 'dark' || (theme === 'auto' && prefersDarkMode)) {
            element.classList.add('bookstaxx-dark-theme');
        } else {
            element.classList.add('bookstaxx-light-theme');
        }
    } catch (error) {
        console.error("테마 적용 중 오류:", error);
    }
}

// 북마크 바 제거 함수
function removeBookmarkBar() {
    try {
        console.log("북마크 바 제거 시작");
        
        // 북마크 바 요소 찾기
        const bookmarkBar = document.getElementById(BOOKMARK_BAR_ID);
        
        // 북마크 바 요소가 있는 경우 제거
        if (bookmarkBar) {
            // 북마크 바 제거
            document.body.removeChild(bookmarkBar);
            
            // 북마크 바 표시 상태 업데이트
            bookmarkBarVisible = false;
            bookmarkBarElement = null;
            
            console.log("북마크 바 제거 완료");
        } else {
            console.log("제거할 북마크 바가 없음");
        }
        
        // 북마크 바 표시 상태 초기화
        bookmarkBarVisible = false;
        bookmarkBarElement = null;
    } catch (error) {
        console.error("북마크 바 제거 중 오류:", error);
        
        // 오류 시 상태 초기화
        bookmarkBarVisible = false;
        bookmarkBarElement = null;
    }
}

// 북마크 로드 함수
function loadBookmarks(container, searchInput) {
    try {
        console.log("북마크 로드 시작");
        
        // 컨테이너 초기화
        container.innerHTML = '';
        
        // 북마크 로딩 메시지 표시
        const loadingElement = document.createElement('div');
        loadingElement.className = 'bookstaxx-loading';
        loadingElement.setAttribute('data-bookstaxx-element', 'true');
        loadingElement.textContent = '북마크 로드 중...';
        container.appendChild(loadingElement);
        
        // 북마크 요청
        chrome.runtime.sendMessage({ action: "getBookmarks" }, function(response) {
            // 응답이 없는 경우
            if (!response) {
                displayError(container, "북마크를 가져올 수 없습니다. 응답이 없습니다.");
                return;
            }
            
            // 오류 응답
            if (response.error) {
                displayError(container, response.error);
                return;
            }
            
            // 북마크 데이터
            const bookmarks = response.bookmarks || [];
            
            // 북마크가 없는 경우
            if (bookmarks.length === 0) {
                displayError(container, "북마크가 없습니다.");
                return;
            }
            
            // 컨테이너 초기화
            container.innerHTML = '';
            
            // 북마크 구성
            const bookmarkTree = buildBookmarkTree(bookmarks);
            
            // 검색 기능 초기화
            if (searchInput) {
                initializeSearch(searchInput, container, bookmarks);
            }
            
            // 북마크 트리 표시
            displayBookmarkTree(container, bookmarkTree);
            
            console.log("북마크 로드 완료:", bookmarks.length);
        });
    } catch (error) {
        console.error("북마크 로드 중 오류:", error);
        displayError(container, "북마크 로드 중 오류가 발생했습니다.");
    }
}

// 오류 표시 함수
function displayError(container, message) {
    try {
        // 컨테이너 초기화
        container.innerHTML = '';
        
        // 오류 요소 생성
        const errorElement = document.createElement('div');
        errorElement.className = 'bookstaxx-error';
        errorElement.setAttribute('data-bookstaxx-element', 'true');
        errorElement.textContent = message;
        
        // 컨테이너에 오류 요소 추가
        container.appendChild(errorElement);
    } catch (error) {
        console.error("오류 표시 중 오류:", error);
    }
}

// 북마크 트리 구성 함수
function buildBookmarkTree(bookmarks) {
    try {
        // 북마크 트리
        const tree = {};
        
        // 북마크 ID 맵 생성
        const bookmarkMap = {};
        
        // 루트 폴더 생성
        tree.id = '0';
        tree.title = '북마크';
        tree.children = [];
        
        // 북마크 맵 구성
        bookmarks.forEach(bookmark => {
            bookmarkMap[bookmark.id] = bookmark;
            bookmark.children = [];
        });
        
        // 북마크 트리 구성
        bookmarks.forEach(bookmark => {
            // 부모 ID 확인
            const parentId = bookmark.parentId;
            
            // 부모가 있는 경우 부모의 children에 추가
            if (parentId && bookmarkMap[parentId]) {
                bookmarkMap[parentId].children.push(bookmark);
            } else if (parentId === '0') {
                // 루트 폴더에 추가
                tree.children.push(bookmark);
            }
        });
        
        return tree;
    } catch (error) {
        console.error("북마크 트리 구성 중 오류:", error);
        return { id: '0', title: '북마크', children: [] };
    }
}

// 북마크 트리 표시 함수
function displayBookmarkTree(container, tree) {
    try {
        // 노드 표시 함수
        function displayNode(node, level) {
            // 폴더인 경우
            if (!node.url) {
                // 폴더 컨테이너 생성
                const folderContainer = document.createElement('div');
                folderContainer.className = 'bookstaxx-folder';
                folderContainer.setAttribute('data-bookstaxx-element', 'true');
                folderContainer.setAttribute('data-level', level);
                
                // 폴더 헤더 생성
                const folderHeader = document.createElement('div');
                folderHeader.className = 'bookstaxx-folder-header';
                folderHeader.setAttribute('data-bookstaxx-element', 'true');
                
                // 폴더 아이콘 생성
                const folderIcon = document.createElement('div');
                folderIcon.className = 'bookstaxx-folder-icon';
                folderIcon.setAttribute('data-bookstaxx-element', 'true');
                folderHeader.appendChild(folderIcon);
                
                // 폴더 제목 생성
                const folderTitle = document.createElement('div');
                folderTitle.className = 'bookstaxx-folder-title';
                folderTitle.setAttribute('data-bookstaxx-element', 'true');
                folderTitle.textContent = node.title;
                folderHeader.appendChild(folderTitle);
                
                // 폴더 헤더에 클릭 이벤트 리스너 등록
                folderHeader.addEventListener('click', function(event) {
                    // 폴더 컨테이너 토글
                    folderContainer.classList.toggle('bookstaxx-folder-expanded');
                    
                    // 이벤트 전파 중단
                    event.stopPropagation();
                });
                
                // 폴더 컨테이너에 폴더 헤더 추가
                folderContainer.appendChild(folderHeader);
                
                // 폴더 내용 컨테이너 생성
                const folderContent = document.createElement('div');
                folderContent.className = 'bookstaxx-folder-content';
                folderContent.setAttribute('data-bookstaxx-element', 'true');
                
                // 자식 노드 표시
                if (node.children && node.children.length > 0) {
                    // 자식 노드 정렬 (폴더 먼저, 그 다음 북마크)
                    const sortedChildren = [...node.children].sort((a, b) => {
                        // 폴더 우선
                        const aIsFolder = !a.url;
                        const bIsFolder = !b.url;
                        
                        if (aIsFolder && !bIsFolder) return -1;
                        if (!aIsFolder && bIsFolder) return 1;
                        
                        // 같은 유형이면 이름으로 정렬
                        return a.title.localeCompare(b.title);
                    });
                    
                    // 정렬된 자식 노드 표시
                    sortedChildren.forEach(child => {
                        const childElement = displayNode(child, level + 1);
                        if (childElement) {
                            folderContent.appendChild(childElement);
                        }
                    });
                }
                
                // 폴더 컨테이너에 폴더 내용 추가
                folderContainer.appendChild(folderContent);
                
                // 첫 번째 레벨 폴더는 기본적으로 확장
                if (level === 0 || level === 1) {
                    folderContainer.classList.add('bookstaxx-folder-expanded');
                }
                
                return folderContainer;
            } else {
                // 북마크인 경우
                // 북마크 요소 생성
                const bookmarkElement = document.createElement('div');
                bookmarkElement.className = 'bookstaxx-bookmark';
                bookmarkElement.setAttribute('data-bookstaxx-element', 'true');
                bookmarkElement.setAttribute('data-level', level);
                bookmarkElement.setAttribute('data-url', node.url);
                
                // 파비콘 컨테이너 생성
                const faviconContainer = document.createElement('div');
                faviconContainer.className = 'bookstaxx-favicon-container';
                faviconContainer.setAttribute('data-bookstaxx-element', 'true');
                
                // 파비콘 생성
                const favicon = document.createElement('img');
                favicon.className = 'bookstaxx-favicon';
                favicon.setAttribute('data-bookstaxx-element', 'true');
                favicon.src = `chrome://favicon/${node.url}`;
                favicon.onerror = function() {
                    this.src = 'icon16.png';
                };
                faviconContainer.appendChild(favicon);
                
                // 제목 생성
                const title = document.createElement('div');
                title.className = 'bookstaxx-bookmark-title';
                title.setAttribute('data-bookstaxx-element', 'true');
                title.textContent = node.title;
                
                // 북마크 요소에 파비콘 컨테이너와 제목 추가
                bookmarkElement.appendChild(faviconContainer);
                bookmarkElement.appendChild(title);
                
                // 북마크 요소에 클릭 이벤트 리스너 등록
                bookmarkElement.addEventListener('click', function(event) {
                    // 북마크 열기
                    openBookmark(node.url);
                    
                    // 이벤트 전파 중단
                    event.stopPropagation();
                });
                
                return bookmarkElement;
            }
        }
        
        // 루트 노드 표시
        if (tree.children && tree.children.length > 0) {
            // 정렬된 자식 노드 표시
            const sortedChildren = [...tree.children].sort((a, b) => {
                // 폴더 우선
                const aIsFolder = !a.url;
                const bIsFolder = !b.url;
                
                if (aIsFolder && !bIsFolder) return -1;
                if (!aIsFolder && bIsFolder) return 1;
                
                // 같은 유형이면 이름으로 정렬
                return a.title.localeCompare(b.title);
            });
            
            // 정렬된 자식 노드 표시
            sortedChildren.forEach(child => {
                const childElement = displayNode(child, 0);
                if (childElement) {
                    container.appendChild(childElement);
                }
            });
        }
    } catch (error) {
        console.error("북마크 트리 표시 중 오류:", error);
    }
}

// 검색 기능 초기화 함수
function initializeSearch(searchInput, container, bookmarks) {
    try {
        // 검색 입력에 이벤트 리스너 등록
        searchInput.addEventListener('input', function() {
            // 검색어
            const query = this.value.trim().toLowerCase();
            
            // 검색어가 없는 경우 전체 북마크 트리 표시
            if (!query) {
                const bookmarkTree = buildBookmarkTree(bookmarks);
                container.innerHTML = '';
                displayBookmarkTree(container, bookmarkTree);
                return;
            }
            
            // 검색 결과
            const results = bookmarks.filter(bookmark => {
                // URL이 있는 북마크만 검색 대상
                if (!bookmark.url) return false;
                
                // 제목과 URL에서 검색
                return bookmark.title.toLowerCase().includes(query) ||
                    bookmark.url.toLowerCase().includes(query);
            });
            
            // 컨테이너 초기화
            container.innerHTML = '';
            
            // 검색 결과가 없는 경우
            if (results.length === 0) {
                displayError(container, "검색 결과가 없습니다.");
                return;
            }
            
            // 검색 결과 표시
            results.forEach(bookmark => {
                // 북마크 요소 생성
                const bookmarkElement = document.createElement('div');
                bookmarkElement.className = 'bookstaxx-bookmark';
                bookmarkElement.setAttribute('data-bookstaxx-element', 'true');
                bookmarkElement.setAttribute('data-url', bookmark.url);
                
                // 파비콘 컨테이너 생성
                const faviconContainer = document.createElement('div');
                faviconContainer.className = 'bookstaxx-favicon-container';
                faviconContainer.setAttribute('data-bookstaxx-element', 'true');
                
                // 파비콘 생성
                const favicon = document.createElement('img');
                favicon.className = 'bookstaxx-favicon';
                favicon.setAttribute('data-bookstaxx-element', 'true');
                favicon.src = `chrome://favicon/${bookmark.url}`;
                favicon.onerror = function() {
                    this.src = 'icon16.png';
                };
                faviconContainer.appendChild(favicon);
                
                // 제목 생성
                const title = document.createElement('div');
                title.className = 'bookstaxx-bookmark-title';
                title.setAttribute('data-bookstaxx-element', 'true');
                title.textContent = bookmark.title;
                
                // 북마크 요소에 파비콘 컨테이너와 제목 추가
                bookmarkElement.appendChild(faviconContainer);
                bookmarkElement.appendChild(title);
                
                // 북마크 요소에 클릭 이벤트 리스너 등록
                bookmarkElement.addEventListener('click', function(event) {
                    // 북마크 열기
                    openBookmark(bookmark.url);
                    
                    // 이벤트 전파 중단
                    event.stopPropagation();
                });
                
                // 컨테이너에 북마크 요소 추가
                container.appendChild(bookmarkElement);
            });
        });
        
        // 검색 입력에 키 이벤트 리스너 등록
        searchInput.addEventListener('keydown', function(event) {
            // ESC 키 처리
            if (event.key === 'Escape') {
                // 검색창이 비어 있으면 북마크 바 제거
                if (this.value === '') {
                    removeBookmarkBar();
                } else {
                    // 검색창이 비어 있지 않으면 검색어 지우기
                    this.value = '';
                    this.dispatchEvent(new Event('input'));
                }
                
                // 이벤트 전파 중단
                event.preventDefault();
                event.stopPropagation();
            }
        });
    } catch (error) {
        console.error("검색 기능 초기화 중 오류:", error);
    }
}

// 북마크 열기 함수
function openBookmark(url) {
    try {
        // 새 탭에서 열지 여부
        const openInNewTab = currentSettings.openInNewTab !== false;
        
        // 새 탭 포커스 여부
        const focusNewTab = currentSettings.focusNewTab !== false;
        
        // 선택 후 자동 닫기 여부
        const autoCloseAfterSelect = currentSettings.autoCloseAfterSelect !== false;
        
        // background.js에 북마크 열기 메시지 전송
        chrome.runtime.sendMessage({
            action: "openBookmark",
            url: url,
            openInNewTab: openInNewTab,
            focusNewTab: focusNewTab
        });
        
        // 자동 닫기가 활성화된 경우 북마크 바 제거
        if (autoCloseAfterSelect) {
            removeBookmarkBar();
        }
    } catch (error) {
        console.error("북마크 열기 중 오류:", error);
    }
}

// 스크립트 초기화 실행
initializeBookStaxx();