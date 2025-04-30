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
    activationMethod: 'middleclick',
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
        
        // 컨텍스트 무효화 상태 초기화
        contextInvalidated = false;
        console.log("컨텍스트 무효화 상태 초기화됨");
        
        // 설정 로드
        loadAppSettings();
        
        // 이벤트 리스너 등록
        registerEventListeners();
        
        // 5초 후 컨텍스트 유효성 체크 (페이지 로드 후 지연 시간을 두고 확인)
        setTimeout(() => {
            checkExtensionContext();
        }, 5000);
    } catch (error) {
        console.error("BookStaxx 초기화 중 오류:", error);
    }
}

// 설정 로드 함수
function loadAppSettings() {
    try {
        console.log("설정 로드 시작");
        
        // 컨텍스트가 이미 무효화된 경우
        if (contextInvalidated) {
            console.error("확장 프로그램 컨텍스트가 무효화되었습니다. 페이지를 새로고침하거나 확장 프로그램을 재시작하세요.");
            return;
        }
        
        // 초기 설정을 기본 설정으로 설정
        currentSettings = {...defaultSettings};
        
        // 설정 요청
        chrome.runtime.sendMessage({ action: "getSettings" }, function(response) {
            // 런타임 오류 확인
            if (chrome.runtime.lastError) {
                const errorMessage = chrome.runtime.lastError.message || "알 수 없는 오류";
                console.error("설정 로드 중 오류:", errorMessage);
                
                // Extension context invalidated 오류 처리
                if (errorMessage.includes('Extension context invalidated')) {
                    contextInvalidated = true;
                    console.error("확장 프로그램 컨텍스트가 무효화되었습니다. 페이지를 새로고침하세요.");
                }
                return;
            }
            
            // 응답이 없는 경우
            if (!response) {
                console.error("설정 로드 실패: 응답 없음");
                return;
            }
            
            // 오류 응답
            if (response.error) {
                console.error("설정 로드 실패:", response.error);
                return;
            }
            
            // 설정 데이터가 있는 경우
            if (response.settings) {
                // 현재 설정 업데이트
                Object.assign(currentSettings, response.settings);
                console.log("설정 로드 완료:", currentSettings);
            } else {
                console.log("설정 로드됨 (기본 설정):", currentSettings);
            }
        });
    } catch (error) {
        console.error("설정 로드 중 오류:", error);
    }
}

