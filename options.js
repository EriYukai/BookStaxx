const optionsForm = document.getElementById('options-form');
const statusDiv = document.getElementById('status');

// Input elements
const bookmarkIconSizeSelect = document.getElementById('bookmarkIconSize');
const bookmarkFontSizeSelect = document.getElementById('bookmarkFontSize');
const bookmarkLayoutModeSelect = document.getElementById('bookmarkLayoutMode');
const bookmarkAnimationModeSelect = document.getElementById('bookmarkAnimationMode');
const maxBookmarksInput = document.getElementById('maxBookmarks');
const backButtonIconInput = document.getElementById('backButtonIcon');
const addButtonIconInput = document.getElementById('addButtonIcon');
const animationEnabledCheckbox = document.getElementById('animationEnabled');
const mouseCursorIconInput = document.getElementById('mouseCursorIcon');
// const scrollButtonIconInput = document.getElementById('scrollButtonIcon'); // Currently disabled

// Preview elements
const backButtonPreview = document.getElementById('backButtonPreview');
const addButtonPreview = document.getElementById('addButtonPreview');
const mouseCursorPreview = document.getElementById('mouseCursorPreview');

// Import section elements
const initialImportSection = document.getElementById('initial-import-section');
const importFolderListDiv = document.getElementById('import-folder-list');
const startImportButton = document.getElementById('start-import-button');
const skipImportButton = document.getElementById('skip-import-button');
const importStatusDiv = document.getElementById('import-status');
// 북마크 불러오기 버튼 요소 추가
const showImportButton = document.getElementById('show-import-button');
// 추가된 요소들
const selectAllButton = document.getElementById('select-all-button');
const deselectAllButton = document.getElementById('deselect-all-button');
const selectedFoldersCount = document.getElementById('selected-folders-count');

// Default settings
const DEFAULT_SETTINGS = {
    bookmarkIconSize: '48',
    bookmarkFontSize: '14',
    maxBookmarks: 20,
    animationEnabled: true,
    bookmarkLayoutMode: 'circle',
    bookmarkAnimationMode: 'shoot',
    mouseCursorBase64: '',
    backButtonBase64: '',
    addButtonBase64: ''
};

// --- Functions --- 

// Saves options to chrome.storage.sync
function saveOptions(e) {
    e.preventDefault();
    
    // Handle file inputs (if any)
    handleFileInput(backButtonIconInput, 'backButtonIcon');
    handleFileInput(addButtonIconInput, 'addButtonIcon');
    handleFileInput(mouseCursorIconInput, 'mouseCursorIcon');
    
    // 아이콘 크기와 폰트 크기가 숫자로 저장되도록 수정
    const iconSize = bookmarkIconSizeSelect.value;
    const fontSize = bookmarkFontSizeSelect.value;
    
    // px 접미사를 제거하고 숫자만 저장
    const iconSizeValue = parseInt(iconSize, 10);
    const fontSizeValue = parseInt(fontSize, 10);
    
    console.log(`아이콘 크기: ${iconSizeValue}px, 폰트 크기: ${fontSizeValue}px`);
    
    // Save settings to chrome.storage.sync
    chrome.storage.sync.set({
        bookmarkIconSize: iconSize,
        bookmarkFontSize: fontSize,
        bookmarkLayoutMode: bookmarkLayoutModeSelect.value,
        bookmarkAnimationMode: bookmarkAnimationModeSelect.value,
        maxBookmarks: parseInt(maxBookmarksInput.value, 10),
        animationEnabled: animationEnabledCheckbox.checked,
        mouseCursorBase64: document.getElementById('mouseCursorPreview').src.startsWith('data:') 
            ? document.getElementById('mouseCursorPreview').src 
            : '',
        backButtonBase64: document.getElementById('backButtonPreview').src.startsWith('data:') 
            ? document.getElementById('backButtonPreview').src 
            : '',
        addButtonBase64: document.getElementById('addButtonPreview').src.startsWith('data:') 
            ? document.getElementById('addButtonPreview').src 
            : ''
    }, function() {
        // Update status to let user know options were saved.
        const status = document.getElementById('status');
        status.textContent = '옵션이 저장되었습니다!';
        setTimeout(function() {
            status.textContent = '';
        }, 2000);
    });
}

