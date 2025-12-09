from flask import Flask, jsonify, request, Response
from flask_cors import CORS
import os
import pytesseract
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
import cv2
import time
import pandas as pd
import datetime
import json

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

# Configure Tesseract path (use system-installed tesseract on Linux)
# On Ubuntu/Debian: sudo apt install tesseract-ocr
# On Windows, uncomment and set the path:
# pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

DATA_DIR = os.path.join(os.path.dirname(__file__), '..', 'Data')
os.makedirs(DATA_DIR, exist_ok=True)


@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'healthy',
        'message': 'Backend is running'
    })


@app.route('/api/analyze', methods=['POST'])
def analyze_data():
    """
    Endpoint to analyze number patterns.
    """
    data = request.get_json()
    numbers = data.get('numbers', [])

    if not numbers:
        return jsonify({'error': 'No numbers provided'}), 400

    frequency = [0] * 10
    for num in numbers:
        if 0 <= num <= 9:
            frequency[num] += 1

    mean = sum(numbers) / len(numbers) if numbers else 0

    return jsonify({
        'count': len(numbers),
        'mean': round(mean, 2),
        'frequency': frequency,
        'last_digit': numbers[-1] if numbers else None
    })


@app.route('/api/scrape', methods=['POST'])
def scrape_data():
    """
    Endpoint to scrape data from playrep.pro using Selenium and OCR for captcha.

    Request body:
    {
        "username": "your_user_id",
        "password": "your_password",
        "pages": 15  (optional, default 15)
    }
    """
    req_data = request.get_json()
    username = req_data.get('username')
    password = req_data.get('password')
    max_pages = req_data.get('pages', 15)

    if not username or not password:
        return jsonify({'error': 'Username and password are required'}), 400

    logs = []
    driver = None

    try:
        logs.append("Starting Application: Ok")

        # Configure Chrome options for headless mode
        chrome_options = Options()
        chrome_options.add_argument('--headless')
        chrome_options.add_argument('--no-sandbox')
        chrome_options.add_argument('--disable-dev-shm-usage')
        chrome_options.add_argument('--window-size=1920,1080')

        driver = webdriver.Chrome(options=chrome_options)

        # Open login page
        driver.get("https://playrep.pro/Login.mvc")
        time.sleep(2)

        # Enter credentials
        username_field = driver.find_element(By.ID, 'username')
        username_field.send_keys(username)

        password_field = driver.find_element(By.ID, "password")
        password_field.send_keys(password)

        # Take screenshot for captcha
        screenshot_path = os.path.join(DATA_DIR, "ss.png")
        driver.save_screenshot(screenshot_path)

        # Process captcha using OCR
        # Find CAPTCHA image elements to get correct coordinates
        captcha_images = driver.find_elements(By.XPATH, "//img[contains(@src, 'CaptchaImage')]")
        if captcha_images:
            # Get the location and size of CAPTCHA images
            first_img = captcha_images[0]
            img_loc = first_img.location
            img_size = first_img.size
            # Calculate crop area (with some padding)
            x1 = max(0, img_loc['x'] - 5)
            y1 = max(0, img_loc['y'] - 5)
            # If there are 2 captcha images, extend to include both
            if len(captcha_images) > 1:
                last_img = captcha_images[-1]
                x2 = last_img.location['x'] + last_img.size['width'] + 5
            else:
                x2 = img_loc['x'] + img_size['width'] + 5
            y2 = img_loc['y'] + img_size['height'] + 5
        else:
            # Fallback coordinates based on debug analysis
            x1, y1, x2, y2 = 790, 355, 915, 395

        img = cv2.cvtColor(cv2.imread(screenshot_path), cv2.COLOR_BGR2RGB)
        img = img[int(y1):int(y2), int(x1):int(x2)]  # Crop captcha area
        captcha_text = pytesseract.image_to_string(img, config='--psm 7')
        captcha = ''.join(captcha_text.split())

        # Enter captcha
        captcha_field = driver.find_element(By.ID, "txtCaptcha")
        captcha_field.send_keys(captcha)

        # Click login button
        driver.find_element(By.ID, "btnCheckLogin").click()
        time.sleep(2)

        # Navigate to data page
        try:
            ul = driver.find_element(By.XPATH, "//ul[@id='menu4']")
            ul.find_element(By.XPATH, "//*[@id='menu4']/li[2]/a").click()
            ul.find_element(By.XPATH, "//*[@id='menu4']/li[2]/ul/li[1]/a").click()
            logs.append("Login Status: Ok")
        except Exception:
            logs.append("Login Status: Failed - Incorrect credentials or captcha")
            return jsonify({'error': 'Login failed', 'logs': logs}), 401

        time.sleep(3)

        # Click to show 100 records
        try:
            driver.find_element(
                By.XPATH,
                "/html/body/div[3]/div/div[2]/div[1]/div/form/div/table[2]/tbody/tr/td[14]/select/option[10]"
            ).click()
            logs.append("Data Loading: Ok")
        except Exception:
            logs.append("Data Loading: Failed - Not enough data present")
            return jsonify({'error': 'Data loading failed', 'logs': logs}), 500

        time.sleep(2)

        # Get pagination info
        nav_bar = driver.find_elements(
            By.XPATH,
            "/html/body/div[3]/div/div[2]/div[1]/div/form/div/table[2]/tbody/tr"
        )[0].text.split(' ')
        pages = len(nav_bar[-13::-1])
        logs.append(f"{pages} pages found")

        # Scrape data from pages
        data = {"Number": [], "Date": [], "Time": []}

        for num in range(1, min(max_pages + 1, pages + 1)):
            try:
                page_input = driver.find_element(
                    By.XPATH,
                    "//*[@id='dvFunTargettxtJqGridGoToPage']"
                )
                page_input.clear()
                page_input.send_keys(num)

                driver.find_element(
                    By.XPATH,
                    f"//*[@id='dvFunTarget']/table[2]/tbody/tr/td[{len(nav_bar) - 10 + 1}]/input[2]"
                ).click()

                row_count = 1 + len(driver.find_elements(
                    By.XPATH,
                    "/html/body/div[3]/div/div[2]/div[1]/div/form/div/table[1]/tbody/tr"
                ))
                col_count = len(driver.find_elements(
                    By.XPATH,
                    "/html/body/div[3]/div/div[2]/div[1]/div/form/div/table[1]/tbody/tr[1]/td"
                ))

                logs.append(f"Page {num}: {row_count}x{col_count}")

                for r in range(1, row_count):
                    number = driver.find_elements(
                        By.XPATH,
                        f"/html/body/div[3]/div/div[2]/div[1]/div/form/div/table[1]/tbody/tr[{r}]/td[2]"
                    )[0].text
                    data['Number'].append(number)

                    date_time = driver.find_elements(
                        By.XPATH,
                        f"/html/body/div[3]/div/div[2]/div[1]/div/form/div/table[1]/tbody/tr[{r}]/td[3]"
                    )[0].text
                    data['Date'].append(date_time[:11])
                    data['Time'].append(date_time[12:])

            except Exception as e:
                logs.append(f"Page {num} loaded with issues: {str(e)}")

        # Save to CSV
        df = pd.DataFrame(data)
        csv_filename = f"{str(datetime.datetime.now())[:10]}-Data.csv"
        csv_path = os.path.join(DATA_DIR, csv_filename)
        df.to_csv(csv_path, index=False)
        logs.append(f"Dataset saved: {csv_filename}")

        return jsonify({
            'success': True,
            'data': data,
            'records': len(data['Number']),
            'csv_file': csv_filename,
            'logs': logs
        })

    except Exception as e:
        logs.append(f"Error: {str(e)}")
        return jsonify({'error': str(e), 'logs': logs}), 500

    finally:
        if driver:
            driver.quit()


