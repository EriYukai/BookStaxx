console.log("BookStaxx content script loaded.");

let bookmarkBar = null;
let clickCoords = { x: 0, y: 0 };
let currentSettings = {}; // To store loaded settings
let bookmarkDisplayEnabled = true;
let observer = null;

// Default settings (mirror options.js, used until storage loads)
const defaultSettings = {
    bookmarkIconSize: 'md',
    bookmarkFontSize: 'sm',
    animationEnabled: true,
};

// --- Define Global Mappings --- 
const baseIconDim = { sm: 32, md: 40, lg: 48 }; // Base pixel dimensions
const sizeClassMap = { sm: 'w-8 h-8', md: 'w-10 h-10', lg: 'w-12 h-12' }; // Tailwind classes
const fontClassMap = { xs: 'text-xs', sm: 'text-sm', base: 'text-base' };
const iconSizeOrder = ['sm', 'md', 'lg']; // For getEffectiveSize
const fontSizeOrder = ['xs', 'sm', 'base']; // For getEffectiveSize

// 전역 handleMouseWheel 변수 선언
let handleMouseWheel = function() {}; // 기본 빈 함수로 초기화

// 북마크 바 제거 함수
function removeBookmarkBar() {
    const container = document.getElementById('bookmarkIconsContainer');
    const backgroundLayer = document.getElementById('bookmarkBackgroundLayer');
    
    if (container) {
        container.remove();
        bookmarkBar = null;
    }
    
    if (backgroundLayer) {
        backgroundLayer.remove();
    }
    
    // 이벤트 리스너 제거 (선택적)
    // document.removeEventListener('mousedown', documentClickHandler);
    console.log('북마크 바 제거됨');
}

// 빈 북마크 원 생성 (북마크가 없을 때)
function createEmptyBookmarkCircle(position) {
    console.log('북마크가 없어 기본 버튼만 표시합니다.');
    
    // 컨테이너 생성 (북마크 바와 유사한 구조)
    const container = document.createElement('div');
    container.id = 'bookmarkIconsContainer';
    container.className = 'bookstaxx-bookmark-bar';
    container.setAttribute('data-bookstaxx-element', 'true');
    container.style.position = 'fixed';
    container.style.zIndex = '2147483647';
    container.style.pointerEvents = 'none';
    
    // 반투명 배경 레이어
    const backgroundLayer = document.createElement('div');
    backgroundLayer.id = 'bookmarkBackgroundLayer';
    backgroundLayer.setAttribute('data-bookstaxx-element', 'true');
    backgroundLayer.style.position = 'fixed';
    backgroundLayer.style.top = '0';
    backgroundLayer.style.left = '0';
    backgroundLayer.style.width = '100%';
    backgroundLayer.style.height = '100%';
    backgroundLayer.style.zIndex = '2147483645';
    backgroundLayer.style.backgroundColor = 'rgba(0, 0, 0, 0.03)';
    backgroundLayer.style.pointerEvents = 'none';
    
    document.body.appendChild(backgroundLayer);
    
    // 위치 설정
    const x = position ? position.x : window.innerWidth / 2;
    const y = position ? position.y : window.innerHeight / 2;
    
    container.style.top = `${y}px`;
    container.style.left = `${x}px`;
    container.style.transform = 'translate(-50%, -50%)';
    
    // 뒤로가기 버튼 추가
    const backButton = createActionButton('←', 'goBack', currentSettings.backButtonIcon);
    backButton.style.position = 'absolute';
    backButton.style.left = `-60px`;
    backButton.style.top = '0';
    backButton.style.transform = 'translateY(-50%)';
    backButton.style.backgroundColor = '#f44336';
    backButton.style.color = 'white';
    backButton.style.borderRadius = '50%';
    backButton.style.width = '40px';
    backButton.style.height = '40px';
    backButton.style.pointerEvents = 'auto';
    backButton.style.opacity = '0';
    
    // 북마크 추가 버튼 추가
    const addButton = createActionButton('+', 'addBookmark', currentSettings.addButtonIcon);
    addButton.style.position = 'absolute';
    addButton.style.right = `-60px`;
    addButton.style.top = '0';
    addButton.style.transform = 'translateY(-50%)';
    addButton.style.backgroundColor = '#4CAF50';
    addButton.style.color = 'white';
    addButton.style.borderRadius = '50%';
    addButton.style.width = '40px';
    addButton.style.height = '40px';
    addButton.style.pointerEvents = 'auto';
    addButton.style.opacity = '0';
    
    container.appendChild(backButton);
    container.appendChild(addButton);
    
    document.body.appendChild(container);
    
    // 설정 버튼 추가
    const settingsButton = createSettingsButton(40);
    settingsButton.style.position = 'absolute';
    settingsButton.style.bottom = `-60px`;
    settingsButton.style.left = '50%';
    settingsButton.style.transform = 'translateX(-50%) scale(0)';
    settingsButton.style.opacity = '0';
    settingsButton.style.pointerEvents = 'auto';
    settingsButton.style.zIndex = '2147483648';
    container.appendChild(settingsButton);
    
    // 애니메이션 적용
    setTimeout(() => {
        backButton.style.transition = 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.4s ease-out';
        backButton.style.opacity = '1';
        backButton.style.transform = 'translateY(-50%) scale(1)';
    }, 100);
    
    setTimeout(() => {
        addButton.style.transition = 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.4s ease-out';
        addButton.style.opacity = '1';
        addButton.style.transform = 'translateY(-50%) scale(1)';
    }, 150);
    
    setTimeout(() => {
        settingsButton.style.transition = 'transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.5s ease-out';
        settingsButton.style.opacity = '1';
        settingsButton.style.transform = 'translateX(-50%) scale(1)';
    }, 200);
    
    // 문서 클릭 이벤트 추가
    document.addEventListener('mousedown', function closeOnClick(e) {
        const isBookmarkElement = e.target.closest('[data-bookstaxx-element]');
        if (!isBookmarkElement) {
            removeBookmarkBar();
            document.removeEventListener('mousedown', closeOnClick);
        }
    });
    
    // ESC 키로 창 닫기
    document.addEventListener('keydown', function escKeyHandler(e) {
        if (e.key === 'Escape') {
            removeBookmarkBar();
            document.removeEventListener('keydown', escKeyHandler);
        }
    });
    
    bookmarkBar = container;
    return container;
}

// 마우스 휠 이벤트 리스너 설정
function setupMouseWheelListener() {
    console.log('마우스 휠 이벤트 리스너 설정');
    
    // 전역 handleMouseWheel 함수를 새로 정의
    handleMouseWheel = function(e) {
        // 북마크 바가 표시되어 있는 상태에서 휠 스크롤 시 특별한 동작이 필요한 경우
        if (bookmarkBar) {
            // 예: 특정 조건에서 북마크 바 닫기
            // if (e.deltaY > 50) {
            //     removeBookmarkBar();
            // }
        }
    };
    
    // 휠 이벤트 리스너 등록
    document.addEventListener('wheel', handleMouseWheel, { passive: true });
    console.log('마우스 휠 이벤트 리스너 설정 완료');
}

// 액션 실행 함수
function executeAction(action) {
    console.log(`액션 실행: ${action}`);
    
    return new Promise((resolve, reject) => {
        try {
            switch (action) {
                case 'goBack':
                    chrome.runtime.sendMessage({ action: 'goBack' }, (response) => {
                        if (chrome.runtime.lastError) {
                            console.error('뒤로가기 실패:', chrome.runtime.lastError);
                            reject(chrome.runtime.lastError);
                            return;
                        }
                        resolve(response || { success: true });
                    });
                    break;
                    
                case 'addBookmark':
                    chrome.runtime.sendMessage({ action: 'addBookmark' }, (response) => {
                        if (chrome.runtime.lastError) {
                            console.error('북마크 추가 실패:', chrome.runtime.lastError);
                            reject(chrome.runtime.lastError);
                            return;
                        }
                        resolve(response);
                    });
                    break;
                    
                default:
                    console.warn(`알 수 없는 액션: ${action}`);
                    resolve({ success: false, error: '알 수 없는 액션' });
            }
        } catch (error) {
            console.error('액션 실행 중 오류:', error);
            reject(error);
        }
    });
}

// 북마크 표시 함수
function displayBookmarks(x, y) {
    if (!x || !y) {
        // 위치가 지정되지 않은 경우 화면 중앙에 표시
        x = window.innerWidth / 2;
        y = window.innerHeight / 2;
    }
    
    // 클릭 좌표 저장
    clickCoords = { x, y };
    
    // 북마크 요청
    try {
        chrome.runtime.sendMessage({ action: "getBookmarks" }, (response) => {
            if (chrome.runtime.lastError) {
                console.error("북마크 가져오기 오류:", chrome.runtime.lastError.message);
                // 확장 프로그램 컨텍스트 무효화 처리
                if (chrome.runtime.lastError.message?.includes("Extension context invalidated")) {
                    console.warn("BookStaxx 컨텍스트가 무효화되었습니다. 페이지나 확장 프로그램을 새로고침해 보세요.");
                } else {
                    // 다른 런타임 오류, 버튼만 있는 바 표시
                    createOrUpdateBookmarkBar([]);
                }
                return;
            }
            
            // 응답 확인 및 처리
            if (response && response.bookmarks) {
                console.log("북마크 수신됨:", response.bookmarks.length);
                createOrUpdateBookmarkBar(response.bookmarks);
            } else {
                console.log("북마크를 찾을 수 없거나 응답이 유효하지 않습니다.");
                createOrUpdateBookmarkBar([]); // 응답이 예상과 다를 경우 버튼만 있는 바 표시
            }
        });
    } catch (error) {
        console.error("sendMessage 호출 중 동기 오류:", error);
    }
}

// 북마크 바 토글 함수
function toggleBookmarkBar(e) {
    if (bookmarkBar) {
        removeBookmarkBar();
    } else {
        // 화면 중앙 위치에 북마크 바 표시
        clickCoords = { 
            x: e ? e.clientX : window.innerWidth / 2, 
            y: e ? e.clientY : window.innerHeight / 2 
        };
        
        displayBookmarks(clickCoords.x, clickCoords.y);
    }
}

// 이벤트 경로 가져오기 (크로스 브라우저 지원)
function getEventPath(event) {
    const path = event.path || (event.composedPath && event.composedPath()) || [];
    
    if (path.length) return path;
    
    // 이벤트 경로를 수동으로 구성
    let target = event.target;
    const manualPath = [target];
    
    while (target.parentElement) {
        target = target.parentElement;
        manualPath.push(target);
    }
    
    if (target.documentElement) {
        manualPath.push(document);
        manualPath.push(window);
    }
    
    return manualPath;
}

// 북마크 바 위치 조정 함수
function adjustBookmarkBarPosition() {
    if (!bookmarkBar) return;
    
    // 현재 위치 유지하면서 화면 내에 위치하도록 조정
    const rect = bookmarkBar.getBoundingClientRect();
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    
    // 화면 경계 밖으로 나가지 않도록 조정
    let x = parseFloat(bookmarkBar.style.left);
    let y = parseFloat(bookmarkBar.style.top);
    
    if (rect.right > windowWidth) {
        x = windowWidth - rect.width/2;
    }
    if (rect.left < 0) {
        x = rect.width/2;
    }
    if (rect.bottom > windowHeight) {
        y = windowHeight - rect.height/2;
    }
    if (rect.top < 0) {
        y = rect.height/2;
    }
    
    bookmarkBar.style.left = `${x}px`;
    bookmarkBar.style.top = `${y}px`;
}

// Load settings from storage when the script loads
function loadSettings() {
    let syncSettings = {};
    let localSettings = {};

    const syncPromise = new Promise(resolve => {
        chrome.storage.sync.get(defaultSettings, (items) => {
            if (chrome.runtime.lastError) {
                console.error("Error loading sync settings:", chrome.runtime.lastError.message);
            } else {
                console.log("Sync settings loaded:", items);
                syncSettings = items;
            }
            resolve();
        });
    });

    const localKeys = ['backButtonIcon', 'addButtonIcon', 'mouseCursorIcon'];
    const localPromise = new Promise(resolve => {
        chrome.storage.local.get(localKeys, (items) => {
            if (chrome.runtime.lastError) {
                console.error("Error loading local settings:", chrome.runtime.lastError.message);
            } else {
                console.log("Local settings loaded:", items);
                localSettings = items;
            }
            resolve();
        });
    });

    Promise.all([syncPromise, localPromise]).then(() => {
        // Merge settings, sync takes precedence for non-image keys if somehow defined
        currentSettings = { ...defaultSettings, ...localSettings, ...syncSettings }; 
        console.log("All settings loaded and merged:", currentSettings);
        // Apply cursor immediately after loading all settings
        applyMouseCursor(currentSettings.mouseCursorIcon);
    });
}