// Restore options from chrome.storage
function restoreOptions() {
    chrome.storage.sync.get(DEFAULT_SETTINGS, (items) => {
        document.getElementById('bookmarkIconSize').value = items.bookmarkIconSize;
        document.getElementById('bookmarkFontSize').value = items.bookmarkFontSize;
        document.getElementById('maxBookmarks').value = items.maxBookmarks;
        document.getElementById('animationEnabled').checked = items.animationEnabled;
        document.getElementById('bookmarkLayoutMode').value = items.bookmarkLayoutMode;
        document.getElementById('bookmarkAnimationMode').value = items.bookmarkAnimationMode;
        
        // Restore image previews if available
        chrome.storage.local.get(['backButtonIcon', 'addButtonIcon', 'mouseCursorIcon'], function(localItems) {
            if (localItems.backButtonIcon) {
                backButtonPreview.src = localItems.backButtonIcon;
                backButtonPreview.classList.remove('hidden');
            }
            if (localItems.addButtonIcon) {
                addButtonPreview.src = localItems.addButtonIcon;
                addButtonPreview.classList.remove('hidden');
            }
            if (localItems.mouseCursorIcon) {
                mouseCursorPreview.src = localItems.mouseCursorIcon;
                mouseCursorPreview.classList.remove('hidden');
            }
        });
    });
}

// 파일 입력 처리 함수 (누락된 함수 추가)
function handleFileInput(inputElement, storageKey) {
    if (!inputElement || !inputElement.files || inputElement.files.length === 0) {
        console.log(`${storageKey}: 선택된 파일 없음`);
        return;
    }
    
    console.log(`${storageKey} 파일 처리 중...`);
    const file = inputElement.files[0];
    
    // 파일을 Data URL로 읽기
    readFileAsDataURL(file)
        .then(dataUrl => {
            // 로컬 스토리지에 저장
            chrome.storage.local.set({ [storageKey]: dataUrl }, function() {
                if (chrome.runtime.lastError) {
                    console.error(`${storageKey} 저장 오류:`, chrome.runtime.lastError);
                } else {
                    console.log(`${storageKey} 저장 완료`);
                }
            });
            
            // 해당 미리보기 이미지에 설정
            const previewId = `${storageKey.replace('Icon', '')}Preview`;
            const previewElement = document.getElementById(previewId);
            if (previewElement) {
                previewElement.src = dataUrl;
                previewElement.classList.remove('hidden');
            }
        })
        .catch(error => {
            console.error(`${storageKey} 파일 읽기 오류:`, error);
        });
}

// 파일을 Base64 Data URL로 읽는 함수 (주석 제거)
function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(file);
    });
}

// Show preview when a file is selected
function handleFilePreview(inputElement, previewElement) {
    inputElement.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            readFileAsDataURL(file).then(dataUrl => {
                previewElement.src = dataUrl;
                previewElement.classList.remove('hidden');
            }).catch(error => {
                console.error("Error reading file for preview:", error);
                previewElement.classList.add('hidden');
            });
        } else {
             // If file selection is cancelled, potentially hide or reset preview
             // For now, keep the previous image or hide if it was empty
             if (!previewElement.src.startsWith('data:image')){
                 previewElement.classList.add('hidden');
             }
        }
    });
}

// --- Import Logic ---

