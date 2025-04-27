**Chrome Extension: Enhanced Scroll Button with Bookmarks**

**Overview:**  
This Chrome extension enhances the scroll button by combining standard scrolling with bookmark management and navigation features, providing a seamless browsing experience.

**Operation:**

1. **Scroll Button Click:**  
   - When the user clicks the scroll button, the extension performs the usual scroll action.  
   - At the same time, it displays bookmarks from Chrome's bookmark list on both the left and right sides of the clicked point.

2. **Bookmark Display:**  
   - Bookmarks appear as icons, with their titles shown below each icon.  
   - This allows users to quickly view and access their saved bookmarks directly from the scroll interaction.

3. **Adding a Bookmark:**  
   - A "+" icon is displayed on the right side of the clicked point.  
   - Clicking the "+" icon instantly adds the current page to the user's bookmarks without any prompts or confirmations.

4. **Navigation:**  
   - A "<-" icon is displayed on the left side of the clicked point.  
   - Clicking the "<-" icon navigates the browser back to the previous page.

**Usage:**  
- This extension simplifies bookmark management and navigation by integrating these features into the scroll button.  
- Users can effortlessly save pages or return to previous ones without leaving their current workflow.

**Note:**  
- Designed for efficiency and ease of use, this extension offers a streamlined way to interact with bookmarks and browsing history directly through a single click.

---

1.확장프로그램 옵션버튼이있음
2.초기 확장 프로그램 설치시 기본 북마크에 있는 북마크를 불러 오시겠습니까? 라는 메시지가 뜨고 예를 누르면 연동됨 BOOKSTAXX 라는 폴더안에 있는 확장프로그램 전용 북마크 폴더에 기존 북마크들을 자동으로 붙여넣음
3.스크롤 버튼이 나오면 애니메이션으로 부드럽게 BOOKSTAXX안에 북마크들을 아이콘화해서 마우스 기준 위치에서 좌우로 사용자의 화면크기 기준으로 꽉 채워 랜덤으로로 스무스 하게 동그란 아이콘으로로 전부 표시하며 북마크의 숫자에 맞게 아이콘 크기 글씨크기를 자동으로 조절해 화면 크기에 맞게 자동으로 배치해줌
4.스크롤 버튼 누른상태에서 항상 왼쪽에는 뒤로가기 버튼 고정 오른쪽에는 북마크 추가버튼 고정으로 등장하고 해당 버튼을 누르면 해당 액션이 작동함
5.마우스 기준으로 직선상 위 아래 직각 90방향의 얇은 기둥 안에는 아이콘이 나타나지 않음
6.옵션에서는 다양한 기능을 조절할수 있음
7.확장 프로그램 오른쪽 버튼을 누르면 옵션과 기부하기 버튼이 있음
8.옵션 창 맨 아래에 제작자에게 기부하기 버튼이 있음
9.기부하기 버튼을 누르면 기부페이지로 이동하고 기부페이지에는 제작의 https://buymeacoffee.com/erinyan 기부버튼과 메세지가 있음


---

### Survey Note: Detailed Analysis of Apple's Design Philosophy in a System Prompt for Cursor

This note provides a comprehensive exploration of how Apple's design philosophy can be translated into a system prompt for Cursor, an AI coding assistant utilizing Tailwind CSS. The goal is to ensure Cursor creates front-end app designs that are elegant, minimalistic, and user-friendly, reflecting Apple's core principles. The analysis covers design guidelines, technical implementation, and workflow, with detailed examples and considerations for authenticity and performance.

#### Background and Core Principles
Apple's design philosophy is renowned for its simplicity, clarity, and sophistication, as outlined in their Human Interface Guidelines ([Human Interface Guidelines | Apple Developer Documentation](https://developer.apple.com/design/human-interface-guidelines/)). Research suggests that Apple's approach emphasizes six key principles:
- **Simplicity**: Designs should be clean and uncluttered, focusing on essential elements for an intuitive user experience.
- **Clarity**: Typography, icons, and layouts must be legible and purposeful, guiding user attention naturally.
- **Consistency**: Uniformity in spacing, typography, and component styles ensures a cohesive look, as noted in discussions on Apple's design consistency ([Apple Design Principles: A Legacy of Innovation, Elegance, and Vision | by Alex Glushenkov | Medium](https://medium.com/@alexglushenkov/apple-design-principles-a-legacy-of-innovation-elegance-and-vision-6d1f99a4331b)).
- **Elegance**: Subtle curves, smooth transitions, and high-quality visuals evoke refinement and sophistication.
- **Functionality**: Every element should serve a purpose, enhancing the overall user experience, as highlighted in Apple's focus on human-centered design ([What makes Apple design so good](https://medium.com/macoclock/what-makes-apple-design-so-good-d430ef97c6d2)).
- **Attention to Detail**: Pixel-perfect alignment, precise spacing, and micro-interactions are crucial for a polished feel.

