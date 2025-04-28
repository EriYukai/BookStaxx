const optionsForm = document.getElementById('options-form');
const statusDiv = document.getElementById('status');

// Input elements
const bookmarkIconSizeSelect = document.getElementById('bookmarkIconSize');
const bookmarkFontSizeSelect = document.getElementById('bookmarkFontSize');
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
const defaultSettings = {
    bookmarkIconSize: 'md',      // 'sm', 'md', 'lg'
    bookmarkFontSize: 'sm',      // 'xs', 'sm', 'base'
    backButtonIcon: null,       // Base64 Data URL or null
    addButtonIcon: null,        // Base64 Data URL or null
    animationEnabled: true,
    mouseCursorIcon: null,      // Base64 Data URL or null
    // scrollButtonIcon: null, // Currently disabled
};

// --- Functions --- 

// Saves options to chrome.storage.sync
function saveOptions(event) {
    event.preventDefault();
    statusDiv.textContent = '저장 중...';

    const settingsToSaveSync = {
        bookmarkIconSize: bookmarkIconSizeSelect.value,
        bookmarkFontSize: bookmarkFontSizeSelect.value,
        animationEnabled: animationEnabledCheckbox.checked,
    };
    // Image data goes to local storage
    const settingsToSaveLocal = {};

    // Handle file inputs separately to read them as Data URLs
    const filePromises = [];

    // Prepare local settings with existing previews first
    if (backButtonPreview.src.startsWith('data:image')) {
        settingsToSaveLocal.backButtonIcon = backButtonPreview.src;
    }
    if (addButtonPreview.src.startsWith('data:image')) {
        settingsToSaveLocal.addButtonIcon = addButtonPreview.src;
    }
    if (mouseCursorPreview.src.startsWith('data:image')) {
        settingsToSaveLocal.mouseCursorIcon = mouseCursorPreview.src;
    }

    if (backButtonIconInput.files && backButtonIconInput.files[0]) {
        filePromises.push(readFileAsDataURL(backButtonIconInput.files[0]).then(dataUrl => {
            settingsToSaveLocal.backButtonIcon = dataUrl; // Save to local settings
            backButtonPreview.src = dataUrl;
            backButtonPreview.classList.remove('hidden');
        }));
    }
    if (addButtonIconInput.files && addButtonIconInput.files[0]) {
        filePromises.push(readFileAsDataURL(addButtonIconInput.files[0]).then(dataUrl => {
            settingsToSaveLocal.addButtonIcon = dataUrl; // Save to local settings
            addButtonPreview.src = dataUrl;
            addButtonPreview.classList.remove('hidden');
        }));
    }
    if (mouseCursorIconInput.files && mouseCursorIconInput.files[0]) {
         filePromises.push(readFileAsDataURL(mouseCursorIconInput.files[0]).then(dataUrl => {
            settingsToSaveLocal.mouseCursorIcon = dataUrl; // Save to local settings
             mouseCursorPreview.src = dataUrl; // Show image preview
            mouseCursorPreview.classList.remove('hidden');
        }));
    }

    Promise.all(filePromises).then(() => {
        let syncError = null;
        let localError = null;

        const syncPromise = new Promise(resolve => {
             chrome.storage.sync.set(settingsToSaveSync, () => {
                syncError = chrome.runtime.lastError;
                resolve();
            });
        });

        const localPromise = new Promise(resolve => {
            // Only save local if there's something to save
            if (Object.keys(settingsToSaveLocal).length > 0) {
                 chrome.storage.local.set(settingsToSaveLocal, () => {
                    localError = chrome.runtime.lastError;
                    resolve();
                });
            } else {
                resolve(); // Nothing to save locally
            }
        });

        Promise.all([syncPromise, localPromise]).then(() => {
             const combinedError = syncError || localError;
             if (combinedError) {
                 statusDiv.textContent = `저장 오류: ${combinedError.message}`;
                statusDiv.classList.remove('text-green-600', 'dark:text-green-400');
                statusDiv.classList.add('text-red-600', 'dark:text-red-400');
             } else {
                statusDiv.textContent = '옵션이 저장되었습니다.';
                statusDiv.classList.remove('text-red-600', 'dark:text-red-400');
                statusDiv.classList.add('text-green-600', 'dark:text-green-400');
                setTimeout(() => { statusDiv.textContent = ''; }, 2000);
             }
        });

    }).catch(error => {
         console.error("Error reading files:", error);
         statusDiv.textContent = '파일 읽기 오류.';
         statusDiv.classList.remove('text-green-600', 'dark:text-green-400');
         statusDiv.classList.add('text-red-600', 'dark:text-red-400');
    });
}

// Restores select box and checkbox state using the preferences stored in chrome.storage.
function restoreOptions() {
    // Get sync settings
    chrome.storage.sync.get(defaultSettings, (syncItems) => {
        if (chrome.runtime.lastError) {
            console.error("Error restoring sync options:", chrome.runtime.lastError.message);
            // Still try to load local settings
        } else {
            bookmarkIconSizeSelect.value = syncItems.bookmarkIconSize;
            bookmarkFontSizeSelect.value = syncItems.bookmarkFontSize;
            animationEnabledCheckbox.checked = syncItems.animationEnabled;
        }
    });

    // Get local settings (for images)
    const localKeys = ['backButtonIcon', 'addButtonIcon', 'mouseCursorIcon'];
    chrome.storage.local.get(localKeys, (localItems) => {
         if (chrome.runtime.lastError) {
            console.error("Error restoring local options:", chrome.runtime.lastError.message);
            return;
        }
        // Restore image previews if they exist
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
}

// Reads a file as a Base64 Data URL
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