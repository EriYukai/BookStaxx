// 기본 설정
// 기본 설정
const defaultSettings = {
  bookmarkButton: {
    position: { top: '100px', left: '10px' },
    size: { width: '40px', height: '40px' },
    image: null,
    visible: true
  },
  bookmarkBar: {
    position: 'top',
    displayStyle: 'smallIconsOnly',
    hideChrome: true,
    design: {
      opacity: 100,
      backgroundColor: '#f1f3f4',
      padding: 'medium',
      border: 'thin'
    }
  }
};

// DOM 요소
const buttonVisibleCheckbox = document.getElementById('show-bookmark-button');
const barPositionSelect = document.getElementById('bookmark-bar-position');
const styleOptions = document.querySelectorAll('.style-option');
const saveButton = document.getElementById('save-button');
const resetButton = document.getElementById('resetButton');
const successMessage = document.getElementById('successMessage');
const bookmark_display_style = document.getElementById('bookmark-display-style');
const hideChromeBookmarkBar = document.getElementById('hide-chrome-bookmark-bar');

// 디자인 요소
const barOpacitySlider = document.getElementById('opacity-slider');
const opacityValue = document.getElementById('opacity-value');
const barColorPicker = document.getElementById('background-color');
const resetColorButton = document.getElementById('reset-color');

// 현재 설정
let currentSettings = {};