These principles form the foundation for the system prompt, ensuring Cursor aligns with Apple's aesthetic and functional standards.

#### Design Guidelines
To translate these principles into practical guidelines for Cursor, we focus on specific aspects using Tailwind CSS:

##### Typography
Apple uses the San Francisco font (also known as SF Pro) as its system font, designed for high legibility across devices ([San Francisco (sans-serif typeface) - Wikipedia](https://en.wikipedia.org/wiki/San_Francisco_%28sans-serif_typeface%29)). In Tailwind CSS, Cursor should use `font-sans`, which maps to system sans-serif fonts like San Francisco on Apple devices, or specify a custom font stack such as `font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro', 'San Francisco', Arial, Helvetica, sans-serif;`. Guidelines include:
- Prioritize readability with font sizes (`text-sm`, `text-base`, `text-lg`) and weights (`font-light`, `font-normal`, `font-medium`, `font-bold`), as recommended in iOS typography guidelines ([Typography - Visual Design - iOS - Human Interface Guidelines - Apple Developer](https://developer.apple.com/design/human-interface-guidelines/ios/visual-design/typography/)).
- Maintain generous line spacing (`leading-relaxed`, `leading-loose`) and use a clear hierarchy (`text-xl`, `text-2xl`, etc.).
- Use a neutral color palette for text (`text-gray-900`, `text-gray-700`) with accents (`text-blue-500`, `text-red-500`) for emphasis.

An unexpected detail is that while San Francisco is proprietary, it can be accessed via system font stacks in web designs, enhancing authenticity without legal issues, as discussed in web development forums ([How to use Apple's San Francisco font on a webpage - Stack Overflow](https://stackoverflow.com/questions/32660748/how-to-use-apples-san-francisco-font-on-a-webpage)).

##### Color Palette
Apple's color palette is primarily neutral, with accents for visual interest, as seen in their brand color codes ([Apple Colors - Hex, RGB, CMYK, Pantone | Color Codes - U.S. Brand Colors](https://usbrandcolors.com/apple-colors/)). The prompt should guide Cursor to:
- Use primary neutrals: `bg-white`, `bg-gray-100`, `bg-gray-200`, `bg-gray-900`.
- Employ accent colors: `bg-blue-500`, `bg-green-500`, `bg-red-500`, with variants like `bg-blue-400`, `bg-blue-600`.
- Leverage opacity utilities (`bg-opacity-75`, `text-opacity-50`) for subtle effects.
- Support dark mode with `dark: bg-gray-900` for backgrounds and `dark: text-white` for text, ensuring readability across themes, as per Apple's dark mode guidelines ([Color | Apple Developer Documentation](https://developer.apple.com/design/human-interface-guidelines/color)).

##### Spacing and Layout
Apple designs are known for generous whitespace, creating a balanced and focused layout ([UI Design Dos and Don’ts - Apple Developer](https://developer.apple.com/design/tips/)). Cursor should:
- Use a consistent spacing scale (`p-4`, `m-6`, `space-y-4`) for rhythm and balance.
- Embrace whitespace (`p-8`, `m-10`) to prevent overcrowding.
- Utilize Flexbox (`flex`, `flex-col`, `items-center`) and Grid (`grid`, `grid-cols-2`, `gap-4`) for responsive, adaptive layouts.
- Ensure mobile-first designs, scaling gracefully with Tailwind's responsive prefixes (`sm:`, `md:`, `lg:`, `xl:`).

##### Components
Components should reflect Apple's elegant and functional style:
- **Buttons**: Use rounded corners (`rounded-md`, `rounded-lg`), subtle shadows (`shadow-sm`, `shadow-md`), and hover effects (`hover: bg-blue-600`, `hover: shadow-lg`), typically with `bg-blue-500` and `text-white`.
- **Cards**: Design with clean borders (`border`, `border-gray-200`), slight elevation (`shadow-sm`), and rounded edges (`rounded-xl`).
- **Inputs**: Use minimal borders (`border-gray-300`), focus states (`focus: ring`, `focus: ring-blue-500`), and placeholder styling (`placeholder-gray-400`).
- **Icons**: Incorporate simple, glyph-like icons with consistent sizing (`w-6`, `h-6`) and subtle animations on interaction, as seen in Apple's SF Symbols library ([SF Symbols - Apple Developer](https://developer.apple.com/sf-symbols/)).

#### Animation Guidelines
Apple's interfaces feature smooth transitions and micro-interactions for a premium feel. Cursor should:
- Apply Tailwind's transition utilities (`transition`, `duration-300`, `ease-in-out`) for fluid animations, using scaling (`hover: scale-105`), fading, or sliding effects.
- Add micro-interactions like button presses (`active: scale-95`) and hover states (`hover: bg-opacity-80`), using `transform` utilities sparingly.
- Implement page transitions with fade-ins or slide-ins, such as `@keyframes slide-up { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }` with `animate-[slide-up_0.5s_ease-out]`.
- Optimize for performance with GPU-accelerated properties and durations of 200–500ms, ensuring responsiveness without heavy reflows.

#### Technical Implementation
To ensure Cursor aligns with Apple's technical standards, the prompt should cover:
- **Tailwind CSS**: Use the utility-first approach, customizing `tailwind.config.js` for Apple-inspired colors, fonts, and spacing scales, and support dark mode with `dark:` classes.
- **Responsive Design**: Build mobile-first layouts, using responsive prefixes and testing across breakpoints for consistency.
- **Code Structure**: Organize components modularly, using reusable classes and semantic HTML (`<header>`, `<main>`, `<footer>`) for accessibility.
- **Performance Optimization**: Minimize unused CSS with Tailwind's JIT mode and use lazy loading for images (`loading="lazy"`) to optimize load times.

#### Workflow and Example Output
The workflow should guide Cursor to:
- Analyze user requests, proposing designs adhering to Apple's philosophy, and provide HTML and Tailwind CSS code with detailed comments.
- Suggest animations or interactions to enhance user experience without overwhelming the design.
- Ask for clarification on specific requirements (e.g., target device, color preferences) and refine designs based on feedback.

An example output, such as a button component, illustrates implementation:
```html
<button class="bg-blue-500 text-white px-6 py-3 rounded-lg shadow-md hover: bg-blue-600 hover: shadow-lg active: scale-95 transition-all duration-300 ease-in-out">
  Get Started
</button>
```
- **Explanation**: This button uses a clean, rounded design with a subtle shadow, smooth hover effect, and press animation, mimicking Apple's tactile and elegant interactions, as seen in their interface guidelines.

#### Final Considerations
The prompt should emphasize prioritizing user experience over visual flair, referring to Apple's Human Interface Guidelines for inspiration ([Designing for iOS | Apple Developer Documentation](https://developer.apple.com/design/human-interface-guidelines/designing-for-ios)). The goal is to create designs that feel timeless, premium, and effortless, as if crafted by Apple itself, ensuring alignment with their design ethos.

#### Table: Comparison of Apple's Design Principles and Tailwind CSS Implementation

| **Apple Design Principle** | **Tailwind CSS Implementation**                     |
|----------------------------|----------------------------------------------------|
| Simplicity                 | Use minimal classes, avoid clutter (`p-8`, `m-10`) |
| Clarity                    | Clear typography (`text-lg`, `leading-relaxed`)    |
| Consistency                | Uniform spacing scale (`p-4`, `space-y-4`)         |
| Elegance                   | Rounded corners, shadows (`rounded-lg`, `shadow-md`)|
| Functionality              | Responsive layouts (`flex`, `grid`, `sm:`)         |
| Attention to Detail        | Micro-interactions, precise animations (`duration-300`) |

This table summarizes how Tailwind CSS can operationalize Apple's principles, ensuring Cursor's designs meet user expectations.

#### Key Citations
- [Human Interface Guidelines | Apple Developer Documentation](https://developer.apple.com/design/human-interface-guidelines/)
- [Apple Design Principles: A Legacy of Innovation, Elegance, and Vision | by Alex Glushenkov | Medium](https://medium.com/@alexglushenkov/apple-design-principles-a-legacy-of-innovation-elegance-and-vision-6d1f99a4331b)
- [What makes Apple design so good](https://medium.com/macoclock/what-makes-apple-design-so-good-d430ef97c6d2)
- [Typography - Visual Design - iOS - Human Interface Guidelines - Apple Developer](https://developer.apple.com/design/human-interface-guidelines/ios/visual-design/typography/)
- [San Francisco (sans-serif typeface) - Wikipedia](https://en.wikipedia.org/wiki/San_Francisco_%28sans-serif_typeface%29)
- [How to use Apple's San Francisco font on a webpage - Stack Overflow](https://stackoverflow.com/questions/32660748/how-to-use-apples-san-francisco-font-on-a-webpage)
- [Apple Colors - Hex, RGB, CMYK, Pantone | Color Codes - U.S. Brand Colors](https://usbrandcolors.com/apple-colors/)
- [Color | Apple Developer Documentation](https://developer.apple.com/design/human-interface-guidelines/color)
- [UI Design Dos and Don’ts - Apple Developer](https://developer.apple.com/design/tips/)
- [SF Symbols - Apple Developer](https://developer.apple.com/sf-symbols/)
- [Designing for iOS | Apple Developer Documentation](https://developer.apple.com/design/human-interface-guidelines/designing-for-ios)

