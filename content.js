console.log("BookStaxx content script loaded.");

// 전역 변수 정의
let bookmarkBar = null;      // 현재 활성화된 북마크 바 요소
let preventAutoClose = false;  // 자동 닫힘 방지 플래그
let isInitialized = false;     // 초기화 상태 플래그
let contextInvalidated = false; // 컨텍스트 무효화 상태
let recoveryAttempts = 0;      // 복구 시도 횟수
const MAX_RECOVERY_ATTEMPTS = 5; // 최대 복구 시도 횟수
let reconnectTimer = null;     // 재연결 타이머
let checkContextTimer = null;  // 컨텍스트 확인 타이머

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
        
        // 이미 초기화된 경우 중복 초기화 방지
        if (isInitialized) {
            console.log("이미 초기화되었습니다.");
            return;
        }
        
        // 컨텍스트 무효화 상태 확인
        if (contextInvalidated) {
            console.log("컨텍스트가 무효화된 상태에서 초기화 시도 - 복구 먼저 진행");
            tryRecoverContext();
            return;
        }
        
        // Chrome API 객체 접근 확인
        if (typeof chrome === 'undefined' || !chrome.runtime) {
            console.error("초기화 실패: chrome 객체 또는 runtime API에 접근할 수 없습니다.");
            contextInvalidated = true;
            tryRecoverContext();
            return;
        }
        
        // 컨텍스트 무효화 상태 초기화
        contextInvalidated = false;
        console.log("컨텍스트 무효화 상태 초기화됨");
        
        // 오류 복구 시도 횟수 초기화
        recoveryAttempts = 0;
        
        // 설정 로드
        loadAppSettings();
        
        // 이벤트 리스너 등록
        registerEventListeners();
        
        // 초기화 플래그 설정
        isInitialized = true;
        
        // 컨텍스트 유효성 체크 시작 (페이지 로드 후 바로 확인)
        // 시간 간격을 늘려 부하 감소
        setTimeout(checkExtensionContext, 1000);
    } catch (error) {
        console.error("BookStaxx 초기화 중 오류:", error);
        
        // 초기화 실패 시 복구 시도
        if (!contextInvalidated) {
            contextInvalidated = true;
            tryRecoverContext();
        }
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
        
        // 컨텍스트가 이미 무효화된 경우 복구 시도
        if (contextInvalidated) {
            console.log("컨텍스트가 무효화되어 복구 시도");
            tryRecoverContext();
            
            // 사용자에게 알림
            showErrorMessage("확장 프로그램 연결이 끊겼습니다. 복구를 시도합니다. 잠시 후 다시 시도해주세요.");
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
        showBookmarkIcons();
        
        console.log("북마크 바 토글 완료");
    } catch (error) {
        console.error("북마크 바 토글 중 오류:", error);
        // 오류 발생 시에도 컨텍스트 복구 시도
        tryRecoverContext();
    }
}

// 새로운 함수: 북마크 아이콘 직접 표시
function showBookmarkIcons() {
    try {
        console.log("북마크 아이콘 표시 시작");
        
        // 기존 요소 모두 제거
        removeAllBookmarkElements();
        
        // 상태 업데이트
        bookmarkBarVisible = true;
        
        // 화면 크기와 마우스 위치 가져오기
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;
        const mouseX = clickPosition.x;
        const mouseY = clickPosition.y;
        
        // 버튼 크기 및 여백 설정
        const buttonSize = 56; // CSS에서 변경됨
        const buttonMargin = 20;
        const buttonOffset = 100; // 마우스에서 버튼까지의 거리 증가
        
        // 뒤로가기 버튼 생성 및 배치
        const backButton = document.createElement('div');
        backButton.className = 'bookstaxx-action-button bookstaxx-back-button';
        backButton.setAttribute('data-bookstaxx-element', 'true');
        backButton.title = '뒤로 가기';
        backButton.innerHTML = '<svg class="bookstaxx-action-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#333" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>';
        
        // 뒤로가기 버튼 위치 계산 - 마우스 왼쪽에 배치
        let backX = mouseX - buttonOffset;
        let backY = mouseY;
        
        // 화면 경계 확인 (왼쪽)
        if (backX < buttonMargin + buttonSize/2) {
            backX = buttonMargin + buttonSize/2;
        }
        
        // 상하 경계 확인
        if (backY < buttonSize/2 + buttonMargin) {
            backY = buttonSize/2 + buttonMargin;
        } else if (backY > screenHeight - buttonSize/2 - buttonMargin) {
            backY = screenHeight - buttonSize/2 - buttonMargin;
        }
        
        // 버튼 위치 설정 (중앙 기준)
        backButton.style.left = `${backX - buttonSize/2}px`;
        backButton.style.top = `${backY - buttonSize/2}px`;
        
        // 뒤로가기 버튼 이벤트 리스너
        backButton.addEventListener('click', function(event) {
            console.log("뒤로가기 버튼 클릭");
            window.history.back();
            removeBookmarkBar();
            event.stopPropagation();
        });
        
        // 북마크 추가 버튼 생성 및 배치
        const addButton = document.createElement('div');
        addButton.className = 'bookstaxx-action-button bookstaxx-add-button';
        addButton.setAttribute('data-bookstaxx-element', 'true');
        addButton.title = '현재 페이지 북마크 추가';
        addButton.innerHTML = '<svg class="bookstaxx-action-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>';
        
        // 북마크 추가 버튼 위치 계산 - 마우스 오른쪽에 배치
        let addX = mouseX + buttonOffset;
        let addY = backY; // 뒤로가기 버튼과 같은 높이 유지
        
        // 화면 경계 확인 (오른쪽)
        if (addX > screenWidth - buttonMargin - buttonSize/2) {
            addX = screenWidth - buttonMargin - buttonSize/2;
        }
        
        // 버튼 위치 설정 (중앙 기준)
        addButton.style.left = `${addX - buttonSize/2}px`;
        addButton.style.top = `${backY - buttonSize/2}px`;
        
        // 북마크 추가 버튼 이벤트 리스너
        addButton.addEventListener('click', function(event) {
            console.log("북마크 추가 버튼 클릭");
            addCurrentPageToBookmarks();
            event.stopPropagation();
        });
        
        // 버튼을 body에 추가
        document.body.appendChild(backButton);
        document.body.appendChild(addButton);
        
        // 북마크 로드 및 표시
        loadBookmarksAndDisplay();
        
        // 자동 닫힘 방지 설정
        preventAutoClose = true;
        setTimeout(() => {
            preventAutoClose = false;
        }, 500);
        
        console.log("북마크 버튼 위치 - 뒤로가기:", backX, backY, "추가:", addX, addY);
    } catch (error) {
        console.error("북마크 아이콘 표시 중 오류:", error);
        showErrorMessage("북마크 표시 중 오류가 발생했습니다: " + error.message);
    }
}

// 북마크 로드 및 표시 함수
function loadBookmarksAndDisplay() {
    try {
        // 북마크 데이터 요청
        chrome.runtime.sendMessage({ action: "getBookmarks" }, function(response) {
            // 오류 확인
            if (chrome.runtime.lastError) {
                console.error("북마크 로드 중 오류:", chrome.runtime.lastError.message);
                showErrorMessage("북마크를 로드할 수 없습니다. 페이지를 새로고침하거나 확장 프로그램을 재시작하세요.");
                return;
            }
            
            // 응답 확인
            if (!response || !response.success) {
                console.error("북마크 로드 실패:", response ? response.error : "응답 없음");
                showErrorMessage("북마크를 로드할 수 없습니다.");
                return;
            }
            
            // 북마크 데이터 확인
            const bookmarks = response.bookmarks;
            displayBookmarkIconsDirectly(bookmarks);
        });
    } catch (error) {
        console.error("북마크 로드 중 오류:", error);
        showErrorMessage("북마크를 로드하는 중 오류가 발생했습니다.");
    }
}