// Apply custom mouse cursor
const MOUSE_CURSOR_STYLE_ID = 'bookstaxx-mouse-cursor-style';
function applyMouseCursor(cursorIconDataUrl) {
    let styleElement = document.getElementById(MOUSE_CURSOR_STYLE_ID);
    if (!styleElement) {
        styleElement = document.createElement('style');
        styleElement.id = MOUSE_CURSOR_STYLE_ID;
        document.head.appendChild(styleElement);
    }

    if (cursorIconDataUrl) {
        console.log("Applying mouse cursor with Data URL (first 100 chars):", cursorIconDataUrl.substring(0, 100));
        // Note: Custom cursor URLs have limitations (size, format).
        // .cur is generally best. Large PNGs might not work well.
        // Providing a fallback is important.
        styleElement.textContent = `body, html { cursor: url(${cursorIconDataUrl}), auto !important; }`;
        console.log("Applied custom cursor");
    } else {
        // Remove custom cursor style
        styleElement.textContent = '';
        console.log("Removed custom cursor");
    }
}

// Listen for changes in storage and update settings/cursor
if (chrome.storage && chrome.storage.onChanged) {
    chrome.storage.onChanged.addListener((changes, namespace) => {
        let settingsChanged = false;
        let cursorChanged = false;

        console.log(`Storage changed in namespace: ${namespace}`);

        if (namespace === 'sync' || namespace === 'local') {
            for (let key in changes) {
                const newValue = changes[key].newValue;
                if (currentSettings[key] !== newValue) { // Update only if changed
                    console.log(`Setting ${key} changed from ${currentSettings[key]} to ${newValue}`);
                    currentSettings[key] = newValue;
                    settingsChanged = true;
                    if (key === 'mouseCursorIcon') {
                        cursorChanged = true;
                    }
                }
            }
        }

        if (settingsChanged) {
            console.log("Settings updated from storage change:", currentSettings);
            if (cursorChanged) {
                applyMouseCursor(currentSettings.mouseCursorIcon);
            }
            // If the bar is currently visible, maybe update it (optional, potentially complex)
            // if (bookmarkBar) { 
            //    console.log("Bookmark bar is visible, attempting to update...");
            //    createOrUpdateBookmarkBar(cachedBookmarks || []); // Need to cache bookmarks
            // } 
        }
    });
} else {
    console.warn("chrome.storage.onChanged is not available in this context.");
}

// Initial load
loadSettings();

// --- Add Custom Animation Keyframes --- 
function addCustomKeyframes() {
    let styleSheet = document.getElementById('bookstaxx-animations');
    if (!styleSheet) {
        styleSheet = document.createElement('style');
        styleSheet.id = 'bookstaxx-animations';
        document.head.appendChild(styleSheet);
        
        // 보다 강화된 애니메이션 효과
        styleSheet.innerHTML = `
            @keyframes scaleFadeIn {
                0% { opacity: 1; transform: scale(0.5); }
                70% { opacity: 1; transform: scale(1.1); }
                100% { opacity: 1; transform: scale(1); }
            }
        `;
    }
}
addCustomKeyframes(); // Add keyframes when script loads

// 중간 마우스 버튼 (스크롤 휠) 클릭 감지
document.addEventListener('mousedown', (event) => {
    // event.button === 1은 중간 마우스 버튼입니다
    if (event.button === 1) {
        // 바가 이미 존재하면 제거하고 더 이상 아무것도 하지 않습니다
        if (bookmarkBar) {
            removeBookmarkBar();
            return; 
        }
        
        // 마우스 중간 버튼 클릭 이벤트 캡처
        // event.preventDefault(); <- 이 줄을 제거하여 기본 스크롤 기능 유지 (중요)
        // event.stopPropagation(); <- 이벤트 전파 중지도 제거
        
        // 클릭 좌표 저장
        clickCoords = { x: event.clientX, y: event.clientY };
        console.log("중간 클릭 감지됨:", clickCoords);

        // 북마크 요청
        try {
            chrome.runtime.sendMessage({ action: "getBookmarks" }, (response) => {
                // 비동기 오류 먼저 확인
                if (chrome.runtime.lastError) {
                    console.error("북마크 가져오기 오류:", chrome.runtime.lastError.message);
                    // 확장 프로그램 컨텍스트 무효화 처리
                    if (chrome.runtime.lastError.message?.includes("Extension context invalidated")) {
                        console.warn("BookStaxx 컨텍스트가 무효화되었습니다. 페이지나 확장 프로그램을 새로고침해 보세요.");
                    } else {
                       // 다른 런타임 오류, 버튼만 있는 바 표시
                       createOrUpdateBookmarkBar([]); 
                    } 
                    return;
                }
                
                // 응답 확인 및 처리
                if (response && response.bookmarks) {
                    console.log("북마크 수신됨:", response.bookmarks.length);
                    createOrUpdateBookmarkBar(response.bookmarks);
                } else {
                    console.log("북마크를 찾을 수 없거나 응답이 유효하지 않습니다.");
                    createOrUpdateBookmarkBar([]); // 응답이 예상과 다를 경우 버튼만 있는 바 표시
                }
            });
        } catch (error) {
            // 동기 오류 처리
            console.error("sendMessage 호출 중 동기 오류:", error);
            if (error.message?.includes("Extension context invalidated")) {
                console.warn("BookStaxx 컨텍스트가 무효화되었습니다. 페이지나 확장 프로그램을 새로고침해 보세요.");
            } else {
                console.error("북마크 표시 시도 중 예상치 못한 오류가 발생했습니다.");
            }
        }
    }
}, true); // 캡처 단계에서 이벤트 처리 (매우 중요)

// 다른 곳을 클릭하거나 중간 클릭 시 북마크 바 제거
document.addEventListener('mousedown', (event) => {
    // 북마크 바가 표시된 상태에서 마우스 버튼을 다시 클릭하면 제거
    if (bookmarkBar && event.button === 1) {
        removeBookmarkBar();
        event.preventDefault(); // 스크롤 방지
        event.stopPropagation(); // 이벤트 전파 방지
        return;
    }
    
    // 북마크 바가 있고 클릭이 북마크 바 외부에서 발생한 경우
    if (bookmarkBar && !bookmarkBar.contains(event.target) && event.button !== 1) {
        removeBookmarkBar();
    }
});

// 오른쪽 클릭으로 북마크 바 닫기
document.addEventListener('contextmenu', (event) => {
    // 북마크 바가 있고 오른쪽 클릭이 북마크 바 외부에서 발생한 경우
    if (bookmarkBar && !bookmarkBar.contains(event.target)) {
        event.preventDefault(); // 컨텍스트 메뉴 방지
        removeBookmarkBar();
    }
    // 북마크 바 내부에서 오른쪽 클릭은 기본 컨텍스트 메뉴 허용
});

// 단축키로 북마크 바 표시/숨기기 기능 추가
document.addEventListener('keydown', function(e) {
    // Alt+B 단축키
    if (e.altKey && e.code === 'KeyB') {
        e.preventDefault();
        
        if (bookmarkBar) {
            removeBookmarkBar();
        } else {
            // 화면 중앙 위치에 북마크 바 표시
            clickCoords = { 
                x: window.innerWidth / 2, 
                y: window.innerHeight / 2 
            };
            
            // 북마크 요청
            try {
                chrome.runtime.sendMessage({ action: "getBookmarks" }, (response) => {
                    if (chrome.runtime.lastError) {
                        console.error("북마크 가져오기 오류:", chrome.runtime.lastError.message);
                        return;
                    }
                    
                    if (response && response.bookmarks) {
                        createOrUpdateBookmarkBar(response.bookmarks);
                    } else {
                        createOrUpdateBookmarkBar([]);
                    }
                });
            } catch (error) {
                console.error("단축키로 북마크 표시 중 오류:", error);
            }
        }
    }
});

// Helper to get the smaller size from two Tailwind size strings
// const iconSizeOrder = ['sm', 'md', 'lg']; // Moved to global
// const fontSizeOrder = ['xs', 'sm', 'base']; // Moved to global

function getEffectiveSize(currentSetting, forceSize, sizeOrder) {
    const currentIndex = sizeOrder.indexOf(currentSetting);
    const forceIndex = sizeOrder.indexOf(forceSize);

    if (currentIndex === -1) return forceSize; // If current setting is invalid, use forced
    if (forceIndex === -1) return currentSetting; // If force size is invalid, use current

    // Return the smaller index (smaller size)
    return currentIndex < forceIndex ? currentSetting : forceSize;
}

// 북마크 바 생성/업데이트 함수
function createOrUpdateBookmarkBar(bookmarks) {
    console.log('북마크 바 생성 시작:', bookmarks ? bookmarks.length : 0);
    
    // 기존 북마크 바 제거
    removeBookmarkBar();
    
    try {
        // 북마크 사용 빈도로 정렬
        const sortedBookmarks = sortBookmarksByUsage(bookmarks || []);
        
        // chrome.storage 접근가능성 체크
        if (typeof chrome === 'undefined' || !chrome.storage) {
            console.warn('BookStaxx: chrome.storage API를 사용할 수 없습니다. 기본 설정을 사용합니다.');
            // 기본 설정으로 계속 진행
            displayBookmarkIcons(sortedBookmarks, clickCoords);
            return;
        }
        
        // 설정 불러오기
        try {
            chrome.storage.local.get({
                iconSize: 24,
                fontSize: 12,
                animationEnabled: true,
                maxBookmarks: 20,  // 표시할 최대 북마크 수 증가
                bookmarkLayoutMode: 'circle',
                bookmarkAnimationMode: 'explosion'
            }, (settings) => {
                displayBookmarkIcons(sortedBookmarks, clickCoords);
            });
        } catch (error) {
            console.error('BookStaxx: 설정 로드 중 오류:', error);
            // 오류 발생시 기본 설정 사용
            displayBookmarkIcons(sortedBookmarks, clickCoords);
        }
    } catch (error) {
        console.error('북마크 바 생성 준비 중 오류:', error);
    }
}

