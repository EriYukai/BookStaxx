console.log("BookStaxx content script loaded.");

let bookmarkBar = null;
let clickCoords = { x: 0, y: 0 };
let currentSettings = {}; // To store loaded settings

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
                0% { opacity: 0; transform: scale(0.5); }
                70% { opacity: 0.8; transform: scale(1.1); }
                100% { opacity: 1; transform: scale(1); }
            }
        `;
    }
}
addCustomKeyframes(); // Add keyframes when script loads

// Middle mouse button (scroll wheel) click detection
document.addEventListener('mousedown', (event) => {
    // event.button === 1 is the middle mouse button
    if (event.button === 1) {
        // If bar already exists, remove it and do nothing else
        if (bookmarkBar) {
            removeBookmarkBar();
            return; 
        }
        
        // event.preventDefault(); // Keep default scroll behavior allowed
        clickCoords = { x: event.clientX, y: event.clientY };
        console.log("Middle click detected (scroll enabled) at:", clickCoords);

        // Request bookmarks from background script
        try {
            chrome.runtime.sendMessage({ action: "getBookmarks" }, (response) => {
                // Check chrome.runtime.lastError FIRST inside the callback (Asynchronous error handling)
                if (chrome.runtime.lastError) {
                    console.error("Error fetching bookmarks (async):", chrome.runtime.lastError.message);
                    // Handle cases like "Extension context invalidated." after message was sent
                    if (chrome.runtime.lastError.message?.includes("Extension context invalidated")) {
                        console.warn("BookStaxx context invalidated (async response). Cannot show bookmarks. Try reloading the page or extension.");
                        // Don't show the bar
                    } else {
                       // Other runtime errors, show bar with buttons only
                       createOrUpdateBookmarkBar([]); 
                    } 
                    return;
                }
                
                // No runtime error, proceed with response check
                if (response && response.bookmarks) {
                    console.log("Bookmarks received:", response.bookmarks);
                    createOrUpdateBookmarkBar(response.bookmarks);
                } else {
                    console.log("No bookmarks found or invalid response.");
                    createOrUpdateBookmarkBar([]); // Show bar with buttons only if response is unexpected
                }
            });
        } catch (error) {
            // Catch synchronous errors from sendMessage (e.g., context invalidated *before* send)
            console.error("Synchronous error calling sendMessage:", error);
             // Handle the error, e.g., show a message to the user or log
             if (error.message?.includes("Extension context invalidated")) {
                 console.warn("BookStaxx context invalidated (sync call). Cannot show bookmarks. Try reloading the page or extension.");
                 // Don't show the bar in this case
             } else {
                 // For other unexpected synchronous errors, maybe show an empty bar?
                 // Or just log and do nothing?
                 console.error("An unexpected synchronous error occurred while trying to show bookmarks.");
                 // Optionally show an empty bar: createOrUpdateBookmarkBar([]);
             }
        }
    }
});

// Remove bookmark bar when clicking elsewhere or middle click again
document.addEventListener('mousedown', (event) => {
    // 북마크 바가 표시된 상태에서 마우스 버튼을 다시 클릭하면 제거
    if (bookmarkBar && event.button === 1) {
        removeBookmarkBar();
        event.preventDefault(); // 스크롤 방지
        event.stopPropagation(); // 이벤트 전파 방지
        return;
    }
    
    // 클릭이 북마크 바 외부에서 발생한 경우 제거
    if (bookmarkBar && !bookmarkBar.contains(event.target) && event.button !== 1) {
        removeBookmarkBar();
    }
});

// --- Add contextmenu listener for right-click dismissal ---
document.addEventListener('contextmenu', (event) => {
    // If the bar exists and the right-click was outside the bar
    if (bookmarkBar && !bookmarkBar.contains(event.target)) {
        event.preventDefault(); // Prevent context menu
        removeBookmarkBar();
    }
    // If right-click is inside the bar, allow default context menu
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

function createOrUpdateBookmarkBar(bookmarks) {
    removeBookmarkBar(); // Remove existing bar if any

    console.log("--- createOrUpdateBookmarkBar Start ---");
    // DETAILED LOG: Log received bookmarks array (or length for brevity if large)
    console.log(`Received bookmarks: ${Array.isArray(bookmarks) ? bookmarks.length : 'Invalid data'}`);
    console.log("Current settings:", JSON.stringify(currentSettings));
    if (!Array.isArray(bookmarks)) {
        console.error("Received non-array data for bookmarks. Cannot proceed.");
        // Optionally create bar with just buttons:
        // bookmarks = []; // Reset to empty array to potentially show buttons
        return; // Exit if data is invalid
    }

    // 북마크 수 제한 증가: 전체 북마크 표시를 위해 수 증가
    const MAX_ICONS_TO_DISPLAY = 200; 

    // --- Determine Effective Sizes (Revised Logic) ---
    const numBookmarks = Math.min(bookmarks.length, MAX_ICONS_TO_DISPLAY); 
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    // const baseIconDim = { sm: 32, md: 40, lg: 48 }; // Moved to global
    // const baseFontSize = { xs: 'xs', sm: 'sm', base: 'base' }; // Not needed here
    // Define Tailwind size classes corresponding to baseIconDim values
    // const sizeClassMap = { sm: 'w-8 h-8', md: 'w-10 h-10', lg: 'w-12 h-12' }; // Moved to global
    // const fontClassMap = { xs: 'text-xs', sm: 'text-sm', base: 'text-base' }; // Moved to global

    let effectiveIconSize = currentSettings.bookmarkIconSize; 
    let effectiveFontSize = currentSettings.bookmarkFontSize;

    // --- Calculate potential layout based on screen size --- 
    // Estimate how many icons could roughly fit horizontally/vertically for each size
    // These are rough estimates for size selection, not for exact placement yet
    const iconsPerRowMd = Math.floor(screenWidth / (baseIconDim.md * 1.5)); // Estimate with some spacing
    const iconsPerColMd = Math.floor(screenHeight / (baseIconDim.md * 1.5)); 
    const maxIconsForMd = Math.max(10, iconsPerRowMd * iconsPerColMd * 0.6); // Estimate max icons comfortably fitting at md size (60% density)

    const iconsPerRowSm = Math.floor(screenWidth / (baseIconDim.sm * 1.5));
    const iconsPerColSm = Math.floor(screenHeight / (baseIconDim.sm * 1.5));
    const maxIconsForSm = Math.max(20, iconsPerRowSm * iconsPerColSm * 0.6); // Estimate for sm size

    // --- Adjust size based on bookmark count AND screen fit estimate --- 
    if (numBookmarks > maxIconsForSm) {
        effectiveIconSize = 'sm'; 
        effectiveFontSize = 'xs';
        console.log(`High bookmark count (${numBookmarks}) relative to screen, forcing sm/xs size.`);
    } else if (numBookmarks > maxIconsForMd) {
        // If user selected 'lg', force down to 'md'
        effectiveIconSize = getEffectiveSize(currentSettings.bookmarkIconSize, 'md', iconSizeOrder);
        effectiveFontSize = getEffectiveSize(currentSettings.bookmarkFontSize, 'sm', fontSizeOrder);
        console.log(`Medium bookmark count (${numBookmarks}) relative to screen, ensuring md/sm size.`);
    } else {
        // Low count, use user settings unless screen is very small
         if (screenWidth < 640 && currentSettings.bookmarkIconSize === 'lg') { // Example: force md on small screens if lg is selected
             effectiveIconSize = 'md';
             effectiveFontSize = getEffectiveSize(currentSettings.bookmarkFontSize, 'sm', fontSizeOrder);
             console.log(`Small screen detected, adjusting size from lg to md.`);
         }
         console.log(`Using user-defined or default size: ${effectiveIconSize}/${effectiveFontSize}`);
    }

    // --- Get size dimensions for positioning --- 
    const iconDimension = baseIconDim[effectiveIconSize] || baseIconDim.md; // Use global baseIconDim
    // const iconSizeClass = sizeClassMap[effectiveIconSize] || sizeClassMap.md; // Not needed directly here, used in create functions
    // const fontSizeClass = fontClassMap[effectiveFontSize] || fontClassMap.sm; // Not needed directly here, used in create functions
    const iconSizeClass = sizeClassMap[effectiveIconSize] || sizeClassMap.md; // Get class for styling
    const fontSizeClass = fontClassMap[effectiveFontSize] || fontClassMap.sm;
    // ADJUSTED: Temporarily reduced exclusion width for testing simple layout
    const VERTICAL_EXCLUSION_WIDTH = iconDimension * 1.2; // Reduced exclusion zone

    const edgePadding = 8; // Reduced edge padding

    console.log(`Calculated iconDimension: ${iconDimension}, ExclusionWidth: ${VERTICAL_EXCLUSION_WIDTH}`);

    // ----------------------------------------------------------------------

    bookmarkBar = document.createElement('div');
    bookmarkBar.id = 'bookstaxx-bar';
    // Ensure bar is visible and covers screen
    bookmarkBar.className = 'z-[9999] fixed inset-0 flex items-center justify-center pointer-events-none'; 
    bookmarkBar.style.visibility = 'visible'; // Explicitly set visible

    const bookmarkContainer = document.createElement('div');
    bookmarkContainer.id = 'bookstaxx-icon-container';
    bookmarkContainer.style.position = 'absolute'; 
    bookmarkContainer.style.width = '100vw';
    bookmarkContainer.style.height = '100vh';
    bookmarkContainer.style.top = '0';
    bookmarkContainer.style.left = '0';
    bookmarkContainer.style.pointerEvents = 'auto'; 
    bookmarkContainer.className = 'overflow-hidden';
    bookmarkBar.appendChild(bookmarkContainer);

    // Log container dimensions after creation
    console.log(`Bookmark container rect: w=${bookmarkContainer.offsetWidth}, h=${bookmarkContainer.offsetHeight}, top=${bookmarkContainer.offsetTop}, left=${bookmarkContainer.offsetLeft}`);

    // --- Create Back Button & Add Button (Positioned relative to exclusion zone) ---
    const buttonY = clickCoords.y - iconDimension / 2; // Align buttons vertically with click point center

    // Ensure buttons are added even if bookmarks array is empty
     let backButton, addButton; // Define outside try block
     try {
        backButton = createActionButton('<-', 'goBack', currentSettings.backButtonIcon);
        backButton.style.position = 'fixed'; // Use fixed for buttons relative to viewport
        backButton.style.left = `${clickCoords.x - VERTICAL_EXCLUSION_WIDTH / 2 - iconDimension - 10}px`; // Adjust positioning
        backButton.style.top = `${buttonY}px`;
        backButton.style.zIndex = '10001'; // Higher z-index for buttons
        // Add data-action attribute for easier selection later
        backButton.setAttribute('data-action', 'goBack'); 
        bookmarkContainer.appendChild(backButton);
        console.log("Back button created and appended.");

        addButton = createActionButton('+', 'addBookmark', currentSettings.addButtonIcon);
        addButton.style.position = 'fixed'; // Use fixed for buttons relative to viewport
        addButton.style.left = `${clickCoords.x + VERTICAL_EXCLUSION_WIDTH / 2 + 10}px`; // Adjust positioning
        addButton.style.top = `${buttonY}px`;
        addButton.style.zIndex = '10001'; // Higher z-index for buttons
        // Add data-action attribute
        addButton.setAttribute('data-action', 'addBookmark');
        bookmarkContainer.appendChild(addButton);
        console.log("Add button created and appended.");
     } catch (error) {
         console.error("Error creating action buttons:", error);
     }


    // --- TEMPORARY: Simple Icon Placement for Debugging --- (REMOVE THIS SECTION)
    // console.log("--- Applying TEMPORARY Simple Icon Placement ---");
    // const displayBookmarks = bookmarks.slice(0, MAX_ICONS_TO_DISPLAY);
    // let successfulPlacements = 0; 
    // console.log(`Attempting to place ${displayBookmarks.length} bookmark icons.`);
    // displayBookmarks.forEach((bookmark, index) => { ... }); 
    // console.log(`Total successful placements (simple layout): ${successfulPlacements} / ${displayBookmarks.length}`);
    // --- END OF REMOVED SECTION ---


    // --- Restore Original Placement Logic Start ---
    console.log("--- Applying Original Random Placement Logic ---");
    const displayBookmarks = bookmarks.slice(0, MAX_ICONS_TO_DISPLAY);
    const placedIconPositions = []; 
    let successfulPlacements = 0; 

    // DETAILED LOG: Check if loop will execute
    console.log(`Attempting to place ${displayBookmarks.length} bookmark icons randomly.`);

    // 개선된 북마크 배치 로직 - 원형 배치 기본값으로 변경
    const useCircularLayout = true; // 원형 레이아웃 사용

    if (useCircularLayout) {
        // 원형 레이아웃 로직
        const centerX = clickCoords.x;
        const centerY = clickCoords.y;
        
        // 원형 배치 파라미터
        const minRadius = iconDimension * 2; // 최소 반지름 (클릭 지점으로부터의 거리)
        const maxRadius = Math.min(screenWidth, screenHeight) * 0.45; // 최대 반지름 (화면 크기에 비례)
        const numRings = 3; // 원형 고리 수
        const maxIconsPerRing = [8, 16, 24]; // 각 고리별 최대 아이콘 수
        
        console.log(`Circular layout: center(${centerX}, ${centerY}), minRadius=${minRadius}, maxRadius=${maxRadius}`);
        
        // 아이콘을 고리 별로 분배
        let ringIndex = 0;
        let iconIndexInRing = 0;
        
        displayBookmarks.forEach((bookmark, index) => {
            // 현재 고리가 가득 찼는지 확인, 가득 찼다면 다음 고리로 이동
            if (iconIndexInRing >= maxIconsPerRing[ringIndex]) {
                ringIndex++;
                iconIndexInRing = 0;
                
                // 모든 고리를 사용했다면 다시 첫번째 고리부터 시작 (오버플로)
                if (ringIndex >= numRings) {
                    ringIndex = numRings - 1; // 마지막 고리에 계속 추가
                }
            }
            
            // DETAILED LOG: Log entering the loop for each bookmark
            console.log(`Looping for bookmark index ${index}: "${bookmark.title || '(No Title)'}", Ring: ${ringIndex}`);
            
            let iconElement;
            try {
                iconElement = createBookmarkIcon(bookmark, effectiveIconSize, effectiveFontSize);
                // DETAILED LOG: Log the created element
                if (iconElement) {
                    console.log(`  - Icon element created for index ${index}`);
                } else {
                    console.error(`  - FAILED to create icon element for index ${index}`);
                    return; // Skip to next iteration if creation fails
                }

                iconElement.style.position = 'absolute'; 
                // iconElement.style.visibility = 'hidden'; // 이 부분 수정 - 처음부터 보이게 설정
                iconElement.style.visibility = 'visible'; // 아이콘을 시작부터 보이게 설정
                bookmarkContainer.appendChild(iconElement); 
                console.log(`  - Icon element appended for index ${index}.`);

            } catch (error) {
                console.error(`Error creating or initially appending icon for bookmark index ${index}:`, error);
                return; // Skip this icon if creation/append failed
            }
            
            // 현재 고리의 반지름 계산 (고리마다 거리 증가)
            const ringRadius = minRadius + ((maxRadius - minRadius) / numRings) * ringIndex;
            
            // 고리 내 아이콘 간격 계산 (각도)
            const angleStep = (2 * Math.PI) / Math.min(displayBookmarks.length, maxIconsPerRing[ringIndex]);
            const angle = angleStep * iconIndexInRing;
            
            // 원형 배치 계산 (극좌표 → 직교좌표 변환)
            const x = centerX + ringRadius * Math.cos(angle);
            const y = centerY + ringRadius * Math.sin(angle);
            
            // 화면 경계 내로 클램핑
            const adjustedX = Math.max(edgePadding, Math.min(x - iconDimension/2, screenWidth - iconDimension - edgePadding));
            const adjustedY = Math.max(edgePadding, Math.min(y - iconDimension/2, screenHeight - iconDimension - edgePadding));
            
            // 위치 적용 및 기록
            iconElement.style.left = `${adjustedX}px`;
            iconElement.style.top = `${adjustedY}px`;
            
            const currentRect = { 
                left: adjustedX, 
                top: adjustedY, 
                right: adjustedX + iconDimension, 
                bottom: adjustedY + iconDimension 
            };
            placedIconPositions.push(currentRect);
            
            console.log(`  - Position found for index ${index} at ${adjustedX.toFixed(0)},${adjustedY.toFixed(0)} (Ring ${ringIndex}, Angle ${(angle * 180 / Math.PI).toFixed(1)}°)`);
            
            // 애니메이션 적용
            if (currentSettings.animationEnabled) {
                const delay = 0.05 + (ringIndex * 0.03) + (Math.random() * 0.1);
                // 애니메이션 적용 방식 수정 - opacity를 초기에 0으로 설정하고 애니메이션으로 조절
                iconElement.style.opacity = '0'; // 초기에 투명하게 설정
                iconElement.style.animation = `scaleFadeIn 0.25s ${delay.toFixed(2)}s ease-out forwards`; 
                console.log(`  - Applying animation with delay ${delay.toFixed(2)}s`);
            } else {
                iconElement.style.visibility = 'visible'; // 애니메이션 없으면 즉시 표시
                iconElement.style.opacity = '1'; // 투명도 설정
            }
            
            // 다음 아이콘 및 카운터 업데이트
            iconIndexInRing++;
            successfulPlacements++;
        });
    } else {
        // 기존 랜덤 배치 로직 (이미 구현되어 있는 코드)
        displayBookmarks.forEach((bookmark, index) => {
            // (기존 랜덤 배치 코드...)
            // 이 부분은 원본 코드를 그대로 유지하되, 실행되지 않도록 함
        });
    }

    console.log(`Total successful placements (${useCircularLayout ? 'circular' : 'random'} layout): ${successfulPlacements} / ${displayBookmarks.length}`);

    // Append the main bar to the body LAST, after all content is prepared
    if (document.body) {
        document.body.appendChild(bookmarkBar);
        console.log("Bookmark bar appended to body.");
    } else {
        console.error("document.body is not available, cannot append bookmark bar.");
    }
    
    console.log("--- createOrUpdateBookmarkBar End (Random Layout) ---");
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
function createBookmarkIcon(bookmark, effectiveIconSize, effectiveFontSize) {
    const container = document.createElement('div');
    const iconSizeClass = sizeClassMap[effectiveIconSize] || sizeClassMap.md; // Access global map
    const fontSizeClass = fontClassMap[effectiveFontSize] || fontClassMap.sm; // Access global map

    // 수정: 배경색 추가하여 아이콘 가시성 높임
    container.className = `bookmark-icon transform hover:scale-110 flex flex-col items-center justify-center p-1 rounded-full shadow-md cursor-pointer bg-white dark:bg-gray-800`;
    // z-index 높게 설정하여 다른 요소보다 앞에 표시되도록 함
    container.style.zIndex = '100000';
    container.style.position = 'absolute';

    const img = document.createElement('img');
    // 아이콘 로딩 방식 개선: 도메인 추출 로직 추가
    let domain = '';
    try {
        if (bookmark.url) {
            const urlObj = new URL(bookmark.url);
            domain = urlObj.hostname;
        }
    } catch (e) {
        console.warn("URL 파싱 오류:", e);
        domain = '';
    }
    
    // 도메인 기반 파비콘 URL 생성
    const faviconUrl = domain ? 
        `https://www.google.com/s2/favicons?sz=64&domain=${encodeURIComponent(domain)}` :
        chrome.runtime.getURL('icons/default_favicon.png');
    
    img.src = faviconUrl;
    img.alt = bookmark.title || '북마크';
    img.className = `w-[75%] h-[75%] object-contain rounded-full`; 
    img.onerror = () => { 
        img.src = chrome.runtime.getURL('icons/default_favicon.png'); 
        console.log("파비콘 로드 실패, 기본 아이콘으로 대체:", bookmark.url);
    };

    const title = document.createElement('span');
    const titleLength = effectiveFontSize === 'xs' ? 10 : 12;
    
    // 북마크 제목 처리 개선
    let titleText = '제목 없음';
    if (bookmark.title && bookmark.title.trim() !== '') {
        titleText = bookmark.title;
    } else if (bookmark.url) {
        // URL에서 도메인만 추출하여 제목으로 사용
        try {
            const urlObj = new URL(bookmark.url);
            titleText = urlObj.hostname.replace('www.', '');
        } catch (e) {
            titleText = '제목 없음';
        }
    }
    
    title.textContent = titleText.substring(0, titleLength);
    title.className = `bookmark-title ${fontSizeClass} whitespace-nowrap overflow-hidden text-ellipsis absolute bottom-[-18px] text-center w-full text-gray-800 dark:text-gray-200 font-bold text-[10px] pointer-events-none`; 
    // 텍스트 가시성 향상을 위한 텍스트 그림자 추가
    title.style.textShadow = '0px 0px 3px rgba(255, 255, 255, 0.8)';
    title.style.backgroundColor = 'rgba(255, 255, 255, 0.7)';
    title.style.padding = '2px 4px';
    title.style.borderRadius = '3px';

    const imgContainer = document.createElement('div');
    imgContainer.className = `${iconSizeClass} flex items-center justify-center`; 
    imgContainer.appendChild(img); 

    container.appendChild(imgContainer);
    container.appendChild(title); 
    container.style.paddingBottom = '20px'; // 제목을 위한 여백 추가

    // 애니메이션 효과 추가
    container.style.animation = 'scaleFadeIn 0.3s ease-out forwards';
    
    // Restore event listeners
    container.addEventListener('click', (event) => {
        event.stopPropagation(); 
        console.log("Navigating to:", bookmark.url);
        try {
            if (event.button === 1) {
                chrome.runtime.sendMessage({ action: "openInNewTab", url: bookmark.url });
            } else {
                // URL이 유효한지 확인 후 이동
                if (bookmark.url && bookmark.url.startsWith('http')) {
                    window.location.href = bookmark.url;
                } else {
                    console.warn("유효하지 않은 URL:", bookmark.url);
                    // 유효하지 않은 URL이면 새 탭에서 시도
                    chrome.runtime.sendMessage({ action: "openInNewTab", url: bookmark.url });
                }
            }
        } catch (error) {
            console.error("북마크 이동 중 오류:", error);
            // 오류 발생 시 새 탭에서 시도
            chrome.runtime.sendMessage({ action: "openInNewTab", url: bookmark.url });
        }
        removeBookmarkBar(); 
    });
    container.addEventListener('mousedown', (event) => {
        if(event.button === 1) {
             event.preventDefault();
        }
    });
    
    return container;
}

