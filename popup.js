// 문서가 로드되면 실행
document.addEventListener('DOMContentLoaded', function() {
  // 버튼 요소 가져오기
  const addBookmarkButton = document.getElementById('add-bookmark');
  const toggleBookmarkBarButton = document.getElementById('toggle-bookmark-bar');
  const openSettingsButton = document.getElementById('open-settings');
  
  // 현재 페이지 북마크 추가 버튼 클릭 이벤트
  addBookmarkButton.addEventListener('click', function() {
    // 현재 활성화된 탭 정보 가져오기
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      if (tabs && tabs.length > 0) {
        const currentTab = tabs[0];
        
        // 백그라운드 스크립트에 북마크 추가 메시지 전송
        chrome.runtime.sendMessage({
          action: 'addBookmark',
          url: currentTab.url,
          title: currentTab.title
        }, function(response) {
          if (response && response.success) {
            // 성공 메시지 표시
            showMessage('북마크가 추가되었습니다.');
            
            // 북마크 바 업데이트
            updateBookmarkBar(currentTab.id);
          } else {
            // 오류 메시지 표시
            showMessage('북마크 추가 중 오류가 발생했습니다: ' + (response ? response.error : '알 수 없는 오류'));
          }
        });
      }
    });
  });
  
  // 북마크 바 표시/숨기기 버튼 클릭 이벤트
  toggleBookmarkBarButton.addEventListener('click', function() {
    // 현재 활성화된 탭 정보 가져오기
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      if (tabs && tabs.length > 0) {
        const currentTab = tabs[0];
        
        // 북마크 바 표시 상태 토글 메시지 전송
        chrome.tabs.sendMessage(currentTab.id, { action: 'toggleBookmarkBar' }, function(response) {
          if (response && response.success) {
            // 성공 메시지 표시
            showMessage(response.visible ? '북마크 바가 표시되었습니다.' : '북마크 바가 숨겨졌습니다.');
          } else {
            // 북마크 바가 초기화되지 않은 경우 초기화
            chrome.runtime.sendMessage({
              action: 'initBookmarkBar',
              tabId: currentTab.id
            }, function(initResponse) {
              if (initResponse && initResponse.success) {
                showMessage('북마크 바가 초기화되었습니다.');
              } else {
                showMessage('북마크 바 초기화 중 오류가 발생했습니다.');
              }
            });
          }
        });
      }
    });
  });
  
  // 설정 버튼 클릭 이벤트
  openSettingsButton.addEventListener('click', function() {
    // 설정 페이지 열기
    chrome.runtime.openOptionsPage();
    // 팝업 닫기
    window.close();
  });
  
  // 메시지 표시 함수
  function showMessage(message) {
    // 이미 메시지 요소가 있으면 제거
    const existingMessage = document.querySelector('.message');
    if (existingMessage) {
      existingMessage.remove();
    }
    
    // 메시지 요소 생성
    const messageElement = document.createElement('div');
    messageElement.className = 'message';
    messageElement.textContent = message;
    messageElement.style.position = 'fixed';
    messageElement.style.bottom = '16px';
    messageElement.style.left = '50%';
    messageElement.style.transform = 'translateX(-50%)';
    messageElement.style.backgroundColor = '#2e5276';
    messageElement.style.color = 'white';
    messageElement.style.padding = '8px 16px';
    messageElement.style.borderRadius = '4px';
    messageElement.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.2)';
    messageElement.style.zIndex = '1000';
    messageElement.style.transition = 'opacity 0.3s ease-in-out';
    
    // 문서에 메시지 요소 추가
    document.body.appendChild(messageElement);
    
    // 3초 후 메시지 제거
    setTimeout(function() {
      messageElement.style.opacity = '0';
      setTimeout(function() {
        messageElement.remove();
      }, 300);
    }, 3000);
  }
  
  // 북마크 바 업데이트 함수
  function updateBookmarkBar(tabId) {
    chrome.tabs.sendMessage(tabId, { action: 'updateBookmarks' }, function(response) {
      // 응답 처리 (필요한 경우)
      console.log('북마크 바 업데이트 응답:', response);
    });
  }
}); 