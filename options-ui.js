// 파일 선택 시 파일명 표시 및 미리보기 업데이트
document.addEventListener('DOMContentLoaded', function() {
    const fileInputs = [
        {input: 'mouseCursorIcon', fileName: 'mouseCursorFileName', preview: 'mouseCursorPreview', noPreview: 'mouseCursorNoPreview'},
        {input: 'backButtonIcon', fileName: 'backButtonFileName', preview: 'backButtonPreview', noPreview: 'backButtonNoPreview'},
        {input: 'addButtonIcon', fileName: 'addButtonFileName', preview: 'addButtonPreview', noPreview: 'addButtonNoPreview'}
    ];
    
    fileInputs.forEach(item => {
        const input = document.getElementById(item.input);
        const fileNameSpan = document.getElementById(item.fileName);
        const preview = document.getElementById(item.preview);
        const noPreview = document.getElementById(item.noPreview);
        
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
}); 