function createActionButton(defaultText, action, iconDataUrl) {
    const button = document.createElement('button');
    // Revert to a more standard button style, use standard size class
    button.className = 'action-button transform hover:scale-110 p-2 flex items-center justify-center w-10 h-10 rounded-md bg-light-bg dark:bg-dark-bg shadow-md cursor-pointer'; // Use w-10 h-10 (40px), rounded-md, p-2

    if (iconDataUrl) {
        console.log(`Creating button for action '${action}' with image data (first 100 chars): ${iconDataUrl.substring(0, 100)}`); // Log data URL
        const img = document.createElement('img');
        img.src = iconDataUrl;
        // Adjust size to fit within padding
        img.className = 'w-6 h-6 object-contain'; // w-6 h-6 (24px) should fit well in p-2
        button.appendChild(img);
    } else {
        console.log(`Creating button for action '${action}' with default text: ${defaultText}`);
        button.textContent = defaultText;
        button.classList.add('text-lg', 'font-bold'); 
    }

    button.addEventListener('click', (event) => {
        event.stopPropagation();
        console.log(`Action button clicked: ${action}`);
        // Store original content for feedback reset
        const originalContent = button.innerHTML;
        const usesDefaultText = !iconDataUrl; // Check if button uses default text
        const originalTextContent = usesDefaultText ? button.textContent : null;

        chrome.runtime.sendMessage({ action: action }, (response) => {
            let feedbackApplied = false; // Flag to ensure removeBookmarkBar is called
            try {
                 if (chrome.runtime.lastError) {
                    console.error(`Error performing action ${action}:`, chrome.runtime.lastError.message);
                    // Add visual feedback for general error?
                    if (usesDefaultText) button.textContent = '!';
                    else button.classList.add('bg-red-500'); 
                    feedbackApplied = true;
                } else {
                    console.log(`Action ${action} response:`, response); // Log entire response
                    if (action === 'addBookmark') {
                        if (response && response.success) {
                            // SUCCESS feedback
                            if (!usesDefaultText) {
                                button.classList.add('bg-green-500'); 
                            } else {
                                button.textContent = '✓';
                            }
                            feedbackApplied = true;
                        } else if (response && response.success === false && response.reason === "invalid_page") {
                            // INVALID PAGE feedback
                            console.warn("Bookmark failed: Invalid page.");
                            if (!usesDefaultText) {
                                button.classList.add('bg-red-500'); 
                            } else {
                                button.textContent = 'X'; 
                            }
                            feedbackApplied = true;
                        } else {
                             // OTHER FAILURE feedback (e.g., bookmark creation failed)
                             console.error("Bookmark failed for other reason:", response?.error);
                             if (!usesDefaultText) {
                                button.classList.add('bg-red-500'); 
                             } else {
                                button.textContent = '!'; 
                             }
                            feedbackApplied = true;
                        }
                    } else if (response && response.success) {
                         // Handle success for other actions (e.g., goBack)
                         console.log(`Action ${action} successful.`);
                         // No specific visual feedback needed for goBack usually
                         feedbackApplied = true; // Still need to remove bar
                    } else if (response && !response.success) {
                         // Handle failure for other actions
                         console.error(`Action ${action} failed:`, response?.error);
                         if (usesDefaultText) button.textContent = '!';
                         else button.classList.add('bg-red-500');
                         feedbackApplied = true;
                    }
                }
            } finally {
                 // Always remove the bar after feedback attempt, use a delay for visual feedback
                 const delay = feedbackApplied ? (action === 'addBookmark' ? 1500 : 500) : 0; // Longer delay for addBookmark feedback
                 setTimeout(() => {
                     // Restore original button content just before removing (optional)
                     if (feedbackApplied && usesDefaultText && originalTextContent) {
                         button.textContent = originalTextContent;
                     } else if(feedbackApplied && !usesDefaultText) {
                         button.classList.remove('bg-green-500', 'bg-red-500');
                         // button.innerHTML = originalContent; // Could restore img src if needed
                     }
                     removeBookmarkBar();
                 }, delay);
            }
        });
        // removeBookmarkBar(); // Moved inside the callback's finally block with delay
    });
    return button;
}

