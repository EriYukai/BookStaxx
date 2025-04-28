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
        
        // 마우스 중간 버튼 클릭 이벤트 캡처 강화
        event.preventDefault(); // 모든 사이트에서 기본 동작 방지
        event.stopPropagation(); // 이벤트 전파 중지
        
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
            createBookmarkBarWithSettings(sortedBookmarks, {
                iconSize: 24,
                fontSize: 12,
                animationEnabled: true,
                maxBookmarks: 10
            });
            return;
        }
        
        // 설정 불러오기
        try {
            chrome.storage.local.get({
                iconSize: 24,
                fontSize: 12,
                animationEnabled: true,
                maxBookmarks: 10
            }, (settings) => {
                createBookmarkBarWithSettings(sortedBookmarks, settings);
            });
        } catch (error) {
            console.error('BookStaxx: 설정 로드 중 오류:', error);
            // 오류 발생시 기본 설정 사용
            createBookmarkBarWithSettings(sortedBookmarks, {
                iconSize: 24,
                fontSize: 12,
                animationEnabled: true,
                maxBookmarks: 10
            });
        }
    } catch (error) {
        console.error('북마크 바 생성 준비 중 오류:', error);
    }
}

// 설정을 적용하여 북마크 바 생성 (기존 함수에서 분리)
function createBookmarkBarWithSettings(sortedBookmarks, settings) {
    try {
        const { iconSize, fontSize, animationEnabled, maxBookmarks } = settings;
        
        // 표시할 북마크 제한
        const visibleBookmarks = sortedBookmarks.slice(0, maxBookmarks);
        
        // 북마크 바 컨테이너 생성
        const bar = document.createElement('div');
        bar.id = 'bookstaxx-bookmark-bar';
        bar.className = 'bookstaxx-bookmark-bar';
        bar.setAttribute('data-bookstaxx-element', 'true');
        bar.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            z-index: 2147483647;
            background: white;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
            border-radius: 8px;
            padding: 10px;
            display: flex;
            flex-direction: column;
            align-items: center;
            max-width: 90vw;
            max-height: 90vh;
            overflow-y: auto;
            width: auto;
            opacity: 0;
            transform: translateY(-10px);
            font-family: Arial, sans-serif;
        `;
        
        // 북마크 컨테이너
        const bookmarksContainer = document.createElement('div');
        bookmarksContainer.className = 'bookstaxx-bookmarks-container';
        bookmarksContainer.style.cssText = `
            display: flex;
            flex-wrap: wrap;
            justify-content: center;
            max-width: 600px;
            gap: 8px;
        `;
        
        // 제목 요소
        const title = document.createElement('div');
        title.textContent = 'BookStaxx';
        title.style.cssText = `
            font-weight: bold;
            width: 100%;
            text-align: center;
            margin-bottom: 10px;
            color: #444;
            font-size: 14px;
            border-bottom: 1px solid #eee;
            padding-bottom: 5px;
        `;
        
        // 메시지 표시 (북마크가 없는 경우)
        if (!visibleBookmarks || visibleBookmarks.length === 0) {
            const message = document.createElement('div');
            message.textContent = '저장된 북마크가 없습니다';
            message.style.cssText = 'padding: 10px; color: #666; text-align: center;';
            bookmarksContainer.appendChild(message);
        } else {
            // 북마크 항목 추가
            visibleBookmarks.forEach(bookmark => {
                const item = createBookmarkItem(bookmark, iconSize, fontSize);
                bookmarksContainer.appendChild(item);
            });
        }
        
        // 요소 배치
        bar.appendChild(title);
        bar.appendChild(bookmarksContainer);
        
        // 설정 버튼 추가
        const settingsButton = createSettingsButton(iconSize);
        bar.appendChild(settingsButton);

        // Shadow DOM 사용 시도 (스타일 격리)
        try {
            const wrapper = document.createElement('div');
            wrapper.id = 'bookstaxx-wrapper';
            wrapper.setAttribute('data-bookstaxx-element', 'true');
            
            const shadowRoot = wrapper.attachShadow({ mode: 'open' });
            shadowRoot.appendChild(bar);
            document.body.appendChild(wrapper);
        } catch (error) {
            // Shadow DOM 실패 시 직접 추가
            console.warn('Shadow DOM 실패, 직접 삽입:', error);
            document.body.appendChild(bar);
        }
        
        // 북마크 바 나타나는 애니메이션
        const barElement = document.getElementById('bookstaxx-bookmark-bar') || 
            document.querySelector('.bookstaxx-bookmark-bar');
        
        if (barElement) {
            if (animationEnabled) {
                setTimeout(() => {
                    barElement.style.transition = 'opacity 0.3s, transform 0.3s';
                    barElement.style.opacity = '1';
                    barElement.style.transform = 'translateY(0)';
                }, 10);
            } else {
                barElement.style.opacity = '1';
                barElement.style.transform = 'translateY(0)';
            }
        }

        // 외부 클릭 시 북마크 바 닫기
        document.addEventListener('click', function closeBarOnOutsideClick(e) {
            const path = getEventPath(e);
            const isBookmarkBarClick = path.some(node => {
                return node.hasAttribute && (
                    node.hasAttribute('data-bookstaxx-element') || 
                    node.id === 'bookstaxx-bookmark-bar' ||
                    node.className && node.className.includes && 
                    node.className.includes('bookstaxx-')
                );
            });
            
            if (!isBookmarkBarClick) {
                removeBookmarkBar();
                document.removeEventListener('click', closeBarOnOutsideClick);
            }
        });
        
        console.log('북마크 바 생성 완료');
    } catch (error) {
        console.error('북마크 바 생성 중 오류:', error);
    }
}

// 이벤트 경로 가져오기 (브라우저 호환성 처리)
function getEventPath(event) {
    return event.composedPath && event.composedPath() || 
           event.path || 
           (function(e) {
               const path = [];
               let currentElem = e.target;
               while (currentElem) {
                   path.push(currentElem);
                   currentElem = currentElem.parentElement;
               }
               if (path.indexOf(window) === -1 && path.indexOf(document) === -1)
                   path.push(document);
               if (path.indexOf(window) === -1)
                   path.push(window);
               return path;
           })(event);
}

// Helper function for simple rectangle overlap check
// Added optional padding: negative value allows overlap
function checkRectOverlap(rect1, rect2, padding = 0) {
    // If padding is negative, it represents the allowed overlap amount.
    const allowedOverlap = padding < 0 ? -padding : 0;

    // Check for non-overlap horizontally
    // They don't overlap if one is entirely to the left of the other, considering allowed overlap
    if (rect1.right - allowedOverlap < rect2.left || rect2.right - allowedOverlap < rect1.left) {
        return false;
    }

    // Check for non-overlap vertically
    // They don't overlap if one is entirely above the other, considering allowed overlap
    if (rect1.bottom - allowedOverlap < rect2.top || rect2.bottom - allowedOverlap < rect1.top) {
        return false;
    }

    // If neither horizontal nor vertical non-overlap condition is met, they overlap.
    return true;
}

// *** TEMPORARY SIMPLIFIED ICON FUNCTION (Should be commented out) ***
/*
function createSimpleBookmarkIcon(effectiveIconSize) {
    const container = document.createElement('div');
    const iconSizeClass = sizeClassMap[effectiveIconSize] || sizeClassMap.md; // Access global map
    container.className = `bookmark-icon-simple ${iconSizeClass} rounded-full bg-red-500`; 
    container.style.border = '1px solid black'; 
    return container;
}
*/

// RESTORED Original function
// Ensure this is NOT commented out
function createBookmarkItem(bookmark, iconSize, fontSize) {
    const item = document.createElement('div');
    item.className = 'bookstaxx-bookmark-item';
    item.style.cssText = `
        display: flex;
        flex-direction: column;
        align-items: center;
        width: ${iconSize * 2}px;
        text-align: center;
        cursor: pointer;
        padding: 8px;
        border-radius: 4px;
        transition: background-color 0.2s;
        margin: 2px;
    `;
    
    // 호버 효과
    item.addEventListener('mouseenter', () => {
        item.style.backgroundColor = 'rgba(0, 0, 0, 0.05)';
    });
    
    item.addEventListener('mouseleave', () => {
        item.style.backgroundColor = 'transparent';
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
                        // 메시지 전송 실패시 직접 열기
                        console.warn("메시지 전송 실패, 직접 열기:", chrome.runtime.lastError);
                        window.open(bookmark.url, '_blank');
                    }
                    
                    // 북마크 바 제거
                    removeBookmarkBar();
                }
            );
        } catch (error) {
            console.error("북마크 열기 오류:", error);
            // 대체 방법으로 직접 열기
            window.open(bookmark.url, '_blank');
            removeBookmarkBar();
        }
    });
    
    // 아이콘 생성 (CSP 친화적인 방식으로 수정)
    const icon = document.createElement('div');
    if (bookmark.url) {
        try {
            const domain = new URL(bookmark.url).hostname;
            const firstLetter = domain.charAt(0).toUpperCase();
            
            // 기본 아이콘(첫 글자)으로 시작
            icon.textContent = firstLetter;
            icon.style.cssText = `
                width: ${iconSize}px;
                height: ${iconSize}px;
                background-color: #f0f0f0;
                border-radius: 4px;
                margin-bottom: 5px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: ${iconSize * 0.6}px;
                color: #666;
            `;
            
            // URL 기반 색상 생성
            const hash = Array.from(domain).reduce((acc, char) => {
                return char.charCodeAt(0) + ((acc << 5) - acc);
            }, 0);
            const hue = Math.abs(hash % 360);
            icon.style.backgroundColor = `hsl(${hue}, 70%, 90%)`;
            icon.style.color = `hsl(${hue}, 70%, 30%)`;
            
            // 북마크에 파비콘 URL이 있으면 사용
            if (bookmark.favIconUrl) {
                const img = new Image();
                img.onload = function() {
                    icon.textContent = '';
                    icon.style.backgroundImage = `url('${bookmark.favIconUrl}')`;
                    icon.style.backgroundSize = 'contain';
                    icon.style.backgroundRepeat = 'no-repeat';
                    icon.style.backgroundPosition = 'center';
                };
                img.onerror = function() {
                    // 파비콘 로드 실패시 기본 텍스트 유지
                    console.log('파비콘 로드 실패:', bookmark.url);
                };
                img.src = bookmark.favIconUrl;
            }
        } catch (error) {
            // URL 파싱 오류 시 기본 아이콘 사용
            icon.innerHTML = '🔖';
            icon.style.cssText = `
                font-size: ${iconSize}px;
                height: ${iconSize}px;
                display: flex;
                align-items: center;
                justify-content: center;
                margin-bottom: 5px;
            `;
        }
    } else {
        // 폴더 아이콘 (폴더인 경우)
        icon.innerHTML = '📁';
        icon.style.cssText = `
            font-size: ${iconSize}px;
            height: ${iconSize}px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 5px;
        `;
    }
    
    // 제목 요소
    const title = document.createElement('div');
    title.textContent = bookmark.title || '북마크';
    title.title = bookmark.title || '북마크'; // 툴팁으로 전체 제목 표시
    title.style.cssText = `
        font-size: ${fontSize}px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        width: 100%;
        max-width: ${iconSize * 2}px;
    `;
    
    item.appendChild(icon);
    item.appendChild(title);
    return item;
}

function createActionButton(defaultText, action, iconDataUrl) {
    const button = document.createElement('button');
    // 버튼 기본 스타일
    button.className = 'action-button transform hover:scale-110 p-2 flex items-center justify-center w-10 h-10 rounded-md bg-light-bg dark:bg-dark-bg shadow-md cursor-pointer';

    if (iconDataUrl) {
        console.log(`Creating button for action '${action}' with image data (first 100 chars): ${iconDataUrl.substring(0, 100)}`);
        const img = document.createElement('img');
        img.src = iconDataUrl;
        img.className = 'w-6 h-6 object-contain'; // 아이콘 크기 조정
        button.appendChild(img);
    } else {
        console.log(`Creating button for action '${action}' with default text: ${defaultText}`);
        button.textContent = defaultText;
        button.classList.add('text-lg', 'font-bold'); 
    }

    button.addEventListener('click', async (event) => {
        event.stopPropagation();
        console.log(`Action button clicked: ${action}`);

        // 원래 콘텐츠 저장 (피드백 표시 후 복원용)
        const originalContent = button.innerHTML;
        const usesDefaultText = !iconDataUrl;
        const originalTextContent = usesDefaultText ? button.textContent : null;

        // 피드백 UI 설정 함수
        const showFeedback = (success, reason = '') => {
            if (success) {
                // 성공 피드백
                if (!usesDefaultText) {
                    button.classList.add('bg-green-500');
                } else {
                    button.textContent = '✓';
                }
            } else if (reason === 'invalid_page') {
                // 유효하지 않은 페이지 피드백
                if (!usesDefaultText) {
                    button.classList.add('bg-orange-500');
                } else {
                    button.textContent = '!';
                }
            } else {
                // 일반 오류 피드백
                if (!usesDefaultText) {
                    button.classList.add('bg-red-500');
                } else {
                    button.textContent = '!';
                }
            }

            // 지연 후 피드백 UI 제거 및 북마크 바 닫기
            return new Promise(resolve => {
                const delay = action === 'addBookmark' ? 1500 : 500;
                setTimeout(() => {
                    // 원래 콘텐츠 복원
                    if (usesDefaultText && originalTextContent) {
                        button.textContent = originalTextContent;
                    } else {
                        button.classList.remove('bg-green-500', 'bg-red-500', 'bg-orange-500');
                    }
                    removeBookmarkBar();
                    resolve();
                }, delay);
            });
        };

        try {
            // 액션 실행
            const response = await executeAction(action);
            console.log(`Action ${action} response:`, response);

            if (action === 'addBookmark') {
                if (response && response.success) {
                    await showFeedback(true);
                } else if (response && response.success === false && response.reason === "invalid_page") {
                    console.warn("Bookmark failed: Invalid page.");
                    await showFeedback(false, 'invalid_page');
                } else {
                    console.error("Bookmark failed for other reason:", response?.error);
                    await showFeedback(false);
                }
            } else if (response && response.success) {
                await showFeedback(true);
            } else {
                console.error(`Action ${action} failed:`, response?.error);
                await showFeedback(false);
            }
        } catch (error) {
            console.error(`Error executing ${action}:`, error);
            await showFeedback(false);
        }
    });
    
    return button;
}

// 마우스 휠 이벤트 핸들러 설정
function setupMouseWheelListener() {
    console.log('마우스 휠 이벤트 리스너 설정');
    
    // 기존 이벤트 리스너 제거 (중복 방지)
    document.removeEventListener('wheel', handleMouseWheel);
    
    // 설정 불러오기
    chrome.storage.local.get({
        wheelEnabled: true,
        wheelDirection: 'down',
        wheelSensitivity: 2
    }, (settings) => {
        if (settings.wheelEnabled) {
            // 새 이벤트 리스너 설정
            document.addEventListener('wheel', handleMouseWheel);
            console.log('마우스 휠 이벤트 리스너 설정됨:', settings);
        } else {
            console.log('마우스 휠 기능 비활성화됨');
        }
    });
}

// 마우스 휠 이벤트 처리 함수
function handleMouseWheel(event) {
    // 현재 북마크 바가 표시되어 있는지 확인
    const isBarVisible = document.getElementById('bookstaxx-bookmark-bar') || 
                       document.getElementById('bookstaxx-wrapper');
    
    if (isBarVisible) {
        return; // 북마크 바가 이미 표시되어 있으면 무시
    }
    
    chrome.storage.local.get({
        wheelDirection: 'down',
        wheelSensitivity: 2,
        minWheelDelay: 500
    }, (settings) => {
        // 방향 및 감도 설정
        const isDownDirection = settings.wheelDirection === 'down';
        const threshold = 100 * settings.wheelSensitivity;
        
        // 현재 시간 및 마지막 트리거 시간 확인
        const now = Date.now();
        const lastTime = window.lastWheelTriggerTime || 0;
        
        // 최소 지연 시간을 지켰는지 확인
        if (now - lastTime < settings.minWheelDelay) {
            return;
        }
        
        // 방향과 크기 확인
        const delta = event.deltaY;
        
        // 설정된 방향과 역치값 확인
        if ((isDownDirection && delta > threshold) || 
            (!isDownDirection && delta < -threshold)) {
            
            // 트리거 타임스탬프 저장
            window.lastWheelTriggerTime = now;
            
            // 북마크 바 표시
            showBookmarkBar(event);
        }
    });
}

// 북마크 바 표시 함수
function showBookmarkBar(event) {
    console.log('북마크 바 표시 요청됨');

    // Chrome API 접근 가능 여부 확인
    if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.storage) {
        console.warn('BookStaxx: Chrome API를 사용할 수 없어 북마크 바를 표시할 수 없습니다.');
        // 이벤트 객체가 존재하고 사용자 이벤트에 의한 호출인 경우 알림 표시
        if (event && event.type) {
            const message = document.createElement('div');
            message.textContent = 'BookStaxx: 확장 프로그램 API에 접근할 수 없습니다';
            message.style.cssText = `
                position: fixed;
                top: 10px;
                right: 10px;
                background: rgba(0,0,0,0.7);
                color: white;
                padding: 10px 15px;
                border-radius: 4px;
                z-index: 9999;
                font-family: Arial, sans-serif;
                font-size: 14px;
            `;
            document.body.appendChild(message);
            setTimeout(() => {
                message.style.opacity = '0';
                message.style.transition = 'opacity 0.3s';
                setTimeout(() => message.remove(), 300);
            }, 3000);
        }
        return;
    }
    
    // 확장 프로그램 컨텍스트 확인
    if (!isExtensionContextValid()) {
        handleInvalidContext();
        return;
    }
    
    // 이벤트 좌표 저장 (없으면 기본값)
    const coords = {
        x: event ? event.clientX : window.innerWidth / 2,
        y: event ? event.clientY : 10
    };
    
    // 북마크 로드
    try {
        chrome.runtime.sendMessage({ action: 'getBookmarks' }, (response) => {
            // 메시지 전송 후 컨텍스트 확인
            if (!isExtensionContextValid()) {
                handleInvalidContext();
                return;
            }
            
            if (chrome.runtime.lastError) {
                console.error('북마크 로드 오류:', chrome.runtime.lastError);
                // 오류 시 로컬 저장소에서 가져오기 시도
                try {
                    chrome.storage.local.get('cachedBookmarks', (result) => {
                        if (chrome.runtime.lastError) {
                            console.error('로컬 저장소 오류:', chrome.runtime.lastError);
                            createOrUpdateBookmarkBar([]);
                            return;
                        }
                        
                        const bookmarks = result.cachedBookmarks || [];
                        createOrUpdateBookmarkBar(bookmarks);
                    });
                } catch (storageError) {
                    // 컨텍스트 무효화 오류 확인
                    if (storageError.message && storageError.message.includes('Extension context invalidated')) {
                        handleInvalidContext();
                        return;
                    }
                    
                    console.error('로컬 저장소 접근 오류:', storageError);
                    createOrUpdateBookmarkBar([]);
                }
                return;
            }
            
            if (response && response.bookmarks) {
                createOrUpdateBookmarkBar(response.bookmarks);
                
                // 캐시 저장
                try {
                    chrome.storage.local.set({ 
                        cachedBookmarks: response.bookmarks,
                        lastCacheTime: Date.now()
                    });
                } catch (cacheError) {
                    // 컨텍스트 무효화 오류 확인
                    if (cacheError.message && cacheError.message.includes('Extension context invalidated')) {
                        handleInvalidContext();
                        return;
                    }
                    
                    console.warn('북마크 캐싱 오류:', cacheError);
                }
            } else {
                console.warn('응답에 북마크 데이터가 없음');
                createOrUpdateBookmarkBar([]);
            }
        });
    } catch (error) {
        // 컨텍스트 무효화 오류 확인
        if (error.message && error.message.includes('Extension context invalidated')) {
            handleInvalidContext();
            return;
        }
        
        console.error('북마크 바 표시 중 오류:', error);
        createOrUpdateBookmarkBar([]);
    }
}

// 북마크 바 토글 함수 (키보드 단축키, 컨텍스트 메뉴 등에서 호출)
function toggleBookmarkBar(event) {
    const isVisible = document.getElementById('bookstaxx-bookmark-bar') || 
                     document.getElementById('bookstaxx-wrapper');
    
    if (isVisible) {
        removeBookmarkBar();
    } else {
        showBookmarkBar(event);
    }
}

// 북마크 바를 제거하는 함수
function removeBookmarkBar() {
    console.log('북마크 바 제거 시작');
    
    try {
        // 문서 클릭 이벤트 리스너 제거 (있는 경우)
        document.removeEventListener('click', documentClickHandler);
        
        // Shadow DOM 래퍼 제거
        const wrapper = document.getElementById('bookstaxx-wrapper');
        if (wrapper) {
            wrapper.remove();
        }
        
        // 구 버전 Shadow DOM 호스트 제거
        const shadowHost = document.getElementById('bookstaxx-shadow-host');
        if (shadowHost) {
            shadowHost.remove();
        }
        
        // 직접 추가된 북마크 바 제거
        const bookmarkBar = document.getElementById('bookstaxx-bookmark-bar');
        if (bookmarkBar) {
            bookmarkBar.remove();
        }
        
        // 클래스로 추가된 북마크 바 제거
        const bookmarkBars = document.querySelectorAll('.bookstaxx-bookmark-bar');
        bookmarkBars.forEach(bar => bar.remove());
        
        // 북마크 바 관련 모든 요소 제거 (data-attribute로 표시된 요소)
        const bookmarkElements = document.querySelectorAll('[data-bookstaxx-element]');
        bookmarkElements.forEach(element => element.remove());
        
        console.log('북마크 바 제거 완료');
        return true;
    } catch (error) {
        console.error('북마크 바 제거 중 오류:', error);
        return false;
    }
}

// Helper to update appearance if settings change while bar is visible (Optional)
// function updateBookmarkBarAppearance() {
//     if (!bookmarkBar) return;
//     // Re-apply styles based on currentSettings
//     // This would involve iterating through icons/buttons and updating classes/content
//     console.log("Updating existing bar appearance (placeholder)");
// }

// TODO: Implement full logic for icon/text size adjustment based on bookmark count AND screen size (Req 3).
// TODO: Handle favicon loading errors more robustly.
// TODO: Refine vertical exclusion logic if needed, especially with dynamic widths. 

function displayBookmarkIcons(bookmarks, position) {
    // 기존 북마크 컨테이너가 있다면 제거
    removeBookmarkBar();
    
    if (!bookmarks || bookmarks.length === 0) {
        console.log('표시할 북마크가 없습니다.');
        return;
    }
    
    // 북마크를 사용 빈도순으로 정렬
    bookmarks = sortBookmarksByUsage(bookmarks);
    
    console.log(`북마크 ${bookmarks.length}개 표시 중...`);
    
    // 최대 표시할 북마크 수 제한
    const maxDisplayCount = 15;
    const displayBookmarks = bookmarks.slice(0, maxDisplayCount);
    
    // 컨테이너 생성
    const container = document.createElement('div');
    container.id = 'bookmarkIconsContainer';
    container.style.position = 'fixed';
    container.style.zIndex = '2147483647'; // 최대 z-index 값으로 설정
    container.style.pointerEvents = 'auto'; // 마우스 이벤트 허용
    
    // 마우스 이벤트 방지 레이어
    const preventEventLayer = document.createElement('div');
    preventEventLayer.id = 'bookmarkPreventEventLayer';
    preventEventLayer.style.position = 'fixed';
    preventEventLayer.style.top = '0';
    preventEventLayer.style.left = '0';
    preventEventLayer.style.width = '100%';
    preventEventLayer.style.height = '100%';
    preventEventLayer.style.zIndex = '2147483646'; // 컨테이너보다 낮은 z-index
    preventEventLayer.style.backgroundColor = 'rgba(0, 0, 0, 0.1)';
    preventEventLayer.style.backdropFilter = 'blur(2px)';
    preventEventLayer.style.pointerEvents = 'auto'; // 명시적으로 설정
    
    preventEventLayer.addEventListener('click', (e) => {
        e.stopPropagation();
        removeBookmarkBar();
    });
    
    document.body.appendChild(preventEventLayer);
    
    // 아이콘 생성 및 원형 배치
    const bookmarkCount = displayBookmarks.length;
    
    // 원형 배치 설정
    let radius, startAngle, endAngle;
    
    // 북마크 수에 따른 원형 배치 설정
    if (bookmarkCount <= 6) {
        // 반원 형태로 배치 (상단)
        radius = 100;
        startAngle = -Math.PI / 2 - Math.PI / 3;
        endAngle = -Math.PI / 2 + Math.PI / 3;
    } else if (bookmarkCount <= 12) {
        // 원 형태로 배치 (3/4 원)
        radius = 120;
        startAngle = -Math.PI / 2 - Math.PI / 2;
        endAngle = -Math.PI / 2 + Math.PI / 2;
    } else {
        // 원 형태로 배치 (완전한 원)
        radius = 140;
        startAngle = 0;
        endAngle = 2 * Math.PI;
    }
    
    // 컨테이너 위치 설정
    const x = position ? position.x : window.innerWidth / 2;
    const y = position ? position.y : window.innerHeight / 2;
    
    container.style.top = `${y}px`;
    container.style.left = `${x}px`;
    container.style.transform = 'translate(-50%, -50%)';
    
    // 북마크 아이콘 배치
    displayBookmarks.forEach((bookmark, index) => {
        const angle = startAngle + (endAngle - startAngle) * (index / (bookmarkCount - 1 || 1));
        const iconX = radius * Math.cos(angle);
        const iconY = radius * Math.sin(angle);
        
        const bookmarkIcon = createBookmarkItem(bookmark, 'md', 'sm');
        if (!bookmarkIcon) {
            console.error(`북마크 아이콘 생성 실패: ${bookmark.title || '제목 없음'}`);
            return;
        }
        
        bookmarkIcon.style.position = 'absolute';
        bookmarkIcon.style.transform = `translate(${iconX}px, ${iconY}px)`;
        bookmarkIcon.style.opacity = '1'; // 명시적으로 불투명도 설정
        bookmarkIcon.style.visibility = 'visible'; // 명시적으로 visibility 설정
        bookmarkIcon.style.pointerEvents = 'auto'; // 명시적으로 포인터 이벤트 허용
        bookmarkIcon.style.zIndex = '2147483647'; // 최대 z-index 값
        
        // 부드러운 등장 애니메이션
        bookmarkIcon.style.transition = 'transform 0.3s ease-out, opacity 0.3s ease-out';
        
        // 마우스 이벤트 버블링 방지
        bookmarkIcon.addEventListener('click', (e) => {
            e.stopPropagation();
        });
        
        container.appendChild(bookmarkIcon);
    });
    
    // 마우스 이동 및 클릭 이벤트 처리
    container.addEventListener('mousemove', (e) => {
        e.stopPropagation();
    });
    
    container.addEventListener('click', (e) => {
        e.stopPropagation();
    });
    
    document.body.appendChild(container);
    
    // ESC 키로 북마크 창 닫기
    document.addEventListener('keydown', function escKeyHandler(e) {
        if (e.key === 'Escape') {
            removeBookmarkBar();
            document.removeEventListener('keydown', escKeyHandler);
        }
    });
    
    console.log('북마크 아이콘 표시 완료');
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

// 이벤트 리스너 및 리소스 정리 함수
function cleanup() {
    try {
        // 휠 이벤트 리스너 제거
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