// Check if initial import was already done or skipped
function checkShowInitialImport() {
    // 팝업에서 북마크 불러오기 요청을 확인
    chrome.storage.local.get(['importDone', 'showImportSection'], (result) => {
        console.log("Import state check:", result);
        
        // 팝업에서 불러오기 요청이 있으면 무조건 표시
        if (result.showImportSection) {
            // 요청 처리 후 플래그 초기화
            chrome.storage.local.remove('showImportSection', () => {
                console.log("Import section request processed and removed");
            });
            
            // 폴더 목록 불러오기
            loadImportFolderList();
            return;
        }
        
        // 항상 폴더 목록 불러오기 (importDone 체크 제거)
        loadImportFolderList();
    });
}

// 북마크 불러오기 버튼 이벤트 리스너
function setupImportButtonListener() {
    if (showImportButton) {
        showImportButton.addEventListener('click', () => {
            console.log("북마크 불러오기 버튼 클릭됨");
            loadImportFolderList();
        });
    }
    
    // 전체 선택 버튼
    if (selectAllButton) {
        selectAllButton.addEventListener('click', () => {
            const checkboxes = importFolderListDiv.querySelectorAll('input[type="checkbox"]');
            checkboxes.forEach(checkbox => {
                checkbox.checked = true;
            });
            updateSelectedFoldersCount();
        });
    }
    
    // 전체 해제 버튼
    if (deselectAllButton) {
        deselectAllButton.addEventListener('click', () => {
            const checkboxes = importFolderListDiv.querySelectorAll('input[type="checkbox"]');
            checkboxes.forEach(checkbox => {
                checkbox.checked = false;
            });
            updateSelectedFoldersCount();
        });
    }
}

// 선택된 폴더 개수 업데이트
function updateSelectedFoldersCount() {
    const selectedCheckboxes = importFolderListDiv.querySelectorAll('input[type="checkbox"]:checked');
    const count = selectedCheckboxes.length;
    
    // 선택된 폴더 개수 표시 업데이트
    selectedFoldersCount.innerHTML = `선택된 폴더: <span class="text-bookmark-blue dark:text-teal-300 font-medium">${count}</span>개`;
    
    // 선택된 폴더가 있는 경우 버튼 활성화
    startImportButton.disabled = count === 0;
    if (count === 0) {
        startImportButton.classList.add('opacity-50', 'cursor-not-allowed');
    } else {
        startImportButton.classList.remove('opacity-50', 'cursor-not-allowed');
    }
    
    // 체크된 항목 강조 표시
    const allFolderItems = importFolderListDiv.querySelectorAll('.folder-item');
    allFolderItems.forEach(item => {
        const checkbox = item.querySelector('input[type="checkbox"]');
        if (checkbox && checkbox.checked) {
            item.classList.add('bg-blue-50', 'dark:bg-blue-900/20', 'border-l-4', 'border-bookmark-blue', 'dark:border-teal-500');
        } else {
            item.classList.remove('bg-blue-50', 'dark:bg-blue-900/20', 'border-l-4', 'border-bookmark-blue', 'dark:border-teal-500');
        }
    });
}