@app.route('/api/scrape/stream', methods=['GET'])
def scrape_stream():
    """
    SSE endpoint to scrape data with real-time log streaming.
    Query params: username, password, pages (optional)
    """
    username = request.args.get('username')
    password = request.args.get('password')
    max_pages = int(request.args.get('pages', 15))

    def generate():
        def send_log(message, log_type="info"):
            data = json.dumps({"type": "log", "log_type": log_type, "message": message})
            yield f"data: {data}\n\n"

        def send_error(message):
            data = json.dumps({"type": "error", "message": message})
            yield f"data: {data}\n\n"

        def send_complete(result_data):
            data = json.dumps({"type": "complete", "data": result_data})
            yield f"data: {data}\n\n"

        if not username or not password:
            yield from send_error("Username and password are required")
            return

        driver = None
        try:
            yield from send_log("Starting Application...", "info")
            yield from send_log("Initializing Chrome browser", "info")

            chrome_options = Options()
            chrome_options.add_argument('--headless')
            chrome_options.add_argument('--no-sandbox')
            chrome_options.add_argument('--disable-dev-shm-usage')
            chrome_options.add_argument('--window-size=1920,1080')

            driver = webdriver.Chrome(options=chrome_options)
            yield from send_log("Chrome browser started", "success")

            yield from send_log("Opening login page...", "info")
            driver.get("https://playrep.pro/Login.mvc")
            time.sleep(2)
            yield from send_log("Login page loaded", "success")

            yield from send_log("Entering credentials...", "info")
            username_field = driver.find_element(By.ID, 'username')
            username_field.send_keys(username)
            password_field = driver.find_element(By.ID, "password")
            password_field.send_keys(password)
            yield from send_log("Credentials entered", "success")

            yield from send_log("Processing CAPTCHA...", "info")
            screenshot_path = os.path.join(DATA_DIR, "ss.png")
            driver.save_screenshot(screenshot_path)

            # Find CAPTCHA image elements to get correct coordinates
            captcha_images = driver.find_elements(By.XPATH, "//img[contains(@src, 'CaptchaImage')]")
            if captcha_images:
                first_img = captcha_images[0]
                img_loc = first_img.location
                img_size = first_img.size
                x1 = max(0, img_loc['x'] - 5)
                y1 = max(0, img_loc['y'] - 5)
                if len(captcha_images) > 1:
                    last_img = captcha_images[-1]
                    x2 = last_img.location['x'] + last_img.size['width'] + 5
                else:
                    x2 = img_loc['x'] + img_size['width'] + 5
                y2 = img_loc['y'] + img_size['height'] + 5
                yield from send_log(f"CAPTCHA found at ({x1},{y1}) to ({x2},{y2})", "info")
            else:
                x1, y1, x2, y2 = 790, 355, 915, 395
                yield from send_log("Using fallback CAPTCHA coordinates", "warning")

            img = cv2.cvtColor(cv2.imread(screenshot_path), cv2.COLOR_BGR2RGB)
            img = img[int(y1):int(y2), int(x1):int(x2)]
            captcha_text = pytesseract.image_to_string(img, config='--psm 7')
            captcha = ''.join(captcha_text.split())
            yield from send_log(f"CAPTCHA detected: {captcha}", "success")

            captcha_field = driver.find_element(By.ID, "txtCaptcha")
            captcha_field.send_keys(captcha)

            yield from send_log("Submitting login...", "info")
            driver.find_element(By.ID, "btnCheckLogin").click()
            time.sleep(2)

            try:
                ul = driver.find_element(By.XPATH, "//ul[@id='menu4']")
                ul.find_element(By.XPATH, "//*[@id='menu4']/li[2]/a").click()
                ul.find_element(By.XPATH, "//*[@id='menu4']/li[2]/ul/li[1]/a").click()
                yield from send_log("Login successful!", "success")
            except Exception:
                yield from send_error("Login failed - Incorrect credentials or CAPTCHA")
                return

            time.sleep(3)

            yield from send_log("Loading data table...", "info")
            try:
                driver.find_element(
                    By.XPATH,
                    "/html/body/div[3]/div/div[2]/div[1]/div/form/div/table[2]/tbody/tr/td[14]/select/option[10]"
                ).click()
                yield from send_log("Data table loaded (100 records per page)", "success")
            except Exception:
                yield from send_error("Data loading failed - Not enough data present")
                return

            time.sleep(2)

            yield from send_log("Analyzing pagination...", "info")
            nav_bar = driver.find_elements(
                By.XPATH,
                "/html/body/div[3]/div/div[2]/div[1]/div/form/div/table[2]/tbody/tr"
            )[0].text.split(' ')
            pages = len(nav_bar[-13::-1])
            yield from send_log(f"Found {pages} pages of data", "success")

            scraped_data = {"Number": [], "Date": [], "Time": []}
            total_records = 0

            for num in range(1, min(max_pages + 1, pages + 1)):
                try:
                    yield from send_log(f"Scraping page {num}/{min(max_pages, pages)}...", "info")

                    page_input = driver.find_element(
                        By.XPATH,
                        "//*[@id='dvFunTargettxtJqGridGoToPage']"
                    )
                    page_input.clear()
                    page_input.send_keys(num)

                    driver.find_element(
                        By.XPATH,
                        f"//*[@id='dvFunTarget']/table[2]/tbody/tr/td[{len(nav_bar) - 10 + 1}]/input[2]"
                    ).click()

                    time.sleep(1)

                    row_count = 1 + len(driver.find_elements(
                        By.XPATH,
                        "/html/body/div[3]/div/div[2]/div[1]/div/form/div/table[1]/tbody/tr"
                    ))

                    for r in range(1, row_count):
                        number = driver.find_elements(
                            By.XPATH,
                            f"/html/body/div[3]/div/div[2]/div[1]/div/form/div/table[1]/tbody/tr[{r}]/td[2]"
                        )[0].text
                        scraped_data['Number'].append(number)

                        date_time = driver.find_elements(
                            By.XPATH,
                            f"/html/body/div[3]/div/div[2]/div[1]/div/form/div/table[1]/tbody/tr[{r}]/td[3]"
                        )[0].text
                        scraped_data['Date'].append(date_time[:11])
                        scraped_data['Time'].append(date_time[12:])

                    total_records += row_count - 1
                    yield from send_log(f"Page {num}: {row_count - 1} records (Total: {total_records})", "success")

                except Exception as e:
                    yield from send_log(f"Page {num}: Error - {str(e)}", "warning")

            yield from send_log("Saving data to CSV...", "info")
            df = pd.DataFrame(scraped_data)
            csv_filename = f"{str(datetime.datetime.now())[:10]}-Data.csv"
            csv_path = os.path.join(DATA_DIR, csv_filename)
            df.to_csv(csv_path, index=False)
            yield from send_log(f"Data saved: {csv_filename}", "success")

            yield from send_log(f"Scraping complete! {total_records} records collected", "success")

            yield from send_complete({
                'success': True,
                'data': scraped_data,
                'records': total_records,
                'csv_file': csv_filename
            })

        except Exception as e:
            yield from send_error(str(e))

        finally:
            if driver:
                driver.quit()

    return Response(
        generate(),
        mimetype='text/event-stream',
        headers={
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*'
        }
    )


