// 다국어 지원을 위한 메시지 함수
function getMessage(key, substitutions) {
  return chrome.i18n.getMessage(key, substitutions) || key;
}

// 기본 설정 정의
const defaultSettings = {
  bookmarkBar: {
    position: 'top',
    backgroundColor: '#f1f3f4',
    textColor: '#333333',
    opacity: 100,
    iconSize: 'medium',
    textSize: 'medium',
    maxTextLength: 15,
    showText: true,
    style: 'normal',
    hideChrome: false,
    adjustBodyPadding: true
  },
  bookmarkButton: {
    show: true,
    position: 'bottomRight',
    size: '40px',
    backgroundColor: '#4285F4',
    textColor: '#FFFFFF',
    customImage: null
  }
};

// UI 요소
const elements = {
  position: document.getElementById('position'),
  opacity: document.getElementById('opacity'),
  opacityValue: document.getElementById('opacity-value'),
  backgroundColor: document.getElementById('background-color'),
  backgroundColorValue: document.getElementById('background-color-value'),
  textColor: document.getElementById('text-color'),
  textColorValue: document.getElementById('text-color-value'),
  showText: document.getElementById('show-text'),
  iconSizeOptions: document.querySelectorAll('.icon-size-option'),
  iconSize: document.getElementById('icon-size'),
  textSize: document.getElementById('text-size'),
  barStyle: document.getElementById('bar-style'),
  barPreview: document.getElementById('bookmark-preview'),
  previewText: document.querySelector('.bookmark-text-preview'),
  saveButton: document.getElementById('save-button'),
  resetButton: document.getElementById('reset-button'),
  hideChrome: document.getElementById('hide-chrome'),
  maxTextLength: document.getElementById('max-text-length'),
  maxTextLengthValue: document.getElementById('max-text-length-value'),
  buttonImage: document.getElementById('button-image'),
  buttonImagePreview: document.getElementById('button-image-preview'),
  resetImageButton: document.getElementById('reset-image-button'),
  colorPresets: document.querySelectorAll('.color-preset')
};

// 설정 로드
function loadSettings() {
  console.log('설정 로드 시작');
  chrome.storage.sync.get(defaultSettings, (settings) => {
    console.log('로드된 설정:', settings);
    
    // 설정값을 UI에 적용
    // 위치 설정 적용
    if (elements.position) {
      elements.position.value = settings.bookmarkBar.position || 'top';
    }
    
    // 투명도 설정 적용
    if (elements.opacity && elements.opacityValue) {
      elements.opacity.value = settings.bookmarkBar.opacity || 100;
      elements.opacityValue.textContent = `${settings.bookmarkBar.opacity || 100}%`;
    }
    
    // 배경색 설정 적용
    if (elements.backgroundColor && elements.backgroundColorValue) {
      elements.backgroundColor.value = settings.bookmarkBar.backgroundColor || '#f1f3f4';
      elements.backgroundColorValue.value = settings.bookmarkBar.backgroundColor || '#f1f3f4';
    }
    
    // 텍스트 색상 설정 적용
    if (elements.textColor && elements.textColorValue) {
      elements.textColor.value = settings.bookmarkBar.textColor || '#333333';
      elements.textColorValue.value = settings.bookmarkBar.textColor || '#333333';
    }
    
    // 텍스트 표시 여부 설정 적용
    if (elements.showText) {
      elements.showText.checked = settings.bookmarkBar.showText !== false;
    }

    // 아이콘 크기 선택
    if (elements.iconSizeOptions) {
      elements.iconSizeOptions.forEach(option => {
        if (option.dataset.size === (settings.bookmarkBar.iconSize || 'medium')) {
          option.style.fontWeight = 'bold';
          option.style.border = '2px solid #4285F4';
          option.style.borderRadius = '4px';
          option.style.padding = '5px';
        }
      });
    }

    // 미리보기 업데이트
    updatePreview();

    // 언어 설정 적용
    applyLanguage();
    console.log('설정 로드 및 적용 완료');
  });
}