// 이벤트 리스너 등록 함수
function registerEventListeners() {
    try {
        console.log("이벤트 리스너 등록 시작");
        
        // 키보드 이벤트 리스너 등록
        document.addEventListener('keydown', handleKeyDown);
        
        // 마우스 클릭 이벤트 리스너 등록 (mousedown으로 변경하여 모든 버튼 캡처)
        document.addEventListener('mousedown', handleDocumentClick);
        
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
        // 설정이 로드되지 않은 경우 기본 설정 사용
        if (!currentSettings || typeof currentSettings !== 'object') {
            currentSettings = {...defaultSettings};
        }
        
        // 현재 설정의 핫키 및 모디파이어
        const hotkey = (currentSettings.hotkey && currentSettings.hotkey.toString()) ? currentSettings.hotkey.toString().toLowerCase() : 'b';
        const hotkeyModifier = currentSettings.hotkeyModifier || 'alt';
        
        // 이벤트 키가 undefined인 경우 처리
        if (!event.key) {
            console.log("키보드 이벤트에 key 속성이 없습니다:", event);
            return;
        }
        
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
            console.log("핫키 조합 감지:", hotkey, "+", hotkeyModifier);
            
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
        console.log("마우스 버튼 클릭 감지:", event.button);
        
        // 마우스 오른쪽 버튼 클릭 확인
        const isRightClick = event.button === 2;
        // 마우스 중간 버튼(스크롤 휠) 클릭 확인
        const isMiddleClick = event.button === 1;
        
        // 북마크 바 요소 확인
        const isBookmarkBarElement = event.target.closest(`#${BOOKMARK_BAR_ID}`) !== null;
        const isBookstaxxElement = event.target.getAttribute('data-bookstaxx-element') === 'true';
        
        // 중간 버튼(스크롤 휠) 클릭 처리 - 무조건 활성화
        if (isMiddleClick) {
            console.log("중간 버튼 클릭 감지 - 북마크 바 표시");
            // 중간 클릭에 대한 기본 동작 방지(브라우저에 따라 자동 스크롤 시작 등)
            event.preventDefault();
            event.stopPropagation();
            
            // 북마크 바 토글
            toggleBookmarkBar(event);
            return;
        }
        
        // 자동 닫힘 방지 상태일 때는 외부 클릭 무시
        if (preventAutoClose) {
            return;
        }
        
        // 북마크 바 외부 클릭 처리 (북마크 바가 표시된 상태일 때만)
        if (bookmarkBarVisible && !isBookmarkBarElement && !isBookstaxxElement) {
            // 클릭한 요소가 북마크 바 요소가 아닌 경우에만 북마크 바 제거
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
        console.log("북마크 바 토글 요청");
        
        // 컨텍스트가 이미 무효화된 경우
        if (contextInvalidated) {
            console.error("확장 프로그램 컨텍스트가 무효화되었습니다. 페이지를 새로고침하세요.");
            showErrorMessage("확장 프로그램 컨텍스트가 무효화되었습니다. 페이지를 새로고침하세요.");
            return;
        }
        
        // 북마크 바가 이미 표시된 경우 제거
        if (bookmarkBarVisible) {
            console.log("북마크 바 제거");
            removeBookmarkBar();
            return;
        }
        
        // 클릭 위치 기록
        if (event) {
            clickPosition = {
                x: event.clientX,
                y: event.clientY
            };
            console.log("클릭 위치:", clickPosition);
        }
        
        // 북마크 바 생성
        console.log("북마크 바 생성 시작");
        const bookmarkBar = createBookmarkBar();
        
        // 북마크 바가 생성되지 않은 경우 처리
        if (!bookmarkBar) {
            console.error("북마크 바를 생성할 수 없습니다.");
            return;
        }
        
        // 북마크 바 위치 설정
        positionBookmarkBar(bookmarkBar);
        
        // 북마크 바 표시 상태 업데이트
        bookmarkBarVisible = true;
        bookmarkBarElement = bookmarkBar;
        
        console.log("북마크 바 토글 완료");
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
            return document.getElementById(BOOKMARK_BAR_ID);
        }
        
        // 기존 북마크 바 제거
        removeBookmarkBar();
        
        // 북마크 바 표시 상태 업데이트
        bookmarkBarVisible = true;
        
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
        
        // 뒤로가기 버튼 추가 (북마크 바 외부에 위치)
        const backButton = document.createElement('div');
        backButton.className = 'bookstaxx-action-button bookstaxx-back-button';
        backButton.setAttribute('data-bookstaxx-element', 'true');
        backButton.innerHTML = '<svg class="bookstaxx-action-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#333" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>';
        backButton.addEventListener('click', function(event) {
            // 뒤로가기 동작
            window.history.back();
            
            // 이벤트 전파 중단
            event.stopPropagation();
        });
        
        // 북마크 추가 버튼 (북마크 바 외부에 위치)
        const addButton = document.createElement('div');
        addButton.className = 'bookstaxx-action-button bookstaxx-add-button';
        addButton.setAttribute('data-bookstaxx-element', 'true');
        addButton.innerHTML = '<svg class="bookstaxx-action-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#333" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>';
        addButton.addEventListener('click', function(event) {
            // 현재 페이지를 북마크에 추가
            addCurrentPageToBookmarks();
            
            // 이벤트 전파 중단
            event.stopPropagation();
        });
        
        // body에 북마크 요소 추가
        // 참고: 북마크 바는 검색 기능을 위해 보이지 않게 추가됨
        bookmarkBar.style.display = 'none';
        bookmarkBar.style.opacity = '0';
        bookmarkBar.style.visibility = 'hidden';
        document.body.appendChild(bookmarkBar);
        
        // 액션 버튼 추가 및 위치 지정
        document.body.appendChild(backButton);
        document.body.appendChild(addButton);
        
        // 버튼 위치 설정
        const buttonY = clickPosition.y;
        backButton.style.top = `${buttonY - 24}px`;
        backButton.style.left = `${clickPosition.x - 100}px`;
        addButton.style.top = `${buttonY - 24}px`;
        addButton.style.left = `${clickPosition.x + 50}px`;
        
        // 버튼을 화면 밖으로 나가지 않도록 조정
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;
        const buttonMargin = 20;
        
        if (parseFloat(backButton.style.left) < buttonMargin) {
            backButton.style.left = `${buttonMargin}px`;
        }
        
        if (parseFloat(addButton.style.left) + 48 > screenWidth - buttonMargin) {
            addButton.style.left = `${screenWidth - 48 - buttonMargin}px`;
        }
        
        if (buttonY < 48 + buttonMargin) {
            backButton.style.top = `${48 + buttonMargin}px`;
            addButton.style.top = `${48 + buttonMargin}px`;
        } else if (buttonY > screenHeight - 48 - buttonMargin) {
            backButton.style.top = `${screenHeight - 48 - buttonMargin}px`;
            addButton.style.top = `${screenHeight - 48 - buttonMargin}px`;
        }
        
        // 검색 입력 포커스
        setTimeout(() => {
            searchInput.focus();
        }, 100);
        
        // 컨텍스트 무효화 상태 확인
        if (contextInvalidated) {
            console.error("확장 프로그램 컨텍스트가 무효화되었습니다. 북마크를 로드할 수 없습니다.");
            showErrorMessage("확장 프로그램 컨텍스트가 무효화되었습니다. 페이지를 새로고침하세요.");
        } else {
            // 북마크 로드 후 북마크 아이콘 표시
            loadBookmarks(bookmarkContainer, searchInput, true);
        }
        
        // 자동 닫힘 방지 설정 (500ms 동안)
        preventAutoClose = true;
        setTimeout(() => {
            preventAutoClose = false;
        }, 500);
        
        console.log("북마크 바 생성 완료");
        
        // 생성된 북마크 바 반환
        return bookmarkBar;
    } catch (error) {
        console.error("북마크 바 생성 중 오류:", error);
        
        // 오류 시 북마크 바 표시 상태 복원
        bookmarkBarVisible = false;
        bookmarkBarElement = null;
        
        // 오류 메시지 표시
        showErrorMessage("북마크 바 생성 중 오류가 발생했습니다: " + error.message);
        
        // null 반환 (생성 실패)
        return null;
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
            left = clickPosition.x - 200; // 클릭 위치 중앙에 표시
            top = clickPosition.y - 20;   // 클릭 위치 약간 위에 표시
            
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
        
        // 액션 버튼 위치 설정
        const backButton = document.querySelector('.bookstaxx-back-button');
        const addButton = document.querySelector('.bookstaxx-add-button');
        
        if (backButton && addButton) {
            const buttonY = clickPosition.y;
            
            // 버튼 위치 설정 (클릭 위치 기준)
            backButton.style.top = buttonY + 'px';
            backButton.style.left = clickPosition.x - 100 + 'px';
            
            addButton.style.top = buttonY + 'px';
            addButton.style.left = clickPosition.x + 100 - 48 + 'px'; // 버튼 크기(48px) 고려
            
            // 화면 밖으로 나가지 않도록 조정
            if (parseFloat(backButton.style.left) < 20) {
                backButton.style.left = '20px';
            }
            
            if (parseFloat(addButton.style.left) + 48 > window.innerWidth - 20) {
                addButton.style.left = window.innerWidth - 68 + 'px';
            }
            
            if (buttonY < 20) {
                backButton.style.top = '20px';
                addButton.style.top = '20px';
            } else if (buttonY > window.innerHeight - 68) {
                backButton.style.top = window.innerHeight - 68 + 'px';
                addButton.style.top = window.innerHeight - 68 + 'px';
            }
        }
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
        
        // 액션 버튼 제거
        const backButton = document.querySelector('.bookstaxx-back-button');
        const addButton = document.querySelector('.bookstaxx-add-button');
        
        if (backButton) {
            document.body.removeChild(backButton);
        }
        
        if (addButton) {
            document.body.removeChild(addButton);
        }
        
        // 북마크 바 요소가 있는 경우 제거
        if (bookmarkBar) {
            document.body.removeChild(bookmarkBar);
            console.log("북마크 바 제거 완료");
        } else {
            console.log("제거할 북마크 바가 없음");
        }
        
        // 북마크 아이콘 요소들 제거
        const bookmarkIcons = document.querySelectorAll('.bookstaxx-bookmark-icon');
        console.log(`북마크 아이콘 ${bookmarkIcons.length}개 제거 시작`);
        
        bookmarkIcons.forEach((icon, index) => {
            try {
                document.body.removeChild(icon);
            } catch (error) {
                console.error(`북마크 아이콘 #${index} 제거 중 오류:`, error);
            }
        });
        
        console.log("북마크 아이콘 제거 완료");
        
        // 동적 스타일 제거
        const styleElement = document.getElementById('bookstaxx-dynamic-style');
        if (styleElement) {
            styleElement.textContent = '';
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
function loadBookmarks(container, searchInput, displayAsIcons = false) {
    try {
        console.log("북마크 로드 시작");
        
        // 컨텍스트가 이미 무효화된 경우
        if (contextInvalidated) {
            console.error("확장 프로그램 컨텍스트가 무효화되었습니다. 페이지를 새로고침하거나 확장 프로그램을 재시작하세요.");
            showErrorMessage("확장 프로그램 컨텍스트가 무효화되었습니다. 페이지를 새로고침하세요.");
            return;
        }
        
        // 컨테이너 초기화
        if (container) {
            container.innerHTML = '';
            
            // 북마크 로딩 메시지 표시
            const loadingElement = document.createElement('div');
            loadingElement.className = 'bookstaxx-loading';
            loadingElement.setAttribute('data-bookstaxx-element', 'true');
            loadingElement.textContent = '북마크 로드 중...';
            container.appendChild(loadingElement);
        }
        
        // 북마크 요청
        chrome.runtime.sendMessage({ action: "getBookmarks" }, function(response) {
            // 런타임 오류 확인
            if (chrome.runtime.lastError) {
                const errorMessage = chrome.runtime.lastError.message || "알 수 없는 오류";
                console.error("북마크 로드 중 오류:", errorMessage);
                
                // Extension context invalidated 오류 처리
                if (errorMessage.includes('Extension context invalidated')) {
                    contextInvalidated = true;
                    showErrorMessage("북마크 로드 중 오류: 확장 프로그램 컨텍스트가 무효화되었습니다. 페이지를 새로고침하세요.");
                } else {
                    showErrorMessage("북마크 로드 중 오류가 발생했습니다: " + errorMessage);
                }
                return;
            }
            
            // 응답이 없는 경우
            if (!response) {
                console.error("북마크를 가져올 수 없습니다. 응답이 없습니다.");
                showErrorMessage("북마크를 가져올 수 없습니다.");
                return;
            }
            
            // 오류 응답
            if (response.error) {
                console.error("북마크 로드 오류:", response.error);
                showErrorMessage("북마크 로드 중 오류가 발생했습니다: " + response.error);
                return;
            }
            
            // 북마크 데이터
            const bookmarks = response.bookmarks || [];
            
            // 북마크가 없는 경우
            if (bookmarks.length === 0) {
                console.warn("표시할 북마크가 없습니다.");
                showErrorMessage("표시할 북마크가 없습니다.");
                return;
            }
            
            // 북마크 구성
            const bookmarkTree = buildBookmarkTree(bookmarks);
            
            // 검색 기능 초기화
            if (searchInput && container) {
                initializeSearch(searchInput, container, bookmarks);
                
                // 컨테이너 초기화
                container.innerHTML = '';
            }
            
            console.log("북마크 로드 완료:", bookmarks.length);
            
            // 북마크 표시 방식에 따라 처리
            if (displayAsIcons) {
                // 북마크를 아이콘으로 표시
                displayBookmarkIcons(container, bookmarkTree);
            } else if (container) {
                // 북마크를 트리 형태로 표시
                displayBookmarkTree(container, bookmarkTree);
            }
        });
    } catch (error) {
        console.error("북마크 로드 중 오류:", error);
        showErrorMessage("북마크 로드 중 오류가 발생했습니다: " + error.message);
    }
}

// 북마크를 아이콘 형태로 표시하는 함수
function displayBookmarkIcons(container, tree) {
    try {
        console.log("북마크 아이콘 표시 시작");
        
        // 모든 북마크 수집 (재귀 함수)
        function collectBookmarks(node, bookmarks = []) {
            // 노드가 북마크인 경우
            if (node.url) {
                bookmarks.push(node);
            }
            
            // 노드가 폴더이고 하위 항목이 있는 경우
            if (node.children && node.children.length > 0) {
                node.children.forEach(child => {
                    collectBookmarks(child, bookmarks);
                });
            }
            
            return bookmarks;
        }
        
        // 전체 북마크 수집
        const allBookmarks = [];
        
        // 루트 노드의 자식 순회
        if (tree.children && tree.children.length > 0) {
            tree.children.forEach(child => {
                collectBookmarks(child, allBookmarks);
            });
        }
        
        // 북마크가 없는 경우
        if (allBookmarks.length === 0) {
            console.error("표시할 북마크가 없습니다.");
            const errorMsg = document.createElement('div');
            errorMsg.textContent = "북마크 모드 중 오류가 발생했습니다.";
            errorMsg.style.color = "#e74c3c";
            errorMsg.style.textAlign = "center";
            errorMsg.style.padding = "20px";
            errorMsg.style.backgroundColor = "rgba(0, 0, 0, 0.8)";
            errorMsg.style.borderRadius = "8px";
            errorMsg.style.position = "fixed";
            errorMsg.style.top = "50%";
            errorMsg.style.left = "50%";
            errorMsg.style.transform = "translate(-50%, -50%)";
            errorMsg.style.zIndex = "2147483647";
            errorMsg.style.fontFamily = "sans-serif";
            errorMsg.style.fontSize = "16px";
            errorMsg.style.width = "300px";
            document.body.appendChild(errorMsg);
            setTimeout(() => {
                document.body.removeChild(errorMsg);
            }, 3000);
            return;
        }
        
        console.log("북마크 수집 완료:", allBookmarks.length);
        
        // 북마크를 랜덤하게 섞기
        const shuffledBookmarks = [...allBookmarks].sort(() => Math.random() - 0.5);
        
        // 최대 표시 개수 제한
        const maxBookmarks = parseInt(currentSettings.maxBookmarks || 20);
        const bookmarksToDisplay = shuffledBookmarks.slice(0, maxBookmarks);
        
        console.log("표시할 북마크 수:", bookmarksToDisplay.length);
        
        // 클릭 위치를 기준으로 영역 분할
        const clickX = clickPosition.x;
        const clickY = clickPosition.y;
        
        // 화면 크기 가져오기
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;
        
        // 아이콘 크기 계산 (북마크 개수에 따라 동적으로 조절)
        const idealBookmarkCount = bookmarksToDisplay.length;
        const availableSpace = 0.7 * Math.min(screenWidth, screenHeight);
        
        // 북마크 개수에 따른 아이콘 크기 자동 조절
        let iconSize;
        if (idealBookmarkCount <= 10) {
            iconSize = 80; // 적은 수의 북마크일 때 큰 아이콘
        } else if (idealBookmarkCount <= 20) {
            iconSize = 70;
        } else if (idealBookmarkCount <= 30) {
            iconSize = 60;
        } else {
            iconSize = 50; // 많은 수의 북마크일 때 작은 아이콘
        }
        
        console.log("아이콘 크기:", iconSize);
        
        // 이전 북마크 아이콘 제거
        const existingIcons = document.querySelectorAll('.bookstaxx-bookmark-icon');
        existingIcons.forEach(icon => {
            document.body.removeChild(icon);
        });
        
        // 스타일 요소 생성 또는 업데이트
        let styleElement = document.getElementById('bookstaxx-dynamic-style');
        if (!styleElement) {
            styleElement = document.createElement('style');
            styleElement.id = 'bookstaxx-dynamic-style';
            document.head.appendChild(styleElement);
        }
        
        // 동적 스타일 적용
        styleElement.textContent = `
            .bookstaxx-bookmark-icon {
                position: fixed;
                width: ${iconSize}px;
                height: ${iconSize}px;
                background-color: rgba(255, 255, 255, 0.9);
                border-radius: 50%;
                box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
                z-index: 2147483640;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                overflow: hidden;
                cursor: pointer;
                transition: transform 0.2s ease;
                animation: bookstaxx-fade-in 0.5s ease forwards;
                opacity: 0;
            }
            
            .bookstaxx-bookmark-icon:hover {
                transform: scale(1.1);
                z-index: 2147483645;
            }
            
            .bookstaxx-bookmark-icon-img {
                width: ${iconSize * 0.6}px;
                height: ${iconSize * 0.6}px;
                border-radius: 50%;
                background-color: #f5f5f5;
                display: flex;
                align-items: center;
                justify-content: center;
                overflow: hidden;
            }
            
            .bookstaxx-bookmark-icon-title {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                font-size: ${Math.max(10, iconSize * 0.16)}px;
                color: #333;
                text-align: center;
                max-width: ${iconSize}px;
                padding: 4px;
                margin-top: 4px;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                height: ${iconSize * 0.16 + 4}px;
            }
            
            @keyframes bookstaxx-fade-in {
                0% { opacity: 0; transform: scale(0.5); }
                100% { opacity: 1; transform: scale(1); }
            }
            
            @keyframes bookstaxx-shoot {
                0% { opacity: 0; transform: scale(0.1) translate(0, 0); }
                70% { opacity: 1; }
                100% { transform: scale(1) translate(var(--end-x), var(--end-y)); }
            }
            
            body.bookstaxx-dark-theme .bookstaxx-bookmark-icon {
                background-color: rgba(51, 51, 51, 0.9);
                border: 1px solid #555;
            }
            
            body.bookstaxx-dark-theme .bookstaxx-bookmark-icon-title {
                color: #eee;
            }
        `;
        
        // 생성한 북마크 아이콘의 위치를 저장할 배열
        const createdIconPositions = [];
        
        // 북마크 아이콘 생성 및 배치
        bookmarksToDisplay.forEach((bookmark, index) => {
            // 북마크 아이콘 요소 생성
            const bookmarkIcon = document.createElement('div');
            bookmarkIcon.className = 'bookstaxx-bookmark-icon';
            bookmarkIcon.setAttribute('data-bookstaxx-element', 'true');
            bookmarkIcon.setAttribute('data-url', bookmark.url);
            
            // 아이콘 이미지 컨테이너
            const iconImg = document.createElement('div');
            iconImg.className = 'bookstaxx-bookmark-icon-img';
            iconImg.setAttribute('data-bookstaxx-element', 'true');
            
            // 파비콘 추가
            const favicon = document.createElement('img');
            favicon.src = `chrome://favicon/${bookmark.url}`;
            favicon.style.width = '100%';
            favicon.style.height = '100%';
            favicon.style.objectFit = 'contain';
            favicon.onerror = function() {
                this.src = 'icons/icon16.png';
            };
            
            iconImg.appendChild(favicon);
            
            // 제목 추가
            const title = document.createElement('div');
            title.className = 'bookstaxx-bookmark-icon-title';
            title.setAttribute('data-bookstaxx-element', 'true');
            title.textContent = bookmark.title;
            
            // 북마크 아이콘에 요소 추가
            bookmarkIcon.appendChild(iconImg);
            bookmarkIcon.appendChild(title);
            
            // 클릭 이벤트 추가
            bookmarkIcon.addEventListener('click', (event) => {
                // 북마크 열기
                openBookmark(bookmark.url);
                
                // 이벤트 전파 중단
                event.stopPropagation();
            });
            
            // body에 북마크 아이콘 추가
            document.body.appendChild(bookmarkIcon);
            
            // 위치 계산 및 설정 (클릭 위치를 중심으로 랜덤하게 분포)
            let validPosition = false;
            let posX, posY;
            let attempts = 0;
            
            const minDistance = Math.min(screenWidth, screenHeight) * 0.05;
            const maxDistance = Math.min(screenWidth, screenHeight) * 0.4;
            
            // 위치가 유효할 때까지 반복 (최대 10회)
            while (!validPosition && attempts < 10) {
                attempts++;
                
                // 랜덤 각도 (0-360도)
                let angle;
                do {
                    angle = Math.random() * 2 * Math.PI;
                    // 수직 수평 90도 방향 피하기 (±30도 범위)
                    const angleModHalfPi = angle % (Math.PI / 2);
                    const avoidArea = Math.PI / 12; // 15도
                } while (
                    // 0, 90, 180, 270도 주변 범위 피하기
                    (Math.abs(Math.cos(angle)) < 0.3 || Math.abs(Math.sin(angle)) < 0.3)
                );
                
                // 거리 계산
                const distance = minDistance + Math.random() * (maxDistance - minDistance);
                
                // x, y 좌표 계산
                posX = clickX + Math.cos(angle) * distance;
                posY = clickY + Math.sin(angle) * distance;
                
                // 화면 경계 확인
                const margin = iconSize / 2;
                if (posX < margin || posX > screenWidth - margin || 
                    posY < margin || posY > screenHeight - margin) {
                    continue; // 화면 밖으로 나가면 다시 시도
                }
                
                // 다른 아이콘과의 충돌 확인
                const overlap = createdIconPositions.some(pos => {
                    const distance = Math.sqrt(
                        Math.pow(posX - pos.x, 2) + 
                        Math.pow(posY - pos.y, 2)
                    );
                    return distance < iconSize * 1.2; // 아이콘 크기의 1.2배 이내면 충돌
                });
                
                if (!overlap) {
                    validPosition = true;
                    createdIconPositions.push({ x: posX, y: posY });
                }
            }
            
            // 최종 위치 적용
            bookmarkIcon.style.left = `${posX - iconSize/2}px`;
            bookmarkIcon.style.top = `${posY - iconSize/2}px`;
            
            // 애니메이션 적용
            const animationMode = currentSettings.bookmarkAnimationMode || 'shoot';
            if (animationMode === 'shoot') {
                bookmarkIcon.style.setProperty('--end-x', `${posX - clickX}px`);
                bookmarkIcon.style.setProperty('--end-y', `${posY - clickY}px`);
                bookmarkIcon.style.left = `${clickX - iconSize/2}px`;
                bookmarkIcon.style.top = `${clickY - iconSize/2}px`;
                bookmarkIcon.style.animation = 'bookstaxx-shoot 0.5s ease forwards';
                bookmarkIcon.style.animationDelay = `${index * 0.05}s`;
            } else {
                // 기본 페이드인 애니메이션
                bookmarkIcon.style.animationDelay = `${index * 0.05}s`;
            }
            
            console.log(`북마크 #${index} 배치됨: ${bookmark.title} (${posX}, ${posY})`);
        });
        
        console.log("북마크 아이콘 표시 완료");
    } catch (error) {
        console.error("북마크 아이콘 표시 중 오류:", error);
        // 오류 메시지 표시
        const errorMsg = document.createElement('div');
        errorMsg.textContent = "북마크 모드 중 오류가 발생했습니다.";
        errorMsg.style.color = "#e74c3c";
        errorMsg.style.textAlign = "center";
        errorMsg.style.padding = "20px";
        errorMsg.style.backgroundColor = "rgba(0, 0, 0, 0.8)";
        errorMsg.style.borderRadius = "8px";
        errorMsg.style.position = "fixed";
        errorMsg.style.top = "50%";
        errorMsg.style.left = "50%";
        errorMsg.style.transform = "translate(-50%, -50%)";
        errorMsg.style.zIndex = "2147483647";
        errorMsg.style.fontFamily = "sans-serif";
        errorMsg.style.fontSize = "16px";
        errorMsg.style.width = "300px";
        document.body.appendChild(errorMsg);
        setTimeout(() => {
            document.body.removeChild(errorMsg);
        }, 3000);
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
        // 컨텍스트가 이미 무효화된 경우
        if (contextInvalidated) {
            console.error("확장 프로그램 컨텍스트가 무효화되었습니다. 페이지를 새로고침하세요.");
            showErrorMessage("확장 프로그램 컨텍스트가 무효화되었습니다. 페이지를 새로고침하세요.");
            return;
        }
        
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
        }, function(response) {
            // 런타임 오류 확인
            if (chrome.runtime.lastError) {
                const errorMessage = chrome.runtime.lastError.message || "알 수 없는 오류";
                console.error("북마크 열기 중 오류:", errorMessage);
                
                // Extension context invalidated 오류 처리
                if (errorMessage.includes('Extension context invalidated')) {
                    contextInvalidated = true;
                    showErrorMessage("북마크 열기 중 오류: 확장 프로그램 컨텍스트가 무효화되었습니다. 페이지를 새로고침하세요.");
                } else {
                    showErrorMessage("북마크 열기 중 오류가 발생했습니다: " + errorMessage);
                }
                return;
            }
        });
        
        // 자동 닫기가 활성화된 경우 북마크 바 제거
        if (autoCloseAfterSelect) {
            removeBookmarkBar();
        }
    } catch (error) {
        console.error("북마크 열기 중 오류:", error);
        showErrorMessage("북마크 열기 중 오류가 발생했습니다: " + error.message);
    }
}

// 현재 페이지를 북마크에 추가하는 함수
function addCurrentPageToBookmarks() {
    try {
        // 컨텍스트가 이미 무효화된 경우
        if (contextInvalidated) {
            console.error("확장 프로그램 컨텍스트가 무효화되었습니다. 페이지를 새로고침하세요.");
            showErrorMessage("확장 프로그램 컨텍스트가 무효화되었습니다. 페이지를 새로고침하세요.");
            return;
        }
        
        // 현재 페이지 정보
        const currentUrl = window.location.href;
        const currentTitle = document.title;
        
        // background.js에 북마크 추가 메시지 전송
        chrome.runtime.sendMessage({
            action: "addBookmark",
            url: currentUrl,
            title: currentTitle
        }, function(response) {
            // 런타임 오류 확인
            if (chrome.runtime.lastError) {
                const errorMessage = chrome.runtime.lastError.message || "알 수 없는 오류";
                console.error("북마크 추가 중 오류:", errorMessage);
                
                // Extension context invalidated 오류 처리
                if (errorMessage.includes('Extension context invalidated')) {
                    contextInvalidated = true;
                    showErrorMessage("북마크 추가 중 오류: 확장 프로그램 컨텍스트가 무효화되었습니다. 페이지를 새로고침하세요.");
                } else {
                    showErrorMessage("북마크 추가 중 오류가 발생했습니다: " + errorMessage);
                }
                return;
            }
            
            // 응답이 없는 경우
            if (!response) {
                console.error("북마크 추가 실패: 응답 없음");
                showErrorMessage("북마크 추가에 실패했습니다.");
                return;
            }
            
            // 성공 응답
            if (response.success) {
                console.log("북마크 추가 성공:", response.bookmark || response.message);
                
                // 성공 메시지 표시
                const successMessage = document.createElement('div');
                successMessage.textContent = "북마크가 추가되었습니다.";
                successMessage.style.position = "fixed";
                successMessage.style.bottom = "20px";
                successMessage.style.left = "50%";
                successMessage.style.transform = "translateX(-50%)";
                successMessage.style.backgroundColor = "#4caf50";
                successMessage.style.color = "white";
                successMessage.style.padding = "10px 20px";
                successMessage.style.borderRadius = "4px";
                successMessage.style.zIndex = "2147483647";
                successMessage.style.boxShadow = "0 2px 10px rgba(0, 0, 0, 0.2)";
                
                document.body.appendChild(successMessage);
                
                // 3초 후 메시지 제거
                setTimeout(() => {
                    if (document.body.contains(successMessage)) {
                        document.body.removeChild(successMessage);
                    }
                }, 3000);
            } else {
                // 오류 응답
                console.error("북마크 추가 실패:", response.error);
                showErrorMessage("북마크 추가에 실패했습니다: " + response.error);
            }
        });
    } catch (error) {
        console.error("북마크 추가 중 오류:", error);
        showErrorMessage("북마크 추가 중 오류가 발생했습니다: " + error.message);
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

// 오류 메시지 표시 함수
function showErrorMessage(message) {
    const errorMsg = document.createElement('div');
    errorMsg.textContent = message;
    errorMsg.style.color = "#e74c3c";
    errorMsg.style.textAlign = "center";
    errorMsg.style.padding = "20px";
    errorMsg.style.backgroundColor = "rgba(0, 0, 0, 0.8)";
    errorMsg.style.borderRadius = "8px";
    errorMsg.style.position = "fixed";
    errorMsg.style.top = "50%";
    errorMsg.style.left = "50%";
    errorMsg.style.transform = "translate(-50%, -50%)";
    errorMsg.style.zIndex = "2147483647";
    errorMsg.style.fontFamily = "sans-serif";
    errorMsg.style.fontSize = "16px";
    errorMsg.style.width = "300px";
    document.body.appendChild(errorMsg);
    setTimeout(() => {
        if (document.body.contains(errorMsg)) {
            document.body.removeChild(errorMsg);
        }
    }, 3000);
}

// 확장 프로그램 컨텍스트 유효성 확인 함수
function checkExtensionContext() {
    try {
        // 이미 무효화된 상태라면 체크하지 않음
        if (contextInvalidated) {
            return;
        }
        
        // 간단한 메시지를 보내 확장 프로그램 연결 상태 확인
        chrome.runtime.sendMessage({ action: "ping" }, function(response) {
            if (chrome.runtime.lastError) {
                const errorMessage = chrome.runtime.lastError.message || "알 수 없는 오류";
                
                // Extension context invalidated 오류 처리
                if (errorMessage.includes('Extension context invalidated')) {
                    contextInvalidated = true;
                    console.error("확장 프로그램 컨텍스트가 무효화되었습니다:", errorMessage);
                    
                    // 상단에 사용자에게 알림 표시
                    const notificationBar = document.createElement('div');
                    notificationBar.textContent = "BookStaxx 확장 프로그램 컨텍스트가 무효화되었습니다. 페이지를 새로고침하세요.";
                    notificationBar.style.position = "fixed";
                    notificationBar.style.top = "0";
                    notificationBar.style.left = "0";
                    notificationBar.style.width = "100%";
                    notificationBar.style.backgroundColor = "#f44336";
                    notificationBar.style.color = "white";
                    notificationBar.style.padding = "8px";
                    notificationBar.style.textAlign = "center";
                    notificationBar.style.zIndex = "2147483647";
                    notificationBar.style.fontFamily = "sans-serif";
                    notificationBar.style.fontSize = "14px";
                    
                    // 닫기 버튼 추가
                    const closeButton = document.createElement('span');
                    closeButton.textContent = "×";
                    closeButton.style.float = "right";
                    closeButton.style.marginRight = "20px";
                    closeButton.style.cursor = "pointer";
                    closeButton.style.fontWeight = "bold";
                    closeButton.style.fontSize = "20px";
                    
                    closeButton.addEventListener('click', function() {
                        if (document.body.contains(notificationBar)) {
                            document.body.removeChild(notificationBar);
                        }
                    });
                    
                    notificationBar.appendChild(closeButton);
                    document.body.appendChild(notificationBar);
                } else {
                    console.error("확장 프로그램 통신 오류:", errorMessage);
                }
            } else {
                console.log("확장 프로그램 컨텍스트 유효성 확인 완료");
            }
        });
        
        // 30초마다 컨텍스트 유효성 재확인
        setTimeout(checkExtensionContext, 30000);
    } catch (error) {
        console.error("확장 프로그램 컨텍스트 확인 중 오류:", error);
    }
}

// 스크립트 초기화 실행
initializeBookStaxx();