// 북마크를 직접 아이콘으로 표시하는 함수
function displayBookmarkIconsDirectly(receivedBookmarks) {
    try {
        console.log("북마크 아이콘 표시 시작");
        
        // 모든 북마크를 평면 배열로 변환
        const allBookmarks = [];
        
        // 북마크 트리 처리
        if (Array.isArray(receivedBookmarks)) {
            receivedBookmarks.forEach(folder => collectBookmarks(folder, allBookmarks));
        } else if (receivedBookmarks && typeof receivedBookmarks === 'object') {
            collectBookmarks(receivedBookmarks, allBookmarks);
        }
        
        console.log(`총 ${allBookmarks.length}개의 북마크 로드됨`);
        
        // 북마크가 없는 경우
        if (allBookmarks.length === 0) {
            showErrorMessage("표시할 북마크가 없습니다. 북마크를 추가하거나 옵션을 확인하세요.");
            return;
        }
        
        // 애니메이션 스타일 추가
        addAnimationStyles();
        
        // 설정에서 북마크 최대 개수 가져오기 (문자열 설정을 숫자로 변환)
        const maxBookmarks = parseInt(currentSettings.maxBookmarks || '20', 10);
        
        // 배열을 랜덤하게 섞어서 일부만 표시 (최신순 표시를 위해 역순으로 정렬 후 섞기)
        let shuffledBookmarks = [...allBookmarks].reverse().sort(() => Math.random() - 0.5);
        const bookmarksToDisplay = shuffledBookmarks.slice(0, maxBookmarks);
        
        // 마우스 위치 및 화면 크기
        const mouseX = clickPosition.x;
        const mouseY = clickPosition.y;
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;
        
        // 북마크 아이콘 크기 계산 (기본 아이콘 크기 + 여백)
        const iconSize = parseInt(currentSettings.bookmarkIconSize || '48', 10);
        const iconSpacing = iconSize * 2.2; // 아이콘 간 최소 간격 (아이콘 크기의 2.2배로 증가)
        
        // 화면 여백 (화면 경계에서 여유)
        const margin = Math.max(iconSize * 1.2, Math.min(screenWidth, screenHeight) * 0.05);
        
        // 레이아웃 모드 확인
        const layoutMode = currentSettings.bookmarkLayoutMode || 'circle';
        
        // 북마크 배치를 위한 위치 정보 배열
        const placementPositions = [];
        
        // 레이아웃 모드에 따라 북마크 배치 방식 결정
        if (layoutMode === 'circle') {
            // 원형 레이아웃: 개선된 원형 배치 알고리즘
            const totalBookmarks = bookmarksToDisplay.length;
            
            // 배치 방식 결정: 북마크 수에 따라 자동 결정
            let placementStrategy = 'singleCircle';  // 기본 단일 원형 배치
            
            if (totalBookmarks > 12) {
                placementStrategy = 'multiCircle';   // 다중 원형 배치
            } else if (totalBookmarks > 24) {
                placementStrategy = 'spiralPlacement'; // 나선형 배치
            }
            
            // 단일 원형 배치 (12개 이하)
            if (placementStrategy === 'singleCircle') {
                // 원의 반지름 계산: 북마크 수에 따라 조정 (최소 화면 크기의 22%)
                const baseRadius = Math.min(screenWidth, screenHeight) * 0.22;
                
                // 북마크 간 충분한 간격을 보장하기 위한 반지름 조정
                // 원주 = 2 * PI * r, 각 북마크가 차지하는 호의 길이 계산
                const circumference = 2 * Math.PI * baseRadius;
                const arcLengthPerBookmark = circumference / totalBookmarks;
                
                // 북마크 간 최소 거리 확보를 위한 반지름 조정
                let adjustedRadius = baseRadius;
                if (arcLengthPerBookmark < iconSpacing) {
                    // 필요한 반지름 = 필요한 원주 / (2 * PI)
                    adjustedRadius = Math.max(baseRadius, (iconSpacing * totalBookmarks) / (2 * Math.PI));
                }
                
                // 각도 간격 계산 (완전한 원 = 2π)
                const angleStep = (2 * Math.PI) / totalBookmarks;
                
                // 약간의 회전 오프셋 추가 (시작점을 미세하게 조정)
                const rotationOffset = Math.PI / 8; // 22.5도 회전
                
                for (let i = 0; i < totalBookmarks; i++) {
                    const angle = rotationOffset + i * angleStep;
                    const x = mouseX + adjustedRadius * Math.cos(angle);
                    const y = mouseY + adjustedRadius * Math.sin(angle);
                    
                    // 화면 경계 확인 및 조정
                    const finalX = Math.max(margin, Math.min(screenWidth - margin, x));
                    const finalY = Math.max(margin, Math.min(screenHeight - margin, y));
                    
                    placementPositions.push({ 
                        x: finalX, 
                        y: finalY, 
                        index: i,
                        angle: angle  // 각도 정보 저장 (디버깅 및 확장 가능성)
                    });
                }
            }
            // 다중 원형 배치 (13~24개)
            else if (placementStrategy === 'multiCircle') {
                // 내부 원과 외부 원의 반지름 계산
                const innerRadius = Math.min(screenWidth, screenHeight) * 0.15;
                const outerRadius = Math.min(screenWidth, screenHeight) * 0.28;
                
                // 북마크를 내부 원과 외부 원에 분배
                const innerCount = Math.ceil(totalBookmarks * 0.4); // 약 40%를 내부 원에 배치
                const outerCount = totalBookmarks - innerCount;
                
                // 약간의 회전 오프셋 추가
                const rotationOffset = Math.PI / 12; // 15도
                
                // 내부 원 북마크 위치 계산
                if (innerCount > 0) {
                    const innerAngleStep = (2 * Math.PI) / innerCount;
                    for (let i = 0; i < innerCount; i++) {
                        const angle = rotationOffset + i * innerAngleStep;
                        const x = mouseX + innerRadius * Math.cos(angle);
                        const y = mouseY + innerRadius * Math.sin(angle);
                        
                        placementPositions.push({ 
                            x, y, 
                            index: i,
                            circle: 'inner'
                        });
                    }
                }
                
                // 외부 원 북마크 위치 계산 (내부 원과 엇갈리게 배치)
                if (outerCount > 0) {
                    const outerAngleStep = (2 * Math.PI) / outerCount;
                    const outerOffset = innerCount > 0 ? outerAngleStep / 2 : 0; // 내부 원이 있으면 반 칸 어긋나게
                    
                    for (let i = 0; i < outerCount; i++) {
                        const angle = rotationOffset + outerOffset + i * outerAngleStep;
                        const x = mouseX + outerRadius * Math.cos(angle);
                        const y = mouseY + outerRadius * Math.sin(angle);
                        
                        placementPositions.push({ 
                            x, y, 
                            index: i + innerCount,
                            circle: 'outer'
                        });
                    }
                }
                
                // 화면 경계 확인 및 조정
                placementPositions.forEach(pos => {
                    pos.x = Math.max(margin, Math.min(screenWidth - margin, pos.x));
                    pos.y = Math.max(margin, Math.min(screenHeight - margin, pos.y));
                });
            }
            // 나선형 배치 (25개 이상)
            else if (placementStrategy === 'spiralPlacement') {
                const a = 0.5; // 나선의 간격 조절 계수
                const b = 0.2; // 나선의 조밀도 조절 계수
                
                for (let i = 0; i < totalBookmarks; i++) {
                    // 나선 방정식 r = a + b*θ에 따라 계산
                    // θ는 각도, r은 반지름
                    const theta = i * 0.8; // 각도 간격 (라디안)
                    const radius = (a + b * theta) * Math.min(screenWidth, screenHeight) * 0.15;
                    
                    const x = mouseX + radius * Math.cos(theta);
                    const y = mouseY + radius * Math.sin(theta);
                    
                    // 화면 경계 확인 및 조정
                    const finalX = Math.max(margin, Math.min(screenWidth - margin, x));
                    const finalY = Math.max(margin, Math.min(screenHeight - margin, y));
                    
                    placementPositions.push({ 
                        x: finalX, 
                        y: finalY, 
                        index: i,
                        angle: theta
                    });
                }
            }
            
            // 향상된 겹침 방지 알고리즘
            let overlappingDetected = true;
            const maxAdjustmentIterations = 10; // 최대 조정 시도 횟수 증가
            let adjustmentIteration = 0;
            
            while (overlappingDetected && adjustmentIteration < maxAdjustmentIterations) {
                overlappingDetected = false;
                adjustmentIteration++;
                
                // 모든 북마크 쌍에 대해 겹침 검사
                for (let i = 0; i < placementPositions.length; i++) {
                    for (let j = i + 1; j < placementPositions.length; j++) {
                        const pos1 = placementPositions[i];
                        const pos2 = placementPositions[j];
                        
                        // 두 위치 간의 거리 계산
                        const dx = pos2.x - pos1.x;
                        const dy = pos2.y - pos1.y;
                        const distance = Math.sqrt(dx * dx + dy * dy);
                        
                        // 겹침 감지
                        if (distance < iconSpacing) {
                            overlappingDetected = true;
                            
                            // 겹침 해결: 서로 반대 방향으로 밀어내기 (강화된 버전)
                            const angleBetween = Math.atan2(dy, dx);
                            const pushDistance = (iconSpacing - distance) / 1.8; // 1.8로 나누어 더 강하게 밀기
                            
                            // 첫 번째 북마크는 반대 방향으로 이동
                            pos1.x -= Math.cos(angleBetween) * pushDistance;
                            pos1.y -= Math.sin(angleBetween) * pushDistance;
                            
                            // 두 번째 북마크는 같은 방향으로 이동
                            pos2.x += Math.cos(angleBetween) * pushDistance;
                            pos2.y += Math.sin(angleBetween) * pushDistance;
                            
                            // 화면 경계 확인 및 조정
                            pos1.x = Math.max(margin, Math.min(screenWidth - margin, pos1.x));
                            pos1.y = Math.max(margin, Math.min(screenHeight - margin, pos1.y));
                            pos2.x = Math.max(margin, Math.min(screenWidth - margin, pos2.x));
                            pos2.y = Math.max(margin, Math.min(screenHeight - margin, pos2.y));
                        }
                    }
                }
                
                // 진행 상황 로깅
                if (overlappingDetected) {
                    console.log(`겹침 조정 라운드 ${adjustmentIteration} 완료, 여전히 겹침이 있습니다.`);
                } else {
                    console.log(`겹침 조정 완료: ${adjustmentIteration} 라운드`);
                }
            }
            
            // 마지막 안전 조치: 각 북마크 주변에 최소 간격 강제 적용
            for (let i = 0; i < placementPositions.length; i++) {
                const pos1 = placementPositions[i];
                let movedTooClose = false;
                
                for (let j = 0; j < placementPositions.length; j++) {
                    if (i === j) continue;
                    
                    const pos2 = placementPositions[j];
                    
                    // 두 위치 간의 거리 계산
                    const dx = pos2.x - pos1.x;
                    const dy = pos2.y - pos1.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    // 최소 거리 미만인 경우
                    if (distance < iconSize * 1.3) {
                        movedTooClose = true;
                        break;
                    }
                }
                
                // 너무 가까운 경우 중심에서 멀어지는 방향으로 이동
                if (movedTooClose) {
                    const angleFromCenter = Math.atan2(pos1.y - mouseY, pos1.x - mouseX);
                    const pushOutDistance = iconSize * 0.5;
                    
                    pos1.x += Math.cos(angleFromCenter) * pushOutDistance;
                    pos1.y += Math.sin(angleFromCenter) * pushOutDistance;
                    
                    // 화면 경계 확인
                    pos1.x = Math.max(margin, Math.min(screenWidth - margin, pos1.x));
                    pos1.y = Math.max(margin, Math.min(screenHeight - margin, pos1.y));
                }
            }
        }
        
        // 나머지 레이아웃 모드 (full, grid, random 등) 관련 코드는 유지됨
        // ... existing code ...
        
        // 계산된 위치에 북마크 아이콘 생성 및 배치
        placementPositions.forEach(position => {
            try {
                // 해당 인덱스의 북마크 가져오기
                const bookmark = bookmarksToDisplay[position.index];
                if (!bookmark) return;
                
                // 아이콘 생성
                const bookmarkIcon = createBookmarkIcon(bookmark);
                
                // 고유 인덱스 속성 추가
                bookmarkIcon.setAttribute('data-index', position.index);
                
                // 화면 경계 확인
                const finalX = Math.max(iconSize, Math.min(screenWidth - iconSize, position.x));
                const finalY = Math.max(iconSize, Math.min(screenHeight - iconSize, position.y));
                
                // 애니메이션 설정
                setBookmarkAnimation(bookmarkIcon, mouseX, mouseY, finalX, finalY, position.index);
                
                // body에 추가
                document.body.appendChild(bookmarkIcon);
            } catch (iconError) {
                console.error("북마크 아이콘 생성 중 오류:", iconError);
            }
        });
        
        console.log("북마크 아이콘 표시 완료");
    } catch (error) {
        console.error("북마크 아이콘 직접 표시 중 오류:", error);
        showErrorMessage("북마크 아이콘을 표시하는 중 오류가 발생했습니다: " + error.message);
    }
}