// 폴더 목록 불러오기 함수
function loadImportFolderList() {
    // 상태 초기화
    resetImportStatus();
    
    // 북마크 섹션 표시
    initialImportSection.classList.remove('hidden');
    
    // 로딩 표시 - 이미 HTML에 추가되어 있음
    
    // 최상위 폴더 요청 전에 타임아웃 설정
    let timeoutId = setTimeout(() => {
        if (!initialImportSection.classList.contains('hidden')) {
            console.warn("북마크 폴더 로딩 타임아웃");
            showImportStatus('북마크 폴더 로딩 시간이 초과되었습니다. 확장 프로그램을 다시 시작해보세요.', 'error');
            
            importFolderListDiv.innerHTML = '<p class="py-3 text-center text-red-600 dark:text-red-400">폴더를 로드할 수 없습니다.</p>';
            selectedFoldersCount.textContent = '선택된 폴더: 0개';
        }
    }, 8000); // 8초 타임아웃
    
    try {
        // Ask background for top-level folders
        chrome.runtime.sendMessage({ action: "getTopLevelFolders" }, (response) => {
            // 타임아웃 취소
            clearTimeout(timeoutId);
            
            if (chrome.runtime.lastError) {
                console.error("폴더 로딩 오류:", chrome.runtime.lastError);
                showImportStatus('북마크 폴더 로딩 중 오류가 발생했습니다: ' + chrome.runtime.lastError.message, 'error');
                
                importFolderListDiv.innerHTML = '<p class="py-3 text-center text-red-600 dark:text-red-400">폴더를 로드할 수 없습니다.</p>';
                selectedFoldersCount.textContent = '선택된 폴더: 0개';
                return;
            }
            
            if (response && response.success && response.folders && response.folders.length > 0) {
                hideImportStatus(); // 상태 숨기기
                populateImportFolderList(response.folders);
                updateSelectedFoldersCount(); // 선택된 폴더 개수 초기화
            } else {
                console.log("최상위 폴더를 가져올 수 없거나 폴더가 없습니다.");
                showImportStatus('북마크 폴더를 불러올 수 없거나 폴더가 없습니다.', 'error');
                
                importFolderListDiv.innerHTML = '<p class="py-3 text-center text-red-600 dark:text-red-400">폴더를 로드할 수 없습니다.</p>';
                selectedFoldersCount.textContent = '선택된 폴더: 0개';
            }
        });
    } catch (error) {
        // 예외 처리
        clearTimeout(timeoutId);
        console.error("북마크 폴더 로딩 예외:", error);
        showImportStatus('북마크 폴더 로딩 중 예외가 발생했습니다: ' + error.message, 'error');
        
        importFolderListDiv.innerHTML = '<p class="py-3 text-center text-red-600 dark:text-red-400">폴더를 로드할 수 없습니다.</p>';
        selectedFoldersCount.textContent = '선택된 폴더: 0개';
    }
}

