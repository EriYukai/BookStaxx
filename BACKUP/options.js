// 옵션 페이지 초기화
document.addEventListener('DOMContentLoaded', function() {
  console.log('옵션 페이지 초기화 시작');
  
  // 기본 설정
  const defaultSettings = {
    bookmarkBar: {
      show: true,
      position: 'top',
      height: '40px',
      backgroundColor: '#ffffff',
      textColor: '#333333'
    },
    bookmarkButton: {
      show: true,
      position: 'bottomRight',
      size: '40px',
      backgroundColor: '#0077ED',
      textColor: '#ffffff',
      customImage: null
    }
  };
  
  // 요소 참조
  const elements = {
    // 북마크 버튼 설정 요소
    bookmarkButtonShow: document.getElementById('bookmarkButtonShow'),
    bookmarkButtonPosition: document.getElementById('bookmarkButtonPosition'),
    bookmarkButtonSize: document.getElementById('bookmarkButtonSize'),
    bookmarkButtonCustomSize: document.getElementById('bookmarkButtonCustomSize'),
    bookmarkButtonColor: document.getElementById('bookmarkButtonColor'),
    bookmarkButtonColorPicker: document.getElementById('bookmarkButtonColorPicker'),
    bookmarkButtonColorPreview: document.getElementById('bookmarkButtonColorPreview'),
    bookmarkButtonTextColor: document.getElementById('bookmarkButtonTextColor'),
    bookmarkButtonTextColorPicker: document.getElementById('bookmarkButtonTextColorPicker'),
    bookmarkButtonTextColorPreview: document.getElementById('bookmarkButtonTextColorPreview'),
    bookmarkButtonCustomImage: document.getElementById('bookmarkButtonCustomImage'),
    
    // 북마크 바 설정 요소
    bookmarkBarShow: document.getElementById('bookmarkBarShow'),
    bookmarkBarPosition: document.getElementById('bookmarkBarPosition'),
    bookmarkBarHeight: document.getElementById('bookmarkBarHeight'),
    bookmarkBarAnimation: document.getElementById('bookmarkBarAnimation'),
    bookmarkBarShape: document.getElementById('bookmarkBarShape'),
    bookmarkBarBackgroundColor: document.getElementById('bookmarkBarBackgroundColor'),
    bookmarkBarBackgroundColorPicker: document.getElementById('bookmarkBarBackgroundColorPicker'),
    bookmarkBarBackgroundColorPreview: document.getElementById('bookmarkBarBackgroundColorPreview'),
    bookmarkBarTextColor: document.getElementById('bookmarkBarTextColor'),
    bookmarkBarTextColorPicker: document.getElementById('bookmarkBarTextColorPicker'),
    bookmarkBarTextColorPreview: document.getElementById('bookmarkBarTextColorPreview'),
    
    // 버튼 요소
    saveButton: document.getElementById('saveButton'),
    resetButton: document.getElementById('resetButton'),
    importChromeBookmarks: document.getElementById('importChromeBookmarks'),
    
    // 미리보기 요소
    previewContainer: document.getElementById('previewContainer'),
    previewBookmarkBar: document.getElementById('previewBookmarkBar'),
    
    // 북마크바 유지 설정 요소
    persistBookmarkBar: document.getElementById('persistBookmarkBar'),
    
    // 크롬 UI 스타일 요소
    useChromeStyle: document.getElementById('useChromeStyle'),
    
    // 북마크 텍스트 표시 관련 요소
    showBookmarkText: document.getElementById('showBookmarkText'),
    bookmarkTextMaxLength: document.getElementById('bookmarkTextMaxLength'),
  };
  
  // 요소가 존재하는지 확인
  function checkRequiredElements() {
    console.log('필수 요소 확인 시작');
    
    const missingElements = [];
    for (const [key, element] of Object.entries(elements)) {
      if (!element) {
        missingElements.push(key);
        console.log(`${key} 요소를 찾을 수 없습니다`);
      }
    }
    
    if (missingElements.length > 0) {
      console.error(`필수 요소 ${missingElements.length}개가 누락되었습니다:`, missingElements.join(', '));
      return false;
    }
    
    console.log('모든 필수 요소가 존재합니다');
    return true;
  }
  
  // 설정 로드
  function loadSettings() {
    console.log('설정 로드 시작');
    
    chrome.storage.sync.get(defaultSettings, function(settings) {
      console.log('로드된 설정:', settings);
      
      // 북마크 버튼 설정
      if (elements.bookmarkButtonShow) {
        elements.bookmarkButtonShow.checked = settings.bookmarkButton.show;
      }
      
      if (elements.bookmarkButtonPosition) {
        elements.bookmarkButtonPosition.value = settings.bookmarkButton.position || 'bottomRight';
      }
      
      if (elements.bookmarkButtonSize) {
        elements.bookmarkButtonSize.value = settings.bookmarkButton.size || '40px';
      }
      
      if (elements.bookmarkButtonCustomSize) {
        // 사이즈에서 px 제거하고 숫자만 추출
        const sizeValue = parseInt(settings.bookmarkButton.size);
        if (!isNaN(sizeValue)) {
          elements.bookmarkButtonCustomSize.value = sizeValue;
        }
      }
      
      if (elements.bookmarkButtonColor) {
        elements.bookmarkButtonColor.value = settings.bookmarkButton.backgroundColor || '#0077ED';
      }
      
      if (elements.bookmarkButtonColorPicker) {
        elements.bookmarkButtonColorPicker.value = settings.bookmarkButton.backgroundColor || '#0077ED';
      }
      
      if (elements.bookmarkButtonColorPreview) {
        elements.bookmarkButtonColorPreview.style.backgroundColor = settings.bookmarkButton.backgroundColor || '#0077ED';
      }
      
      if (elements.bookmarkButtonTextColor) {
        elements.bookmarkButtonTextColor.value = settings.bookmarkButton.textColor || '#FFFFFF';
      }
      
      if (elements.bookmarkButtonTextColorPicker) {
        elements.bookmarkButtonTextColorPicker.value = settings.bookmarkButton.textColor || '#FFFFFF';
      }
      
      if (elements.bookmarkButtonTextColorPreview) {
        elements.bookmarkButtonTextColorPreview.style.backgroundColor = settings.bookmarkButton.textColor || '#FFFFFF';
      }
      
      if (elements.bookmarkButtonCustomImage) {
        elements.bookmarkButtonCustomImage.value = settings.bookmarkButton.customImage || '';
      }
      
      // 북마크 바 설정
      if (elements.bookmarkBarShow) {
        elements.bookmarkBarShow.checked = settings.bookmarkBar.show !== false;
      }
      
      if (elements.bookmarkBarPosition) {
        elements.bookmarkBarPosition.value = settings.bookmarkBar.position || 'top';
      }
      
      if (elements.bookmarkBarHeight) {
        elements.bookmarkBarHeight.value = settings.bookmarkBar.height || '40px';
      }
      
      if (elements.bookmarkBarAnimation) {
        elements.bookmarkBarAnimation.value = settings.bookmarkBar.animation || 'fade';
      }
      
      if (elements.bookmarkBarShape) {
        elements.bookmarkBarShape.value = settings.bookmarkBar.shape || 'standard';
      }
      
      if (elements.bookmarkBarBackgroundColor) {
        elements.bookmarkBarBackgroundColor.value = settings.bookmarkBar.backgroundColor || '#FFFFFF';
      }
      
      if (elements.bookmarkBarBackgroundColorPicker) {
        elements.bookmarkBarBackgroundColorPicker.value = settings.bookmarkBar.backgroundColor || '#FFFFFF';
      }
      
      if (elements.bookmarkBarBackgroundColorPreview) {
        elements.bookmarkBarBackgroundColorPreview.style.backgroundColor = settings.bookmarkBar.backgroundColor || '#FFFFFF';
      }
      
      if (elements.bookmarkBarTextColor) {
        elements.bookmarkBarTextColor.value = settings.bookmarkBar.textColor || '#333333';
      }
      
      if (elements.bookmarkBarTextColorPicker) {
        elements.bookmarkBarTextColorPicker.value = settings.bookmarkBar.textColor || '#333333';
      }
      
      if (elements.bookmarkBarTextColorPreview) {
        elements.bookmarkBarTextColorPreview.style.backgroundColor = settings.bookmarkBar.textColor || '#333333';
      }
      
      // 크롬 UI 스타일 설정 로드
      if (settings.bookmarkBar && settings.bookmarkBar.useChromeStyle !== undefined) {
        elements.useChromeStyle.checked = settings.bookmarkBar.useChromeStyle;
      } else {
        elements.useChromeStyle.checked = true; // 기본값은 true
      }
      
      // 북마크 텍스트 표시 설정 로드
      if (settings.bookmarkBar && settings.bookmarkBar.showText !== undefined) {
        elements.showBookmarkText.checked = settings.bookmarkBar.showText;
      } else {
        elements.showBookmarkText.checked = true; // 기본값은 true
      }
      
      // 북마크 텍스트 길이 제한 설정 로드
      if (settings.bookmarkBar && settings.bookmarkBar.textMaxLength !== undefined) {
        elements.bookmarkTextMaxLength.value = settings.bookmarkBar.textMaxLength;
      } else {
        elements.bookmarkTextMaxLength.value = '0'; // 기본값은 제한 없음
      }
      
      // 미리보기 업데이트
      updatePreview();
      
      console.log('설정 로드 및 적용 완료');
    });
  }
  
  // 설정 저장
  function saveSettings() {
    console.log('설정 저장 시작');
    
    if (!elements.bookmarkButtonShow) {
      console.error('필수 요소가 없어 설정을 저장할 수 없습니다');
      return;
    }
    
    // 북마크 버튼 설정
    const buttonSettings = {
      show: elements.bookmarkButtonShow.checked,
      position: elements.bookmarkButtonPosition.value,
      size: elements.bookmarkButtonSize.value || '40px',
      backgroundColor: elements.bookmarkButtonColor.value || '#0077ED',
      textColor: elements.bookmarkButtonTextColor.value || '#FFFFFF',
      customImage: elements.bookmarkButtonCustomImage.value || null
    };
    
    // 북마크 바 설정
    const barSettings = {
      show: elements.bookmarkBarShow.checked,
      position: elements.bookmarkBarPosition.value,
      height: elements.bookmarkBarHeight.value || '40px',
      animation: elements.bookmarkBarAnimation ? elements.bookmarkBarAnimation.value : 'fade',
      shape: elements.bookmarkBarShape ? elements.bookmarkBarShape.value : 'standard',
      backgroundColor: elements.bookmarkBarBackgroundColor.value || '#FFFFFF',
      textColor: elements.bookmarkBarTextColor.value || '#333333',
      useChromeStyle: elements.useChromeStyle.checked,
      showText: elements.showBookmarkText.checked,
      textMaxLength: parseInt(elements.bookmarkTextMaxLength.value) || 0,
    };
    
    // 설정 객체
    const settings = {
      bookmarkBar: barSettings,
      bookmarkButton: buttonSettings
    };
    
    console.log('저장할 설정:', settings);
    
    // 설정 저장
    chrome.storage.sync.set(settings, function() {
      console.log('설정 저장 완료');
      
      // 모든 탭에 설정 업데이트 알림
      chrome.tabs.query({}, function(tabs) {
        tabs.forEach(function(tab) {
          try {
            chrome.tabs.sendMessage(
              tab.id, 
              { action: 'settingsUpdated', settings: settings },
              function(response) {
                if (chrome.runtime.lastError) {
                  console.log('탭에 메시지 전송 실패:', chrome.runtime.lastError);
                } else if (response) {
                  console.log('탭에 설정 업데이트 메시지 전송 완료:', tab.id, response);
                }
              }
            );
          } catch (e) {
            console.error('탭에 메시지 전송 실패:', e);
          }
        });
      });
      
      // 저장 완료 표시
      showSaveSuccess();
      
      // 미리보기 업데이트
      updatePreview();
    });
  }
  
  // 저장 성공 표시
  function showSaveSuccess() {
    if (!elements.saveButton) return;
    
    const originalText = elements.saveButton.textContent;
    elements.saveButton.textContent = '저장됨!';
    elements.saveButton.classList.add('save-success');
    
    setTimeout(function() {
      elements.saveButton.textContent = originalText;
      elements.saveButton.classList.remove('save-success');
    }, 2000);
  }
  
  // 미리보기 업데이트
  function updatePreview() {
    console.log('미리보기 업데이트 시작');
    
    if (!elements.previewContainer || !elements.previewBookmarkBar) {
      console.error('미리보기 요소가 없어 업데이트할 수 없습니다');
      return;
    }
    
    const container = elements.previewContainer;
    const barPreview = elements.previewBookmarkBar;
    
    // 북마크 바 표시 여부
    if (elements.bookmarkBarShow && !elements.bookmarkBarShow.checked) {
      barPreview.style.display = 'none';
    } else {
      barPreview.style.display = 'flex';
    }
    
    // 북마크 바 위치
    if (elements.bookmarkBarPosition && elements.bookmarkBarPosition.value) {
      const position = elements.bookmarkBarPosition.value;
      
      // 기본 스타일 초기화
      barPreview.style.position = 'absolute';
      barPreview.style.flexDirection = 'row';
      barPreview.style.width = '';
      barPreview.style.height = '';
      container.style.justifyContent = 'center';
      container.style.alignItems = 'center';
      
      // 위치에 따른 스타일 적용
      switch (position) {
        case 'top':
          barPreview.style.top = '0';
          barPreview.style.left = '0';
          barPreview.style.right = '0';
          barPreview.style.bottom = '';
          barPreview.style.width = '100%';
          barPreview.style.height = elements.bookmarkBarHeight ? elements.bookmarkBarHeight.value : '40px';
          break;
          
        case 'right':
          barPreview.style.top = '0';
          barPreview.style.right = '0';
          barPreview.style.bottom = '0';
          barPreview.style.left = '';
          barPreview.style.width = elements.bookmarkBarHeight ? elements.bookmarkBarHeight.value : '40px';
          barPreview.style.height = '100%';
          barPreview.style.flexDirection = 'column';
          break;
          
        case 'bottom':
          barPreview.style.bottom = '0';
          barPreview.style.left = '0';
          barPreview.style.right = '0';
          barPreview.style.top = '';
          barPreview.style.width = '100%';
          barPreview.style.height = elements.bookmarkBarHeight ? elements.bookmarkBarHeight.value : '40px';
          break;
          
        case 'left':
          barPreview.style.top = '0';
          barPreview.style.left = '0';
          barPreview.style.bottom = '0';
          barPreview.style.right = '';
          barPreview.style.width = elements.bookmarkBarHeight ? elements.bookmarkBarHeight.value : '40px';
          barPreview.style.height = '100%';
          barPreview.style.flexDirection = 'column';
          break;
          
        case 'topRight':
          barPreview.style.top = '0';
          barPreview.style.right = '0';
          barPreview.style.bottom = '';
          barPreview.style.left = '';
          barPreview.style.width = '50%';
          barPreview.style.height = elements.bookmarkBarHeight ? elements.bookmarkBarHeight.value : '40px';
          break;
          
        case 'topLeft':
          barPreview.style.top = '0';
          barPreview.style.left = '0';
          barPreview.style.bottom = '';
          barPreview.style.right = '';
          barPreview.style.width = '50%';
          barPreview.style.height = elements.bookmarkBarHeight ? elements.bookmarkBarHeight.value : '40px';
          break;
          
        case 'bottomRight':
          barPreview.style.bottom = '0';
          barPreview.style.right = '0';
          barPreview.style.top = '';
          barPreview.style.left = '';
          barPreview.style.width = '50%';
          barPreview.style.height = elements.bookmarkBarHeight ? elements.bookmarkBarHeight.value : '40px';
          break;
          
        case 'bottomLeft':
          barPreview.style.bottom = '0';
          barPreview.style.left = '0';
          barPreview.style.top = '';
          barPreview.style.right = '';
          barPreview.style.width = '50%';
          barPreview.style.height = elements.bookmarkBarHeight ? elements.bookmarkBarHeight.value : '40px';
          break;
      }
    }
    
    // 북마크 바 배경색
    if (elements.bookmarkBarBackgroundColor) {
      barPreview.style.backgroundColor = elements.bookmarkBarBackgroundColor.value;
    }
    
    // 북마크 바 텍스트 색상
    const bookmarkItems = barPreview.querySelectorAll('.preview-bookmark-item');
    const textColor = elements.bookmarkBarTextColor ? elements.bookmarkBarTextColor.value : '#333333';
    
    bookmarkItems.forEach(item => {
      const text = item.querySelector('.preview-bookmark-text');
      if (text) {
        text.style.color = textColor;
      }
      
      // 호버 효과
      item.onmouseenter = function() {
        this.style.backgroundColor = 'rgba(0, 0, 0, 0.08)';
      };
      
      item.onmouseleave = function() {
        this.style.backgroundColor = 'transparent';
      };
    });
    
    // 북마크 버튼 미리보기
    let buttonPreview = elements.previewContainer.querySelector('.preview-bookmark-button');
    
    // 없으면 생성
    if (!buttonPreview) {
      buttonPreview = document.createElement('div');
      buttonPreview.className = 'preview-bookmark-button';
      elements.previewContainer.appendChild(buttonPreview);
    }
    
    // 버튼 표시 여부
    buttonPreview.style.display = elements.bookmarkButtonShow && elements.bookmarkButtonShow.checked ? 'flex' : 'none';
    
    // 버튼 스타일
    buttonPreview.style.position = 'absolute';
    buttonPreview.style.width = elements.bookmarkButtonSize ? elements.bookmarkButtonSize.value : '40px';
    buttonPreview.style.height = elements.bookmarkButtonSize ? elements.bookmarkButtonSize.value : '40px';
    buttonPreview.style.backgroundColor = elements.bookmarkButtonColor ? elements.bookmarkButtonColor.value : '#0077ED';
    buttonPreview.style.color = elements.bookmarkButtonTextColor ? elements.bookmarkButtonTextColor.value : '#FFFFFF';
    buttonPreview.style.borderRadius = '50%';
    buttonPreview.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.2)';
    buttonPreview.style.display = 'flex';
    buttonPreview.style.alignItems = 'center';
    buttonPreview.style.justifyContent = 'center';
    buttonPreview.style.fontSize = '20px';
    buttonPreview.style.fontWeight = 'bold';
    buttonPreview.style.cursor = 'pointer';
    buttonPreview.innerHTML = '<span>+</span>';
    buttonPreview.style.transition = 'all 0.2s cubic-bezier(0.25, 1, 0.5, 1)';
    
    // 버튼 위치
    const position = elements.bookmarkButtonPosition ? elements.bookmarkButtonPosition.value : 'bottomRight';
    
    if (position.includes('top')) {
      buttonPreview.style.top = '20px';
    } else {
      buttonPreview.style.bottom = '20px';
    }
    
    if (position.includes('Right')) {
      buttonPreview.style.right = '20px';
    } else {
      buttonPreview.style.left = '20px';
    }
    
    // 버튼 호버 효과
    buttonPreview.onmouseenter = function() {
      this.style.transform = 'scale(1.05)';
    };
    
    buttonPreview.onmouseleave = function() {
      this.style.transform = 'scale(1)';
    };
    
    buttonPreview.onmousedown = function() {
      this.style.transform = 'scale(0.95)';
    };
    
    buttonPreview.onmouseup = function() {
      this.style.transform = 'scale(1)';
    };
    
    // 크롬 UI 스타일 적용
    if (elements.useChromeStyle.checked) {
      // 다크 모드 감지
      const isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      
      // 크롬 북마크바 스타일 (라이트/다크 모드에 따라 다름)
      const chromeBackgroundColor = isDarkMode ? 'rgba(40, 42, 54, 0.95)' : 'rgba(240, 243, 244, 0.95)';
      const chromeTextColor = isDarkMode ? '#e8eaed' : '#202124';
      const chromeBorderColor = isDarkMode ? 'rgba(60, 64, 67, 0.3)' : 'rgba(218, 220, 224, 0.5)';
      
      // 미리보기에 크롬 스타일 적용
      barPreview.style.backgroundColor = chromeBackgroundColor;
      barPreview.style.color = chromeTextColor;
      barPreview.style.borderBottom = `1px solid ${chromeBorderColor}`;
      barPreview.style.boxShadow = 'none';
      barPreview.style.height = '28px';
      barPreview.style.padding = '0 4px';
      barPreview.style.fontSize = '12px';
      
      // 미리보기 북마크 아이템 스타일 설정
      const previewItems = barPreview.querySelectorAll('.preview-bookmark-item');
      previewItems.forEach(item => {
        item.style.padding = '0 8px';
        item.style.margin = '0 1px';
        item.style.height = '24px';
        item.style.borderRadius = '2px';
        item.style.color = chromeTextColor;
      });
    } else {
      // 기존 커스텀 스타일 적용
      // ... existing code ...
    }
    
    // 북마크 텍스트 표시 설정 적용
    const previewItems = elements.previewBookmarkBar.querySelectorAll('.preview-bookmark-item');
    previewItems.forEach(item => {
      const textElement = item.querySelector('.preview-bookmark-text');
      if (textElement) {
        // 텍스트 표시 여부
        textElement.style.display = elements.showBookmarkText.checked ? 'block' : 'none';
        
        // 텍스트 길이 제한
        const maxLength = parseInt(elements.bookmarkTextMaxLength.value) || 0;
        if (maxLength > 0) {
          const originalText = textElement.getAttribute('data-original-text') || textElement.textContent;
          if (!textElement.getAttribute('data-original-text')) {
            textElement.setAttribute('data-original-text', originalText);
          }
          
          if (originalText.length > maxLength) {
            textElement.textContent = originalText.substring(0, maxLength) + '...';
          } else {
            textElement.textContent = originalText;
          }
        } else if (textElement.getAttribute('data-original-text')) {
          // 제한이 없는 경우 원래 텍스트로 복원
          textElement.textContent = textElement.getAttribute('data-original-text');
        }
      }
    });
  }
  
  // 설정 초기화
  function resetSettings() {
    console.log('설정 초기화 시작');
    
    chrome.storage.sync.set(defaultSettings, function() {
      console.log('설정 초기화 완료');
      
      // 설정 다시 로드
      loadSettings();
      
      // 초기화 완료 표시
      if (elements.resetButton) {
        const originalText = elements.resetButton.textContent;
        elements.resetButton.textContent = '초기화 완료!';
        
        setTimeout(function() {
          elements.resetButton.textContent = originalText;
        }, 2000);
      }
    });
  }
  
  // 북마크바 유지 설정 로드
  function loadPersistBookmarkBarSetting() {
    chrome.storage.sync.get(['persistBookmarkBar'], function(result) {
      const persistBookmarkBar = result.persistBookmarkBar !== undefined ? result.persistBookmarkBar : true;
      document.getElementById('persistBookmarkBar').checked = persistBookmarkBar;
    });
  }

  // 북마크바 유지 설정 저장
  function savePersistBookmarkBarSetting() {
    const persistBookmarkBar = document.getElementById('persistBookmarkBar').checked;
    chrome.storage.sync.set({ persistBookmarkBar: persistBookmarkBar }, function() {
      console.log('북마크바 유지 설정이 저장되었습니다:', persistBookmarkBar);
      
      // 모든 탭에 설정 변경 알림
      chrome.tabs.query({}, function(tabs) {
        tabs.forEach(function(tab) {
          chrome.tabs.sendMessage(tab.id, { 
            action: 'settingsUpdated',
            settings: { persistBookmarkBar: persistBookmarkBar }
          }).catch(() => {
            // 오류 무시 (일부 탭에서는 메시지를 받을 수 없음)
          });
        });
      });
    });
  }
  
  // 이벤트 리스너 설정
  function setupEventListeners() {
    console.log('이벤트 리스너 설정 시작');
    
    // 저장 버튼 클릭 이벤트
    if (elements.saveButton) {
      elements.saveButton.addEventListener('click', saveSettings);
    }
    
    // 초기화 버튼 클릭 이벤트
    if (elements.resetButton) {
      elements.resetButton.addEventListener('click', resetSettings);
    }
    
    // 크롬 북마크 가져오기 버튼 클릭 이벤트
    if (elements.importChromeBookmarks) {
      elements.importChromeBookmarks.addEventListener('click', importChromeBookmarks);
    }
    
    // 북마크 바 유지 설정 변경 이벤트
    if (elements.persistBookmarkBar) {
      elements.persistBookmarkBar.addEventListener('change', savePersistBookmarkBarSetting);
    }
    
    // 위치 선택 버튼 이벤트 리스너
    setupPositionButtons();
    
    // 색상 선택기 이벤트
    setupColorPickers();
    
    console.log('이벤트 리스너 설정 완료');
  }
  
  // 위치 선택 버튼 설정
  function setupPositionButtons() {
    const positionButtons = document.querySelectorAll('.position-button');
    if (!positionButtons.length) return;
    
    // 현재 선택된 위치에 active 클래스 추가
    const currentPosition = elements.bookmarkBarPosition.value;
    positionButtons.forEach(button => {
      if (button.dataset.position === currentPosition) {
        button.classList.add('active');
      }
      
      // 클릭 이벤트 추가
      button.addEventListener('click', function() {
        // 모든 버튼에서 active 클래스 제거
        positionButtons.forEach(btn => btn.classList.remove('active'));
        
        // 클릭한 버튼에 active 클래스 추가
        this.classList.add('active');
        
        // 선택한 위치를 드롭다운에 반영
        elements.bookmarkBarPosition.value = this.dataset.position;
        
        // 미리보기 업데이트
        updatePreview();
      });
    });
  }
  
  // 크롬 북마크 불러오기 함수
  function importChromeBookmarks() {
    console.log('크롬 북마크 불러오기 시작');
    
    // 버튼 상태 변경
    if (elements.importChromeBookmarks) {
      elements.importChromeBookmarks.textContent = '불러오는 중...';
      elements.importChromeBookmarks.disabled = true;
    }
    
    // 북마크 가져오기
    chrome.bookmarks.getTree(function(bookmarkTreeNodes) {
      // 북마크 바 폴더 찾기 (일반적으로 첫 번째 노드의 첫 번째 자식)
      const bookmarkBarNode = bookmarkTreeNodes[0].children[0];
      
      if (bookmarkBarNode) {
        console.log('북마크 바 폴더 찾음:', bookmarkBarNode.title);
        
        // 북마크 바 내의 북마크 추출
        const bookmarks = extractBookmarks(bookmarkBarNode);
        console.log('추출된 북마크:', bookmarks.length + '개');
        
        // 백그라운드 스크립트에 북마크 저장 요청
        chrome.runtime.sendMessage(
          { 
            action: 'importBookmarks', 
            bookmarks: bookmarks 
          }, 
          function(response) {
            console.log('북마크 가져오기 응답:', response);
            
            // 버튼 상태 복원
            if (elements.importChromeBookmarks) {
              if (response && response.success) {
                elements.importChromeBookmarks.textContent = '가져오기 완료!';
                setTimeout(() => {
                  elements.importChromeBookmarks.textContent = '북마크 불러오기';
                  elements.importChromeBookmarks.disabled = false;
                }, 2000);
              } else {
                elements.importChromeBookmarks.textContent = '가져오기 실패';
                setTimeout(() => {
                  elements.importChromeBookmarks.textContent = '북마크 불러오기';
                  elements.importChromeBookmarks.disabled = false;
                }, 2000);
              }
            }
          }
        );
      } else {
        console.error('북마크 바 폴더를 찾을 수 없습니다');
        
        // 버튼 상태 복원
        if (elements.importChromeBookmarks) {
          elements.importChromeBookmarks.textContent = '북마크 바를 찾을 수 없음';
          setTimeout(() => {
            elements.importChromeBookmarks.textContent = '북마크 불러오기';
            elements.importChromeBookmarks.disabled = false;
          }, 2000);
        }
      }
    });
  }
  
  // 북마크 트리에서 북마크 추출 함수
  function extractBookmarks(node) {
    let bookmarks = [];
    
    // 현재 노드가 북마크인 경우 (URL이 있음)
    if (node.url) {
      bookmarks.push({
        id: node.id,
        title: node.title,
        url: node.url,
        dateAdded: node.dateAdded
      });
    }
    
    // 자식 노드가 있는 경우 재귀적으로 처리
    if (node.children) {
      node.children.forEach(child => {
        bookmarks = bookmarks.concat(extractBookmarks(child));
      });
    }
    
    return bookmarks;
  }
  
  // 색상 선택기 이벤트 설정
  function setupColorPickers() {
    // 북마크 버튼 배경색
    if (elements.bookmarkButtonColorPicker && elements.bookmarkButtonColor && elements.bookmarkButtonColorPreview) {
      // 색상 선택기 변경 시
      elements.bookmarkButtonColorPicker.addEventListener('input', function() {
        elements.bookmarkButtonColor.value = this.value;
        elements.bookmarkButtonColorPreview.style.backgroundColor = this.value;
        updatePreview();
      });
      
      // 텍스트 입력 변경 시
      elements.bookmarkButtonColor.addEventListener('input', function() {
        elements.bookmarkButtonColorPicker.value = this.value;
        elements.bookmarkButtonColorPreview.style.backgroundColor = this.value;
        updatePreview();
      });
      
      // 색상 미리보기 클릭 시
      elements.bookmarkButtonColorPreview.addEventListener('click', function() {
        elements.bookmarkButtonColorPicker.click();
      });
    }
    
    // 북마크 버튼 텍스트 색상
    if (elements.bookmarkButtonTextColorPicker && elements.bookmarkButtonTextColor && elements.bookmarkButtonTextColorPreview) {
      // 색상 선택기 변경 시
      elements.bookmarkButtonTextColorPicker.addEventListener('input', function() {
        elements.bookmarkButtonTextColor.value = this.value;
        elements.bookmarkButtonTextColorPreview.style.backgroundColor = this.value;
        updatePreview();
      });
      
      // 텍스트 입력 변경 시
      elements.bookmarkButtonTextColor.addEventListener('input', function() {
        elements.bookmarkButtonTextColorPicker.value = this.value;
        elements.bookmarkButtonTextColorPreview.style.backgroundColor = this.value;
        updatePreview();
      });
      
      // 색상 미리보기 클릭 시
      elements.bookmarkButtonTextColorPreview.addEventListener('click', function() {
        elements.bookmarkButtonTextColorPicker.click();
      });
    }
    
    // 북마크 바 배경색
    if (elements.bookmarkBarBackgroundColorPicker && elements.bookmarkBarBackgroundColor && elements.bookmarkBarBackgroundColorPreview) {
      // 색상 선택기 변경 시
      elements.bookmarkBarBackgroundColorPicker.addEventListener('input', function() {
        elements.bookmarkBarBackgroundColor.value = this.value;
        elements.bookmarkBarBackgroundColorPreview.style.backgroundColor = this.value;
        updatePreview();
      });
      
      // 텍스트 입력 변경 시
      elements.bookmarkBarBackgroundColor.addEventListener('input', function() {
        elements.bookmarkBarBackgroundColorPicker.value = this.value;
        elements.bookmarkBarBackgroundColorPreview.style.backgroundColor = this.value;
        updatePreview();
      });
      
      // 색상 미리보기 클릭 시
      elements.bookmarkBarBackgroundColorPreview.addEventListener('click', function() {
        elements.bookmarkBarBackgroundColorPicker.click();
      });
    }
    
    // 북마크 바 텍스트 색상
    if (elements.bookmarkBarTextColorPicker && elements.bookmarkBarTextColor && elements.bookmarkBarTextColorPreview) {
      // 색상 선택기 변경 시
      elements.bookmarkBarTextColorPicker.addEventListener('input', function() {
        elements.bookmarkBarTextColor.value = this.value;
        elements.bookmarkBarTextColorPreview.style.backgroundColor = this.value;
        updatePreview();
      });
      
      // 텍스트 입력 변경 시
      elements.bookmarkBarTextColor.addEventListener('input', function() {
        elements.bookmarkBarTextColorPicker.value = this.value;
        elements.bookmarkBarTextColorPreview.style.backgroundColor = this.value;
        updatePreview();
      });
      
      // 색상 미리보기 클릭 시
      elements.bookmarkBarTextColorPreview.addEventListener('click', function() {
        elements.bookmarkBarTextColorPicker.click();
      });
    }
    
    // 기타 입력 요소 이벤트
    setupOtherInputEvents();
  }
  
  // 기타 입력 요소 이벤트 설정
  function setupOtherInputEvents() {
    // 북마크 버튼 표시 여부
    if (elements.bookmarkButtonShow) {
      elements.bookmarkButtonShow.addEventListener('change', updatePreview);
    }
    
    // 북마크 버튼 위치
    if (elements.bookmarkButtonPosition) {
      elements.bookmarkButtonPosition.addEventListener('change', updatePreview);
    }
    
    // 북마크 버튼 크기
    if (elements.bookmarkButtonSize) {
      elements.bookmarkButtonSize.addEventListener('input', updatePreview);
    }
    
    // 북마크 버튼 사용자 지정 크기
    if (elements.bookmarkButtonCustomSize && elements.bookmarkButtonSize) {
      elements.bookmarkButtonCustomSize.addEventListener('input', function() {
        const size = this.value || '40';
        elements.bookmarkButtonSize.value = `${size}px`;
        updatePreview();
      });
    }
    
    // 북마크 바 표시 여부
    if (elements.bookmarkBarShow) {
      elements.bookmarkBarShow.addEventListener('change', updatePreview);
    }
    
    // 북마크 바 위치
    if (elements.bookmarkBarPosition) {
      elements.bookmarkBarPosition.addEventListener('change', function() {
        // 위치 선택 버튼 업데이트
        const positionButtons = document.querySelectorAll('.position-button');
        positionButtons.forEach(button => {
          button.classList.remove('active');
          if (button.dataset.position === this.value) {
            button.classList.add('active');
          }
        });
        
        updatePreview();
      });
    }
    
    // 북마크 바 높이
    if (elements.bookmarkBarHeight) {
      elements.bookmarkBarHeight.addEventListener('input', updatePreview);
    }
    
    // 커스텀 이미지
    if (elements.bookmarkButtonCustomImage) {
      elements.bookmarkButtonCustomImage.addEventListener('input', updatePreview);
    }
    
    // 크롬 UI 스타일 변경 이벤트
    if (elements.useChromeStyle) {
      elements.useChromeStyle.addEventListener('change', updatePreview);
    }
    
    // 북마크 텍스트 표시 변경 이벤트
    if (elements.showBookmarkText) {
      elements.showBookmarkText.addEventListener('change', updatePreview);
    }
    
    // 북마크 텍스트 길이 제한 변경 이벤트
    if (elements.bookmarkTextMaxLength) {
      elements.bookmarkTextMaxLength.addEventListener('input', updatePreview);
    }
  }
  
  // 초기화
  function initialize() {
    // 필수 요소 확인
    if (!checkRequiredElements()) {
      console.error('필수 요소가 없어 초기화를 중단합니다');
      return;
    }
    
    // 이벤트 리스너 설정
    setupEventListeners();
    
    // 설정 로드
    loadSettings();
    
    // 북마크바 유지 설정 로드
    loadPersistBookmarkBarSetting();
    
    console.log('초기화 완료');
  }
  
  // 초기화 실행
  initialize();
}); 