// 북마크 아이콘 생성 함수
function createBookmarkIcon(bookmark) {
    // 북마크 아이콘 요소 생성
    const bookmarkIcon = document.createElement('div');
    bookmarkIcon.className = 'bookstaxx-bookmark-icon';
    bookmarkIcon.setAttribute('data-bookstaxx-element', 'true');
    bookmarkIcon.setAttribute('data-url', bookmark.url);
    
    // 수정: 제목 처리 개선 - 제목이 없거나, 공백, undefined인 경우를 처리
    const bookmarkTitle = (bookmark.title && bookmark.title.trim()) ? bookmark.title.trim() : '제목 없음';
    bookmarkIcon.setAttribute('data-title', bookmarkTitle);
    
    // 아이콘 이미지 컨테이너
    const iconContainer = document.createElement('div');
    iconContainer.className = 'bookstaxx-bookmark-icon-img';
    iconContainer.setAttribute('data-bookstaxx-element', 'true');
    
    // 파비콘 이미지 생성
    const favicon = document.createElement('img');
    favicon.setAttribute('data-bookstaxx-element', 'true');
    
    // 파비콘 URL 생성 로직 개선
    try {
        // URL이 유효한지 확인
        if (!bookmark.url || typeof bookmark.url !== 'string') {
            throw new Error('유효하지 않은 URL');
        }
        
        // URL 파싱 시도
        const url = new URL(bookmark.url);
        const host = url.hostname;
        
        // URL 유형에 따른 파비콘 처리
        if (url.protocol === 'chrome:' || url.protocol === 'chrome-extension:') {
            // 크롬 내부 페이지는 기본 아이콘 사용
            favicon.src = 'icons/default_favicon.png';
        } else if (url.protocol === 'file:') {
            // 로컬 파일은 파일 타입 아이콘 사용
            favicon.src = 'icons/file_favicon.png';
        } else {
            // 일반 웹사이트는 Google의 파비콘 서비스 사용
            favicon.src = `https://www.google.com/s2/favicons?domain=${host}&sz=64`;
            // 백업 처리를 위해 원래 파비콘 URL도 기록
            favicon.setAttribute('data-original-favicon', `chrome://favicon/${bookmark.url}`);
        }
        
        favicon.alt = host || '웹사이트';
    } catch (error) {
        // URL 파싱 오류 시 기본 아이콘 사용
        favicon.src = 'icons/default_favicon.png';
        favicon.alt = '웹사이트';
        console.warn(`북마크 "${bookmarkTitle}"의 URL 파싱 오류:`, error.message);
    }
    
    // 로드 오류 시 대체 처리 (단계적 대체 전략)
    favicon.onerror = function() {
        // 이미 대체 시도를 했는지 확인
        const retryCount = parseInt(this.getAttribute('data-retry-count') || '0', 10);
        
        if (retryCount === 0) {
            // 첫 번째 실패: 원래 파비콘 URL 시도
            const originalFaviconUrl = this.getAttribute('data-original-favicon');
            if (originalFaviconUrl) {
                console.log("파비콘 로딩 실패, chrome://favicon/ URL 시도 중...");
                this.src = originalFaviconUrl;
                this.setAttribute('data-retry-count', '1');
                return;
            }
        }
        
        // 두 번째 실패 또는 대체 URL이 없는 경우: 기본 아이콘 사용
        console.log("파비콘 로딩 실패, 기본 아이콘 사용");
        this.src = 'icons/default_favicon.png';
        this.setAttribute('data-retry-count', '2'); // 더 이상 재시도 하지 않음
    };
    
    // 아이콘 이미지 컨테이너에 파비콘 추가
    iconContainer.appendChild(favicon);
    
    // 아이콘 크기 설정 (문자열 설정을 숫자로 변환)
    const iconSize = parseInt(currentSettings.bookmarkIconSize || '48', 10);
    iconContainer.style.width = `${iconSize}px`;
    iconContainer.style.height = `${iconSize}px`;
    
    // 아이콘에 이미지 컨테이너 추가
    bookmarkIcon.appendChild(iconContainer);
    
    // 제목 요소 생성
    const title = document.createElement('div');
    title.className = 'bookstaxx-bookmark-icon-title';
    title.setAttribute('data-bookstaxx-element', 'true');
    
    // 설정에서 제목 길이 제한 가져오기 (기본값: 6)
    const titleLengthLimit = parseInt(currentSettings.titleLengthLimit || '6', 10);
    
    // 제목 길이에 따른 표시 처리
    let displayTitle = bookmarkTitle;
    if (displayTitle.length > titleLengthLimit) {
        displayTitle = displayTitle.substring(0, titleLengthLimit) + '...';
    }
    
    title.textContent = displayTitle;
    title.title = bookmarkTitle; // 툴팁으로 전체 제목 표시
    
    // 폰트 크기 설정 (문자열 설정을 숫자로 변환)
    const fontSize = parseInt(currentSettings.bookmarkFontSize || '12', 10);
    title.style.fontSize = `${fontSize}px`;
    
    // 아이콘에 제목 요소 추가
    bookmarkIcon.appendChild(title);
    
    // 클릭 이벤트 리스너 추가
    bookmarkIcon.addEventListener('click', function(event) {
        // 북마크 URL 가져오기
        const url = this.getAttribute('data-url');
        
        // 북마크 열기
        if (url) {
            openBookmark(url);
        } else {
            console.error("북마크 URL을 찾을 수 없습니다:", this);
            showErrorMessage("북마크 URL을 찾을 수 없습니다.");
        }
        
        // 클릭 이벤트 전파 중단
        event.stopPropagation();
    });
    
    return bookmarkIcon;
}

