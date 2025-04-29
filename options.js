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
}

// 폴더 목록 불러오기 함수 분리
function loadImportFolderList() {
    // Ask background for top-level folders
    chrome.runtime.sendMessage({ action: "getTopLevelFolders" }, (response) => {
        if (chrome.runtime.lastError) {
            console.error("폴더 로딩 오류:", chrome.runtime.lastError);
            importStatusDiv.textContent = '북마크 폴더 로딩 중 오류가 발생했습니다: ' + chrome.runtime.lastError.message;
            importStatusDiv.classList.add('text-red-600');
            // 오류가 있어도 섹션은 표시
            initialImportSection.classList.remove('hidden');
            return;
        }
        
        if (response && response.folders && response.folders.length > 0) {
            populateImportFolderList(response.folders);
            initialImportSection.classList.remove('hidden');
        } else {
            console.log("Could not get top-level folders for import or 폴더가 없습니다.");
            // 폴더가 없어도 섹션은 표시
            initialImportSection.classList.remove('hidden');
            // 오류 메시지 표시
            importStatusDiv.textContent = '북마크 폴더를 불러올 수 없거나 폴더가 없습니다.';
            importStatusDiv.classList.add('text-red-600');
        }
    });
}

// Populate the list of folders to import from
function populateImportFolderList(folders) {
    importFolderListDiv.innerHTML = ''; // Clear previous list
    
    if (folders.length === 0) {
        const noFolderMessage = document.createElement('p');
        noFolderMessage.textContent = '가져올 북마크 폴더가 없습니다.';
        noFolderMessage.className = 'text-sm text-gray-600 dark:text-gray-400';
        importFolderListDiv.appendChild(noFolderMessage);
        return;
    }

    let folderCount = 0;
    folders.forEach(folder => {
        // Skip BookStaxx itself - don't allow importing from there (we wouldn't need to)
        if (folder.title === 'BookStaxx') return;
        
        folderCount++;
        const label = document.createElement('label');
        label.className = 'flex items-center space-x-2';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.value = folder.id;
        checkbox.id = `folder-${folder.id}`;
        checkbox.className = 'form-checkbox h-4 w-4 text-bookmark-blue';
        
        const span = document.createElement('span');
        span.textContent = folder.title;
        span.className = 'text-sm text-gray-700 dark:text-gray-300';
        
        label.appendChild(checkbox);
        label.appendChild(span);
        importFolderListDiv.appendChild(label);
    });
    
    if (folderCount === 0) {
        const noFolderMessage = document.createElement('p');
        noFolderMessage.textContent = 'BookStaxx 폴더를 제외한 북마크 폴더가 없습니다.';
        noFolderMessage.className = 'text-sm text-gray-600 dark:text-gray-400';
        importFolderListDiv.appendChild(noFolderMessage);
    }
}

// Handle starting the import
function handleStartImport() {
    const selectedCheckboxes = importFolderListDiv.querySelectorAll('input[type="checkbox"]:checked');
    const folderIdsToImport = Array.from(selectedCheckboxes).map(cb => cb.value);

    if (folderIdsToImport.length === 0) {
        importStatusDiv.textContent = '가져올 폴더를 하나 이상 선택해주세요.';
        importStatusDiv.classList.add('text-red-600');
        return;
    }

    importStatusDiv.textContent = '북마크를 가져오는 중... 잠시 기다려주세요.';
    importStatusDiv.classList.remove('text-red-600');
    importStatusDiv.classList.add('text-yellow-600');
    startImportButton.disabled = true;
    skipImportButton.disabled = true;

    chrome.runtime.sendMessage({ action: "importInitialBookmarks", sourceFolderIds: folderIdsToImport },
        (response) => {
            startImportButton.disabled = false;
            skipImportButton.disabled = false;
            
            if (chrome.runtime.lastError) {
                console.error("북마크 가져오기 오류:", chrome.runtime.lastError);
                importStatusDiv.textContent = '북마크 가져오기 중 오류 발생: ' + chrome.runtime.lastError.message;
                importStatusDiv.classList.remove('text-yellow-600');
                importStatusDiv.classList.add('text-red-600');
                return;
            }
            
            if (response && response.success) {
                importStatusDiv.textContent = `북마크 ${response.count}개를 성공적으로 가져왔습니다.`;
                importStatusDiv.classList.remove('text-yellow-600', 'text-red-600');
                importStatusDiv.classList.add('text-green-600');
            } else {
                importStatusDiv.textContent = '북마크 가져오기 실패: ' + (response?.error || '알 수 없는 오류');
                importStatusDiv.classList.remove('text-yellow-600');
                importStatusDiv.classList.add('text-red-600');
            }
        });
}

// Handle skipping the import
function handleCloseImportSection() {
    // chrome.storage.local.set({ importDone: true }); // 이 줄 제거 - 더 이상 import 완료로 표시하지 않음
    
    // 상태 메시지 비우기
    importStatusDiv.textContent = '';
    importStatusDiv.classList.remove('text-red-600', 'text-yellow-600', 'text-green-600');
    
    // 버튼 상태 초기화
    startImportButton.disabled = false;
    skipImportButton.disabled = false;
    
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