/**
 * BookStaxx Apple Style Enhancement
 * 애플 디자인 철학을 반영한 디자인 요소 및 애니메이션 기능
 */

(function() {
  // 현재 다크 모드인지 확인
  const isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  
  // 다크 모드 변경 감지
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
    applyTheme(e.matches);
  });
  
  // 디자인 테마 적용
  function applyTheme(isDark) {
    // DOM에 필요한 요소가 로드된 후 실행
    const applyWhenReady = () => {
      const bookmarkBar = document.getElementById('bookmark-bar');
      const bookmarkItems = document.querySelectorAll('.bookmark-item');
      const bookmarkTexts = document.querySelectorAll('.bookmark-text');
      
      if (bookmarkBar) {
        // 북마크 바 스타일 업데이트
        const style = getComputedStyle(bookmarkBar).getPropertyValue('backdrop-filter').includes('blur') 
          ? 'frosted' : 'normal';
        
        if (style === 'frosted') {
          bookmarkBar.style.backgroundColor = isDark 
            ? 'rgba(30, 30, 30, 0.85)' 
            : 'rgba(255, 255, 255, 0.85)';
        } else if (style !== 'transparent') {
          bookmarkBar.style.backgroundColor = isDark 
            ? '#1c1c1c' 
            : '#f1f3f4';
        }
        
        // 테두리 색상 업데이트
        const borderColor = isDark ? 'rgba(75, 75, 75, 0.3)' : 'rgba(0, 0, 0, 0.1)';
        
        if (bookmarkBar.classList.contains('bookmark-bar-top')) {
          bookmarkBar.style.borderBottom = `1px solid ${borderColor}`;
        } else if (bookmarkBar.classList.contains('bookmark-bar-bottom')) {
          bookmarkBar.style.borderTop = `1px solid ${borderColor}`;
        } else if (bookmarkBar.classList.contains('bookmark-bar-left')) {
          bookmarkBar.style.borderRight = `1px solid ${borderColor}`;
        } else if (bookmarkBar.classList.contains('bookmark-bar-right')) {
          bookmarkBar.style.borderLeft = `1px solid ${borderColor}`;
        }
      }
      
      // 북마크 아이템 스타일 업데이트
      bookmarkItems.forEach(item => {
        // 호버 이벤트 리스너 재설정
        const existingListeners = item._mouseenterListeners || [];
        existingListeners.forEach(listener => {
          item.removeEventListener('mouseenter', listener);
        });
        
        item._mouseenterListeners = [];
        
        const mouseenterListener = () => {
          item.style.backgroundColor = isDark 
            ? 'rgba(255, 255, 255, 0.1)' 
            : 'rgba(0, 0, 0, 0.05)';
        };
        
        item._mouseenterListeners.push(mouseenterListener);
        item.addEventListener('mouseenter', mouseenterListener);
        
        // 마우스 나갈 때 스타일 초기화
        item.addEventListener('mouseleave', () => {
          item.style.backgroundColor = 'transparent';
        });
      });
      
      // 북마크 텍스트 색상 업데이트
      bookmarkTexts.forEach(text => {
        text.style.color = isDark ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.8)';
      });
    };
    
    // DOM이 준비되면 적용
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', applyWhenReady);
    } else {
      applyWhenReady();
    }
    
    // MutationObserver로 DOM 변화 감지하여 적용
    const setupObserver = () => {
      try {
        if (!document.body) {
          console.log('MutationObserver를 설정할 수 없습니다: document.body가 없습니다.');
          
          // DOM이 준비되면 다시 시도
          if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
              if (document.body) {
                setupObserver();
                console.log('MutationObserver가 성공적으로 설정되었습니다.');
              }
            });
          }
          
          // 페이지 완전 로드 시도
          window.addEventListener('load', () => {
            if (document.body) {
              setupObserver();
              console.log('MutationObserver가 성공적으로 설정되었습니다 (load 후).');
            }
          });
          
          return;
        }
        
        const observer = new MutationObserver(mutations => {
          mutations.forEach(mutation => {
            if (mutation.type === 'childList' && 
                (mutation.target.id === 'bookmark-bar' || 
                document.getElementById('bookmark-bar'))) {
              applyWhenReady();
            }
          });
        });
        
        observer.observe(document.body, { 
          childList: true, 
          subtree: true 
        });
        
        console.log('MutationObserver가 성공적으로 설정되었습니다.');
      } catch (error) {
        console.error('MutationObserver 설정 중 오류 발생:', error);
      }
    };
    
    setupObserver();
  }
  
  // 애니메이션 키프레임 스타일 추가
  function addAnimations() {
    // 이미 추가된 경우 중복 추가 방지
    if (document.getElementById('apple-animations')) {
      return;
    }
    
    // 스타일 요소 준비
    const style = document.createElement('style');
    style.id = 'apple-animations';
    style.textContent = `
      @keyframes appleSlideDown {
        from { transform: translateY(-100%); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
      
      @keyframes appleSlideUp {
        from { transform: translateY(100%); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
      
      @keyframes appleSlideRight {
        from { transform: translateX(-100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      
      @keyframes appleSlideLeft {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      
      @keyframes appleFadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      
      @keyframes appleScale {
        from { transform: scale(0.95); opacity: 0; }
        to { transform: scale(1); opacity: 1; }
      }
      
      @keyframes appleBounce {
        0% { transform: scale(0.9); }
        50% { transform: scale(1.02); }
        100% { transform: scale(1); }
      }
      
      .apple-blur {
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
      }
    `;
    
    // DOM에 스타일 추가 시도
    const tryAppendStyle = () => {
      if (document.head) {
        document.head.appendChild(style);
        return true;
      } else if (document.body) {
        document.body.appendChild(style);
        return true;
      }
      return false;
    };
    
    // 즉시 추가 시도
    if (tryAppendStyle()) {
      return;
    }
    
    // DOM이 준비되지 않은 경우 이벤트 리스너 추가
    console.log('DOM이 아직 준비되지 않았습니다. 이벤트 리스너를 추가합니다.');
    
    // readyState에 따라 처리
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        if (!tryAppendStyle()) {
          // DOM이 로드되어도 요소가 없으면 재시도
          window.addEventListener('load', () => {
            if (!tryAppendStyle()) {
              console.warn('애니메이션 스타일을 추가할 수 없습니다: document.head와 document.body가 준비되지 않았습니다');
            }
          });
        }
      });
    } else if (document.readyState === 'interactive' || document.readyState === 'complete') {
      // 문서 로드가 이미 완료되었으나 head와 body가 없는 특수한 경우 (보통 발생하지 않음)
      window.addEventListener('load', () => {
        if (!tryAppendStyle()) {
          console.warn('애니메이션 스타일을 추가할 수 없습니다: document.head와 document.body가 여전히 없습니다');
        }
      });
    }
  }
  
  // 초기 애니메이션 추가
  addAnimations();
  
  // 초기 테마 적용
  applyTheme(isDarkMode);
  
  // content.js의 createBookmarkButton 함수를 향상시키는 함수
  function enhanceBookmarkButton(button) {
    if (!button) return;
    
    // 기존 + 대신 SVG 아이콘 사용
    if (button.innerHTML === '+') {
      const svgIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svgIcon.setAttribute('width', '24');
      svgIcon.setAttribute('height', '24');
      svgIcon.setAttribute('viewBox', '0 0 24 24');
      svgIcon.setAttribute('fill', 'none');
      svgIcon.setAttribute('stroke', 'currentColor');
      svgIcon.setAttribute('stroke-width', '2');
      svgIcon.setAttribute('stroke-linecap', 'round');
      svgIcon.setAttribute('stroke-linejoin', 'round');
      
      const path1 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path1.setAttribute('d', 'M12 5v14');
      svgIcon.appendChild(path1);
      
      const path2 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path2.setAttribute('d', 'M5 12h14');
      svgIcon.appendChild(path2);
      
      button.innerHTML = '';
      button.appendChild(svgIcon);
    }
    
    // 향상된 상호작용 효과
    button.addEventListener('mouseenter', () => {
      button.style.transform = 'scale(1.05)';
      button.style.boxShadow = '0 8px 15px rgba(0, 0, 0, 0.2)';
    });
    
    button.addEventListener('mouseleave', () => {
      button.style.transform = 'scale(1)';
      button.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.1)';
    });
    
    button.addEventListener('mousedown', () => {
      button.style.transform = 'scale(0.95)';
    });
    
    button.addEventListener('mouseup', () => {
      button.style.transform = 'scale(1.05)';
    });
  }
  
  // 북마크 버튼 감시 및 개선 기능
  function watchForBookmarkButton(node) {
    // 디버그 메시지 출력 제한 (전역 변수 사용)
    if (!window.lastWatchLogTime || Date.now() - window.lastWatchLogTime > 5000) {
      console.log('북마크 버튼 감시 시작');
      window.lastWatchLogTime = Date.now();
    }
    
    // DOM이 아직 로드되지 않았다면 이벤트 리스너 추가
    if (document.readyState === 'loading') {
      console.log('DOM이 아직 준비되지 않았습니다. 이벤트 리스너를 추가합니다.');
      document.addEventListener('DOMContentLoaded', () => {
        if (node) {
          enhanceBookmarkButton(node);
        }
      });
      return;
    }
    
    // DOM이 이미 로드되었다면 즉시 설정
    if (node) {
      enhanceBookmarkButton(node);
    }
  }
  
  // 문자열에서 일관된 색상 생성 (파비콘에 사용)
  window.getColorFromString = function(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    // 밝은 색상만 사용하기 위해 조정
    const hue = Math.abs(hash) % 360;
    const saturation = 65 + (Math.abs(hash) % 20); // 65% ~ 85%
    const lightness = 45 + (Math.abs(hash) % 10);  // 45% ~ 55%
    
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  };
  
  // MutationObserver 설정 함수
  function setupMutationObserver() {
    try {
      // 이미 설정된 경우 중복 설정 방지
      if (window.bookmarkButtonObserver) {
        return;
      }
      
      if (!document.body) {
        // 디버그 메시지 출력 제한 (전역 변수 사용)
        if (!window.lastMutationLogTime || Date.now() - window.lastMutationLogTime > 5000) {
          console.log('MutationObserver를 설정할 수 없습니다: document.body가 없습니다.');
          window.lastMutationLogTime = Date.now();
        }
        
        // DOM이 로드될 때까지 대기
        const setupWhenReady = () => {
          if (document.body) {
            console.log('DOM이 로드되었습니다. MutationObserver를 설정합니다.');
            setupMutationObserver();
            document.removeEventListener('DOMContentLoaded', setupWhenReady);
            window.removeEventListener('load', setupWhenReady);
          }
        };
        
        document.addEventListener('DOMContentLoaded', setupWhenReady);
        window.addEventListener('load', setupWhenReady);
        
        // 일정 시간 후 다시 시도
        setTimeout(setupMutationObserver, 500);
        return;
      }
      
      // 북마크 버튼 감시를 위한 MutationObserver 설정
      const observer = new MutationObserver(function(mutations) {
        // 변경 사항이 많을 경우 처리 최적화
        let shouldProcess = false;
        
        for (const mutation of mutations) {
          if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
            shouldProcess = true;
            break;
          }
        }
        
        if (!shouldProcess) return;
        
        // 북마크 버튼 찾기
        const bookmarkButtons = document.querySelectorAll('.bookmark-button');
        bookmarkButtons.forEach(button => {
          enhanceBookmarkButton(button);
        });
      });
      
      // 문서 전체 변경 감시 설정
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
      
      // 전역 변수에 저장하여 중복 설정 방지
      window.bookmarkButtonObserver = observer;
      
      console.log('MutationObserver가 성공적으로 설정되었습니다.');
    } catch (error) {
      console.error('MutationObserver 설정 중 오류 발생:', error);
    }
  }
  
  // 공개 API
  const AppleStyle = {
    init: function() {
      console.log('AppleStyle 초기화');
      
      // 북마크 버튼 감시 시작
      setupMutationObserver();
      
      // 이미 존재하는 북마크 버튼 개선
      if (document.body) {
        const existingButtons = document.querySelectorAll('.bookmark-button');
        existingButtons.forEach(button => {
          enhanceBookmarkButton(button);
        });
      }
      
      return this;
    },
    
    applyTheme: applyTheme,
    enhanceButton: enhanceBookmarkButton,
    addAnimations: addAnimations,
    isDarkMode: isDarkMode
  };

  // 자동 초기화
  AppleStyle.init();
})(); 