// 북마크 아이콘 애니메이션 설정 함수
function setBookmarkAnimation(bookmarkIcon, startX, startY, endX, endY, index) {
    // 초기 위치 설정
    bookmarkIcon.style.position = 'fixed';
    bookmarkIcon.style.left = `${startX - 20}px`; // 아이콘 중심 위치 보정
    bookmarkIcon.style.top = `${startY - 20}px`;
    
    // 최종 위치에 대한 오프셋 계산
    const offsetX = endX - startX;
    const offsetY = endY - startY;
    
    // CSS 변수로 값 설정
    bookmarkIcon.style.setProperty('--end-x', `${offsetX}px`);
    bookmarkIcon.style.setProperty('--end-y', `${offsetY}px`);
    
    // 아이콘에 고유 ID 부여 (디버깅 및 참조용)
    bookmarkIcon.id = `bookstaxx-icon-${Date.now()}-${index}`;
    
    // 애니메이션 모드 확인 (순차적 또는 동시)
    const animationMode = currentSettings.bookmarkAnimationMode || 'shoot';
    
    // 애니메이션 모드에 따라 다르게 처리
    if (animationMode === 'sequential') {
        // 순차적 등장 모드: 매우 빠른 속도로 하나씩 발사 (10ms 간격)
        setTimeout(() => {
            bookmarkIcon.classList.add('bookstaxx-animate-shoot');
            
            // 애니메이션 완료 후 위치 고정 (관련 버그 방지)
            setTimeout(() => {
                if (document.body.contains(bookmarkIcon)) {
                    bookmarkIcon.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
                    bookmarkIcon.classList.remove('bookstaxx-animate-shoot');
                }
            }, 800); // 애니메이션 시간보다 약간 더 길게
        }, index * 30); // 30ms 간격으로 빠르게 순차 발사 (10ms에서 30ms로 증가)
    } else {
        // 동시 발사 모드 (기본값)
        bookmarkIcon.classList.add('bookstaxx-animate-shoot');
        
        // 애니메이션 완료 후 위치 고정 (관련 버그 방지)
        setTimeout(() => {
            if (document.body.contains(bookmarkIcon)) {
                bookmarkIcon.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
                bookmarkIcon.classList.remove('bookstaxx-animate-shoot');
            }
        }, 800); // 애니메이션 시간보다 약간 더 길게
    }
}

// 애니메이션 스타일 추가 함수
function addAnimationStyles() {
    // 이미 존재하는지 확인
    let styleElement = document.getElementById('bookstaxx-animation-styles');
    if (!styleElement) {
        // 스타일 요소 생성
        styleElement = document.createElement('style');
        styleElement.id = 'bookstaxx-animation-styles';
        document.head.appendChild(styleElement);
    }
    
    // 애니메이션 모드 확인
    const animationMode = currentSettings.bookmarkAnimationMode || 'shoot';
    
    // 애니메이션 활성화 여부 확인
    const animationEnabled = currentSettings.animationEnabled !== false;
    
    // 애니메이션 정의
    let animationKeyframes = '';
    
    if (animationEnabled) {
        if (animationMode === 'shoot' || animationMode === 'sequential') {
            // 발사 애니메이션 - 지속 시간 단축 (0.8s → 0.6s)
            animationKeyframes = `
                @keyframes bookstaxx-shoot-out {
                    0% {
                        transform: translate(0, 0) scale(0.1);
                        opacity: 0;
                    }
                    20% {
                        opacity: 0.5;
                    }
                    40% {
                        opacity: 1;
                    }
                    100% {
                        transform: translate(var(--end-x), var(--end-y)) scale(1);
                        opacity: 1;
                    }
                }
                
                .bookstaxx-animate-shoot {
                    animation: bookstaxx-shoot-out 0.6s cubic-bezier(0.25, 0.1, 0.25, 1.4) forwards;
                    will-change: transform, opacity;
                }
            `;
        } else if (animationMode === 'fade') {
            // 페이드 인 애니메이션
            animationKeyframes = `
                @keyframes bookstaxx-fade-in {
                    0% {
                        transform: translate(var(--end-x), var(--end-y)) scale(0.5);
                        opacity: 0;
                    }
                    100% {
                        transform: translate(var(--end-x), var(--end-y)) scale(1);
                        opacity: 1;
                    }
                }
                
                .bookstaxx-animate-shoot {
                    animation: bookstaxx-fade-in 0.6s ease forwards;
                    will-change: transform, opacity;
                }
            `;
        } else {
            // 기본 애니메이션
            animationKeyframes = `
                @keyframes bookstaxx-shoot-out {
                    0% {
                        transform: translate(0, 0) scale(0.1);
                        opacity: 0;
                    }
                    100% {
                        transform: translate(var(--end-x), var(--end-y)) scale(1);
                        opacity: 1;
                    }
                }
                
                .bookstaxx-animate-shoot {
                    animation: bookstaxx-shoot-out 0.6s ease forwards;
                    will-change: transform, opacity;
                }
            `;
        }
    } else {
        // 애니메이션 비활성화 - 즉시 최종 위치로 이동
        animationKeyframes = `
            .bookstaxx-animate-shoot {
                transform: translate(var(--end-x), var(--end-y)) scale(1);
                opacity: 1;
            }
        `;
    }
    
    // 스타일 설정
    styleElement.textContent = `
        ${animationKeyframes}
        
        /* 오류 수정을 위한 추가 스타일 */
        .bookstaxx-bookmark-icon, 
        .bookstaxx-action-button {
            pointer-events: auto !important;
            visibility: visible !important;
            z-index: 2147483647 !important;
        }
        
        .bookstaxx-action-icon {
            pointer-events: none;
        }
    `;
}

