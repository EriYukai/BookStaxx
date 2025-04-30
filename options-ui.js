// 파일 선택 시 파일명 표시 및 미리보기 업데이트
document.addEventListener('DOMContentLoaded', function() {
    const fileInputs = [
        {input: 'mouseCursorIcon', fileName: 'mouseCursorFileName', preview: 'mouseCursorPreview', noPreview: 'mouseCursorNoPreview', button: 'mouseCursorIconBtn'},
        {input: 'backButtonIcon', fileName: 'backButtonFileName', preview: 'backButtonPreview', noPreview: 'backButtonNoPreview', button: 'backButtonIconBtn'},
        {input: 'addButtonIcon', fileName: 'addButtonFileName', preview: 'addButtonPreview', noPreview: 'addButtonNoPreview', button: 'addButtonIconBtn'}
    ];
    
    fileInputs.forEach(item => {
        const input = document.getElementById(item.input);
        const fileNameSpan = document.getElementById(item.fileName);
        const preview = document.getElementById(item.preview);
        const noPreview = document.getElementById(item.noPreview);
        const button = document.getElementById(item.button);
        
        // 파일 선택 버튼 클릭 이벤트
        button.addEventListener('click', function() {
            input.click();
        });
        
        // 파일 선택 후 이벤트
        input.addEventListener('change', function() {
            if (this.files.length > 0) {
                fileNameSpan.textContent = this.files[0].name;
                
                const reader = new FileReader();
                reader.onload = function(e) {
                    preview.src = e.target.result;
                    preview.classList.remove('hidden');
                    noPreview.classList.add('hidden');
                };
                reader.readAsDataURL(this.files[0]);
            } else {
                fileNameSpan.textContent = '선택된 파일 없음';
                preview.classList.add('hidden');
                noPreview.classList.remove('hidden');
            }
        });
    });
    
    // 이미지 크기 제한을 위한 추가 기능
    // 모든 이미지와 SVG 요소에 클래스 추가
    const allImages = document.querySelectorAll('img, svg');
    allImages.forEach(img => {
        // 이미 크기가 제한된 작은 아이콘은 제외
        if (!img.classList.contains('btn-icon') && 
            !img.classList.contains('bookstaxx-favicon')) {
            img.classList.add('img-icon');
        }
    });
    
    // 5초 후 다시 한번 실행 (동적으로 추가된 요소 처리)
    setTimeout(() => {
        const allImages = document.querySelectorAll('img, svg');
        allImages.forEach(img => {
            if (!img.classList.contains('btn-icon') && 
                !img.classList.contains('bookstaxx-favicon')) {
                img.classList.add('img-icon');
            }
        });
    }, 5000);
    
    // SVG 아이콘에 대한 크기 제한 설정
    const svgElements = document.querySelectorAll('svg');
    svgElements.forEach(svg => {
        if (svg.parentElement && svg.parentElement.classList.contains('btn')) {
            svg.style.width = '20px';
            svg.style.height = '20px';
            svg.style.minWidth = '20px';
            svg.style.maxWidth = '20px';
            svg.style.maxHeight = '20px';
        }
    });
    
    // 닫기 버튼의 SVG 아이콘 크기 특별 처리
    const skipImportButton = document.getElementById('skip-import-button');
    if (skipImportButton) {
        const svgInButton = skipImportButton.querySelector('svg');
        if (svgInButton) {
            svgInButton.style.width = '16px';
            svgInButton.style.height = '16px';
            svgInButton.style.minWidth = '16px';
            svgInButton.style.maxWidth = '16px';
            svgInButton.style.maxHeight = '16px';
        }
    }
}); 