// 북마크 아이콘 표시 함수 - 주 함수로 사용
function displayBookmarkIcons(bookmarks, position) {
    // 기존 북마크 컨테이너가 있다면 제거
    removeBookmarkBar();
    
    if (!bookmarks || bookmarks.length === 0) {
        console.log('표시할 북마크가 없습니다.');
        // 북마크가 없어도 뒤로가기와 추가 버튼은 표시
        createEmptyBookmarkCircle(position);
        return;
    }
    
    // 북마크를 사용 빈도순으로 정렬
    bookmarks = sortBookmarksByUsage(bookmarks);
    
    console.log(`북마크 ${bookmarks.length}개 표시 중...`);
    
    // 설정에서 최대 표시 북마크 수 가져오기
    chrome.storage.sync.get({
        maxBookmarks: 20,
        bookmarkLayoutMode: 'circle',
        bookmarkAnimationMode: 'explosion'
    }, (settings) => {
        const maxDisplayCount = settings.maxBookmarks || 20;
        const layoutMode = settings.bookmarkLayoutMode || 'circle';
        const animationMode = settings.bookmarkAnimationMode || 'explosion';
        
        console.log(`레이아웃 모드: ${layoutMode}, 애니메이션 모드: ${animationMode}, 최대 북마크 수: ${maxDisplayCount}`);
        
        // 최대 표시할 북마크 수 제한
        const displayBookmarks = bookmarks.slice(0, maxDisplayCount);
        
        // 컨테이너 생성
        const container = document.createElement('div');
        container.id = 'bookmarkIconsContainer';
        container.className = 'bookstaxx-bookmark-bar';
        container.setAttribute('data-bookstaxx-element', 'true');
        container.style.position = 'fixed';
        container.style.zIndex = '2147483647'; // 최대 z-index 값으로 설정
        container.style.pointerEvents = 'none'; // 마우스 이벤트 허용하지 않음 (스크롤 허용)
        
        // 반투명 배경 레이어 - 포인터 이벤트 허용하지 않게 수정
        const backgroundLayer = document.createElement('div');
        backgroundLayer.id = 'bookmarkBackgroundLayer';
        backgroundLayer.style.position = 'fixed';
        backgroundLayer.style.top = '0';
        backgroundLayer.style.left = '0';
        backgroundLayer.style.width = '100%';
        backgroundLayer.style.height = '100%';
        backgroundLayer.style.zIndex = '2147483645'; // 컨테이너보다 낮은 z-index
        backgroundLayer.style.backgroundColor = 'rgba(0, 0, 0, 0.03)'; // 더 투명하게
        backgroundLayer.style.pointerEvents = 'none'; // 스크롤 허용
        
        document.body.appendChild(backgroundLayer);
        
        // 마우스 이벤트 방지 레이어에 data-bookstaxx-element 속성 추가
        backgroundLayer.setAttribute('data-bookstaxx-element', 'true');
        
        // 북마크 수에 따른 아이콘 크기 조정
        let iconSize = 40; // 기본 크기
        if (displayBookmarks.length > 10) {
            iconSize = 35;
        }
        if (displayBookmarks.length > 15) {
            iconSize = 32;
        }
        
        // 위치 설정: 마우스 클릭 좌표
        const x = position ? position.x : window.innerWidth / 2;
        const y = position ? position.y : window.innerHeight / 2;
        
        container.style.top = `${y}px`;
        container.style.left = `${x}px`;
        container.style.transform = 'translate(-50%, -50%)';
        
        // 뒤로가기 버튼 추가 (왼쪽) - 마우스에 더 가깝게 배치
        const backButtonRadius = 50; // 고정 크기로 변경
        const backButton = createActionButton('←', 'goBack', currentSettings.backButtonIcon);
        backButton.style.position = 'absolute';
        backButton.style.left = `-${backButtonRadius}px`;
        backButton.style.top = '0';
        backButton.style.transform = 'translateY(-50%)';
        backButton.style.backgroundColor = '#f44336'; // 빨간색 계열
        backButton.style.color = 'white';
        backButton.style.borderRadius = '50%';
        backButton.style.width = '40px';
        backButton.style.height = '40px';
        backButton.style.pointerEvents = 'auto'; // 클릭 허용
        backButton.style.zIndex = '2147483648'; // 최상위
        backButton.style.opacity = '0'; // 시작시 투명
        backButton.style.transform = 'translateY(-50%) scale(0)'; // 시작시 작게
        
        // 북마크 추가 버튼 추가 (오른쪽) - 마우스에 더 가깝게 배치
        const addButtonRadius = 50; // 고정 크기로 변경
        const addButton = createActionButton('+', 'addBookmark', currentSettings.addButtonIcon);
        addButton.style.position = 'absolute';
        addButton.style.right = `-${addButtonRadius}px`;
        addButton.style.top = '0';
        addButton.style.transform = 'translateY(-50%)';
        addButton.style.backgroundColor = '#4CAF50'; // 녹색 계열
        addButton.style.color = 'white';
        addButton.style.borderRadius = '50%';
        addButton.style.width = '40px';
        addButton.style.height = '40px';
        addButton.style.pointerEvents = 'auto'; // 클릭 허용
        addButton.style.zIndex = '2147483648'; // 최상위
        addButton.style.opacity = '0'; // 시작시 투명
        addButton.style.transform = 'translateY(-50%) scale(0)'; // 시작시 작게
        
        container.appendChild(backButton);
        container.appendChild(addButton);
        
        // 레이아웃 모드에 따라 북마크 배치
        if (layoutMode === 'circle') {
            displayBookmarksInCircle(container, displayBookmarks, x, y, iconSize, animationMode);
        } else if (layoutMode === 'grid') {
            displayBookmarksInGrid(container, displayBookmarks, x, y, iconSize, animationMode);
        } else if (layoutMode === 'fullscreen') {
            displayBookmarksFullscreen(container, displayBookmarks, iconSize, animationMode);
        }
        
        document.body.appendChild(container);
        
        // 설정 버튼 추가
        const settingsButton = createSettingsButton(iconSize);
        settingsButton.style.position = 'absolute';
        settingsButton.style.bottom = `-${50}px`; // 고정 크기로 변경
        settingsButton.style.left = '50%';
        settingsButton.style.transform = 'translateX(-50%) scale(0)'; // 시작 시 작게
        settingsButton.style.opacity = '0'; // 시작 시 투명
        settingsButton.style.transition = 'transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.5s ease-out';
        settingsButton.style.pointerEvents = 'auto'; // 클릭 허용
        settingsButton.style.zIndex = '2147483648';
        container.appendChild(settingsButton);
        
        // 애니메이션 적용 - 선택한 모드에 따라 적용
        // 1. 액션 버튼 애니메이션
        setTimeout(() => {
            backButton.style.transition = 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.4s ease-out';
            backButton.style.opacity = '1';
            backButton.style.transform = 'translateY(-50%) scale(1)';
        }, 100);
        
        setTimeout(() => {
            addButton.style.transition = 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.4s ease-out';
            addButton.style.opacity = '1';
            addButton.style.transform = 'translateY(-50%) scale(1)';
        }, 150);
        
        // 3. 설정 버튼 애니메이션
        setTimeout(() => {
            settingsButton.style.opacity = '1';
            settingsButton.style.transform = 'translateX(-50%) scale(1)';
        }, 300 + displayBookmarks.length * 30); // 모든 북마크 아이콘 후에 표시
        
        // 문서 클릭 이벤트 추가 - 북마크 바 외부 클릭 시 닫기
        document.addEventListener('mousedown', documentClickHandler);
        
        // ESC 키로 북마크 창 닫기
        document.addEventListener('keydown', function escKeyHandler(e) {
            if (e.key === 'Escape') {
                removeBookmarkBar();
                document.removeEventListener('keydown', escKeyHandler);
            }
        });
        
        console.log('북마크 아이콘 배치 완료');
    });
    
    return container;
}

function hideBookmarkIcons() {
    const container = document.getElementById('bookmark-container');
    if (container) {
        container.remove();
        document.removeEventListener('click', hideBookmarkIcons);
    }
}

// 북마크 사용 횟수를 증가시키는 함수
function incrementBookmarkUsage(url) {
    if (!url) {
        console.warn('BookStaxx: URL이 없어 사용 빈도를 증가시킬 수 없습니다.');
        return;
    }
    
    // chrome API 접근 가능 여부 확인
    if (typeof chrome === 'undefined') {
        console.warn('BookStaxx: Chrome API를 사용할 수 없어 북마크 사용 빈도를 기록할 수 없습니다.');
        return;
    }
    
    try {
        // 로컬 스토리지에서 데이터 로드
        if (chrome.storage && chrome.storage.local) {
            chrome.storage.local.get('bookmarkUsage', (result) => {
                try {
                    // 기존 데이터 또는 새 객체 생성
                    const usageData = result.bookmarkUsage || {};
                    
                    // URL 항목이 없으면 초기화
                    if (!usageData[url]) {
                        usageData[url] = { 
                            count: 0,
                            lastUsed: Date.now()
                        };
                    }
                    
                    // 카운트 증가 및 마지막 사용 시간 업데이트
                    usageData[url].count += 1;
                    usageData[url].lastUsed = Date.now();
                    
                    // 업데이트된 데이터 저장
                    chrome.storage.local.set({ 'bookmarkUsage': usageData }, () => {
                        if (chrome.runtime.lastError) {
                            console.error('BookStaxx: 북마크 사용 데이터 저장 실패:', chrome.runtime.lastError);
                        }
                    });
                    
                    // 디버그 로그
                    console.log(`BookStaxx: 북마크 사용 빈도 증가 - ${url}, 총 ${usageData[url].count}회`);
                    
                } catch (innerError) {
                    console.error('BookStaxx: 북마크 사용 빈도 증가 처리 중 오류:', innerError);
                }
            });
        }
        
        // 백그라운드 스크립트에 메시지 전송 (배경에서도 업데이트)
        if (chrome.runtime && chrome.runtime.sendMessage) {
            chrome.runtime.sendMessage({
                action: 'updateBookmarkUsage',
                url: url
            }, (response) => {
                // 비동기 응답 처리 (옵션)
                if (chrome.runtime.lastError) {
                    console.warn('BookStaxx: 백그라운드로 사용 빈도 업데이트 메시지 전송 실패:', chrome.runtime.lastError);
                }
            });
        }
        
    } catch (error) {
        console.error('BookStaxx: 북마크 사용 빈도 증가 중 오류:', error);
    }
}

// 북마크를 사용 빈도순으로 정렬하는 함수
function sortBookmarksByUsage(bookmarks) {
    try {
        // 로컬 스토리지에서 사용 기록 가져오기
        const usageData = JSON.parse(localStorage.getItem('bookmarkUsageData') || '{}');
        
        // 북마크 배열 복사
        const sortedBookmarks = [...bookmarks];
        
        // 사용 빈도와 최근 사용 시간에 따라 정렬
        sortedBookmarks.sort((a, b) => {
            const usageA = usageData[a.url] || 0;
            const usageB = usageData[b.url] || 0;
            
            // 사용 빈도가 다르면 빈도순으로 정렬
            if (usageA !== usageB) {
                return usageB - usageA;
            }
            
            // 사용 빈도가 같으면 최근 사용 시간순으로 정렬
            const lastUsedA = usageData[`${a.url}_lastUsed`] || 0;
            const lastUsedB = usageData[`${b.url}_lastUsed`] || 0;
            return lastUsedB - lastUsedA;
        });
        
        return sortedBookmarks;
    } catch (error) {
        console.error('북마크 정렬 중 오류 발생:', error);
        return bookmarks; // 오류 발생 시 원본 배열 반환
    }
}

// 이벤트 리스너 설정 함수
function setupBookmarkListeners() {
  console.log('BookStaxx: 이벤트 리스너 설정 중...');
  
  // 마우스 위치 저장 변수
  let lastRightClickX = null;
  let lastRightClickY = null;
  
  // 전역 mousedown 이벤트 리스너 (오른쪽 클릭 위치 저장)
  document.addEventListener('mousedown', function(e) {
    // 오른쪽 클릭 감지 (버튼 2)
    if (e.button === 2) {
      lastRightClickX = e.clientX;
      lastRightClickY = e.clientY;
    }
  }, true);
  
  // 컨텍스트 메뉴 이벤트 리스너 (Ctrl + 오른쪽 클릭으로 북마크 바 표시)
  document.addEventListener('contextmenu', function(e) {
    // Ctrl 키를 누른 상태에서 오른쪽 클릭
    if (e.ctrlKey) {
      e.preventDefault();
      e.stopPropagation();
      
      // 마지막 오른쪽 클릭 위치에 북마크 표시
      displayBookmarks(lastRightClickX, lastRightClickY);
      return false;
    }
  }, true);
  
  // 단축키 이벤트 리스너 (Ctrl+Alt+B)
  document.addEventListener('keydown', function(e) {
    // Ctrl+Alt+B 단축키 감지
    if (e.ctrlKey && e.altKey && e.code === 'KeyB') {
      e.preventDefault();
      
      // 마지막 오른쪽 클릭 위치 또는 화면 중앙에 북마크 표시
      displayBookmarks(lastRightClickX, lastRightClickY);
    }
  }, true);
  
  // 페이지 URL 변경 감지를 위한 MutationObserver
  const bodyObserver = new MutationObserver(function(mutations) {
    // 변경사항이 있을 때 북마크 바의 위치 조정
    if (bookmarkBar) {
      adjustBookmarkBarPosition();
    }
  });
  
  // body 요소 감시 시작
  if (document.body) {
    bodyObserver.observe(document.body, { 
      childList: true, 
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class'] 
    });
  }
  
  // resize 이벤트 리스너 (창 크기 변경 시 북마크 바 위치 조정)
  window.addEventListener('resize', function() {
    if (bookmarkBar) {
      adjustBookmarkBarPosition();
    }
  });
  
  console.log('BookStaxx: 이벤트 리스너 설정 완료');
}

// 초기화 함수
function initialize() {
    console.log('BookStaxx 초기화');
    
    // 확장 프로그램 컨텍스트 확인
    if (!isExtensionContextValid()) {
        console.warn('BookStaxx: 초기화 시 컨텍스트가 유효하지 않음');
        return;
    }
    
    try {
        // 마우스 휠 이벤트 설정
        setupMouseWheelListener();
        
        // 키보드 단축키 설정
        setupKeyboardShortcuts();
        
        // 북마크 캐시 로드
        loadAndCacheBookmarks();
        
        // 주기적인 컨텍스트 유효성 검사 (10초마다)
        const contextCheckInterval = setInterval(() => {
            if (!isExtensionContextValid()) {
                console.warn('BookStaxx: 주기적 검사에서 컨텍스트 무효화 감지');
                handleInvalidContext();
                clearInterval(contextCheckInterval);
            }
        }, 10000);
        
        // 페이지 언로드 시 정리
        window.addEventListener('beforeunload', cleanup);
        
        console.log('BookStaxx: 초기화 완료');
    } catch (error) {
        // 컨텍스트 무효화 오류 확인
        if (error.message && error.message.includes('Extension context invalidated')) {
            handleInvalidContext();
            return;
        }
        
        console.error('BookStaxx: 초기화 중 오류 발생:', error);
    }
}

// 북마크 데이터 로드 및 캐싱
function loadAndCacheBookmarks() {
    // Chrome API 접근 가능 여부 확인
    if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.storage) {
        console.warn('BookStaxx: Chrome API를 사용할 수 없어 북마크를 로드할 수 없습니다.');
        return;
    }

    try {
        chrome.runtime.sendMessage({ action: 'getBookmarks' }, (response) => {
            if (chrome.runtime.lastError) {
                console.warn('북마크 데이터 로드 실패:', chrome.runtime.lastError);
                return;
            }
            
            if (response && response.bookmarks) {
                // 북마크 데이터 캐싱
                chrome.storage.local.set({
                    cachedBookmarks: response.bookmarks,
                    lastCacheTime: Date.now()
                }, () => {
                    if (chrome.runtime.lastError) {
                        console.error('북마크 캐싱 실패:', chrome.runtime.lastError);
                    } else {
                        console.log('북마크 캐싱 완료:', response.bookmarks.length);
                    }
                });
            }
        });
    } catch (error) {
        console.error('북마크 로드 오류:', error);
    }
}

// 키보드 단축키 설정 함수
function setupKeyboardShortcuts() {
    console.log('키보드 단축키 설정');
    
    // 전역 키보드 단축키 핸들러
    function keyboardShortcutHandler(e) {
        // Alt+B 조합 감지
        if (e.altKey && e.key === 'b') {
            e.preventDefault();
            toggleBookmarkBar(e);
        }
        
        // Esc 키 감지 (북마크 바가 열려있을 경우 닫기)
        if (e.key === 'Escape') {
            const bookmarkBarExists = document.getElementById('bookstaxx-bookmark-bar') || 
                                     document.getElementById('bookstaxx-wrapper');
            if (bookmarkBarExists) {
                e.preventDefault();
                removeBookmarkBar();
            }
        }
    }
    
    // 이벤트 리스너 등록
    document.addEventListener('keydown', keyboardShortcutHandler);
    
    console.log('키보드 단축키 설정 완료');
}