// 설정 저장
function saveSettings() {
  console.log('설정 저장 시작');
  
  // 현재 선택된 아이콘 크기 가져오기
  let selectedIconSize = 'medium';
  if (elements.iconSizeOptions) {
    elements.iconSizeOptions.forEach(option => {
      if (option.style.fontWeight === 'bold') {
        selectedIconSize = option.dataset.size;
      }
    });
  }

  const settings = {
    bookmarkButton: {
      show: true,
      position: 'bottom-right'
    },
    bookmarkBar: {
      position: elements.position ? elements.position.value : 'top',
      opacity: elements.opacity ? parseInt(elements.opacity.value) : 100,
      backgroundColor: elements.backgroundColor ? elements.backgroundColor.value : '#f1f3f4',
      textColor: elements.textColor ? elements.textColor.value : '#333333',
      iconSize: selectedIconSize,
      showText: elements.showText ? elements.showText.checked : true,
      hideChrome: true,
      persistAcrossNavigation: true,
      cacheIcons: true
    }
  };

  // 텍스트 길이 설정 저장
  const maxTextLength = document.getElementById('max-text-length');
  if (maxTextLength) {
    settings.bookmarkBar.maxTextLength = parseInt(maxTextLength.value);
  }
  
  // 텍스트 크기 설정 저장
  const textSizeOptions = document.querySelectorAll('.text-size-option');
  if (textSizeOptions) {
    textSizeOptions.forEach(option => {
      if (option.style.fontWeight === 'bold') {
        settings.bookmarkBar.textSize = option.dataset.size;
      }
    });
  }
  
  // 투명 모드 설정 저장
  const transparencyOptions = document.querySelectorAll('.transparency-mode-option');
  if (transparencyOptions) {
    transparencyOptions.forEach(option => {
      if (option.style.fontWeight === 'bold') {
        settings.bookmarkBar.style = option.dataset.mode;
      }
    });
  }

  console.log('저장할 설정:', settings);
  chrome.storage.sync.set(settings, () => {
    console.log('설정 저장 완료');
    showNotification(getMessage('settingsSaved'));
    
    // 모든 탭에 설정 변경 알림
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, { action: 'settingsUpdated', settings: settings })
          .catch(error => console.log('탭에 메시지 전송 실패:', error));
      });
    });
  });
}

// 미리보기 업데이트
function updatePreview() {
  console.log('미리보기 업데이트');
  if (!elements.barPreview) return;
  
  // 배경색 업데이트
  if (elements.backgroundColor) {
    elements.barPreview.style.backgroundColor = elements.backgroundColor.value;
  }
  
  // 투명도 업데이트
  if (elements.opacity) {
    elements.barPreview.style.opacity = elements.opacity.value / 100;
  }
  
  // 텍스트 색상 업데이트
  const textElements = document.querySelectorAll('.bookmark-text-preview');
  if (elements.textColor) {
    textElements.forEach(el => {
      el.style.color = elements.textColor.value;
    });
  }
  
  // 텍스트 표시 여부
  if (elements.showText) {
    textElements.forEach(el => {
      el.style.display = elements.showText.checked ? 'block' : 'none';
    });
  }
  
  // 아이콘 크기 업데이트
  let iconSize = 16; // 기본값 (중간)
  if (elements.iconSizeOptions) {
    elements.iconSizeOptions.forEach(option => {
      if (option.style.fontWeight === 'bold') {
        if (option.dataset.size === 'small') iconSize = 12;
        if (option.dataset.size === 'large') iconSize = 20;
      }
    });
  }
  
  const iconElements = document.querySelectorAll('.bookmark-icon-preview');
  iconElements.forEach(el => {
    el.style.width = `${iconSize}px`;
    el.style.height = `${iconSize}px`;
  });
}

// 알림 표시
function showNotification(message) {
  const notification = document.createElement('div');
  notification.className = 'notification';
  notification.textContent = message;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.opacity = '0';
    setTimeout(() => {
      notification.remove();
    }, 300);
  }, 2000);
}