@app.route('/api/scrape/debug-captcha', methods=['GET'])
def debug_captcha():
    """
    Debug endpoint to test CAPTCHA reading without login.
    Returns the screenshot and OCR result.
    """
    driver = None
    try:
        chrome_options = Options()
        chrome_options.add_argument('--headless')
        chrome_options.add_argument('--no-sandbox')
        chrome_options.add_argument('--disable-dev-shm-usage')
        chrome_options.add_argument('--window-size=1920,1080')

        driver = webdriver.Chrome(options=chrome_options)

        # Open login page
        driver.get("https://playrep.pro/Login.mvc")
        time.sleep(3)

        # Get page info
        page_title = driver.title
        page_url = driver.current_url

        # Take full screenshot
        full_screenshot_path = os.path.join(DATA_DIR, "debug_full.png")
        driver.save_screenshot(full_screenshot_path)

        # Load and analyze the image
        img_full = cv2.imread(full_screenshot_path)
        img_rgb = cv2.cvtColor(img_full, cv2.COLOR_BGR2RGB)

        # Get image dimensions
        height, width = img_full.shape[:2]

        # Try to find CAPTCHA images dynamically
        captcha_images = driver.find_elements(By.XPATH, "//img[contains(@src, 'CaptchaImage')]")
        dynamic_coords = None
        if captcha_images:
            first_img = captcha_images[0]
            img_loc = first_img.location
            img_size = first_img.size
            x1 = max(0, img_loc['x'] - 5)
            y1 = max(0, img_loc['y'] - 5)
            if len(captcha_images) > 1:
                last_img = captcha_images[-1]
                x2 = last_img.location['x'] + last_img.size['width'] + 5
            else:
                x2 = img_loc['x'] + img_size['width'] + 5
            y2 = img_loc['y'] + img_size['height'] + 5
            dynamic_coords = [int(y1), int(y2), int(x1), int(x2)]

        # Try different crop regions to find CAPTCHA
        crop_regions = [
            {"name": "dynamic", "coords": dynamic_coords} if dynamic_coords else None,
            {"name": "fallback", "coords": [355, 395, 790, 915]},
        ]
        crop_regions = [r for r in crop_regions if r is not None]

        results = []
        for region in crop_regions:
            y1, y2, x1, x2 = region["coords"]
            if y2 <= height and x2 <= width:
                cropped = img_rgb[y1:y2, x1:x2]
                crop_path = os.path.join(DATA_DIR, f"debug_crop_{region['name']}.png")
                cv2.imwrite(crop_path, cv2.cvtColor(cropped, cv2.COLOR_RGB2BGR))

                # Try OCR with different configs
                try:
                    ocr_text = pytesseract.image_to_string(cropped, config='--psm 7')
                    ocr_clean = ''.join(ocr_text.split())
                except Exception as e:
                    ocr_text = f"OCR Error: {str(e)}"
                    ocr_clean = ""

                results.append({
                    "region": region["name"],
                    "coords": region["coords"],
                    "ocr_raw": ocr_text,
                    "ocr_clean": ocr_clean,
                    "crop_saved": crop_path
                })

        # Try to find CAPTCHA element
        captcha_info = {}
        try:
            captcha_input = driver.find_element(By.ID, "txtCaptcha")
            captcha_info["input_found"] = True
            captcha_info["input_location"] = captcha_input.location
            captcha_info["input_size"] = captcha_input.size
        except Exception as e:
            captcha_info["input_found"] = False
            captcha_info["input_error"] = str(e)

        # Try to find CAPTCHA image element
        try:
            # Look for img elements near the captcha
            images = driver.find_elements(By.TAG_NAME, "img")
            captcha_info["images_found"] = len(images)
            captcha_info["image_sources"] = []
            for img in images[:10]:  # First 10 images
                try:
                    src = img.get_attribute("src")
                    loc = img.location
                    size = img.size
                    captcha_info["image_sources"].append({
                        "src": src[:100] if src else None,
                        "location": loc,
                        "size": size
                    })
                except:
                    pass
        except Exception as e:
            captcha_info["images_error"] = str(e)

        return jsonify({
            "success": True,
            "page_title": page_title,
            "page_url": page_url,
            "screenshot_size": {"width": width, "height": height},
            "full_screenshot": full_screenshot_path,
            "crop_results": results,
            "captcha_info": captcha_info
        })

    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

    finally:
        if driver:
            driver.quit()


@app.route('/api/scrape/status', methods=['GET'])
def scrape_status():
    """Check if scraping dependencies are available."""
    status = {
        'tesseract': False,
        'chrome_driver': False
    }

    try:
        pytesseract.get_tesseract_version()
        status['tesseract'] = True
    except Exception:
        pass

    try:
        chrome_options = Options()
        chrome_options.add_argument('--headless')
        chrome_options.add_argument('--no-sandbox')
        driver = webdriver.Chrome(options=chrome_options)
        driver.quit()
        status['chrome_driver'] = True
    except Exception:
        pass

    return jsonify(status)


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 3001))
    app.run(host='0.0.0.0', port=port, debug=True)