// 앱 초기화
initialize(); 

// 확장 프로그램 컨텍스트 확인 함수
function isExtensionContextValid() {
    try {
        // chrome runtime 접근이 가능한지 확인
        if (typeof chrome !== 'undefined' && chrome.runtime) {
            // lastError를 확인하여 컨텍스트 유효성 검증
            if (chrome.runtime.lastError) {
                const errorMessage = chrome.runtime.lastError.message || '';
                return !errorMessage.includes('Extension context invalidated');
            }
            return true;
        }
        return false;
    } catch (error) {
        // 오류 메시지에서 컨텍스트 무효화 여부 확인
        const errorMessage = error.message || '';
        if (errorMessage.includes('Extension context invalidated')) {
            console.warn('BookStaxx: 확장 프로그램 컨텍스트가 무효화되었습니다.');
            return false;
        }
        // 다른 오류는 로깅만 하고 진행
        console.error('BookStaxx: 컨텍스트 확인 중 오류:', error);
        return false;
    }
}

// 확장 프로그램 컨텍스트 무효화 처리 함수
function handleInvalidContext() {
    // UI 알림 표시
    const message = document.createElement('div');
    message.textContent = 'BookStaxx: 확장 프로그램이 업데이트되었습니다. 페이지를 새로고침하세요.';
    message.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        background: rgba(0,0,0,0.8);
        color: white;
        padding: 10px 15px;
        border-radius: 4px;
        z-index: 9999999;
        font-family: Arial, sans-serif;
        font-size: 14px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.3);
    `;
    
    // 새로고침 버튼 추가
    const refreshButton = document.createElement('button');
    refreshButton.textContent = '페이지 새로고침';
    refreshButton.style.cssText = `
        display: block;
        margin-top: 8px;
        padding: 5px 10px;
        background: #4285f4;
        color: white;
        border: none;
        border-radius: 3px;
        cursor: pointer;
        font-size: 12px;
        width: 100%;
    `;
    refreshButton.addEventListener('click', () => {
        window.location.reload();
    });
    
    message.appendChild(refreshButton);
    document.body.appendChild(message);
    
    // 이벤트 리스너 제거
    cleanup();
    
    console.warn('BookStaxx: 확장 프로그램 컨텍스트가 무효화되어 기능이 중지되었습니다. 페이지를 새로고침하세요.');
}

// 이벤트 리스너 및 리소스 정리 함수 - 이제 handleMouseWheel에 접근할 수 있음
function cleanup() {
    try {
        // 휠 이벤트 리스너 제거 - 이제 전역에서 접근 가능
        document.removeEventListener('wheel', handleMouseWheel);
        
        // 클릭 이벤트 리스너 제거
        document.removeEventListener('click', documentClickHandler);
        
        // 키보드 이벤트 리스너 제거 (구현되어 있다면)
        // document.removeEventListener('keydown', keyboardShortcutHandler);
        
        // 북마크 바 제거
        removeBookmarkBar();
        
        console.log('BookStaxx: 모든 이벤트 리스너와 리소스가 정리되었습니다.');
    } catch (error) {
        console.error('BookStaxx: 리소스 정리 중 오류:', error);
    }
}

// 전역 오류 핸들러
window.addEventListener('error', function(event) {
    // 확장 프로그램 컨텍스트 무효화 오류 확인
    if (event.error && event.error.message && 
        event.error.message.includes('Extension context invalidated')) {
        
        console.warn('BookStaxx: 전역 오류 핸들러에서 컨텍스트 무효화 감지');
        
        // 이미 알림이 표시되었는지 확인
        if (!window.bookstaxxContextErrorShown) {
            window.bookstaxxContextErrorShown = true;
            handleInvalidContext();
        }
        
        // 오류 처리됨으로 표시
        event.preventDefault();
    }
});

// 액션 버튼 생성 함수 (복원)
function createActionButton(defaultText, action, iconDataUrl) {
    const button = document.createElement('button');
    // 버튼 기본 스타일
    button.className = 'action-button';
    button.setAttribute('data-bookstaxx-element', 'true');

    button.style.padding = '8px';
    button.style.display = 'flex';
    button.style.alignItems = 'center';
    button.style.justifyContent = 'center';
    button.style.cursor = 'pointer';
    button.style.transition = 'transform 0.2s, box-shadow 0.2s';
    button.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';

    if (iconDataUrl) {
        console.log(`버튼 생성: '${action}' 액션, 이미지 데이터: ${iconDataUrl.substring(0, 100)}`);
        const img = document.createElement('img');
        img.src = iconDataUrl;
        img.style.width = '24px';
        img.style.height = '24px';
        img.style.objectFit = 'contain';
        button.appendChild(img);
    } else {
        console.log(`버튼 생성: '${action}' 액션, 기본 텍스트: ${defaultText}`);
        button.textContent = defaultText;
        button.style.fontSize = '20px'; 
        button.style.fontWeight = 'bold';
    }

    button.addEventListener('click', async (event) => {
        event.stopPropagation();
        console.log(`액션 버튼 클릭됨: ${action}`);

        // 피드백 UI 설정 함수
        const showFeedback = (success, reason = '') => {
            if (success) {
                // 성공 피드백
                button.style.backgroundColor = '#4CAF50';
                if (!iconDataUrl) {
                    button.textContent = '✓';
                }
            } else if (reason === 'invalid_page') {
                // 유효하지 않은 페이지 피드백
                button.style.backgroundColor = '#FF9800';
                if (!iconDataUrl) {
                    button.textContent = '!';
                }
            } else {
                // 일반 오류 피드백
                button.style.backgroundColor = '#F44336';
                if (!iconDataUrl) {
                    button.textContent = '!';
                }
            }

            // 지연 후 북마크 바 닫기
            const delay = action === 'addBookmark' ? 1500 : 500;
            setTimeout(() => {
                removeBookmarkBar();
            }, delay);
        };

        try {
            // 액션 실행
            const response = await executeAction(action);
            console.log(`액션 ${action} 응답:`, response);

            if (action === 'addBookmark') {
                if (response && response.success) {
                    showFeedback(true);
                } else if (response && response.success === false && response.reason === "invalid_page") {
                    console.warn("북마크 실패: 유효하지 않은 페이지");
                    showFeedback(false, 'invalid_page');
                } else {
                    console.error("북마크 실패:", response?.error);
                    showFeedback(false);
                }
            } else if (response && response.success) {
                showFeedback(true);
            } else {
                console.error(`액션 ${action} 실패:`, response?.error);
                showFeedback(false);
            }
        } catch (error) {
            console.error(`액션 ${action} 실행 중 오류:`, error);
            showFeedback(false);
        }
    });
    
    return button;
}

// 북마크 아이템 생성 함수 수정 - 원형 스타일에 맞게 변경
function createBookmarkItem(bookmark, iconSize, fontSize) {
    const item = document.createElement('div');
    item.className = 'bookstaxx-bookmark-item';
    item.setAttribute('data-bookstaxx-element', 'true');
    
    // 기본 스타일 (원형)
    item.style.width = `${iconSize}px`;
    item.style.height = `${iconSize}px`;
    item.style.borderRadius = '50%';
    item.style.backgroundColor = 'white';
    item.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
    item.style.display = 'flex';
    item.style.flexDirection = 'column';
    item.style.alignItems = 'center';
    item.style.justifyContent = 'center';
    item.style.position = 'relative';
    item.style.overflow = 'hidden';
    item.style.cursor = 'pointer';
    item.style.transition = 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.3s ease';
    
    // 호버 효과
    item.addEventListener('mouseenter', () => {
        item.style.transform = 'scale(1.2)';
        item.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
        
        // 툴팁 표시
        const tooltip = document.createElement('div');
        tooltip.className = 'bookmark-tooltip';
        tooltip.textContent = bookmark.title || '북마크';
        tooltip.style.position = 'absolute';
        tooltip.style.bottom = '-30px';
        tooltip.style.left = '50%';
        tooltip.style.transform = 'translateX(-50%)';
        tooltip.style.backgroundColor = 'rgba(0,0,0,0.8)';
        tooltip.style.color = 'white';
        tooltip.style.padding = '4px 8px';
        tooltip.style.borderRadius = '4px';
        tooltip.style.fontSize = '12px';
        tooltip.style.whiteSpace = 'nowrap';
        tooltip.style.zIndex = '2147483647';
        tooltip.style.pointerEvents = 'none';
        
        item.appendChild(tooltip);
    });
    
    item.addEventListener('mouseleave', () => {
        item.style.transform = 'scale(1)';
        item.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
        
        // 툴팁 제거
        const tooltip = item.querySelector('.bookmark-tooltip');
        if (tooltip) {
            tooltip.remove();
        }
    });
    
    // 클릭 이벤트 - 북마크 열기
    item.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        // 사용 빈도 증가
        incrementBookmarkUsage(bookmark.url);
        
        // 북마크 열기 (새 탭)
        try {
            chrome.runtime.sendMessage(
                { action: "openBookmark", url: bookmark.url },
                (response) => {
                    if (chrome.runtime.lastError) {
                        console.warn("메시지 전송 실패, 직접 열기:", chrome.runtime.lastError);
                        window.open(bookmark.url, '_blank');
                    }
                    
                    // 북마크 바 제거
                    removeBookmarkBar();
                }
            );
        } catch (error) {
            console.error("북마크 열기 오류:", error);
            window.open(bookmark.url, '_blank');
            removeBookmarkBar();
        }
    });
    
    // 아이콘 생성
    if (bookmark.url) {
        try {
            const domain = new URL(bookmark.url).hostname;
            const firstLetter = domain.charAt(0).toUpperCase();
            
            // 파비콘 또는 기본 아이콘
            const iconContainer = document.createElement('div');
            iconContainer.style.width = `${iconSize * 0.6}px`;
            iconContainer.style.height = `${iconSize * 0.6}px`;
            iconContainer.style.display = 'flex';
            iconContainer.style.alignItems = 'center';
            iconContainer.style.justifyContent = 'center';
            iconContainer.style.fontSize = `${iconSize * 0.4}px`;
            iconContainer.style.fontWeight = 'bold';
            iconContainer.style.color = '#666';
            
            // URL 기반 색상 생성
            const hash = Array.from(domain).reduce((acc, char) => {
                return char.charCodeAt(0) + ((acc << 5) - acc);
            }, 0);
            const hue = Math.abs(hash % 360);
            iconContainer.style.backgroundColor = `hsl(${hue}, 70%, 90%)`;
            iconContainer.style.color = `hsl(${hue}, 70%, 30%)`;
            iconContainer.style.borderRadius = '50%';
            
            // 처음에는 첫 글자로 시작
            iconContainer.textContent = firstLetter;
            
            // 저장된 파비콘이 있는 경우 우선 사용
            if (bookmark.savedFavIconUrl) {
                console.log(`저장된 파비콘 사용: ${bookmark.title}`);
                iconContainer.textContent = '';
                iconContainer.style.backgroundImage = `url('${bookmark.savedFavIconUrl}')`;
                iconContainer.style.backgroundSize = 'contain';
                iconContainer.style.backgroundRepeat = 'no-repeat';
                iconContainer.style.backgroundPosition = 'center';
            }
            // 저장된 파비콘이 없지만 온라인 파비콘이 있는 경우 (대체)
            else if (bookmark.favIconUrl) {
                const img = new Image();
                img.onload = function() {
                    iconContainer.textContent = '';
                    iconContainer.style.backgroundImage = `url('${bookmark.favIconUrl}')`;
                    iconContainer.style.backgroundSize = 'contain';
                    iconContainer.style.backgroundRepeat = 'no-repeat';
                    iconContainer.style.backgroundPosition = 'center';
                    
                    // 파비콘 저장 요청 (백그라운드로 전송)
                    if (bookmark.id) {
                        try {
                            chrome.runtime.sendMessage({
                                action: 'saveFavicon',
                                bookmarkId: bookmark.id,
                                url: bookmark.url
                            });
                        } catch (e) {
                            console.warn("파비콘 저장 요청 실패:", e);
                        }
                    }
                };
                img.onerror = function() {
                    // 파비콘 로드 실패 시 기본 아이콘 유지
                    console.log('파비콘 로드 실패:', bookmark.url);
                };
                img.src = bookmark.favIconUrl;
            }
            
            item.appendChild(iconContainer);
            
        } catch (error) {
            // URL 파싱 오류 시 기본 아이콘 사용
            const iconContainer = document.createElement('div');
            iconContainer.innerHTML = '🔖';
            iconContainer.style.fontSize = `${iconSize * 0.4}px`;
            iconContainer.style.display = 'flex';
            iconContainer.style.alignItems = 'center';
            iconContainer.style.justifyContent = 'center';
            item.appendChild(iconContainer);
        }
    } else {
        // 폴더 아이콘 (폴더인 경우)
        const iconContainer = document.createElement('div');
        iconContainer.innerHTML = '📁';
        iconContainer.style.fontSize = `${iconSize * 0.4}px`;
        iconContainer.style.display = 'flex';
        iconContainer.style.alignItems = 'center';
        iconContainer.style.justifyContent = 'center';
        item.appendChild(iconContainer);
    }
    
    return item;
}

// 화면 경계 체크 및 조정 함수 - 모든 레이아웃 모드에서 사용
function adjustPositionToScreenBounds(x, y, iconSize, screenMargin = 20) {
    const minX = screenMargin + iconSize / 2;
    const maxX = window.innerWidth - screenMargin - iconSize / 2;
    const minY = screenMargin + iconSize / 2;
    const maxY = window.innerHeight - screenMargin - iconSize / 2;
    
    // 화면 경계를 벗어나면 위치 조정
    const adjustedX = Math.max(minX, Math.min(maxX, x));
    const adjustedY = Math.max(minY, Math.min(maxY, y));
    
    return { x: adjustedX, y: adjustedY };
}

// 북마크 아이콘 생성 및 배치 함수
function createBookmarkIcon(container, bookmark, x, y, iconSize, index, animationMode) {
    // 북마크 아이템 생성 전 처리
    let bookmarkIcon;
    try {
        bookmarkIcon = createBookmarkItem(bookmark, iconSize, iconSize * 0.3); // 폰트 크기는 아이콘의 30%
    } catch (error) {
        console.error(`북마크 아이콘 생성 실패: ${bookmark.title || '제목 없음'}`, error);
        return;
    }
    
    if (!bookmarkIcon) {
        console.error(`북마크 아이콘 생성 실패: ${bookmark.title || '제목 없음'}`);
        return;
    }
    
    // 화면 경계 체크 및 조정 - 북마크 위치가 화면 밖으로 벗어나지 않도록
    const containerRect = container.getBoundingClientRect();
    const containerCenterX = containerRect.left + containerRect.width / 2;
    const containerCenterY = containerRect.top + containerRect.height / 2;
    
    // 컨테이너 기준으로 아이콘 절대 위치 계산
    const absoluteX = containerCenterX + x;
    const absoluteY = containerCenterY + y;
    
    // 위치가 화면을 벗어나는지 체크하고 조정
    const adjusted = adjustPositionToScreenBounds(absoluteX, absoluteY, iconSize);
    
    // 조정된 위치를 컨테이너 상대 좌표로 다시 변환
    const adjustedX = adjusted.x - containerCenterX;
    const adjustedY = adjusted.y - containerCenterY;
    
    // 스타일 적용
    bookmarkIcon.style.position = 'absolute';
    bookmarkIcon.style.transform = `translate(${adjustedX}px, ${adjustedY}px) scale(0)`; // 시작 시 크기 0
    bookmarkIcon.style.opacity = '0'; // 시작은 투명하게
    bookmarkIcon.style.transition = 'transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.5s ease-out'; // 향상된 애니메이션
    bookmarkIcon.style.borderRadius = '50%';
    bookmarkIcon.style.width = `${iconSize}px`;
    bookmarkIcon.style.height = `${iconSize}px`;
    bookmarkIcon.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
    bookmarkIcon.style.backgroundColor = 'white';
    bookmarkIcon.style.display = 'flex';
    bookmarkIcon.style.flexDirection = 'column';
    bookmarkIcon.style.alignItems = 'center';
    bookmarkIcon.style.justifyContent = 'center';
    bookmarkIcon.style.overflow = 'hidden';
    bookmarkIcon.style.cursor = 'pointer';
    bookmarkIcon.style.zIndex = '2147483647';
    bookmarkIcon.style.pointerEvents = 'auto'; // 클릭 허용
    
    // 마우스 오버 효과
    bookmarkIcon.addEventListener('mouseenter', () => {
        bookmarkIcon.style.transform = `translate(${adjustedX}px, ${adjustedY}px) scale(1.2)`;
        bookmarkIcon.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
        bookmarkIcon.style.zIndex = '2147483649'; // 호버 시 최상위로
    });
    
    bookmarkIcon.addEventListener('mouseleave', () => {
        bookmarkIcon.style.transform = `translate(${adjustedX}px, ${adjustedY}px) scale(1)`;
        bookmarkIcon.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
        bookmarkIcon.style.zIndex = '2147483647';
    });
    
    container.appendChild(bookmarkIcon);
    
    // 애니메이션 모드에 따라 적용
    applyBookmarkAnimation(bookmarkIcon, adjustedX, adjustedY, index, animationMode);
}

// 전체 화면 레이아웃으로 북마크 표시
function displayBookmarksFullscreen(container, bookmarks, iconSize, animationMode) {
    if (!bookmarks || bookmarks.length === 0) return;
    
    const margin = 50; // 화면 가장자리에서의 여백
    const availableWidth = window.innerWidth - margin * 2;
    const availableHeight = window.innerHeight - margin * 2;
    
    // 북마크 수에 따라 격자 크기 동적 조정
    const totalBookmarks = bookmarks.length;
    let maxCols;
    
    if (totalBookmarks <= 20) {
        maxCols = Math.ceil(Math.sqrt(totalBookmarks * 16/9)); // 적은 수일 때 16:9 비율 적용
    } else if (totalBookmarks <= 40) {
        maxCols = Math.ceil(Math.sqrt(totalBookmarks)); // 정사각형에 가까운 그리드
    } else {
        // 북마크가 많을 때는 더 많은 열 사용
        maxCols = Math.ceil(Math.sqrt(totalBookmarks * 9/16)); // 9:16 비율 (세로로 더 많이)
    }
    
    // 최대/최소 열 수 제한
    maxCols = Math.max(3, Math.min(Math.floor(availableWidth / (iconSize * 1.5)), maxCols));
    
    const gridSpacing = iconSize * 1.5; // 아이콘 간격
    
    // 그리드 전체 크기
    const cols = Math.min(maxCols, Math.ceil(Math.sqrt(bookmarks.length * 16/9))); 
    const rows = Math.ceil(bookmarks.length / cols);
    const gridWidth = cols * gridSpacing;
    const gridHeight = rows * gridSpacing;
    
    // 그리드 시작 위치 (화면 중앙 기준)
    const startX = (window.innerWidth - gridWidth) / 2 + gridSpacing / 2 - iconSize / 2;
    const startY = (window.innerHeight - gridHeight) / 2 + gridSpacing / 2 - iconSize / 2;
    
    console.log(`전체화면 레이아웃: ${cols}열 x ${rows}행, 북마크 ${bookmarks.length}개`);
    
    // 북마크 배치
    bookmarks.forEach((bookmark, index) => {
        const col = index % cols;
        const row = Math.floor(index / cols);
        
        const iconX = startX + col * gridSpacing - window.innerWidth/2;
        const iconY = startY + row * gridSpacing - window.innerHeight/2;
        
        createBookmarkIcon(container, bookmark, iconX, iconY, iconSize, index, animationMode);
    });
}

// 북마크 아이콘 표시 함수 - 주 함수로 사용
function displayBookmarkIcons(bookmarks, position) {
    // 기존 북마크 컨테이너가 있다면 제거
    removeBookmarkBar();
    
    if (!bookmarks || bookmarks.length === 0) {
        console.log('표시할 북마크가 없습니다.');
        // 북마크가 없어도 뒤로가기와 추가 버튼은 표시
        createEmptyBookmarkCircle(position);
        return;
    }
    
    // 북마크를 사용 빈도순으로 정렬
    bookmarks = sortBookmarksByUsage(bookmarks);
    
    console.log(`북마크 ${bookmarks.length}개 표시 중...`);
    
    // 설정에서 최대 표시 북마크 수 가져오기
    chrome.storage.sync.get({
        maxBookmarks: 30,  // 기본값 증가
        bookmarkLayoutMode: 'circle',
        bookmarkAnimationMode: 'explosion'
    }, (settings) => {
        const maxDisplayCount = settings.maxBookmarks || 30;  // 기본값 증가
        const layoutMode = settings.bookmarkLayoutMode || 'circle';
        const animationMode = settings.bookmarkAnimationMode || 'explosion';
        
        console.log(`레이아웃 모드: ${layoutMode}, 애니메이션 모드: ${animationMode}, 최대 북마크 수: ${maxDisplayCount}`);
        
        // 최대 표시할 북마크 수 제한 - 레이아웃에 따라 다르게 적용
        let displayLimit = maxDisplayCount;
        if (layoutMode === 'fullscreen') {
            // 전체화면 모드에서는 더 많은 북마크 표시 가능
            displayLimit = Math.min(bookmarks.length, Math.max(maxDisplayCount, 50));
        } else if (layoutMode === 'grid') {
            // 그리드 모드에서는 중간 정도의 북마크 표시
            displayLimit = Math.min(bookmarks.length, Math.max(maxDisplayCount, 36));
        }
        
        const displayBookmarks = bookmarks.slice(0, displayLimit);
        console.log(`${displayBookmarks.length}개 북마크 표시 (총 ${bookmarks.length}개 중)`);
        
        // 컨테이너 생성
        const container = document.createElement('div');
        container.id = 'bookmarkIconsContainer';
        container.className = 'bookstaxx-bookmark-bar';
        container.setAttribute('data-bookstaxx-element', 'true');
        container.style.position = 'fixed';
        container.style.zIndex = '2147483647'; // 최대 z-index 값으로 설정
        container.style.pointerEvents = 'none'; // 마우스 이벤트 허용하지 않음 (스크롤 허용)
        
        // 반투명 배경 레이어 - 포인터 이벤트 허용하지 않게 수정
        const backgroundLayer = document.createElement('div');
        backgroundLayer.id = 'bookmarkBackgroundLayer';
        backgroundLayer.style.position = 'fixed';
        backgroundLayer.style.top = '0';
        backgroundLayer.style.left = '0';
        backgroundLayer.style.width = '100%';
        backgroundLayer.style.height = '100%';
        backgroundLayer.style.zIndex = '2147483645'; // 컨테이너보다 낮은 z-index
        backgroundLayer.style.backgroundColor = 'rgba(0, 0, 0, 0.03)'; // 더 투명하게
        backgroundLayer.style.pointerEvents = 'none'; // 스크롤 허용
        
        document.body.appendChild(backgroundLayer);
        
        // 마우스 이벤트 방지 레이어에 data-bookstaxx-element 속성 추가
        backgroundLayer.setAttribute('data-bookstaxx-element', 'true');
        
        // 북마크 수에 따른 아이콘 크기 조정
        let iconSize = 40; // 기본 크기
        if (displayBookmarks.length > 10) {
            iconSize = 35;
        }
        if (displayBookmarks.length > 15) {
            iconSize = 32;
        }
        
        // 위치 설정: 마우스 클릭 좌표
        const x = position ? position.x : window.innerWidth / 2;
        const y = position ? position.y : window.innerHeight / 2;
        
        container.style.top = `${y}px`;
        container.style.left = `${x}px`;
        container.style.transform = 'translate(-50%, -50%)';
        
        // 뒤로가기 버튼 추가 (왼쪽) - 마우스에 더 가깝게 배치
        const backButtonRadius = 50; // 고정 크기로 변경
        const backButton = createActionButton('←', 'goBack', currentSettings.backButtonIcon);
        backButton.style.position = 'absolute';
        backButton.style.left = `-${backButtonRadius}px`;
        backButton.style.top = '0';
        backButton.style.transform = 'translateY(-50%)';
        backButton.style.backgroundColor = '#f44336'; // 빨간색 계열
        backButton.style.color = 'white';
        backButton.style.borderRadius = '50%';
        backButton.style.width = '40px';
        backButton.style.height = '40px';
        backButton.style.pointerEvents = 'auto'; // 클릭 허용
        backButton.style.zIndex = '2147483648'; // 최상위
        backButton.style.opacity = '0'; // 시작시 투명
        backButton.style.transform = 'translateY(-50%) scale(0)'; // 시작시 작게
        
        // 북마크 추가 버튼 추가 (오른쪽) - 마우스에 더 가깝게 배치
        const addButtonRadius = 50; // 고정 크기로 변경
        const addButton = createActionButton('+', 'addBookmark', currentSettings.addButtonIcon);
        addButton.style.position = 'absolute';
        addButton.style.right = `-${addButtonRadius}px`;
        addButton.style.top = '0';
        addButton.style.transform = 'translateY(-50%)';
        addButton.style.backgroundColor = '#4CAF50'; // 녹색 계열
        addButton.style.color = 'white';
        addButton.style.borderRadius = '50%';
        addButton.style.width = '40px';
        addButton.style.height = '40px';
        addButton.style.pointerEvents = 'auto'; // 클릭 허용
        addButton.style.zIndex = '2147483648'; // 최상위
        addButton.style.opacity = '0'; // 시작시 투명
        addButton.style.transform = 'translateY(-50%) scale(0)'; // 시작시 작게
        
        container.appendChild(backButton);
        container.appendChild(addButton);
        
        // 레이아웃 모드에 따라 북마크 배치
        if (layoutMode === 'circle') {
            displayBookmarksInCircle(container, displayBookmarks, x, y, iconSize, animationMode);
        } else if (layoutMode === 'grid') {
            displayBookmarksInGrid(container, displayBookmarks, x, y, iconSize, animationMode);
        } else if (layoutMode === 'fullscreen') {
            displayBookmarksFullscreen(container, displayBookmarks, iconSize, animationMode);
        }
        
        document.body.appendChild(container);
        
        // 설정 버튼 추가
        const settingsButton = createSettingsButton(iconSize);
        settingsButton.style.position = 'absolute';
        settingsButton.style.bottom = `-${50}px`; // 고정 크기로 변경
        settingsButton.style.left = '50%';
        settingsButton.style.transform = 'translateX(-50%) scale(0)'; // 시작 시 작게
        settingsButton.style.opacity = '0'; // 시작 시 투명
        settingsButton.style.transition = 'transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.5s ease-out';
        settingsButton.style.pointerEvents = 'auto'; // 클릭 허용
        settingsButton.style.zIndex = '2147483648';
        container.appendChild(settingsButton);
        
        // 애니메이션 적용 - 선택한 모드에 따라 적용
        // 1. 액션 버튼 애니메이션
        setTimeout(() => {
            backButton.style.transition = 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.4s ease-out';
            backButton.style.opacity = '1';
            backButton.style.transform = 'translateY(-50%) scale(1)';
        }, 100);
        
        setTimeout(() => {
            addButton.style.transition = 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.4s ease-out';
            addButton.style.opacity = '1';
            addButton.style.transform = 'translateY(-50%) scale(1)';
        }, 150);
        
        // 3. 설정 버튼 애니메이션
        setTimeout(() => {
            settingsButton.style.opacity = '1';
            settingsButton.style.transform = 'translateX(-50%) scale(1)';
        }, 300 + displayBookmarks.length * 30); // 모든 북마크 아이콘 후에 표시
        
        // 문서 클릭 이벤트 추가 - 북마크 바 외부 클릭 시 닫기
        document.addEventListener('mousedown', documentClickHandler);
        
        // ESC 키로 북마크 창 닫기
        document.addEventListener('keydown', function escKeyHandler(e) {
            if (e.key === 'Escape') {
                removeBookmarkBar();
                document.removeEventListener('keydown', escKeyHandler);
            }
        });
        
        console.log('북마크 아이콘 배치 완료');
    });
    
    return container;
}

// 북마크 아이콘에 애니메이션 적용
function applyBookmarkAnimation(icon, x, y, index, animationMode) {
    // 기본 지연시간 (모드별로 조정)
    let delay = 200;
    
    switch (animationMode) {
        case 'sequential':
            // 순차적으로 나타나는 애니메이션
            delay = 200 + (index * 50);
            setTimeout(() => {
                icon.style.opacity = '1';
                icon.style.transform = `translate(${x}px, ${y}px) scale(1)`;
            }, delay);
            break;
            
        case 'explosion':
            // 발사되어 흩어지는 애니메이션
            icon.style.transition = 'transform 0.6s cubic-bezier(0.2, 0.8, 0.2, 1.2), opacity 0.4s ease-out';
            delay = 100 + (Math.random() * 200);
            
            // 시작 위치 (중앙으로부터)
            icon.style.transform = `translate(0px, 0px) scale(0)`;
            
            setTimeout(() => {
                icon.style.opacity = '1';
                icon.style.transform = `translate(${x}px, ${y}px) scale(1)`;
            }, delay);
            break;
            
        case 'cascade':
            // 위에서 아래로 정렬되는 애니메이션
            icon.style.transition = 'transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.4s ease-out';
            
            // 시작 위치 (위에서부터)
            icon.style.transform = `translate(${x}px, ${y - 100}px) scale(0.5)`;
            
            delay = 100 + (index * 40);
            setTimeout(() => {
                icon.style.opacity = '1';
                icon.style.transform = `translate(${x}px, ${y}px) scale(1)`;
            }, delay);
            break;
            
        case 'scatter':
            // 모든 아이콘이 동시에 흩어지는 애니메이션
            icon.style.transition = 'transform 0.7s cubic-bezier(0.2, 0.8, 0.2, 1.2), opacity 0.3s ease-out';
            
            // 랜덤한 시작 위치 (화면 중앙)
            const randomAngle = Math.random() * Math.PI * 2;
            const randomDist = 30 + Math.random() * 50;
            const startX = randomDist * Math.cos(randomAngle);
            const startY = randomDist * Math.sin(randomAngle);
            
            icon.style.transform = `translate(${startX}px, ${startY}px) scale(0.2)`;
            
            // 모든 아이콘이 거의 동시에 시작
            delay = 50 + Math.random() * 100;
            setTimeout(() => {
                icon.style.opacity = '1';
                icon.style.transform = `translate(${x}px, ${y}px) scale(1)`;
            }, delay);
            break;
            
        case 'stagger':
            // 지연 효과가 있는 확장 애니메이션
            icon.style.transition = 'transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.6s ease-out';
            
            // 중앙에서 시작
            icon.style.transform = `translate(0px, 0px) scale(0.1)`;
            
            delay = 300 + (index * 60);
            setTimeout(() => {
                icon.style.opacity = '1';
                icon.style.transform = `translate(${x}px, ${y}px) scale(1)`;
            }, delay);
            break;
            
        default:
            // 기본 애니메이션 (순차적)
            delay = 200 + (index * 30);
            setTimeout(() => {
                icon.style.opacity = '1';
                icon.style.transform = `translate(${x}px, ${y}px) scale(1)`;
            }, delay);
    }
}

// 원형 레이아웃으로 북마크 표시
function displayBookmarksInCircle(container, bookmarks, iconSize, animationMode) {
    if (!bookmarks || bookmarks.length === 0) return;
    
    // 화면 크기
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    
    // 북마크 수에 따라 원의 반지름 조정
    let radius = Math.min(
        Math.min(screenWidth, screenHeight) * 0.3,
        Math.max(120, 50 + bookmarks.length * 5)
    );
    
    // 화면 경계를 넘어가지 않도록 반지름 제한
    radius = Math.min(
        radius,
        Math.min(screenWidth, screenHeight) / 2 - iconSize
    );
    
    // 아이콘 간의 각도
    const angleStep = (2 * Math.PI) / bookmarks.length;
    
    // 북마크 아이콘 배치
    bookmarks.forEach((bookmark, index) => {
        // 원형 배치를 위한 각도 계산
        const angle = index * angleStep;
        
        // 원형 좌표계에서의 위치 계산
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        
        // 북마크 아이콘 생성
        createBookmarkIcon(container, bookmark, x, y, iconSize, index, animationMode);
    });
}

// 그리드 레이아웃으로 북마크 표시
function displayBookmarksInGrid(container, bookmarks, iconSize, animationMode) {
    if (!bookmarks || bookmarks.length === 0) return;
    
    // 화면 크기 및 안전 여백
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    const safeMargin = 30; // 화면 가장자리 안전 여백
    
    // 그리드 생성을 위한 계산
    const spacing = iconSize * 1.2; // 아이콘 간 간격
    const maxIconsPerRow = Math.min(
        Math.floor(Math.sqrt(bookmarks.length)),
        Math.floor((screenWidth - safeMargin * 2) / spacing)
    );
    
    // 행과 열 수 계산
    const columns = Math.min(maxIconsPerRow, 5); // 최대 5개까지만 한 줄에 표시
    const rows = Math.ceil(bookmarks.length / columns);
    
    // 그리드 전체 크기
    const gridWidth = columns * spacing;
    const gridHeight = rows * spacing;
    
    // 시작 위치 (화면 중앙 기준으로 옮김)
    const startX = -(gridWidth / 2) + spacing / 2;
    const startY = -(gridHeight / 2) + spacing / 2;
    
    // 북마크를 그리드에 배치
    bookmarks.forEach((bookmark, index) => {
        const col = index % columns;
        const row = Math.floor(index / columns);
        
        // 위치 계산
        const x = startX + col * spacing;
        const y = startY + row * spacing;
        
        // 북마크 아이콘 생성
        createBookmarkIcon(container, bookmark, x, y, iconSize, index, animationMode);
    });
}

// 문서 클릭 이벤트 핸들러 - 북마크 바 외부 클릭 시 닫기
function documentClickHandler(e) {
    // 클릭된 요소 또는 부모 요소가 북마크 바에 속하는지 확인
    let targetElement = e.target;
    let isBookmarkElement = false;
    
    // 클릭된 요소의 부모 노드들을 검사
    while (targetElement && targetElement !== document.body) {
        if (targetElement.hasAttribute && targetElement.hasAttribute('data-bookstaxx-element')) {
            isBookmarkElement = true;
            break;
        }
        targetElement = targetElement.parentNode;
    }
    
    // 북마크 바 영역 외부 클릭 시 바 닫기
    if (!isBookmarkElement) {
        removeBookmarkBar();
    }
}

// 화면 경계 체크 및 위치 조정 함수
function adjustPositionToScreenBounds(x, y, iconSize, screenMargin = 20) {
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    
    // 아이콘 실제 크기 (마진 포함)
    const totalIconSize = iconSize + 10; // 추가 여백 고려
    
    // 화면 상/하/좌/우 경계 체크 및 위치 조정
    let adjustedX = x;
    let adjustedY = y;
    
    // 왼쪽 경계 체크
    if (x - totalIconSize/2 < screenMargin) {
        adjustedX = screenMargin + totalIconSize/2;
    }
    
    // 오른쪽 경계 체크
    if (x + totalIconSize/2 > screenWidth - screenMargin) {
        adjustedX = screenWidth - screenMargin - totalIconSize/2;
    }
    
    // 상단 경계 체크
    if (y - totalIconSize/2 < screenMargin) {
        adjustedY = screenMargin + totalIconSize/2;
    }
    
    // 하단 경계 체크
    if (y + totalIconSize/2 > screenHeight - screenMargin) {
        adjustedY = screenHeight - screenMargin - totalIconSize/2;
    }
    
    return { x: adjustedX, y: adjustedY };
}

// 북마크 아이콘 생성 함수
function createBookmarkIcon(container, bookmark, x, y, iconSize, index, animationMode) {
    try {
        if (!container || !bookmark) return;
        
        const mouseX = window.mouseX || window.innerWidth / 2;
        const mouseY = window.mouseY || window.innerHeight / 2;
        
        // 마우스 위치 중심 좌표계에서 아이콘 위치 계산
        const posX = mouseX + x;
        const posY = mouseY + y;
        
        // 화면 경계를 넘어가지 않도록 위치 조정
        const adjustedPos = adjustPositionToScreenBounds(posX, posY, iconSize);
        
        // 북마크 아이콘 요소 생성
        const icon = document.createElement('div');
        icon.className = 'bookmark-icon';
        icon.setAttribute('data-bookstaxx-element', 'true');
        icon.setAttribute('data-bookmark-id', bookmark.id);
        icon.setAttribute('data-bookmark-url', bookmark.url);
        icon.setAttribute('title', bookmark.title);
        
        // 스타일 설정
        icon.style.position = 'absolute';
        icon.style.width = `${iconSize}px`;
        icon.style.height = `${iconSize}px`;
        icon.style.borderRadius = '50%';
        icon.style.background = '#ffffff';
        icon.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.2)';
        icon.style.cursor = 'pointer';
        icon.style.display = 'flex';
        icon.style.alignItems = 'center';
        icon.style.justifyContent = 'center';
        icon.style.overflow = 'hidden';
        icon.style.transition = 'transform 0.5s cubic-bezier(0.19, 1, 0.22, 1), opacity 0.3s ease-out';
        icon.style.opacity = '0';
        icon.style.transform = `translate(${adjustedPos.x}px, ${adjustedPos.y}px) scale(0.5)`;
        icon.style.zIndex = '2147483640'; // 최상단에 표시
        
        // 파비콘 이미지 추가
        const img = document.createElement('img');
        img.style.maxWidth = '70%';
        img.style.maxHeight = '70%';
        img.style.transition = 'transform 0.2s ease-out';
        
        // 저장된 파비콘 로드 또는 온라인 파비콘 사용
        getSavedFavicon(bookmark.url)
            .then(faviconData => {
                if (faviconData) {
                    img.src = faviconData;
                } else {
                    // Google의 파비콘 서비스 사용
                    img.src = `https://www.google.com/s2/favicons?domain=${new URL(bookmark.url).hostname}&sz=${Math.round(iconSize * 0.7)}`;
                    
                    // 파비콘 저장 시도
                    chrome.runtime.sendMessage({
                        action: 'saveFavicon',
                        url: bookmark.url
                    }).catch(err => console.log('파비콘 저장 요청 실패:', err));
                }
                
                img.onerror = () => {
                    // 파비콘 로드 실패 시 대체 이미지 표시
                    img.src = 'icons/favicon-fallback.png';
                };
            })
            .catch(() => {
                // 파비콘 로드 실패 시 기본 이미지
                img.src = `https://www.google.com/s2/favicons?domain=${new URL(bookmark.url).hostname}&sz=${Math.round(iconSize * 0.7)}`;
            });
        
        icon.appendChild(img);
        
        // 호버 효과
        icon.addEventListener('mouseenter', () => {
            img.style.transform = 'scale(1.1)';
            icon.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)';
        });
        
        icon.addEventListener('mouseleave', () => {
            img.style.transform = 'scale(1)';
            icon.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.2)';
        });
        
        // 클릭 이벤트
        icon.addEventListener('click', (e) => {
            e.stopPropagation();
            
            // 북마크 클릭 로깅 및 사용 빈도 업데이트
            chrome.runtime.sendMessage({
                action: 'updateBookmarkUsage',
                bookmarkId: bookmark.id
            }).catch(err => console.log('북마크 사용 업데이트 실패:', err));
            
            // 북마크 열기
            chrome.runtime.sendMessage({
                action: 'openBookmark',
                url: bookmark.url
            }).catch(err => console.log('북마크 열기 실패:', err));
            
            // 북마크 바 닫기
            removeBookmarkBar();
        });
        
        container.appendChild(icon);
        
        // 애니메이션 적용
        applyBookmarkAnimation(icon, adjustedPos.x, adjustedPos.y, index, animationMode);
        
    } catch (error) {
        console.error('북마크 아이콘 생성 오류:', error);
    }
}