// 이벤트 리스너 설정
function setupEventListeners() {
  console.log('이벤트 리스너 설정');
  
  // 위치 변경
  if (elements.position) {
    elements.position.addEventListener('change', updatePreview);
  }
  
  // 투명도 변경
  if (elements.opacity && elements.opacityValue) {
    elements.opacity.addEventListener('input', () => {
      elements.opacityValue.textContent = `${elements.opacity.value}%`;
      updatePreview();
    });
  }
  
  // 배경색 변경
  if (elements.backgroundColor && elements.backgroundColorValue) {
    elements.backgroundColor.addEventListener('input', () => {
      elements.backgroundColorValue.value = elements.backgroundColor.value;
      updatePreview();
    });
    
    elements.backgroundColorValue.addEventListener('input', () => {
      elements.backgroundColor.value = elements.backgroundColorValue.value;
      updatePreview();
    });
  }
  
  // 텍스트 색상 변경
  if (elements.textColor && elements.textColorValue) {
    elements.textColor.addEventListener('input', () => {
      elements.textColorValue.value = elements.textColor.value;
      updatePreview();
    });
    
    elements.textColorValue.addEventListener('input', () => {
      elements.textColor.value = elements.textColorValue.value;
      updatePreview();
    });
  }
  
  // 텍스트 표시 여부
  if (elements.showText) {
    elements.showText.addEventListener('change', updatePreview);
  }
  
  // 아이콘 크기 선택
  if (elements.iconSizeOptions) {
    elements.iconSizeOptions.forEach(option => {
      option.addEventListener('click', () => {
        elements.iconSizeOptions.forEach(opt => {
          opt.style.fontWeight = 'normal';
          opt.style.border = 'none';
          opt.style.borderRadius = '0';
          opt.style.padding = '0';
        });
        
        option.style.fontWeight = 'bold';
        option.style.border = '2px solid #4285F4';
        option.style.borderRadius = '4px';
        option.style.padding = '5px';
        
        updatePreview();
      });
    });
  }
  
  // 색상 프리셋
  if (elements.colorPresets) {
    elements.colorPresets.forEach(preset => {
      preset.addEventListener('click', () => {
        const color = preset.dataset.color;
        const parent = preset.closest('.option-control');
        
        if (parent && parent.querySelector('#background-color')) {
          elements.backgroundColor.value = color;
          elements.backgroundColorValue.value = color;
        } else if (parent && parent.querySelector('#text-color')) {
          elements.textColor.value = color;
          elements.textColorValue.value = color;
        }
        
        updatePreview();
      });
    });
  }
  
  // 저장 버튼
  if (elements.saveButton) {
    elements.saveButton.addEventListener('click', saveSettings);
  }
  
  // 초기화 버튼
  if (elements.resetButton) {
    elements.resetButton.addEventListener('click', () => {
      chrome.storage.sync.set(defaultSettings, () => {
        loadSettings();
        showNotification(getMessage('settingsReset'));
      });
    });
  }
  
  // 새로운 기능 설정
  setupImageUpload();
  setupTextLengthControl();
  setupTextSizeControl();
  setupTransparencyModeControl();
}

// 언어 적용
function applyLanguage() {
  console.log('언어 적용 시작');
  
  const elementsToLocalize = {
    'options-title': '옵션 페이지 제목',
    'bookmark-bar-title': '외관 설정 제목',
    'position-label': '위치 레이블',
    'position-top': '상단 옵션',
    'position-bottom': '하단 옵션',
    'position-left': '좌측 옵션',
    'position-right': '우측 옵션',
    'opacity-label': '투명도 레이블',
    'background-color-label': '배경색 레이블',
    'text-color-label': '글자색 레이블',
    'icon-size-label': '아이콘 크기 레이블',
    'icon-size-small': '작은 크기 레이블',
    'icon-size-medium': '중간 크기 레이블',
    'icon-size-large': '큰 크기 레이블',
    'show-text-label': '텍스트 표시 레이블',
    'bookmark-preview': '미리보기 제목',
    'preview-title': '미리보기 텍스트',
    'reset-button': '초기화 버튼',
    'save-button': '저장 버튼'
  };
  
  // 각 요소 확인 후 번역 적용
  for (const [id, description] of Object.entries(elementsToLocalize)) {
    const element = document.getElementById(id);
    if (element) {
      const translated = getMessage(id);
      console.log(`${id} 번역: ${translated} (${description})`);
      element.textContent = translated;
    } else {
      console.warn(`${id} 요소를 찾을 수 없음 (${description})`);
    }
  }
  
  console.log('언어 적용 완료');
}