// 이미지를 Base64로 변환하는 함수
function convertImageToBase64(file, callback) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = function() {
      // 이미지 크기 제한 (최대 48x48)
      const maxSize = 48;
      let width = img.width;
      let height = img.height;
      
      // 이미지가 너무 크면 크기 조정
      if (width > maxSize || height > maxSize) {
        if (width > height) {
          height = Math.round(height * (maxSize / width));
          width = maxSize;
        } else {
          width = Math.round(width * (maxSize / height));
          height = maxSize;
        }
      }
      
      // 캔버스에 이미지 그리기
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      
      // 이미지 품질 조정 (0.6은 60% 품질)
      const base64 = canvas.toDataURL('image/jpeg', 0.6);
      
      // 이미지 크기 확인 (Base64 문자열 길이)
      const sizeInBytes = Math.round((base64.length * 3) / 4);
      const sizeInKB = sizeInBytes / 1024;
      
      console.log(`이미지 크기: ${sizeInKB.toFixed(2)}KB`);
      
      // 최대 크기 제한 (Chrome 스토리지 제한: 아이템당 8KB)
      const maxKB = 5; // 여유를 두고 5KB로 제한
      
      if (sizeInKB > maxKB) {
        alert(`이미지 크기가 너무 큽니다(${sizeInKB.toFixed(2)}KB). 더 작은 이미지를 사용해주세요.`);
        callback(null);
      } else {
        callback(base64);
      }
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

// 설정 로드
function loadSettings() {
  chrome.storage.local.get('settings', function(data) {
    if (data.settings) {
      currentSettings = data.settings;
      
      // 북마크 버튼 설정 적용
      if (currentSettings.bookmarkButton) {
        document.getElementById('show-bookmark-button').checked = currentSettings.bookmarkButton.visible;
      }
      
      // 북마크 바 설정 적용
      if (currentSettings.bookmarkBar) {
        // 위치 설정
        const positionSelect = document.getElementById('bookmark-bar-position');
        if (currentSettings.bookmarkBar.position) {
          positionSelect.value = currentSettings.bookmarkBar.position;
        }
        
        // 표시 스타일 설정
        const displayStyleSelect = document.getElementById('bookmark-display-style');
        if (currentSettings.bookmarkBar.displayStyle) {
          displayStyleSelect.value = currentSettings.bookmarkBar.displayStyle;
        }
        
        // 크롬 북마크 바 숨김 설정
        const hideChrome = document.getElementById('hide-chrome-bookmark-bar');
        if (currentSettings.bookmarkBar.hideChrome !== undefined) {
          hideChrome.checked = currentSettings.bookmarkBar.hideChrome;
        }
        
        // 디자인 옵션 적용
        if (currentSettings.bookmarkBar.design) {
          const design = currentSettings.bookmarkBar.design;
          
          // 투명도 설정
          if (design.opacity !== undefined) {
            document.getElementById('opacity-slider').value = design.opacity;
            document.getElementById('opacity-value').textContent = design.opacity + '%';
          }
          
          // 배경색 설정
          if (design.backgroundColor) {
            document.getElementById('background-color').value = design.backgroundColor;
          }
          
          // 여백 설정
          if (design.padding) {
            document.querySelector(`input[name="padding"][value="${design.padding}"]`).checked = true;
          }
          
          // 테두리 설정
          if (design.border) {
            document.querySelector(`input[name="border"][value="${design.border}"]`).checked = true;
          }
        }
      }
      
      // 미리보기 업데이트
      updatePreview();
    }
  });
}

// 설정 저장
function saveSettings() {
  console.log('설정 저장 시작');
  
  // 현재 설정 가져오기
  chrome.storage.local.get('bookStaxxSettings', (data) => {
    if (chrome.runtime.lastError) {
      console.error('설정 로드 오류:', chrome.runtime.lastError.message);
      showMessage('설정을 저장하는 중 오류가 발생했습니다.', 'error');
      return;
    }
    
    // 기존 설정 또는 빈 객체 생성
    const settings = data.bookStaxxSettings || {
      bookmarkButton: {
        position: { top: '100px', left: '10px' },
        size: { width: '40px', height: '40px' },
        image: null
      },
      bookmarkBar: {
        design: {}
      }
    };
    
    // 북마크 바 위치 업데이트
    settings.bookmarkBar.position = document.getElementById('bookmark-bar-position').value;
    
    // 북마크 표시 스타일 업데이트
    settings.bookmarkBar.displayStyle = document.getElementById('bookmark-display-style').value;
    
    // 북마크 버튼 표시 여부 업데이트
    settings.bookmarkButton.visible = document.getElementById('show-bookmark-button').checked;
    
    // Chrome 북마크 바 숨김 여부 업데이트
    settings.bookmarkBar.hideChrome = document.getElementById('hide-chrome-bookmark-bar').checked;
    
    // 디자인 설정 업데이트
    if (!settings.bookmarkBar.design) {
      settings.bookmarkBar.design = {};
    }
    
    // 투명도 설정
    settings.bookmarkBar.design.opacity = parseInt(barOpacitySlider.value);
    
    // 배경색 설정
    settings.bookmarkBar.design.backgroundColor = barColorPicker.value;
    
    // 여백 설정
    settings.bookmarkBar.design.padding = document.querySelector('input[name="padding"]:checked').value;
    
    // 테두리 설정
    settings.bookmarkBar.design.border = document.querySelector('input[name="border"]:checked').value;
    
    // 설정 저장
    chrome.storage.local.set({ 'settings': settings }, () => {
      if (chrome.runtime.lastError) {
        console.error('설정 저장 오류:', chrome.runtime.lastError.message);
        showMessage('설정이 저장되지 않았습니다.', 'error');
        return;
      }
      
      console.log('설정이 저장되었습니다.');
      showMessage('설정이 저장되었습니다.', 'success');
      
      // 모든 탭에 설정 변경 알림
      chrome.tabs.query({}, (tabs) => {
        tabs.forEach(tab => {
          chrome.tabs.sendMessage(tab.id, { action: 'settingsUpdated', settings: settings })
            .catch(error => console.log('탭에 메시지 전송 실패:', error));
        });
      });
    });
  });
}

// 이벤트 리스너 설정
function setupEventListeners() {
  // 북마크 버튼 표시 여부 변경 이벤트
  buttonVisibleCheckbox.addEventListener('change', (e) => {
    currentSettings.bookmarkButton.visible = e.target.checked;
    updatePreview();
  });
  
  // 이미지 선택 이벤트
  // buttonImageInput.addEventListener('change', (e) => {
  //   const file = e.target.files[0];
  //   if (file) {
  //     convertImageToBase64(file, (base64Image) => {
  //       if (base64Image) {
  //         // 미리보기 업데이트
  //         buttonPreview.style.backgroundImage = `url(${base64Image})`;
  //         
  //         // 설정 업데이트
  //         currentSettings.bookmarkButton.image = base64Image;
  //       }
  //     });
  //   }
  // });
  
  // 북마크 바 위치 변경 이벤트
  barPositionSelect.addEventListener('change', (e) => {
    currentSettings.bookmarkBar.position = e.target.value;
    updatePreview();
  });
  
  // 북마크 바 스타일 선택 이벤트
  bookmark_display_style.addEventListener('change', (e) => {
    currentSettings.bookmarkBar.displayStyle = e.target.value;
    updatePreview();
  });
  
  // Chrome 북마크 바 숨김 여부 변경 이벤트
  hideChromeBookmarkBar.addEventListener('change', (e) => {
    currentSettings.bookmarkBar.hideChrome = e.target.checked;
    updatePreview();
  });
  
  // 투명도 슬라이더 이벤트
  barOpacitySlider.addEventListener('input', (e) => {
    opacityValue.textContent = `${e.target.value}%`;
    updatePreview();
  });
  
  // 배경색 선택 이벤트
  barColorPicker.addEventListener('input', () => {
    updatePreview();
  });
  
  // 색상 초기화 버튼
  document.getElementById('reset-color').addEventListener('click', function() {
    barColorPicker.value = '#f1f3f4';
    updatePreview();
  });
  
  // 투명 배경 버튼
  document.getElementById('transparent-color').addEventListener('click', function() {
    barColorPicker.value = 'transparent';
    barColorPicker.disabled = true;
    updatePreview();
    
    // 5초 후 다시 활성화
    setTimeout(() => {
      barColorPicker.disabled = false;
    }, 5000);
  });
  
  // 여백 라디오 버튼 이벤트
  document.querySelectorAll('input[name="padding"]').forEach(radio => {
    radio.addEventListener('change', updatePreview);
  });
  
  // 테두리 라디오 버튼 이벤트
  document.querySelectorAll('input[name="border"]').forEach(radio => {
    radio.addEventListener('change', updatePreview);
  });
  
  // 저장 버튼 클릭 이벤트
  saveButton.addEventListener('click', saveSettings);
  
  // 리셋 버튼 클릭 이벤트
  resetButton?.addEventListener('click', () => {
    // 기본 설정으로 리셋
    currentSettings = JSON.parse(JSON.stringify(defaultSettings));
    
    // UI 업데이트
    loadSettings();
    
    // 설정 저장
    saveSettings();
  });
}

// 초기화
function init() {
  loadSettings();
  setupEventListeners();
}

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', () => {
  console.log('설정 페이지 로드됨');
  loadSettings();
  
  // 저장 버튼 이벤트 리스너
  document.getElementById('save-button').addEventListener('click', saveSettings);
  
  // 위치 선택 이벤트 리스너
  document.getElementById('bookmark-bar-position').addEventListener('change', updatePreview);
  
  // 표시 스타일 선택 이벤트 리스너
  document.getElementById('bookmark-display-style').addEventListener('change', updatePreview);
  
  // 북마크 버튼 표시 여부 체크박스 이벤트 리스너
  document.getElementById('show-bookmark-button').addEventListener('change', updatePreview);
  
  // 초기 미리보기 업데이트
  updatePreview();
});