// 전체 화면 레이아웃으로 북마크 표시
function displayBookmarksFullscreen(container, bookmarks, iconSize, animationMode) {
    if (!bookmarks || bookmarks.length === 0) return;
    
    // 화면 크기 및 안전 여백
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    const margin = 50; // 화면 가장자리 여백
    
    // 가용 영역 계산
    const availableWidth = screenWidth - (margin * 2);
    const availableHeight = screenHeight - (margin * 2);
    
    // 북마크 간 간격
    const spacing = iconSize * 1.3;
    
    // 그리드 열 수 계산 (아이콘 크기 기반)
    let cols = Math.floor(availableWidth / spacing);
    
    // 북마크 수에 따라 열 수 조정
    if (bookmarks.length < cols) {
        cols = bookmarks.length;
    } else if (cols < 1) {
        cols = 1;
    }
    
    // 행 수 계산
    const rows = Math.ceil(bookmarks.length / cols);
    
    // 그리드 전체 크기
    const gridWidth = cols * spacing;
    const gridHeight = rows * spacing;
    
    // 그리드 시작 위치 (화면 중앙 기준)
    const startX = (screenWidth - gridWidth) / 2 + spacing / 2;
    const startY = (screenHeight - gridHeight) / 2 + spacing / 2;
    
    // 북마크 배치
    bookmarks.forEach((bookmark, index) => {
        const col = index % cols;
        const row = Math.floor(index / cols);
        
        // 아이콘 위치 계산 (화면 중앙 기준)
        const iconX = startX + (col * spacing) - window.mouseX;
        const iconY = startY + (row * spacing) - window.mouseY;
        
        // 북마크 아이콘 생성
        createBookmarkIcon(container, bookmark, iconX, iconY, iconSize, index, animationMode);
    });
}