// 북마크 버튼 이미지 업로드 기능 추가
function setupImageUpload() {
  const imageUploadInput = document.getElementById('button-image');
  const previewImage = document.getElementById('button-image-preview');
  const resetImageButton = document.getElementById('reset-image-button');
  
  if (!imageUploadInput || !previewImage || !resetImageButton) {
    console.warn('이미지 업로드 요소를 찾을 수 없음');
    return;
  }
  
  // 저장된 이미지 불러오기
  chrome.storage.sync.get(['bookmarkButton'], (data) => {
    if (data.bookmarkButton && data.bookmarkButton.customImage) {
      previewImage.src = data.bookmarkButton.customImage;
      previewImage.style.display = 'block';
    } else {
      previewImage.style.display = 'none';
    }
  });
  
  // 이미지 업로드 이벤트 처리
  imageUploadInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // 파일 크기 제한 (1MB)
    if (file.size > 1024 * 1024) {
      showNotification(getMessage('imageTooBig'));
      return;
    }
    
    // 이미지 파일 타입 확인
    if (!file.type.match('image.*')) {
      showNotification(getMessage('invalidImageType'));
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const imageData = event.target.result;
      
      // 이미지 크기 조정
      resizeImage(imageData, 128, 128, (resizedImage) => {
        // 미리보기 표시
        previewImage.src = resizedImage;
        previewImage.style.display = 'block';
        
        // 설정에 저장
        chrome.storage.sync.get(['bookmarkButton'], (data) => {
          const settings = data.bookmarkButton || {};
          settings.customImage = resizedImage;
          
          chrome.storage.sync.set({ bookmarkButton: settings }, () => {
            showNotification(getMessage('imageSaved'));
          });
        });
      });
    };
    
    reader.readAsDataURL(file);
  });
  
  // 이미지 초기화 버튼
  resetImageButton.addEventListener('click', () => {
    previewImage.style.display = 'none';
    previewImage.src = '';
    
    chrome.storage.sync.get(['bookmarkButton'], (data) => {
      const settings = data.bookmarkButton || {};
      settings.customImage = null;
      
      chrome.storage.sync.set({ bookmarkButton: settings }, () => {
        showNotification(getMessage('imageReset'));
      });
    });
  });
}

// 이미지 크기 조정 함수
function resizeImage(dataUrl, maxWidth, maxHeight, callback) {
  const img = new Image();
  img.onload = function() {
    let width = img.width;
    let height = img.height;
    
    // 비율 유지하면서 크기 조정
    if (width > height) {
      if (width > maxWidth) {
        height = Math.round(height * maxWidth / width);
        width = maxWidth;
      }
    } else {
      if (height > maxHeight) {
        width = Math.round(width * maxHeight / height);
        height = maxHeight;
      }
    }
    
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, width, height);
    
    // 압축된 이미지 데이터 반환
    callback(canvas.toDataURL('image/png', 0.85));
  };
  
  img.src = dataUrl;
}

// 텍스트 길이 설정 기능 추가
function setupTextLengthControl() {
  const textLengthSlider = document.getElementById('max-text-length');
  const textLengthValue = document.getElementById('max-text-length-value');
  
  if (!textLengthSlider || !textLengthValue) {
    console.warn('텍스트 길이 설정 요소를 찾을 수 없음');
    return;
  }
  
  // 저장된 설정 불러오기
  chrome.storage.sync.get(['bookmarkBar'], (data) => {
    if (data.bookmarkBar && data.bookmarkBar.maxTextLength) {
      textLengthSlider.value = data.bookmarkBar.maxTextLength;
      textLengthValue.textContent = data.bookmarkBar.maxTextLength;
    }
  });
  
  // 슬라이더 이벤트 처리
  textLengthSlider.addEventListener('input', () => {
    const value = textLengthSlider.value;
    textLengthValue.textContent = value;
    
    // 미리보기 업데이트
    updatePreview();
  });
}

// 텍스트 크기 설정 기능 추가
const textSizeElement = document.getElementById('text-size');
if (textSizeElement) {
  // 저장된 설정 불러오기
  chrome.storage.sync.get(['bookmarkBar'], (data) => {
    if (data.bookmarkBar && data.bookmarkBar.textSize) {
      textSizeElement.value = data.bookmarkBar.textSize;
    }
  });
  
  // 텍스트 크기 옵션 클릭 이벤트
  textSizeElement.addEventListener('change', () => {
    updatePreview();
  });
} else {
  console.warn('텍스트 크기 설정 요소를 찾을 수 없음 - 이 메시지는 무시해도 됩니다');
}

// 투명 모드 설정 기능 추가
const transparentModeElement = document.getElementById('transparent-mode');
if (transparentModeElement) {
  // 저장된 설정 불러오기
  chrome.storage.sync.get(['bookmarkBar'], (data) => {
    if (data.bookmarkBar && data.bookmarkBar.style) {
      transparentModeElement.value = data.bookmarkBar.style;
    }
  });
  
  // 투명 모드 옵션 클릭 이벤트
  transparentModeElement.addEventListener('change', () => {
    updatePreview();
  });
} else {
  console.warn('투명 모드 설정 요소를 찾을 수 없음 - 이 메시지는 무시해도 됩니다');
}

// 초기화
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM 로드 완료, 초기화 시작');
  for (const [key, element] of Object.entries(elements)) {
    if (!element && key !== 'iconSizeOptions' && key !== 'colorPresets') {
      console.warn(`요소 ${key}를 찾을 수 없음`);
    }
  }
  
  loadSettings();
  setupEventListeners();
  console.log('초기화 완료');
}); 