// 미리보기 업데이트 함수
function updatePreview() {
  const barPosition = document.getElementById('bookmark-bar-position').value;
  const displayStyle = document.getElementById('bookmark-display-style').value;
  const showButton = document.getElementById('show-bookmark-button').checked;
  const hideChrome = document.getElementById('hide-chrome-bookmark-bar').checked;
  
  // 디자인 옵션
  const opacity = barOpacitySlider.value;
  const backgroundColor = barColorPicker.value;
  const padding = document.querySelector('input[name="padding"]:checked').value;
  const border = document.querySelector('input[name="border"]:checked').value;
  
  // 미리보기 컨테이너
  const previewContainer = document.getElementById('preview-container');
  previewContainer.innerHTML = '';
  
  // 북마크 바 미리보기
  const barPreview = document.createElement('div');
  barPreview.className = 'preview-bookmark-bar';
  barPreview.setAttribute('data-position', barPosition);
  barPreview.setAttribute('data-style', displayStyle);
  
  // 디자인 적용
  if (backgroundColor === 'transparent') {
    barPreview.style.backgroundColor = 'transparent';
    barPreview.style.boxShadow = 'none';
  } else {
    barPreview.style.backgroundColor = backgroundColor;
  }
  barPreview.style.opacity = opacity / 100;
  
  // 여백 적용
  switch (padding) {
    case 'small':
      barPreview.style.padding = '2px';
      break;
    case 'medium':
      barPreview.style.padding = '5px';
      break;
    case 'large':
      barPreview.style.padding = '10px';
      break;
  }
  
  // 테두리 적용
  switch (border) {
    case 'none':
      barPreview.style.border = 'none';
      break;
    case 'thin':
      barPreview.style.border = '1px solid #dadce0';
      break;
    case 'medium':
      barPreview.style.border = '2px solid #dadce0';
      break;
    case 'thick':
      barPreview.style.border = '3px solid #dadce0';
      break;
  }
  
  // 북마크 항목 추가
  for (let i = 0; i < 5; i++) {
    const bookmarkItem = document.createElement('div');
    bookmarkItem.className = 'preview-bookmark-item';
    
    const icon = document.createElement('div');
    icon.className = 'preview-bookmark-icon';
    bookmarkItem.appendChild(icon);
    
    // 텍스트가 있는 스타일인 경우 텍스트 추가
    if (displayStyle.includes('WithText')) {
      const text = document.createElement('div');
      text.className = 'preview-bookmark-text';
      text.textContent = `북마크${i+1}`;
      bookmarkItem.appendChild(text);
    }
    
    barPreview.appendChild(bookmarkItem);
  }
  
  // 북마크 버튼 미리보기
  if (showButton) {
    const buttonPreview = document.createElement('div');
    buttonPreview.className = 'preview-bookmark-button';
    buttonPreview.textContent = '+';
    previewContainer.appendChild(buttonPreview);
  }
  
  // Chrome 북마크 바 미리보기 (숨김 옵션이 꺼져 있을 때만)
  if (!hideChrome) {
    const chromeBarPreview = document.createElement('div');
    chromeBarPreview.className = 'preview-bookmark-bar';
    chromeBarPreview.style.top = '0';
    chromeBarPreview.style.height = '20px';
    chromeBarPreview.style.backgroundColor = '#dee1e6';
    chromeBarPreview.style.zIndex = '9998';
    chromeBarPreview.style.opacity = '0.7';
    chromeBarPreview.textContent = 'Chrome 북마크 바';
    chromeBarPreview.style.fontSize = '10px';
    chromeBarPreview.style.justifyContent = 'center';
    chromeBarPreview.style.alignItems = 'center';
    previewContainer.appendChild(chromeBarPreview);
  }
  
  // 미리보기 컨테이너에 추가
  previewContainer.appendChild(barPreview);
  
  // 설명 업데이트
  updateDescription(barPosition, displayStyle, showButton);
}