// Populate the list of folders to import from
function populateImportFolderList(folders) {
    console.log("북마크 폴더 목록 렌더링:", folders.length);
    importFolderListDiv.innerHTML = ''; // Clear previous list
    
    if (!folders || folders.length === 0) {
        const noFolderMessage = document.createElement('p');
        noFolderMessage.textContent = '가져올 북마크 폴더가 없습니다.';
        noFolderMessage.className = 'py-3 text-center text-gray-600 dark:text-gray-400';
        importFolderListDiv.appendChild(noFolderMessage);
        selectedFoldersCount.textContent = '선택된 폴더: 0개';
        return;
    }

    // 북마크 폴더 헤더 (설명) 추가
    const headerElement = document.createElement('div');
    headerElement.className = 'mb-3 pb-2 border-b border-gray-200 dark:border-gray-700';
    headerElement.innerHTML = `
        <p class="text-sm text-gray-600 dark:text-gray-400">아래 폴더에서 북마크를 가져옵니다. 폴더를 선택하면 해당 폴더의 모든 북마크가 BookStaxx로 가져와집니다.</p>
    `;
    importFolderListDiv.appendChild(headerElement);

    let folderCount = 0;
    folders.forEach(folder => {
        // BookStaxx 폴더는 건너뜀
        if (folder.title === 'BookStaxx') return;
        
        folderCount++;
        
        // 폴더 아이템 컨테이너
        const item = document.createElement('div');
        item.className = 'folder-item mb-2 p-2 hover:bg-gray-100 dark:hover:bg-gray-750 rounded-md transition-all duration-200';
        
        // 레벨에 따른 들여쓰기 추가
        const indentLevel = folder.level || 0;
        
        // 체크박스 레이블 컨테이너
        const label = document.createElement('label');
        label.className = 'flex items-center space-x-3 cursor-pointer';
        
        // 들여쓰기 추가 (레벨이 0보다 크면)
        if (indentLevel > 0) {
            const indentElement = document.createElement('div');
            indentElement.className = 'flex-shrink-0';
            indentElement.style.width = `${indentLevel * 16}px`;
            label.appendChild(indentElement);
        }
        
        // 체크박스
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.value = folder.id;
        checkbox.id = `folder-${folder.id}`;
        checkbox.className = 'form-checkbox h-5 w-5 text-bookmark-blue rounded transition-all';
        checkbox.dataset.folderId = folder.id;
        checkbox.dataset.folderTitle = folder.title;
        
        // 체크박스 변경 이벤트
        checkbox.addEventListener('change', updateSelectedFoldersCount);
        
        // 폴더 아이콘
        const iconSpan = document.createElement('span');
        iconSpan.className = 'text-gray-500 dark:text-gray-400 flex-shrink-0';
        
        // 북마크 바 또는 기타 북마크는 다른 아이콘 사용
        if (folder.id === '1') {
            // 북마크 바 아이콘
            iconSpan.innerHTML = `
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"></path>
                </svg>
            `;
        } else if (folder.id === '2') {
            // 기타 북마크 아이콘
            iconSpan.innerHTML = `
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2"></path>
                </svg>
            `;
        } else {
            // 일반 폴더 아이콘
            iconSpan.innerHTML = `
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"></path>
                </svg>
            `;
        }
        
        // 폴더 제목 컨테이너
        const textContainer = document.createElement('div');
        textContainer.className = 'flex flex-col flex-grow overflow-hidden';
        
        // 폴더 제목
        const textSpan = document.createElement('span');
        textSpan.textContent = folder.title;
        textSpan.className = 'text-sm text-gray-700 dark:text-gray-300 truncate';
        textContainer.appendChild(textSpan);
        
        // 폴더 경로 표시 (북마크 바와 기타 북마크 제외)
        if (folder.id !== '1' && folder.id !== '2' && folder.path) {
            const pathSpan = document.createElement('span');
            pathSpan.textContent = folder.level > 0 ? `${folder.level}단계 하위 폴더` : '';
            pathSpan.className = 'text-xs text-gray-500 dark:text-gray-500 truncate';
            textContainer.appendChild(pathSpan);
        }
        
        // 요소 조합
        label.appendChild(checkbox);
        label.appendChild(iconSpan);
        label.appendChild(textContainer);
        item.appendChild(label);
        importFolderListDiv.appendChild(item);
    });
    
    if (folderCount === 0) {
        const noFolderMessage = document.createElement('p');
        noFolderMessage.textContent = 'BookStaxx 폴더를 제외한 북마크 폴더가 없습니다.';
        noFolderMessage.className = 'py-3 text-center text-gray-600 dark:text-gray-400';
        importFolderListDiv.appendChild(noFolderMessage);
    }
    
    // 선택된 폴더 개수 업데이트
    selectedFoldersCount.innerHTML = `선택된 폴더: <span class="text-bookmark-blue dark:text-teal-300">0</span>개`;
}

// 가져오기 상태 표시 함수 
function showImportStatus(message, type = 'info') {
    importStatusDiv.textContent = message;
    importStatusDiv.classList.remove('hidden', 'bg-yellow-100', 'text-yellow-800', 'bg-red-100', 'text-red-800', 'bg-green-100', 'text-green-800');
    
    switch (type) {
        case 'error':
            importStatusDiv.classList.add('bg-red-100', 'text-red-800');
            break;
        case 'success':
            importStatusDiv.classList.add('bg-green-100', 'text-green-800');
            break;
        case 'warning':
        case 'info':
        default:
            importStatusDiv.classList.add('bg-yellow-100', 'text-yellow-800');
            break;
    }
}

// 가져오기 상태 숨기기
function hideImportStatus() {
    importStatusDiv.classList.add('hidden');
}