// 모든 북마크 요소 제거 함수
function removeAllBookmarkElements() {
    try {
        // 북마크 아이콘 요소들 제거
        const bookmarkIcons = document.querySelectorAll('.bookstaxx-bookmark-icon');
        bookmarkIcons.forEach(icon => {
            if (document.body.contains(icon)) {
                document.body.removeChild(icon);
            }
        });
        
        // 액션 버튼 제거
        const backButton = document.querySelector('.bookstaxx-back-button');
        if (backButton && document.body.contains(backButton)) {
            document.body.removeChild(backButton);
        }
        
        const addButton = document.querySelector('.bookstaxx-add-button');
        if (addButton && document.body.contains(addButton)) {
            document.body.removeChild(addButton);
        }
        
        // 북마크 바 요소 제거
        const bookmarkBar = document.getElementById(BOOKMARK_BAR_ID);
        if (bookmarkBar && document.body.contains(bookmarkBar)) {
            document.body.removeChild(bookmarkBar);
        }
        
        // 상태 초기화
        bookmarkBarVisible = false;
        bookmarkBarElement = null;
        
        console.log("모든 북마크 요소 제거 완료");
    } catch (error) {
        console.error("북마크 요소 제거 중 오류:", error);
    }
}

// 북마크 바 제거 함수
function removeBookmarkBar() {
    removeAllBookmarkElements();
}

// 북마크 로드 함수
function loadBookmarks(container, searchInput, displayAsIcons = false) {
    try {
        console.log("북마크 로드 시작");
        
        // 북마크 로딩 메시지 표시
        container.innerHTML = '<div class="bookstaxx-loading">북마크 로드 중...</div>';
        
        // 북마크 데이터 요청
        chrome.runtime.sendMessage({ action: "getBookmarks" }, function(response) {
            // 오류 확인
            if (chrome.runtime.lastError) {
                console.error("북마크 로드 중 오류:", chrome.runtime.lastError.message);
                displayError(container, "북마크를 로드할 수 없습니다. 페이지를 새로고침하거나 확장 프로그램을 재시작하세요.");
                return;
            }
            
            // 응답 확인
            if (!response || !response.success) {
                console.error("북마크 로드 실패:", response ? response.error : "응답 없음");
                displayError(container, "북마크를 로드할 수 없습니다.");
                return;
            }
            
            // 북마크 데이터 확인
            const bookmarks = response.bookmarks;
            if (!bookmarks || !Array.isArray(bookmarks) || bookmarks.length === 0) {
                console.error("북마크 데이터 없음 또는 빈 배열");
                displayError(container, "북마크가 없거나 로드할 수 없습니다.");
                return;
            }
            
            console.log("북마크 데이터 수신:", bookmarks.length);
            
            // 북마크 저장 및 북마크 바 설정
            const bookmarkTree = buildBookmarkTree(bookmarks);
            
            // 아이콘 모드에 따라 다른 표시 방식 사용
            if (displayAsIcons) {
                // 아이콘으로 표시
                displayBookmarkIcons(container, bookmarks);
            } else {
                // 트리로 표시
                displayBookmarkTree(container, bookmarkTree);
            }
            
            // 검색 기능 초기화
            if (searchInput) {
                initializeSearch(searchInput, container, bookmarks);
            }
            
            console.log("북마크 로드 완료");
        });
    } catch (error) {
        console.error("북마크 로드 중 오류:", error);
        displayError(container, "북마크를 로드하는 중 오류가 발생했습니다.");
    }
}

// 북마크 트리에서 북마크를 수집하는 함수
function collectBookmarks(node, bookmarks = []) {
    try {
        // 노드가 북마크인 경우 (URL이 있는 경우)
        if (node.url) {
            bookmarks.push(node);
        }
        
        // 노드가 폴더인 경우 (children 속성이 있는 경우)
        if (node.children && Array.isArray(node.children)) {
            // 모든 자식 요소에 대해 재귀적으로 처리
            for (const child of node.children) {
                collectBookmarks(child, bookmarks);
            }
        }
        
        return bookmarks;
    } catch (error) {
        console.error("북마크 수집 중 오류:", error);
        return bookmarks; // 오류 발생 시 현재까지 수집한 북마크 반환
    }
}

