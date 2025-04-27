document.addEventListener('DOMContentLoaded', () => {
    const optionsButton = document.getElementById('options-button');
    const donateButton = document.getElementById('donate-button');
    const importButton = document.getElementById('import-button');
    const donateUrl = 'https://buymeacoffee.com/erinyan'; // Define donation URL

    if (optionsButton) {
        optionsButton.addEventListener('click', () => {
            // Open the extension's options page
            if (chrome.runtime.openOptionsPage) {
                chrome.runtime.openOptionsPage();
            } else {
                // Fallback for older versions or if the function is unavailable
                window.open(chrome.runtime.getURL('options.html'));
            }
        });
    }

    if (importButton) {
        importButton.addEventListener('click', () => {
            // 옵션 페이지를 열고 북마크 불러오기 섹션 표시 요청
            chrome.storage.local.set({ 'showImportSection': true }, () => {
                if (chrome.runtime.lastError) {
                    console.error("북마크 불러오기 상태 설정 오류:", chrome.runtime.lastError);
                } else {
                    console.log("북마크 불러오기 상태가 설정되었습니다.");
                    // 옵션 페이지 열기
                    if (chrome.runtime.openOptionsPage) {
                        chrome.runtime.openOptionsPage();
                    } else {
                        window.open(chrome.runtime.getURL('options.html'));
                    }
                }
            });
        });
    }

    if (donateButton) {
        donateButton.addEventListener('click', () => {
            // Open the donation link in a new tab
            chrome.tabs.create({ url: donateUrl });
        });
    }
}); 