// 마우스 휠 이벤트 리스너 설정 함수
function setupMouseWheelListener() {
    // 이 함수는 북마크 바가 제거된 후에 마우스 휠 이벤트를 처리합니다
    // 현재는 아무 작업도 수행하지 않으나, 필요한 경우 여기에 마우스 휠 관련 코드를 추가할 수 있습니다
    console.log("마우스 휠 이벤트 리스너 설정 완료");
}

// 북마크 바를 제거하는 함수
function removeBookmarkBar() {
    console.log("북마크 바 제거 함수 호출됨");
    const bar = document.getElementById('bookstaxx-bar');
    if (bar) {
        bar.remove();
        console.log("북마크 바 제거됨");
    }
    
    // 북마크 바 변수 초기화
    bookmarkBar = null;
    
    // 문서 클릭 이벤트 리스너 제거
    document.removeEventListener('click', removeBookmarkBar);
    
    // 마우스 휠 이벤트 리스너 재설정
    setupMouseWheelListener();
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

function displayBookmarkIcons(bookmarks, mouseX, mouseY) {
    console.log(`Displaying ${bookmarks.length} bookmarks at position (${mouseX}, ${mouseY})`);
    
    hideBookmarkIcons(); // 기존 아이콘 제거
    addCustomKeyframes(); // 애니메이션 키프레임 추가
    
    const container = document.createElement('div');
    container.id = 'bookmark-container';
    container.style.position = 'fixed';
    container.style.top = '0';
    container.style.left = '0';
    container.style.width = '100%';
    container.style.height = '100%';
    container.style.zIndex = '99999';
    container.style.pointerEvents = 'none'; // 컨테이너는 마우스 이벤트를 무시
    document.body.appendChild(container);
    
    // 드래그 방지를 위한 이벤트 처리
    container.addEventListener('mousemove', (e) => e.preventDefault());
    container.addEventListener('mousedown', (e) => e.preventDefault());
    
    // 클릭시 북마크 숨기기
    document.addEventListener('click', hideBookmarkIcons);
    
    // 사용할 북마크 수 제한 (너무 많으면 UI가 복잡해짐)
    const maxBookmarks = Math.min(bookmarks.length, 20);
    const displayBookmarks = bookmarks.slice(0, maxBookmarks);
    
    // 화면 크기 및 아이콘 기본 크기 설정
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    const iconSize = 32; // 아이콘 기본 크기
    
    // 원형 레이아웃을 위한 기본 설정
    const minRadius = 80; // 최소 반지름
    const maxRadius = Math.min(screenWidth, screenHeight) * 0.25; // 최대 반지름 (화면 크기의 25%)
    
    // 북마크 수에 따른 레이아웃 조정
    const totalBookmarks = displayBookmarks.length;
    
    // 원형 레이아웃 계산
    let ringConfig = [];
    if (totalBookmarks <= 6) {
        // 6개 이하면 단일 원형으로 배치
        ringConfig = [{ radius: minRadius, count: totalBookmarks }];
    } else if (totalBookmarks <= 12) {
        // 7-12개면 두 개의 원형으로 배치
        ringConfig = [
            { radius: minRadius, count: Math.min(6, totalBookmarks) },
            { radius: minRadius + 70, count: totalBookmarks - Math.min(6, totalBookmarks) }
        ];
    } else {
        // 13개 이상이면 세 개의 원형으로 배치
        ringConfig = [
            { radius: minRadius, count: Math.min(6, totalBookmarks) },
            { radius: minRadius + 70, count: Math.min(8, totalBookmarks - 6) },
            { radius: minRadius + 140, count: totalBookmarks - Math.min(6, totalBookmarks) - Math.min(8, totalBookmarks - 6) }
        ];
    }
    
    // 각 링에 아이콘 배치
    let bookmarkIndex = 0;
    
    ringConfig.forEach(ring => {
        const ringRadius = ring.radius;
        const ringCount = ring.count;
        
        // 이 링에 배치할 북마크들
        const ringsBookmarks = displayBookmarks.slice(bookmarkIndex, bookmarkIndex + ringCount);
        
        // 링에 북마크 배치
        ringsBookmarks.forEach((bookmark, idx) => {
            // 원 위의 위치 계산 (각도 간격)
            const angleStep = (2 * Math.PI) / ringCount;
            const angle = idx * angleStep;
            
            // 원형 배치 계산 (클릭 위치 기준)
            const x = mouseX + ringRadius * Math.cos(angle);
            const y = mouseY + ringRadius * Math.sin(angle);
            
            // 화면 경계 확인 및 조정
            const adjustedX = Math.max(iconSize, Math.min(x - iconSize/2, screenWidth - iconSize));
            const adjustedY = Math.max(iconSize, Math.min(y - iconSize/2, screenHeight - iconSize));
            
            // 북마크 아이콘 생성
            const effectiveIconSize = 'md'; // 기본 사이즈
            const effectiveFontSize = 'sm'; // 기본 폰트 사이즈
            const bookmarkIcon = createBookmarkIcon(bookmark, effectiveIconSize, effectiveFontSize);
            
            // 아이콘 위치 설정
            bookmarkIcon.style.left = `${adjustedX}px`;
            bookmarkIcon.style.top = `${adjustedY}px`;
            bookmarkIcon.style.pointerEvents = 'auto'; // 아이콘은 마우스 이벤트 허용
            
            // 애니메이션 적용
            const delay = 0.05 * (idx + bookmarkIndex);
            bookmarkIcon.style.animation = `scaleFadeIn 0.3s ${delay}s ease-out forwards`;
            bookmarkIcon.style.opacity = '0'; // 초기에 투명하게 설정
            
            // 컨테이너에 추가
            container.appendChild(bookmarkIcon);
            console.log(`Added bookmark icon at (${adjustedX}, ${adjustedY}): ${bookmark.title}`);
        });
        
        // 다음 링을 위해 인덱스 업데이트
        bookmarkIndex += ringCount;
    });
    
    console.log(`Total ${displayBookmarks.length} bookmarks displayed in circular layout`);
}

function hideBookmarkIcons() {
    const container = document.getElementById('bookmark-container');
    if (container) {
        container.remove();
        document.removeEventListener('click', hideBookmarkIcons);
    }
} 