// 북마크를 아이콘 형태로 표시하는 함수
function displayBookmarkIcons(container, tree) {
    try {
        console.log("북마크 아이콘 표시 시작");
        container.innerHTML = '';
        
        // 기존의 북마크 아이콘 제거
        const existingIcons = document.querySelectorAll('.bookstaxx-bookmark-icon');
        existingIcons.forEach(icon => {
            if (document.body.contains(icon)) {
                document.body.removeChild(icon);
            }
        });
        
        // 컨테이너 클래스 추가
        container.classList.add('bookstaxx-icons-view');
        
        // 모든 북마크를 평면 배열로 변환
        const allBookmarks = [];
        
        // 트리가 배열인 경우 (다수의 북마크 폴더)
        if (Array.isArray(tree)) {
            for (const node of tree) {
                collectBookmarks(node, allBookmarks);
            }
        } else if (tree && typeof tree === 'object') {
            // 트리가 단일 객체인 경우 (단일 북마크 폴더)
            collectBookmarks(tree, allBookmarks);
        }
        
        console.log(`총 ${allBookmarks.length}개의 북마크 로드됨`);
        
        // 북마크가 없는 경우
        if (allBookmarks.length === 0) {
            container.innerHTML = '<div class="bookstaxx-error">표시할 북마크가 없습니다. 북마크를 추가하거나 옵션에서 북마크 폴더를 확인하세요.</div>';
            return;
        }
        
        // 설정에서 북마크 최대 개수 가져오기
        const maxBookmarks = currentSettings.maxBookmarks || 20;
        // 배열을 랜덤하게 섞어서 일부만 표시 (최신순 표시를 위해 역순으로 정렬 후 섞기)
        let shuffledBookmarks = [...allBookmarks].reverse().sort(() => Math.random() - 0.5);
        
        // 설정된 최대 북마크 수 만큼만 사용
        const bookmarks = shuffledBookmarks.slice(0, maxBookmarks);
        
        // 클릭 위치 가져오기
        const mouseX = clickPosition.x;
        const mouseY = clickPosition.y;
        
        // 화면 크기 가져오기
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;
        
        // 위/아래 기둥 너비 계산 (화면의 일정 비율, 예: 10%)
        const columnWidth = Math.min(100, screenWidth * 0.1); // 최소 10픽셀, 최대 100픽셀
        
        // 애니메이션 스타일 요소 생성
        let styleElement = document.getElementById('bookstaxx-animation-styles');
        if (!styleElement) {
            styleElement = document.createElement('style');
            styleElement.id = 'bookstaxx-animation-styles';
            document.head.appendChild(styleElement);
        }
        
        // 애니메이션 스타일 정의
        styleElement.textContent = `
            @keyframes bookstaxx-shoot-out {
                0% {
                    transform: translate(0, 0) scale(0.2);
                    opacity: 0;
                }
                30% {
                    opacity: 1;
                }
                100% {
                    transform: translate(var(--end-x), var(--end-y)) scale(1);
                    opacity: 1;
                }
            }
            
            .bookstaxx-animate-shoot {
                animation: bookstaxx-shoot-out 0.6s cubic-bezier(0.17, 0.67, 0.83, 0.67) forwards;
            }
        `;
        
        // 북마크 아이콘 생성 (body에 직접 추가)
        bookmarks.forEach((bookmark, index) => {
            try {
                // 북마크 아이콘 요소 생성
                const bookmarkIcon = document.createElement('div');
                bookmarkIcon.className = 'bookstaxx-bookmark-icon';
                bookmarkIcon.setAttribute('data-bookstaxx-element', 'true');
                bookmarkIcon.setAttribute('data-url', bookmark.url);
                bookmarkIcon.setAttribute('data-title', bookmark.title);
                
                // 아이콘 이미지 컨테이너
                const iconContainer = document.createElement('div');
                iconContainer.className = 'bookstaxx-bookmark-icon-img';
                iconContainer.setAttribute('data-bookstaxx-element', 'true');
                
                // 파비콘 이미지 생성
                const favicon = document.createElement('img');
                favicon.setAttribute('data-bookstaxx-element', 'true');
                
                // 기본 파비콘 URL 생성
                try {
                    // URL에서 호스트 추출
                    const url = new URL(bookmark.url);
                    const host = url.hostname;
                    favicon.src = `chrome://favicon/size/32@2x/${url.origin}`;
                    favicon.alt = host;
                } catch (error) {
                    // URL 파싱 오류 시 기본 아이콘 사용
                    favicon.src = 'icons/default_favicon.png';
                    favicon.alt = '웹사이트';
                    console.error("URL 파싱 오류:", error);
                }
                
                // 로드 오류 시 기본 아이콘 사용
                favicon.onerror = function() {
                    this.src = 'icons/default_favicon.png';
                };
                
                // 아이콘 이미지 컨테이너에 파비콘 추가
                iconContainer.appendChild(favicon);
                
                // 아이콘 제목 생성
                const title = document.createElement('div');
                title.className = 'bookstaxx-bookmark-icon-title';
                title.setAttribute('data-bookstaxx-element', 'true');
                title.textContent = bookmark.title;
                
                // 아이콘에 요소 추가
                bookmarkIcon.appendChild(iconContainer);
                bookmarkIcon.appendChild(title);
                
                // 랜덤 위치 계산 (화면 밖으로 나가지 않도록)
                let targetX, targetY;
                let attempts = 0;
                const maxAttempts = 20; // 더 많은 시도 횟수
                
                do {
                    // 랜덤 각도 (0-360도)
                    const angle = Math.random() * 2 * Math.PI;
                    
                    // 랜덤 거리 (화면 크기의 10%-40%)
                    const minDistance = Math.min(screenWidth, screenHeight) * 0.1;
                    const maxDistance = Math.min(screenWidth, screenHeight) * 0.4;
                    const distance = minDistance + Math.random() * (maxDistance - minDistance);
                    
                    // 극좌표에서 직교좌표로 변환
                    const offsetX = Math.cos(angle) * distance;
                    const offsetY = Math.sin(angle) * distance;
                    
                    // 최종 위치
                    targetX = mouseX + offsetX;
                    targetY = mouseY + offsetY;
                    
                    // 화면 경계 확인 (아이콘 너비/높이를 고려)
                    if (targetX < 50) targetX = 50;
                    if (targetX > screenWidth - 50) targetX = screenWidth - 50;
                    if (targetY < 50) targetY = 50;
                    if (targetY > screenHeight - 50) targetY = screenHeight - 50;
                    
                    // 마우스 기준 상하 90도 직각 방향의 얇은 기둥 내에 있는지 확인
                    const isInVerticalColumn = Math.abs(targetX - mouseX) < columnWidth / 2;
                    
                    // 시도 횟수 증가
                    attempts++;
                    
                    // 아이콘이 수직 기둥 밖에 있는 경우 또는 최대 시도 횟수 초과 시 루프 종료
                    if (!isInVerticalColumn || attempts >= maxAttempts) {
                        break;
                    }
                } while (true);
                
                // 최종 위치 설정 (초기에는 마우스 위치에 배치)
                bookmarkIcon.style.position = 'fixed';
                bookmarkIcon.style.left = `${mouseX - 20}px`; // 아이콘 절반 크기만큼 오프셋
                bookmarkIcon.style.top = `${mouseY - 20}px`; // 아이콘 절반 크기만큼 오프셋
                
                // 애니메이션을 위한 계산된 위치 설정
                const endX = targetX - mouseX;
                const endY = targetY - mouseY;
                bookmarkIcon.style.setProperty('--end-x', `${endX}px`);
                bookmarkIcon.style.setProperty('--end-y', `${endY}px`);
                
                // 아이콘 크기 설정
                const iconSize = currentSettings.bookmarkIconSize || 48;
                iconContainer.style.width = `${iconSize}px`;
                iconContainer.style.height = `${iconSize}px`;
                
                // 폰트 크기 설정
                const fontSize = currentSettings.bookmarkFontSize || 12;
                title.style.fontSize = `${fontSize}px`;
                
                // 클릭 이벤트 리스너 추가
                bookmarkIcon.addEventListener('click', function(event) {
                    // 북마크 URL 가져오기
                    const url = this.getAttribute('data-url');
                    
                    // 북마크 열기
                    if (url) {
                        openBookmark(url);
                    }
                    
                    // 클릭 이벤트 전파 중단
                    event.stopPropagation();
                });
                
                // body에 북마크 아이콘 직접 추가 (컨테이너가 아닌)
                document.body.appendChild(bookmarkIcon);
                
                // 애니메이션 지연 적용 (순차적으로 발사되는 효과)
                setTimeout(() => {
                    bookmarkIcon.classList.add('bookstaxx-animate-shoot');
                }, index * 50); // 각 아이콘마다 50ms 지연
            } catch (iconError) {
                console.error("북마크 아이콘 생성 중 오류:", iconError);
            }
        });
        
        console.log("북마크 아이콘 표시 완료");
    } catch (error) {
        console.error("북마크 아이콘 표시 중 오류:", error);
        displayError(container, "북마크 아이콘을 표시하는 중 오류가 발생했습니다.");
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
            console.log("북마크 열기 시도 중 컨텍스트 무효화 상태 감지 - 복구 시도");
            
            // 복구 시도 후 다시 시도
            tryRecoverContext();
            
            // 사용자에게 알림
            showErrorMessage("확장 프로그램 연결을 복구하는 중입니다. 잠시 후 다시 시도해주세요.");
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
                    
                    // 사용자에게 오류 알림
                    showErrorMessage("북마크 열기 중 확장 프로그램 연결이 끊겼습니다. 자동으로 복구를 시도합니다.");
                    
                    // 복구 시도
                    tryRecoverContext();
                    
                    // 컨텍스트 무효화 알림 표시
                    showContextInvalidatedNotification();
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
        
        // 예기치 않은 오류 발생 시 컨텍스트 복구 시도
        if (!contextInvalidated) {
            contextInvalidated = true;
            tryRecoverContext();
        }
    }
}

// 북마크 추가 성공 메시지 표시 함수
function showSuccessMessage(message) {
    // 기존 성공 메시지 제거
    const existingMsg = document.querySelector('.bookstaxx-success-message');
    if (existingMsg && document.body.contains(existingMsg)) {
        document.body.removeChild(existingMsg);
    }
    
    // 새 성공 메시지 생성
    const successMsg = document.createElement('div');
    successMsg.className = 'bookstaxx-success-message';
    successMsg.textContent = message;
    
    // body에 추가
    document.body.appendChild(successMsg);
    
    // 3초 후 메시지 제거
    setTimeout(() => {
        if (document.body.contains(successMsg)) {
            // 페이드 아웃 효과 적용
            successMsg.style.opacity = '0';
            successMsg.style.transition = 'opacity 0.5s ease';
            
            // 애니메이션 완료 후 요소 제거
            setTimeout(() => {
                if (document.body.contains(successMsg)) {
                    document.body.removeChild(successMsg);
                }
            }, 500);
        }
    }, 3000);
}

// 현재 페이지를 북마크에 추가하는 함수
function addCurrentPageToBookmarks() {
    try {
        // 컨텍스트가 이미 무효화된 경우
        if (contextInvalidated) {
            console.log("북마크 추가 시도 중 컨텍스트 무효화 상태 감지 - 복구 시도");
            
            // 복구 시도 후 다시 시도
            tryRecoverContext();
            
            // 사용자에게 알림
            showErrorMessage("확장 프로그램 연결을 복구하는 중입니다. 잠시 후 다시 시도해주세요.");
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
                    
                    // 사용자에게 오류 알림
                    showErrorMessage("북마크 추가 중 확장 프로그램 연결이 끊겼습니다. 자동으로 복구를 시도합니다.");
                    
                    // 복구 시도
                    tryRecoverContext();
                    
                    // 컨텍스트 무효화 알림 표시
                    showContextInvalidatedNotification();
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
                showSuccessMessage("북마크가 추가되었습니다.");
            } else {
                // 오류 응답
                console.error("북마크 추가 실패:", response.error);
                showErrorMessage("북마크 추가에 실패했습니다: " + response.error);
            }
        });
    } catch (error) {
        console.error("북마크 추가 중 오류:", error);
        showErrorMessage("북마크 추가 중 오류가 발생했습니다: " + error.message);
        
        // 예기치 않은 오류 발생 시 컨텍스트 복구 시도
        if (!contextInvalidated) {
            contextInvalidated = true;
            tryRecoverContext();
        }
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
    // 기존 오류 메시지 제거
    const existingErrorMsg = document.querySelector('.bookstaxx-error-message');
    if (existingErrorMsg && document.body.contains(existingErrorMsg)) {
        document.body.removeChild(existingErrorMsg);
    }
    
    // 새 오류 메시지 생성
    const errorMsg = document.createElement('div');
    errorMsg.className = 'bookstaxx-error-message';
    errorMsg.textContent = message;
    
    // body에 추가
    document.body.appendChild(errorMsg);
    
    // 3초 후 메시지 제거
    setTimeout(() => {
        if (document.body.contains(errorMsg)) {
            // 페이드 아웃 효과 적용
            errorMsg.style.opacity = '0';
            errorMsg.style.transition = 'opacity 0.5s ease';
            
            // 애니메이션 완료 후 요소 제거
            setTimeout(() => {
                if (document.body.contains(errorMsg)) {
                    document.body.removeChild(errorMsg);
                }
            }, 500);
        }
    }, 3000);
}