// 설정 버튼 생성 함수
function createSettingsButton() {
    // 설정 버튼 컨테이너
    const settingsBtn = document.createElement('div');
    settingsBtn.className = 'settings-button';
    settingsBtn.setAttribute('data-bookstaxx-element', 'true');
    
    // 스타일 설정
    settingsBtn.style.position = 'absolute';
    settingsBtn.style.bottom = '15px';
    settingsBtn.style.right = '15px';
    settingsBtn.style.width = '32px';
    settingsBtn.style.height = '32px';
    settingsBtn.style.borderRadius = '50%';
    settingsBtn.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
    settingsBtn.style.boxShadow = '0 2px 5px rgba(0, 0, 0, 0.2)';
    settingsBtn.style.display = 'flex';
    settingsBtn.style.alignItems = 'center';
    settingsBtn.style.justifyContent = 'center';
    settingsBtn.style.cursor = 'pointer';
    settingsBtn.style.zIndex = '2147483647'; // 최상단 레이어
    
    // 설정 아이콘 생성
    settingsBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#333" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
        </svg>
    `;
    
    // 호버 효과
    settingsBtn.addEventListener('mouseenter', () => {
        settingsBtn.style.transform = 'scale(1.1)';
        settingsBtn.style.boxShadow = '0 3px 8px rgba(0, 0, 0, 0.3)';
    });
    
    settingsBtn.addEventListener('mouseleave', () => {
        settingsBtn.style.transform = 'scale(1)';
        settingsBtn.style.boxShadow = '0 2px 5px rgba(0, 0, 0, 0.2)';
    });
    
    // 클릭 이벤트 - 옵션 페이지 열기
    settingsBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // 이벤트 버블링 방지
        
        // 옵션 페이지 열기
        chrome.runtime.sendMessage({
            action: 'openOptions'
        }).catch(err => console.log('옵션 페이지 열기 실패:', err));
        
        // 북마크 바 닫기
        removeBookmarkBar();
    });
    
    return settingsBtn;
}

// 키보드 단축키 설정
function setupKeyboardShortcuts() {
    // 단축키 이벤트 리스너
    document.addEventListener('keydown', (e) => {
        // Alt+B: 북마크 바 토글
        if (e.altKey && e.key === 'b') {
            e.preventDefault();
            toggleBookmarkBar();
        }
        
        // ESC: 북마크 바 닫기
        if (e.key === 'Escape') {
            removeBookmarkBar();
        }
    });
}

// 스크린 경계 체크 및 위치 조정
function adjustPositionToScreenBounds(x, y, iconSize, screenMargin = 20) {
    // 화면 크기
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    
    // 마우스 위치 기준으로 좌표 조정
    const absX = window.mouseX + x;
    const absY = window.mouseY + y;
    
    // 아이콘 반지름
    const radius = iconSize / 2;
    
    // 조정된 좌표
    let adjustedX = x;
    let adjustedY = y;
    
    // 화면 왼쪽 경계 체크
    if (absX - radius < screenMargin) {
        adjustedX = screenMargin - window.mouseX + radius;
    }
    
    // 화면 오른쪽 경계 체크
    if (absX + radius > screenWidth - screenMargin) {
        adjustedX = screenWidth - screenMargin - window.mouseX - radius;
    }
    
    // 화면 상단 경계 체크
    if (absY - radius < screenMargin) {
        adjustedY = screenMargin - window.mouseY + radius;
    }
    
    // 화면 하단 경계 체크
    if (absY + radius > screenHeight - screenMargin) {
        adjustedY = screenHeight - screenMargin - window.mouseY - radius;
    }
    
    return { x: adjustedX, y: adjustedY };
}

// 북마크 아이콘 생성 함수
function createBookmarkIcon(container, bookmark, x, y, iconSize, index, animationMode) {
    try {
        // 화면 경계 고려하여 위치 조정
        const adjustedPos = adjustPositionToScreenBounds(x, y, iconSize);
        x = adjustedPos.x;
        y = adjustedPos.y;
        
        // 아이콘 요소 생성
        const iconElement = document.createElement('div');
        iconElement.className = 'bookmark-icon';
        iconElement.setAttribute('data-bookstaxx-element', 'true');
        iconElement.setAttribute('title', bookmark.title || '');
        iconElement.setAttribute('data-url', bookmark.url || '');
        iconElement.setAttribute('data-id', bookmark.id || '');
        
        // 아이콘 스타일 설정
        iconElement.style.position = 'absolute';
        iconElement.style.width = `${iconSize}px`;
        iconElement.style.height = `${iconSize}px`;
        iconElement.style.borderRadius = '50%';
        iconElement.style.backgroundColor = '#ffffff';
        iconElement.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.15)';
        iconElement.style.overflow = 'hidden';
        iconElement.style.cursor = 'pointer';
        iconElement.style.zIndex = '9998';
        iconElement.style.transition = 'transform 0.2s ease-out, box-shadow 0.2s ease-out, opacity 0.3s ease-out';
        iconElement.style.transform = `translate(${x}px, ${y}px) scale(0.5)`;
        iconElement.style.opacity = '0';
        
        // 파비콘 이미지 요소 생성
        const faviconElement = document.createElement('img');
        faviconElement.style.width = '100%';
        faviconElement.style.height = '100%';
        faviconElement.style.objectFit = 'cover';
        faviconElement.alt = bookmark.title || '';

        // 저장된 파비콘 사용 또는 온라인 파비콘 가져오기
        chrome.runtime.sendMessage({ action: 'getSavedFavicon', bookmarkId: bookmark.id }, (response) => {
            if (response && response.favicon) {
                faviconElement.src = response.favicon;
            } else {
                // 기본 파비콘 URL (Google 파비콘 서비스 사용)
                const faviconUrl = `https://www.google.com/s2/favicons?domain=${new URL(bookmark.url).hostname}&sz=64`;
                faviconElement.src = faviconUrl;
                
                // 로드 후 파비콘 저장 (백그라운드에서)
                faviconElement.onload = () => {
                    chrome.runtime.sendMessage({ 
                        action: 'saveFavicon', 
                        bookmarkId: bookmark.id, 
                        url: bookmark.url 
                    });
                };
            }
        });

        // 파비콘 로드 에러 처리
        faviconElement.onerror = () => {
            // 첫 글자를 사용한 기본 아이콘으로 대체
            faviconElement.style.display = 'none';
            
            const fallbackIcon = document.createElement('div');
            fallbackIcon.style.width = '100%';
            fallbackIcon.style.height = '100%';
            fallbackIcon.style.display = 'flex';
            fallbackIcon.style.alignItems = 'center';
            fallbackIcon.style.justifyContent = 'center';
            fallbackIcon.style.backgroundColor = getRandomColor(bookmark.url);
            fallbackIcon.style.color = '#ffffff';
            fallbackIcon.style.fontWeight = 'bold';
            fallbackIcon.style.fontSize = `${iconSize / 2}px`;
            fallbackIcon.textContent = (bookmark.title || 'B')[0].toUpperCase();
            
            iconElement.appendChild(fallbackIcon);
        };

        // 아이콘에 파비콘 추가
        iconElement.appendChild(faviconElement);
        
        // 호버 효과
        iconElement.addEventListener('mouseenter', () => {
            iconElement.style.transform = `translate(${x}px, ${y}px) scale(1.1)`;
            iconElement.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.25)';
        });
        
        iconElement.addEventListener('mouseleave', () => {
            iconElement.style.transform = `translate(${x}px, ${y}px) scale(1)`;
            iconElement.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.15)';
        });
        
        // 클릭 이벤트 처리
        iconElement.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            // 북마크 URL로 이동
            chrome.runtime.sendMessage({ 
                action: 'navigateToUrl', 
                url: bookmark.url,
                bookmarkId: bookmark.id
            }, () => {
                // 북마크 바 제거
                removeBookmarkBar();
            });
        });
        
        // 컨테이너에 아이콘 추가
        container.appendChild(iconElement);
        
        // 애니메이션 적용
        applyBookmarkAnimation(iconElement, x, y, index, animationMode);
        
    } catch (error) {
        console.error('북마크 아이콘 생성 오류:', error);
    }
}

