from PIL import Image
import os

img_path = '786936720143725509.png'
icons_dir = 'icons'

os.makedirs(icons_dir, exist_ok=True)

try:
    img = Image.open(img_path)
    
    # Resize and save icons
    img.resize((16, 16)).save(os.path.join(icons_dir, 'icon16.png'))
    img.resize((48, 48)).save(os.path.join(icons_dir, 'icon48.png'))
    img.resize((128, 128)).save(os.path.join(icons_dir, 'icon128.png'))
    
    # Generate fallback favicon (16x16)
    img.resize((16, 16)).save(os.path.join(icons_dir, 'default_favicon.png'))
    
    print(f"Icons generated successfully in '{icons_dir}/' folder.")

except FileNotFoundError:
    print(f"Error: Input image '{img_path}' not found in the current directory.")
except Exception as e:
    print(f"Error processing image: {e}") 