// 확장 프로그램 컨텍스트 유효성 확인 함수
function checkExtensionContext() {
    // 이미 실행 중인 확인 타이머가 있다면 정리
    if (checkContextTimer) {
        clearTimeout(checkContextTimer);
        checkContextTimer = null;
    }
    
    // 이미 무효화된 상태라면 복구 시도
    if (contextInvalidated) {
        console.log("컨텍스트가 무효화되어 복구 시도");
        tryRecoverContext();
        
        // 다음 확인 예약 (빈번한 확인을 줄이기 위해 10초로 변경)
        checkContextTimer = setTimeout(checkExtensionContext, 10000);
        return;
    }
    
    // 제한된 사이트인지 확인
    const currentHost = window.location.hostname;
    const isRestrictedSite = /sooplive|youtube|netflix|hulu|twitch|disneyplus|primevideo|naver\.com|google\.com|daum\.net|kakao\.com|wemep\.co\.kr|coupang\.com/i.test(currentHost);
    
    // 추가: 제한된 사이트에서는 확인 주기를 늘림
    const checkInterval = isRestrictedSite ? 30000 : 10000; // 제한된 사이트: 30초, 일반: 10초
    
    // 확장 컨텍스트 체크 전에 chrome 객체 확인
    if (typeof chrome === 'undefined' || !chrome.runtime) {
        console.error("chrome 또는 chrome.runtime 객체 접근 실패");
        contextInvalidated = true;
        tryRecoverContext();
        
        // 다음 확인 예약
        checkContextTimer = setTimeout(checkExtensionContext, checkInterval);
        return;
    }
    
    try {
        // iframe이나 문제가 있는 페이지에서도 성공적으로 동작하도록 개선된 핑 방식
        const pingTimestamp = Date.now();
        const pingData = { 
            action: "ping", 
            timestamp: pingTimestamp,
            origin: window.location.origin,
            path: window.location.pathname,
            isRestrictedSite: isRestrictedSite
        };
        
        // 간단한 메시지를 보내 확장 프로그램 연결 상태 확인
        chrome.runtime.sendMessage(pingData, function(response) {
            // try-catch로 콜백 내부 오류 처리
            try {
                if (chrome.runtime.lastError) {
                    const errorMessage = chrome.runtime.lastError.message || "알 수 없는 오류";
                    
                    // Extension context invalidated 오류 처리
                    if (errorMessage.includes('Extension context invalidated')) {
                        contextInvalidated = true;
                        console.error("확장 프로그램 컨텍스트가 무효화되었습니다. 복구 시도를 시작합니다.");
                        
                        // 복구 시도
                        tryRecoverContext();
                        
                        // 상단에 사용자에게 알림 표시 (제한된 사이트에서는 표시하지 않음)
                        if (!isRestrictedSite) {
                            showContextInvalidatedNotification();
                        } else {
                            console.log("제한된 사이트에서는 알림을 표시하지 않습니다.");
                        }
                    } else {
                        console.error("확장 프로그램 통신 오류:", errorMessage);
                    }
                } else {
                    // 응답 검증 - 실제로 유효한 응답인지 확인
                    if (response && response.success) {
                        console.log("확장 프로그램 컨텍스트 유효성 확인 완료");
                        
                        // 컨텍스트가 유효하다면 무효화 상태 초기화
                        if (contextInvalidated) {
                            contextInvalidated = false;
                            recoveryAttempts = 0; // 복구 시도 횟수 초기화
                            console.log("컨텍스트가 복구되었습니다.");
                            
                            // 복구 알림 메시지 제거
                            removeContextNotification();
                        }
                    } else {
                        console.warn("유효하지 않은 핑 응답:", response);
                        // 유효하지 않은 응답도 컨텍스트 무효화로 처리
                        contextInvalidated = true;
                        tryRecoverContext();
                    }
                }
            } catch (callbackError) {
                console.error("핑 응답 처리 중 오류:", callbackError);
                contextInvalidated = true;
                tryRecoverContext();
            }
            
            // 다음 컨텍스트 확인 예약 (제한된 사이트에서는 주기를 늘림)
            checkContextTimer = setTimeout(checkExtensionContext, checkInterval);
        });
    } catch (error) {
        console.error("확장 프로그램 컨텍스트 확인 중 오류:", error);
        
        // 컨텍스트 무효화 상태로 설정하고 복구 시도
        contextInvalidated = true;
        tryRecoverContext();
        
        // 다음 컨텍스트 확인 예약
        checkContextTimer = setTimeout(checkExtensionContext, checkInterval);
    }
}

// 컨텍스트 무효화 알림 표시 함수
function showContextInvalidatedNotification() {
    // 이미 표시된 알림이 있는지 확인
    if (document.getElementById('bookstaxx-context-notification')) {
        return;
    }
    
    // 알림 바 생성
    const notificationBar = document.createElement('div');
    notificationBar.id = 'bookstaxx-context-notification';
    notificationBar.textContent = "BookStaxx 확장 프로그램 연결이 끊겼습니다. 복구를 시도합니다...";
    notificationBar.style.position = "fixed";
    notificationBar.style.top = "0";
    notificationBar.style.left = "0";
    notificationBar.style.width = "100%";
    notificationBar.style.backgroundColor = "#ff9800"; // 주황색 경고
    notificationBar.style.color = "white";
    notificationBar.style.padding = "8px";
    notificationBar.style.textAlign = "center";
    notificationBar.style.zIndex = "2147483647";
    notificationBar.style.fontFamily = "sans-serif";
    notificationBar.style.fontSize = "14px";
    notificationBar.style.boxShadow = "0 2px 5px rgba(0,0,0,0.3)";
    
    // 새로고침 버튼 추가
    const refreshButton = document.createElement('button');
    refreshButton.textContent = "페이지 새로고침";
    refreshButton.style.marginLeft = "10px";
    refreshButton.style.padding = "4px 8px";
    refreshButton.style.backgroundColor = "#4285f4";
    refreshButton.style.color = "white";
    refreshButton.style.border = "none";
    refreshButton.style.borderRadius = "4px";
    refreshButton.style.cursor = "pointer";
    
    refreshButton.addEventListener('click', function() {
        window.location.reload();
    });
    
    // 닫기 버튼 추가
    const closeButton = document.createElement('span');
    closeButton.textContent = "×";
    closeButton.style.float = "right";
    closeButton.style.marginRight = "20px";
    closeButton.style.cursor = "pointer";
    closeButton.style.fontWeight = "bold";
    closeButton.style.fontSize = "20px";
    
    closeButton.addEventListener('click', function() {
        removeContextNotification();
    });
    
    notificationBar.appendChild(refreshButton);
    notificationBar.appendChild(closeButton);
    document.body.appendChild(notificationBar);
}

// 알림 제거 함수
function removeContextNotification() {
    const notification = document.getElementById('bookstaxx-context-notification');
    if (notification && document.body.contains(notification)) {
        document.body.removeChild(notification);
    }
}