// 랜덤 색상 생성 함수 (URL 기반)
function getRandomColor(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const hue = Math.abs(hash % 360);
    return `hsl(${hue}, 65%, 55%)`;
}

// 북마크를 전체 화면 레이아웃으로 표시
function displayBookmarksFullscreen(container, bookmarks, iconSize, animationMode) {
    if (!bookmarks || bookmarks.length === 0) return;
    
    // 화면 크기
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    const margin = 60; // 화면 가장자리 여백
    
    // 사용 가능한 영역 계산
    const availableWidth = screenWidth - (margin * 2);
    const availableHeight = screenHeight - (margin * 2);
    
    // 최적 열 수 및 행 수 계산
    const spacing = iconSize * 1.3; // 아이콘 간 간격
    const columnsCount = Math.floor(availableWidth / spacing);
    const rowsCount = Math.ceil(bookmarks.length / columnsCount);
    
    // 그리드 시작 위치 (화면 중앙 기준)
    const gridWidth = columnsCount * spacing;
    const gridHeight = Math.min(rowsCount * spacing, availableHeight);
    
    const startX = -(gridWidth / 2) + spacing / 2;
    const startY = -(gridHeight / 2) + spacing / 2;
    
    // 북마크 배치
    bookmarks.forEach((bookmark, index) => {
        if (index >= columnsCount * rowsCount) return; // 최대 표시 개수 제한
        
        const col = index % columnsCount;
        const row = Math.floor(index / columnsCount);
        
        // 위치 계산
        const x = startX + col * spacing;
        const y = startY + row * spacing;
        
        // 북마크 아이콘 생성
        createBookmarkIcon(container, bookmark, x, y, iconSize, index, animationMode);
    });
}

// documentClickHandler 함수를 수정하여 북마크 요소 체크 로직 추가
function documentClickHandler(event) {
    // 클릭된 요소 또는 부모 요소가 BookStaxx 요소인지 확인
    let target = event.target;
    let isBookStaxxElement = false;
    
    // 클릭된 요소와 모든 부모 요소 검사
    while (target !== null && target !== document.body) {
        if (target.hasAttribute('data-bookstaxx-element')) {
            isBookStaxxElement = true;
            break;
        }
        target = target.parentElement;
    }
    
    // BookStaxx 요소가 아닌 영역 클릭 시 북마크 바 제거
    if (!isBookStaxxElement) {
        removeBookmarkBar();
    }
}