// 설명 업데이트 함수
function updateDescription(position, style, showButton) {
  let description = '현재 설정: ';
  
  // 위치 설명
  switch (position) {
    case 'top':
      description += '북마크 바가 페이지 상단에 표시됩니다. ';
      break;
    case 'bottom':
      description += '북마크 바가 페이지 하단에 표시됩니다. ';
      break;
    case 'left':
      description += '북마크 바가 페이지 왼쪽에 표시됩니다. ';
      break;
    case 'right':
      description += '북마크 바가 페이지 오른쪽에 표시됩니다. ';
      break;
  }
  
  // 스타일 설명
  switch (style) {
    case 'smallIconsOnly':
      description += '작은 아이콘만 표시됩니다. ';
      break;
    case 'smallIconsWithText':
      description += '작은 아이콘과 텍스트를 함께 표시합니다. ';
      break;
    case 'largeIconsOnly':
      description += '큰 아이콘만 표시됩니다. ';
      break;
    case 'largeIconsWithText':
      description += '큰 아이콘과 텍스트를 함께 표시합니다. ';
      break;
  }
  
  // 버튼 표시 여부 설명
  description += showButton ? 
    '북마크 버튼이 표시됩니다. ' : 
    '북마크 버튼이 표시되지 않습니다. ';
  
  // Chrome 북마크 바 숨김 여부 설명
  const hideChrome = document.getElementById('hide-chrome-bookmark-bar').checked;
  description += hideChrome ? 
    'Chrome 기본 북마크 바는 숨겨집니다.' : 
    'Chrome 기본 북마크 바도 함께 표시됩니다.';
  
  document.getElementById('settings-description').textContent = description;
}

// 메시지 표시 함수
function showMessage(message, type = 'info') {
  const messageElement = document.getElementById('message');
  messageElement.textContent = message;
  messageElement.className = `message ${type}`;
  messageElement.style.display = 'block';
  
  // 3초 후 메시지 숨기기
  setTimeout(() => {
    messageElement.style.opacity = '0';
    setTimeout(() => {
      messageElement.style.display = 'none';
      messageElement.style.opacity = '1';
    }, 500);
  }, 3000);
} 