// 가져오기 상태 초기화
function resetImportStatus() {
    importStatusDiv.textContent = '';
    importStatusDiv.classList.add('hidden');
}

// Handle starting the import
function handleStartImport() {
    const selectedCheckboxes = importFolderListDiv.querySelectorAll('input[type="checkbox"]:checked');
    const folderIdsToImport = Array.from(selectedCheckboxes).map(cb => cb.value);

    if (folderIdsToImport.length === 0) {
        showImportStatus('가져올 폴더를 하나 이상 선택해주세요.', 'error');
        return;
    }

    showImportStatus('북마크를 가져오는 중... 잠시 기다려주세요.', 'info');
    
    // 버튼 비활성화 및 로딩 상태 표시
    startImportButton.disabled = true;
    skipImportButton.disabled = true;
    startImportButton.classList.add('opacity-50', 'cursor-not-allowed');
    skipImportButton.classList.add('opacity-50', 'cursor-not-allowed');
    
    // 로딩 아이콘 추가
    const originalButtonContent = startImportButton.innerHTML;
    startImportButton.innerHTML = `
        <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        가져오는 중...
    `;

    chrome.runtime.sendMessage({ action: "importInitialBookmarks", sourceFolderIds: folderIdsToImport },
        (response) => {
            // 버튼 상태 복원
            startImportButton.disabled = false;
            skipImportButton.disabled = false;
            startImportButton.classList.remove('opacity-50', 'cursor-not-allowed');
            skipImportButton.classList.remove('opacity-50', 'cursor-not-allowed');
            startImportButton.innerHTML = originalButtonContent;
            
            if (chrome.runtime.lastError) {
                console.error("북마크 가져오기 오류:", chrome.runtime.lastError);
                showImportStatus('북마크 가져오기 중 오류 발생: ' + chrome.runtime.lastError.message, 'error');
                return;
            }
            
            if (response && response.success) {
                // 성공 메시지 표시
                showImportStatus(`북마크 ${response.count}개를 성공적으로 가져왔습니다.`, 'success');
                
                // 체크박스 모두 해제
                const checkboxes = importFolderListDiv.querySelectorAll('input[type="checkbox"]:checked');
                checkboxes.forEach(checkbox => {
                    checkbox.checked = false;
                });
                updateSelectedFoldersCount();
            } else {
                showImportStatus('북마크 가져오기 실패: ' + (response?.error || '알 수 없는 오류'), 'error');
            }
        });
}

// Handle skipping the import
function handleCloseImportSection() {
    // 북마크 불러오기 섹션 숨기기
    initialImportSection.classList.add('hidden');
    
    // 상태 초기화
    resetImportStatus();
    
    // 버튼 상태 초기화
    startImportButton.disabled = false;
    skipImportButton.disabled = false;
    startImportButton.classList.remove('opacity-50', 'cursor-not-allowed');
    skipImportButton.classList.remove('opacity-50', 'cursor-not-allowed');
    
    console.log("Import section closed by user.");
}

// --- Event Listeners --- 
document.addEventListener('DOMContentLoaded', () => {
    optionsForm.addEventListener('submit', saveOptions);
    setupImportButtonListener(); // 북마크 불러오기 버튼 리스너 설정
    startImportButton.addEventListener('click', handleStartImport);
    skipImportButton.addEventListener('click', handleCloseImportSection);
    
    const donateLink = document.getElementById('donate-link');
    if (donateLink) {
        donateLink.addEventListener('click', (e) => {
            e.preventDefault();
            chrome.tabs.create({ url: 'https://buymeacoffee.com/erinyan' });
        });
    }
    // 파일 입력 필드 미리보기 핸들러 설정
    handleFilePreview(backButtonIconInput, backButtonPreview);
    handleFilePreview(addButtonIconInput, addButtonPreview);
    handleFilePreview(mouseCursorIconInput, mouseCursorPreview);
    
    restoreOptions();
    checkShowInitialImport();
}); 