// 북마크 애니메이션 적용 함수
function applyBookmarkAnimation(element, x, y, index, animationMode = 'default') {
    if (!element) return;
    
    // 기본 지연 시간
    const baseDelay = 30;
    
    // 애니메이션 설정
    let delay, transform, transition;
    
    switch (animationMode) {
        case 'sequential':
            // 순차적으로 표시 (인덱스 기반)
            delay = index * baseDelay;
            transform = `translate(${x}px, ${y}px) scale(1)`;
            transition = `transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) ${delay}ms, opacity 0.3s ease ${delay}ms`;
            break;
            
        case 'explosion':
            // 폭발 효과 (중앙에서 방사형으로)
            delay = 50 + (Math.random() * 150);
            
            // 최종 위치로 이동
            setTimeout(() => {
                element.style.transform = `translate(${x}px, ${y}px) scale(1)`;
                element.style.opacity = '1';
                element.style.transition = `transform 0.6s cubic-bezier(0.22, 0.61, 0.36, 1), opacity 0.6s ease`;
            }, delay);
            
            // 초기 상태 (중앙에 작게)
            transform = `translate(0, 0) scale(0.2)`;
            element.style.transform = transform;
            return; // 이 경우 바로 반환 (setTimeout에서 애니메이션 처리)
            
        case 'cascade':
            // 위에서 아래로 폭포수 효과
            delay = index * baseDelay;
            
            // 원래 위치보다 위에서 시작
            element.style.transform = `translate(${x}px, ${y - 100}px) scale(0)`;
            
            // 약간의 지연 후 최종 위치로 이동
            setTimeout(() => {
                element.style.transform = `translate(${x}px, ${y}px) scale(1)`;
                element.style.opacity = '1';
                element.style.transition = `transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.5s ease`;
            }, delay);
            return;
            
        case 'scatter':
            // 무작위 위치에서 최종 위치로 이동
            delay = Math.random() * 200;
            
            // 무작위 시작 위치
            const randomX = (Math.random() - 0.5) * window.innerWidth * 0.8;
            const randomY = (Math.random() - 0.5) * window.innerHeight * 0.8;
            element.style.transform = `translate(${randomX}px, ${randomY}px) scale(0)`;
            
            // 최종 위치로 이동
            setTimeout(() => {
                element.style.transform = `translate(${x}px, ${y}px) scale(1)`;
                element.style.opacity = '1';
                element.style.transition = `transform 0.7s cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 0.7s ease`;
            }, delay);
            return;
            
        case 'stagger':
            // 그룹별로 나타나는 효과
            const groupSize = 3; // 각 그룹에 몇 개의 아이템이 있는지
            const groupIndex = Math.floor(index / groupSize);
            delay = groupIndex * 150;
            
            setTimeout(() => {
                element.style.transform = `translate(${x}px, ${y}px) scale(1)`;
                element.style.opacity = '1';
                element.style.transition = `transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.4s ease`;
            }, delay);
            return;
            
        default:
            // 기본 fade-in 효과
            delay = Math.min(index * baseDelay, 300);
            transform = `translate(${x}px, ${y}px) scale(1)`;
            transition = `transform 0.3s ease ${delay}ms, opacity 0.3s ease ${delay}ms`;
    }
    
    // 애니메이션 적용
    setTimeout(() => {
        element.style.transform = transform;
        element.style.opacity = '1';
        element.style.transition = transition;
    }, 10); // 약간 지연시켜 DOM 갱신 확보
}

// 북마크를 원형으로 표시
function displayBookmarksInCircle(container, bookmarks, iconSize, animationMode) {
    if (!bookmarks || bookmarks.length === 0) return;
    
    // 반지름 계산 (북마크 개수에 따라 조정)
    const count = bookmarks.length;
    const radius = Math.min(
        Math.max(count * 10, 100), // 최소 100px, 북마크 개수에 따라 증가
        Math.min(window.innerWidth, window.innerHeight) * 0.3 // 화면 크기의 30%를 최대값으로 제한
    );
    
    // 북마크를 원형으로 배치
    bookmarks.forEach((bookmark, index) => {
        // 각도 계산 (균등하게 분포)
        const angle = (2 * Math.PI * index) / count;
        
        // 위치 계산 (원 위의 좌표)
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        
        // 북마크 아이콘 생성
        createBookmarkIcon(container, bookmark, x, y, iconSize, index, animationMode);
    });
}

// 북마크를 그리드로 표시
function displayBookmarksInGrid(container, bookmarks, iconSize, animationMode) {
    if (!bookmarks || bookmarks.length === 0) return;
    
    // 그리드 설정
    const spacing = iconSize * 1.2; // 아이콘 간격
    const maxColumns = Math.min(10, Math.ceil(Math.sqrt(bookmarks.length * 1.5))); // 최대 10열, 비율 조정
    
    // 그리드 크기 계산
    const rows = Math.ceil(bookmarks.length / maxColumns);
    const columns = Math.min(maxColumns, bookmarks.length);
    
    // 그리드 크기
    const gridWidth = (columns - 1) * spacing;
    const gridHeight = (rows - 1) * spacing;
    
    // 시작 위치 (중앙 정렬)
    const startX = -gridWidth / 2;
    const startY = -gridHeight / 2;
    
    // 북마크 배치
    bookmarks.forEach((bookmark, index) => {
        // 행과 열 계산
        const column = index % maxColumns;
        const row = Math.floor(index / maxColumns);
        
        // 위치 계산
        const x = startX + column * spacing;
        const y = startY + row * spacing;
        
        // 북마크 아이콘 생성
        createBookmarkIcon(container, bookmark, x, y, iconSize, index, animationMode);
    });
}

// 화면 경계를 체크하고 위치 조정
function adjustPositionToScreenBounds(x, y, iconSize) {
    const margin = 20; // 화면 경계와의 최소 간격 (픽셀)
    const halfIcon = iconSize / 2;
    
    // 현재 마우스 위치를 기준으로 화면 중앙 좌표 계산
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    
    // 화면 왼쪽 경계 체크
    if (centerX + x - halfIcon < margin) {
        x = margin - centerX + halfIcon;
    }
    
    // 화면 오른쪽 경계 체크
    if (centerX + x + halfIcon > window.innerWidth - margin) {
        x = window.innerWidth - margin - centerX - halfIcon;
    }
    
    // 화면 위쪽 경계 체크
    if (centerY + y - halfIcon < margin) {
        y = margin - centerY + halfIcon;
    }
    
    // 화면 아래쪽 경계 체크
    if (centerY + y + halfIcon > window.innerHeight - margin) {
        y = window.innerHeight - margin - centerY - halfIcon;
    }
    
    return { x, y };
}

// 북마크 아이콘 생성 함수
function createBookmarkIcon(container, bookmark, x, y, iconSize, index, animationMode) {
    if (!bookmark || !container) return null;
    
    // 화면 경계 체크 및 위치 조정
    const adjustedPos = adjustPositionToScreenBounds(x, y, iconSize);
    x = adjustedPos.x;
    y = adjustedPos.y;
    
    // 아이콘 요소 생성
    const icon = document.createElement('div');
    icon.className = 'bookmark-icon';
    icon.dataset.id = bookmark.id;
    icon.title = bookmark.title;
    
    // 스타일 설정
    icon.style.position = 'absolute';
    icon.style.width = `${iconSize}px`;
    icon.style.height = `${iconSize}px`;
    icon.style.borderRadius = '50%';
    icon.style.backgroundColor = '#ffffff';
    icon.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.2)';
    icon.style.display = 'flex';
    icon.style.alignItems = 'center';
    icon.style.justifyContent = 'center';
    icon.style.overflow = 'hidden';
    icon.style.cursor = 'pointer';
    icon.style.transform = `translate(${x}px, ${y}px) scale(0)`;
    icon.style.opacity = '0';
    icon.style.zIndex = '100000';
    
    // 호버 효과
    icon.addEventListener('mouseenter', () => {
        icon.style.transform = `translate(${x}px, ${y}px) scale(1.1)`;
        icon.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.3)';
        icon.style.transition = 'transform 0.2s ease, box-shadow 0.2s ease';
    });
    
    icon.addEventListener('mouseleave', () => {
        icon.style.transform = `translate(${x}px, ${y}px) scale(1)`;
        icon.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.2)';
        icon.style.transition = 'transform 0.2s ease, box-shadow 0.2s ease';
    });
    
    // 클릭 이벤트
    icon.addEventListener('click', () => {
        // 북마크 URL로 이동
        if (bookmark.url) {
            window.location.href = bookmark.url;
        }
    });
    
    // 파비콘 로드 또는 대체 이미지 생성
    loadFavicon(icon, bookmark);
    
    // 컨테이너에 추가
    container.appendChild(icon);
    
    // 애니메이션 적용
    applyBookmarkAnimation(icon, x, y, index, animationMode);
    
    return icon;
}

// 파비콘 로드
function loadFavicon(iconElement, bookmark) {
    if (!iconElement || !bookmark) return;
    
    // 파비콘 이미지 요소 생성
    const img = document.createElement('img');
    img.style.width = '60%';
    img.style.height = '60%';
    img.style.objectFit = 'contain';
    
    // 저장된 파비콘 가져오기
    chrome.runtime.sendMessage({ action: 'getSavedFavicon', url: bookmark.url }, (response) => {
        if (response && response.favicon) {
            // 저장된 파비콘 사용
            img.src = response.favicon;
        } else {
            // 온라인 파비콘 시도
            img.src = `https://www.google.com/s2/favicons?domain=${new URL(bookmark.url).hostname}&sz=64`;
            
            // 온라인 파비콘 저장
            img.onload = () => {
                chrome.runtime.sendMessage({ 
                    action: 'saveFavicon', 
                    url: bookmark.url, 
                    favicon: img.src 
                });
            };
        }
    });
    
    // 이미지 오류 처리
    img.onerror = () => {
        // 파비콘을 불러오지 못한 경우 첫 글자를 대체 이미지로 사용
        img.remove();
        
        const fallback = document.createElement('div');
        fallback.style.width = '100%';
        fallback.style.height = '100%';
        fallback.style.display = 'flex';
        fallback.style.alignItems = 'center';
        fallback.style.justifyContent = 'center';
        fallback.style.fontFamily = 'Arial, sans-serif';
        fallback.style.fontWeight = 'bold';
        fallback.style.fontSize = '16px';
        fallback.style.color = '#333';
        fallback.style.backgroundColor = getRandomColor(bookmark.title);
        
        // 북마크 제목의 첫 글자 (또는 첫 단어의 첫 글자들)
        const words = bookmark.title.split(' ');
        if (words.length > 1 && words[0].length <= 3) {
            // 짧은 첫 단어는 두 단어의 첫 글자 사용
            fallback.textContent = (words[0][0] + words[1][0]).toUpperCase();
        } else {
            // 긴 단어는 첫 글자만 사용
            fallback.textContent = bookmark.title[0].toUpperCase();
        }
        
        iconElement.appendChild(fallback);
    };
    
    // 이미지 추가
    iconElement.appendChild(img);
}

// 북마크 제목에 기반한 랜덤 색상 생성
function getRandomColor(seed) {
    // 간단한 해시 함수로 문자열을 숫자로 변환
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
        hash = seed.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    // 파스텔 색상 생성 (HSL 사용)
    const h = hash % 360; // 색상
    const s = 65 + (hash % 20); // 채도 (65-85%)
    const l = 75 + (hash % 10); // 명도 (75-85%)
    
    return `hsl(${h}, ${s}%, ${l}%)`;
}

// 북마크를 화면 전체에 표시
function displayBookmarksFullscreen(container, bookmarks, iconSize, animationMode) {
    if (!bookmarks || bookmarks.length === 0) return;
    
    // 화면 크기
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    
    // 사용 가능한 화면 영역 (여백 고려)
    const margin = 40; // 화면 경계와의 간격
    const usableWidth = screenWidth - (margin * 2);
    const usableHeight = screenHeight - (margin * 2);
    
    // 북마크 간 간격
    const spacing = iconSize * 1.5;
    
    // 행과 열 수 계산
    const maxColumns = Math.floor(usableWidth / spacing);
    const maxRows = Math.floor(usableHeight / spacing);
    const totalSlots = maxColumns * maxRows;
    
    // 실제 사용할 북마크 수 (최대 표시 가능 수로 제한)
    const bookmarksToShow = bookmarks.slice(0, Math.min(bookmarks.length, totalSlots));
    
    // 그리드 시작 위치 (중앙 정렬)
    const actualColumns = Math.min(maxColumns, Math.ceil(Math.sqrt(bookmarksToShow.length)));
    const actualRows = Math.ceil(bookmarksToShow.length / actualColumns);
    
    const gridWidth = (actualColumns - 1) * spacing;
    const gridHeight = (actualRows - 1) * spacing;
    
    const startX = -gridWidth / 2;
    const startY = -gridHeight / 2;
    
    // 북마크 배치 (그리드 형태)
    bookmarksToShow.forEach((bookmark, index) => {
        const col = index % actualColumns;
        const row = Math.floor(index / actualColumns);
        
        // 위치 계산
        const x = startX + col * spacing;
        const y = startY + row * spacing;
        
        // 북마크 아이콘 생성
        createBookmarkIcon(container, bookmark, x, y, iconSize, index, animationMode);
    });
}