// 컨텍스트 복구 시도 함수
function tryRecoverContext() {
    // 이미 실행 중인 타이머가 있다면 정리
    if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
    }
    
    console.log("컨텍스트 복구 시도 중... (시도 횟수: " + (recoveryAttempts + 1) + "/" + MAX_RECOVERY_ATTEMPTS + ")");
    
    // iframe이나 특정 사이트에서 발생하는 문제 처리 시도
    const isIframe = window !== window.top;
    const currentHost = window.location.hostname;
    // 추가: 컨텍스트 문제가 자주 발생하는 사이트 목록 확장
    const isRestrictedSite = /sooplive|youtube|netflix|hulu|twitch|disneyplus|primevideo|naver\.com|google\.com|daum\.net|kakao\.com|wemep\.co\.kr|coupang\.com/i.test(currentHost);
    
    // 최대 복구 시도 횟수 확인
    if (recoveryAttempts >= MAX_RECOVERY_ATTEMPTS) {
        console.log("최대 복구 시도 횟수를 초과했습니다. 페이지 새로고침이 필요할 수 있습니다.");
        
        // iframe 또는 제한된 사이트에서는 알림 변경
        let notificationMessage = "BookStaxx 확장 프로그램 연결을 복구할 수 없습니다. 페이지를 새로고침하세요.";
        if (isIframe || isRestrictedSite) {
            notificationMessage = `이 사이트(${currentHost})에서는 BookStaxx 확장 프로그램이 제한적으로 작동할 수 있습니다.`;
            
            // 제한된 사이트에서는 주기적인 컨텍스트 확인 중지하여 리소스 사용 줄이기
            if (checkContextTimer) {
                clearTimeout(checkContextTimer);
                checkContextTimer = null;
                console.log("제한된 사이트에서 주기적인 컨텍스트 확인을 중지합니다.");
            }
        }
        
        // 알림 업데이트
        const notification = document.getElementById('bookstaxx-context-notification');
        if (notification) {
            notification.style.backgroundColor = "#f44336"; // 빨간색으로 변경
            notification.textContent = notificationMessage;
            
            // 사용자 경험 개선을 위해 자동 새로고침 옵션 제공
            if (!document.getElementById('bookstaxx-auto-refresh-btn') && !isRestrictedSite) {
                const autoRefreshBtn = document.createElement('button');
                autoRefreshBtn.id = 'bookstaxx-auto-refresh-btn';
                autoRefreshBtn.textContent = "자동 새로고침 (5초 후)";
                autoRefreshBtn.style.marginLeft = "10px";
                autoRefreshBtn.style.padding = "4px 8px";
                autoRefreshBtn.style.backgroundColor = "#4285f4";
                autoRefreshBtn.style.color = "white";
                autoRefreshBtn.style.border = "none";
                autoRefreshBtn.style.borderRadius = "4px";
                autoRefreshBtn.style.cursor = "pointer";
                
                // 5초 카운트다운 후 새로고침
                let countdown = 5;
                const countTimer = setInterval(() => {
                    countdown--;
                    if (countdown <= 0) {
                        clearInterval(countTimer);
                        window.location.reload();
                    } else {
                        autoRefreshBtn.textContent = `자동 새로고침 (${countdown}초 후)`;
                    }
                }, 1000);
                
                autoRefreshBtn.addEventListener('click', function() {
                    clearInterval(countTimer);
                    window.location.reload();
                });
                
                notification.appendChild(autoRefreshBtn);
            }
        }
        
        return;
    }
    
    // 복구 시도 횟수 증가
    recoveryAttempts++;
    
    // 복구 알림 표시 또는 업데이트
    updateRecoveryNotification();
    
    // 추가: 제한된 사이트에서는 복구 시도 횟수를 줄이고 백오프 시간을 늘림
    if (isRestrictedSite && recoveryAttempts > 2) {
        console.log("제한된 사이트에서는 복구 시도를 최소화합니다.");
        scheduleNextRecoveryAttempt(true);
        return;
    }
    
    // 새로운 방식: 새 content script를 로드하기 위한 시도
    try {
        // Chrome API가 접근 가능한지 확인
        if (typeof chrome === 'undefined' || !chrome.runtime) {
            console.error("chrome 객체 또는 runtime API에 접근할 수 없습니다.");
            scheduleNextRecoveryAttempt();
            return;
        }
        
        // 현재 페이지 정보 추가하여 재초기화 요청
        const reinitData = { 
            action: "reinitialize",
            timestamp: Date.now(),
            origin: window.location.origin,
            path: window.location.pathname,
            isIframe: isIframe,
            isRestrictedSite: isRestrictedSite,
            recoveryAttempt: recoveryAttempts
        };
        
        // 안전한 메시지 전송 시도
        safelyTrySendMessage(reinitData)
            .then(response => {
                console.log("재초기화 응답:", response);
                if (response && response.success) {
                    onRecoverySuccess();
                } else {
                    console.warn("재초기화 응답이 성공이 아닙니다:", response);
                    scheduleNextRecoveryAttempt();
                }
            })
            .catch(error => {
                console.error("재초기화 요청 중 오류:", error);
                scheduleNextRecoveryAttempt();
            });
    } catch (error) {
        console.error("복구 시도 중 예외 발생:", error);
        scheduleNextRecoveryAttempt();
    }
}

// 다음 복구 시도 예약
function scheduleNextRecoveryAttempt(isLongDelay = false) {
    // 추가: 제한된 사이트에서는 더 긴 지연 시간 사용
    if (isLongDelay) {
        const longDelay = 30000; // 30초
        console.log(`제한된 사이트에서 ${longDelay/1000}초 후 다음 복구 시도 예정...`);
        reconnectTimer = setTimeout(tryRecoverContext, longDelay);
        return;
    }
    
    // 지수 백오프 적용 (최대 10초에서 15초로 변경)
    const delay = Math.min(Math.pow(1.5, recoveryAttempts) * 1000, 15000);
    console.log(`${Math.round(delay)}ms 후 다음 복구 시도 예정...`);
    reconnectTimer = setTimeout(tryRecoverContext, delay);
}

// 안전한 메시지 전송 함수 - 프로미스 반환
function safelyTrySendMessage(message) {
    return new Promise((resolve, reject) => {
        try {
            // chrome 객체가 없는 경우 또는 런타임이 없는 경우 오류
            if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.sendMessage) {
                reject(new Error("chrome.runtime.sendMessage API를 사용할 수 없습니다."));
                return;
            }
            
            // 타임아웃 설정 (2초)
            const timeoutId = setTimeout(() => {
                reject(new Error("메시지 전송 타임아웃"));
            }, 2000);
            
            // 메시지 전송 시도
            chrome.runtime.sendMessage(message, response => {
                // 타임아웃 취소
                clearTimeout(timeoutId);
                
                // 런타임 오류 확인
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                    return;
                }
                
                // 응답 확인
                resolve(response);
            });
        } catch (error) {
            reject(error);
        }
    });
}

// 복구 성공 처리 함수
function onRecoverySuccess() {
    console.log("컨텍스트 복구 성공!");
    contextInvalidated = false;
    recoveryAttempts = 0;
    
    // 알림 업데이트
    const notification = document.getElementById('bookstaxx-context-notification');
    if (notification) {
        notification.style.backgroundColor = "#4caf50"; // 녹색으로 변경
        notification.textContent = "BookStaxx 확장 프로그램 연결이 복구되었습니다.";
        
        // 3초 후 알림 제거
        setTimeout(removeContextNotification, 3000);
    }
    
    // 이벤트 리스너 재등록
    registerEventListeners();
    
    // 확장 프로그램 초기화 다시 실행
    if (!isInitialized) {
        initializeBookStaxx();
    }
}

// 복구 알림 상태 업데이트
function updateRecoveryNotification() {
    const notification = document.getElementById('bookstaxx-context-notification');
    if (notification) {
        notification.style.backgroundColor = "#ff9800"; // 주황색 
        notification.textContent = `BookStaxx 확장 프로그램 연결을 복구 중입니다... (시도 ${recoveryAttempts}/${MAX_RECOVERY_ATTEMPTS})`;
    } else {
        showContextInvalidatedNotification();
    }
}

// 스크립트 초기화 실행
initializeBookStaxx();